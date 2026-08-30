# Order Search (ata-order-web)

React + TypeScript web app for searching, sorting and reviewing orders by
date range. Backend responses are mocked at the network layer, so the app
runs standalone.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build && npm run preview   # production build, mock still works
npm run lint                       # oxlint
```

## Architecture

```
src/
  main.tsx              Boots MSW (awaited) then React Query + OrdersPage
  types/order.ts        Domain model — the contract with the backend
  constants/
    filters.ts          Period / Status dropdown options, DEFAULT_PAGE_SIZE
    columns.ts          Column definitions: label, mobile, align, sortable
  api/
    client.ts           The only place fetch() is called
    orders.ts           Typed endpoint functions
  hooks/
    useOrders.ts        React Query: infinite list + lazy detail
    useMediaQuery.ts    Breakpoint subscription
  mocks/
    data.ts             Seeded fixture — 123 orders
    handlers.ts         Fake backend: filters, sorts, pages, validates
    browser.ts          Service Worker registration
  components/
    OrdersPage.tsx      Owns committed criteria + sort; loading/error/empty
    SearchBar.tsx       Draft form state, commits on Search
    OrderTable.tsx      Sortable headers + IntersectionObserver sentinel
    OrderRow.tsx        One <tbody> per order; expands to the detail panel
    OrderDetailPanel.tsx  Lazily fetched detail, server-driven actions
    StatusBadge.tsx     Status pill
    TableSkeleton.tsx   First-load placeholder rows
  utils/format.ts       Date / money / enum formatting (view layer only)
  styles/app.css        All styling — plain CSS, no framework
```

## Data model

| Type | Purpose |
|---|---|
| `OrderSummary` | One table row. Kept small — the list returns many. |
| `OrderDetail` | The expanded panel. Fetched lazily, per row, on expand. |
| `Page<T>` | Mirrors Spring Data's `Page<T>` JSON shape. |

Three rules the model follows:

1. **Dates cross the wire as ISO-8601 strings**, never pre-formatted. The
   backend does not know the user's locale or timezone; formatting is a view
   concern and happens only in `utils/format.ts`.
2. **Money is `{ amount, currency }`**, never `"$135.00"`. You cannot do
   arithmetic on a formatted string — nor sort by it.
3. **`availableActions` comes from the server.** Whether a user may Accept or
   Reject an order is business logic, not frontend styling.

## API contract

```
GET /api/orders?period=TRANSMISSION&status=WAITING
    &from=2022-12-01&to=2023-01-31&page=0&size=20&sort=orderDateTime,desc
 -> { content: OrderSummary[], page: { number, size, totalElements, totalPages } }

GET /api/orders/{id}/detail        -> OrderDetail
POST /api/orders/{id}/actions/{action}
```

`400` is returned when `from > to`.

## Sorting

Every data column is sortable; only the trailing actions column is not
(`sortable` in `constants/columns.ts`). Clicking a header sorts it
descending; clicking the column that is already sorted flips the direction.
`OrderTable` renders each sortable header as a real `<button>` and sets
`aria-sort` on the `<th>`, so the current sort is announced, not just drawn
with an arrow.

**Sorting is a server round trip, not a client-side array sort.** The
committed `sort` string lives in `OrdersPage` state and is part of the React
Query key, so changing it re-runs the query from page 0. Sorting only the
pages already loaded would reorder the visible rows and leave the rest of
the result set in the old order — correct-looking and wrong.

The wire format is Spring Data's: `sort=field,dir`. The client sends the
field name and nothing else, because **how** a field compares is server-side
knowledge. `mocks/handlers.ts` holds that mapping (`SORT_AS`) and picks a
comparator per type:

| Kind | Fields | Why it can't be a string compare |
|---|---|---|
| `number` | `quantity`, `filledQuantity` | Lexically, `"10"` sorts before `"9"`. |
| `money` | `price` | It's `{ amount, currency }`; `String()` gives `[object Object]`. |
| `date` | `orderDateTime`, `expirationDateTime` | Compared as instants via `Date.parse`. |
| `string` | everything else | `localeCompare`; nullable `symbol` coalesces to `''`. |

The mock sorts the whole filtered set before slicing the requested page, so
paging and sorting compose exactly as they will against the real service.

## Swapping in the real backend

The mock is a Service Worker intercepting real `fetch` calls, so components
already talk to the network exactly as they will in production.

```bash
# .env.local
VITE_API_BASE_URL=http://localhost:8080/api
```

Setting that variable switches the mock off (`src/main.tsx`) and points
`api/client.ts` at the Spring Boot service. No component changes — including
sorting, which is already expressed as a `Pageable`-shaped query parameter.

## Responsive behaviour

`src/constants/columns.ts` is the single source of truth. Each column carries
a `mobile: boolean` flag; at 768px and below the table renders only the four
required columns — **Account, Operation, Symbol, Status**. Filtering happens
in JS, not with `display: none`, so hidden cells are never added to the DOM
— and their headers, sort buttons included, are never rendered either.

The expanded detail panel reflows to a single column and still shows every
field, so nothing is lost on a small screen.

## Notable implementation choices

- **Draft vs. committed search state.** `SearchBar` owns the form values
  locally; only pressing Search promotes them to the React Query key. Lifting
  every field to the parent would fire a request per keystroke.
- **`useSyncExternalStore` for the breakpoint.** It reads during render, so
  the first paint is already correct. The `useEffect` alternative flashes the
  desktop layout for one frame on mobile.
- **One cell renderer keyed by column.** `OrderRow` maps over whatever
  columns it is handed, so the same component serves the 13-column desktop
  table and the 4-column mobile one.
- **`IntersectionObserver` sentinel** for infinite scroll — no scroll
  listeners, no throttling, no `scrollHeight` math.
- **Detail rows mount only when expanded.** That is what makes the fetch
  lazy: opening a 123-row list costs one request, not 124.
- **Seeded faker.** Data is stable across reloads, so sort order does not
  shift under you and a bug is distinguishable from noise.
- **Simulated latency** (`delay()` in `handlers.ts`). Without it the loading
  skeleton renders for 0ms and its bugs stay hidden.

## MVP-2 notes

`Period` and `Status` are single-valued for MVP-1 but are modeled as string
unions rendered from arrays in `constants/filters.ts`. Adding a value is one
line there plus one in `types/order.ts` — no component changes. A new column
is likewise one entry in `constants/columns.ts` plus its `renderCell` case,
and one line in `SORT_AS` if it should sort by something other than text.
