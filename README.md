# Order Search (ata-order-web)

React + TypeScript web app for searching and reviewing orders by date range.
Backend responses are mocked at the network layer, so the app runs standalone.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build && npm run preview   # production build, mock still works
```

## Architecture

```
src/
  types/order.ts        Domain model — the contract with the backend
  constants/
    filters.ts          Period / Status dropdown options
    columns.ts          Column definitions + which are visible on mobile
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
  components/           SearchBar, OrderTable, OrderRow, OrderDetailPanel, ...
  utils/format.ts       Date / money / enum formatting (view layer only)
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
   arithmetic on a formatted string.
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

## Swapping in the real backend

The mock is a Service Worker intercepting real `fetch` calls, so components
already talk to the network exactly as they will in production.

```bash
# .env.local
VITE_API_BASE_URL=http://localhost:8080/api
```

Setting that variable switches the mock off (`src/main.tsx`) and points
`api/client.ts` at the Spring Boot service. No component changes.

## Responsive behaviour

`src/constants/columns.ts` is the single source of truth. Each column carries
a `mobile: boolean` flag; below 768px the table renders only the four required
columns — **Account, Operation, Symbol, Status**. Filtering happens in JS, not
with `display: none`, so hidden cells are never added to the DOM.

The expanded detail panel reflows to a single column and still shows every
field, so nothing is lost on a small screen.

## Notable implementation choices

- **Draft vs. committed search state.** `SearchBar` owns the form values
  locally; only pressing Search promotes them to the React Query key. Lifting
  every field to the parent would fire a request per keystroke.
- **`useSyncExternalStore` for the breakpoint.** It reads during render, so
  the first paint is already correct. The `useEffect` alternative flashes the
  desktop layout for one frame on mobile.
- **`IntersectionObserver` sentinel** for infinite scroll — no scroll
  listeners, no throttling, no `scrollHeight` math.
- **Seeded faker.** Data is stable across reloads, so sort order does not
  shift under you and a bug is distinguishable from noise.
- **Simulated latency** (`delay()` in `handlers.ts`). Without it the loading
  skeleton renders for 0ms and its bugs stay hidden.

## MVP-2 notes

`Period` and `Status` are single-valued for MVP-1 but are modeled as string
unions rendered from arrays in `constants/filters.ts`. Adding a value is one
line there plus one in `types/order.ts` — no component changes.
