import { useEffect, useRef } from 'react';
import type { ColumnDef } from '../constants/columns';
import type { OrderSummary } from '../types/order';
import { OrderRow } from './OrderRow';

interface Props {
  orders: OrderSummary[];
  columns: ReadonlyArray<ColumnDef>;
  sort: string;
  onSortChange: (sort: string) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

export function OrderTable({
  orders, columns, sort, onSortChange, hasNextPage, isFetchingNextPage, onLoadMore,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [sortField, sortDir] = sort.split(',');

  /**
   * INFINITE SCROLL.
   * An IntersectionObserver watching an empty <div> at the bottom of the
   * list. When that div scrolls into view, load the next page.
   *
   * Why not a scroll listener? It fires on every pixel, needs throttling,
   * and needs manual math against scrollHeight. The observer fires once,
   * is off the main thread, and is ~8 lines.
   */
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Guard on isFetchingNextPage or a fast scroll fires this several
        // times before the first response lands.
        if (entries[0].isIntersecting && !isFetchingNextPage) onLoadMore();
      },
      { rootMargin: '200px' }, // start loading slightly BEFORE the user hits the end
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  function toggleSort(column: ColumnDef) {
    if (!column.sortable) return;
    const nextDir = sortField === column.key && sortDir === 'desc' ? 'asc' : 'desc';
    onSortChange(`${String(column.key)},${nextDir}`);
  }

  return (
    <>
      {/* The wrapper, not the page body, owns horizontal overflow. */}
      <div className="table-wrap">
        <table className="order-table">
          <thead>
            <tr>
              <th className="order-row__toggle"><span className="sr-only">Expand</span></th>
              {columns.map((column) => {
                const isSorted = sortField === column.key;
                return (
                  <th
                    key={String(column.key)}
                    data-align={column.align ?? 'left'}
                    // aria-sort tells assistive tech the current sort state.
                    aria-sort={isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    {column.sortable ? (
                      <button type="button" className="th-sort" onClick={() => toggleSort(column)}>
                        {column.label}
                        <span className="th-sort__icon">{isSorted ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {orders.map((order) => (
            <OrderRow key={order.id} order={order} columns={columns} />
          ))}
        </table>
      </div>

      <div ref={sentinelRef} className="sentinel">
        {isFetchingNextPage && <span className="spinner" aria-label="Loading more orders" />}
        {!hasNextPage && orders.length > 0 && (
          <span className="sentinel__end">End of results</span>
        )}
      </div>
    </>
  );
}
