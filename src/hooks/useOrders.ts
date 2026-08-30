import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchOrderDetail, fetchOrders } from '../api/orders';
import { DEFAULT_PAGE_SIZE } from '../constants/filters';
import type { OrderSearchCriteria } from '../types/order';

/**
 * The queryKey is the whole contract: React Query re-fetches whenever any
 * part of it changes, and caches per unique key. This is why `criteria`
 * must be COMMITTED state (set on Search click), not live form state —
 * otherwise every keystroke in a date field fires a request.
 */
export function useOrdersQuery(criteria: OrderSearchCriteria, sort: string) {
  return useInfiniteQuery({
    queryKey: ['orders', criteria, sort],
    queryFn: ({ pageParam }) => fetchOrders(criteria, pageParam, DEFAULT_PAGE_SIZE, sort),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const next = lastPage.page.number + 1;
      // Returning undefined tells React Query "no more pages" —
      // that's what flips hasNextPage to false.
      return next < lastPage.page.totalPages ? next : undefined;
    },
  });
}

/**
 * Detail is fetched lazily, per row. `enabled` is the key bit: the query
 * stays idle until the row is actually expanded, so opening a 123-row list
 * costs exactly one request, not 124.
 */
export function useOrderDetailQuery(orderId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: () => fetchOrderDetail(orderId),
    enabled,
    // Detail rarely changes while the panel is open; don't refetch on
    // every collapse/expand cycle.
    staleTime: 5 * 60 * 1000,
  });
}
