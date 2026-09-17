import { useMemo, useState } from 'react';
import { SearchBar } from './SearchBar';
import { OrderTable } from './OrderTable';
import { TableSkeleton } from './TableSkeleton';
import { useOrdersQuery } from '../hooks/useOrders';
import { useIsMobile } from '../hooks/useMediaQuery';
import { visibleColumns } from '../constants/columns';
import type { OrderSearchCriteria } from '../types/order';

const INITIAL_CRITERIA: OrderSearchCriteria = {
  period: 'TRANSMISSION',
  status: 'WAITING',
  from: '2022-12-01',
  to: '2023-01-31',
};


export function OrdersPage() {
  // COMMITTED criteria — only changes when Search is clicked.
  const [criteria, setCriteria] = useState<OrderSearchCriteria>(INITIAL_CRITERIA);
  const [sort, setSort] = useState('orderDateTime,desc');

  const isMobile = useIsMobile();
  const columns = useMemo(() => visibleColumns(isMobile), [isMobile]);

  const {
    data, isLoading, isFetching, isError, error,
    fetchNextPage, hasNextPage, isFetchingNextPage, refetch,
  } = useOrdersQuery(criteria, sort);

  // useInfiniteQuery hands back pages; flatten them for rendering.
  const orders = useMemo(() => data?.pages.flatMap((p) => p.content) ?? [], [data]);
  const totalElements = data?.pages[0]?.page.totalElements;

  return (
    <main className="page">
      <SearchBar
        initial={INITIAL_CRITERIA}
        onSearch={setCriteria}
        isSearching={isFetching && !isFetchingNextPage}
        resultCount={totalElements}
      />

      {/* --- 1. First load: skeleton, not a spinner. Skeletons preserve
              layout so the page doesn't jump when data arrives. --- */}
      {isLoading && <TableSkeleton columns={columns.length + 1} />}

      {/* --- 2. Error: show the server's message AND a way to recover. --- */}
      {isError && (
        <div className="state state--error" role="alert">
          <p>{(error as Error).message}</p>
          <button type="button" className="btn btn--primary" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      )}

      {/* --- 3. Empty: tell them WHY it's empty and what to change. --- */}
      {!isLoading && !isError && orders.length === 0 && (
        <div className="state state--empty">
          <p>No orders found for this date range.</p>
          <p className="state__hint">Try widening the “From” and “To” dates.</p>
        </div>
      )}

      {/* --- 4. Success --- */}
      {!isLoading && !isError && orders.length > 0 && (
        <OrderTable
          orders={orders}
          columns={columns}
          sort={sort}
          onSortChange={setSort}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={fetchNextPage}
        />
      )}
    </main>
  );
}
