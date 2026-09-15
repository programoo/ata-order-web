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

## Docker & Kubernetes

The image is two stages: Node builds `dist/`, nginx serves it. In the cluster
the browser never talks to the backend directly — nginx proxies it:

```
browser ──► order-web (nginx :80) ──/api/──► salary-app (Spring Boot :8080)
            same origin                      k8s Service name
```

**The bundle is built with `VITE_API_BASE_URL=/api`**, a relative URL. That
switches the mock off and makes every request same-origin, so there is no
CORS and no backend address baked into the JS. A browser cannot resolve a k8s
Service name, and `http://localhost:8080` would mean each viewer's own
machine — so a relative URL plus a proxy is the only shape that works.

| File | Role |
|---|---|
| `Dockerfile` | Sets `VITE_API_BASE_URL=/api` at build time; `API_UPSTREAM=http://salary-app` at run time. |
| `nginx.conf` | Copied to `/etc/nginx/templates/`, so `${API_UPSTREAM}` is filled from the environment at container start. `location /api/` forwards the path unchanged. |
| `.dockerignore` | Excludes `.env*` — the local dev URL must not leak into the image. |

nginx's template step substitutes only variables that exist in the
environment, so its own `$uri` / `$scheme` are left alone.

### Deploy to minikube

Images are not pushed to a registry; they are loaded into minikube and
referenced by tag (`imagePullPolicy: IfNotPresent`). Bump the tag every
build — reusing one means the node keeps the old image.

```bash
docker build -t ata-order-web:1.3 .
minikube image load ata-order-web:1.3
kubectl set image deploy/order-web '*=ata-order-web:1.3'
kubectl rollout status deploy/order-web
```

Roll back with `kubectl rollout undo deploy/order-web`.

### Pointing at a different backend

The upstream is an environment variable, not a build input — no rebuild:

```bash
kubectl set env deploy/order-web API_UPSTREAM=http://other-service
docker run -p 8081:80 -e API_UPSTREAM=http://host.docker.internal:8080 ata-order-web:1.3
```

nginx resolves the upstream host once, at startup, and exits if it cannot —
so outside the cluster `API_UPSTREAM` must be set to something reachable.

### Troubleshooting

- **`/api/orders` returns 404.** The backend image predates the endpoint.
  Check with `kubectl exec deploy/order-web -- wget -qO- http://salary-app/api/orders`;
  if that 404s, rebuild and roll out `ata-salary-services` from a commit that
  has `OrderController`.
- **Requests go to `localhost:8080` or the table shows mock data.** The
  bundle was not built by the `Dockerfile` — a local `npm run build` takes
  `VITE_API_BASE_URL` from `.env` (or none, which enables the mock). Rebuild
  the image with `docker build`.

