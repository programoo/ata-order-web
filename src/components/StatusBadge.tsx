import type { OrderStatus } from '../types/order';

const LABELS: Record<OrderStatus, string> = { WAITING: 'Waiting' };

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`status status--${status.toLowerCase()}`}>
      <span className="status__dot" aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
