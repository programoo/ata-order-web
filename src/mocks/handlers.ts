import { http, HttpResponse, delay } from 'msw';
import { ORDERS, getOrderDetail } from './data';
import type { OrderSummary, Page } from '../types/order';

/**
 * These handlers implement the CONTRACT, not just canned JSON.
 * Filtering, sorting and paging genuinely run here, which means:
 *  - your date range actually changes the result count
 *  - infinite scroll actually pages
 *  - the real Spring Boot service can drop in behind the same URLs
 */
export const handlers = [
  http.get('/api/orders', async ({ request }) => {
    const url = new URL(request.url);

    const period = url.searchParams.get('period');
    const status = url.searchParams.get('status');
    const from = url.searchParams.get('from'); // yyyy-MM-dd
    const to = url.searchParams.get('to');
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 20);
    const sort = url.searchParams.get('sort') ?? 'orderDateTime,desc';

    // --- validation: a real service rejects a backwards range ---
    if (from && to && from > to) {
      return HttpResponse.json(
        { message: '"From" date must be on or before "To" date.' },
        { status: 400 },
      );
    }

    let result: OrderSummary[] = ORDERS.filter((o) => {
      if (status && o.status !== status) return false;
      // `period` is fixed to TRANSMISSION in MVP-1; kept for contract fidelity.
      if (period && period !== 'TRANSMISSION') return false;
      // Compare on the calendar day only — slicing the ISO string is exact
      // here and avoids timezone drift from new Date() round-trips.
      const day = o.orderDateTime.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    });

    // --- sorting ---
    const [sortField, sortDir = 'asc'] = sort.split(',');
    result = [...result].sort((a, b) => {
      const av = a[sortField as keyof OrderSummary];
      const bv = b[sortField as keyof OrderSummary];
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'desc' ? -cmp : cmp;
    });

    const totalElements = result.length;
    const content = result.slice(page * size, page * size + size);

    // Simulate network latency so you actually SEE your loading states.
    // If you skip this, you ship a skeleton nobody ever rendered.
    await delay(400);

    const body: Page<OrderSummary> = {
      content,
      page: {
        number: page,
        size,
        totalElements,
        totalPages: Math.ceil(totalElements / size),
      },
    };
    return HttpResponse.json(body);
  }),

  http.get('/api/orders/:id/detail', async ({ params }) => {
    await delay(300);
    const detail = getOrderDetail(params.id as string);
    if (!detail) {
      return HttpResponse.json({ message: 'Order not found' }, { status: 404 });
    }
    return HttpResponse.json(detail);
  }),

  http.post('/api/orders/:id/actions/:action', async () => {
    await delay(500);
    return HttpResponse.json({ ok: true });
  }),
];
