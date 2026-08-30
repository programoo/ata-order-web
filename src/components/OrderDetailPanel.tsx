import { useOrderDetailQuery } from '../hooks/useOrders';
import { formatDateTime, formatMoney } from '../utils/format';

export function OrderDetailPanel({ orderId }: { orderId: string }) {
  // `enabled: true` — this component only mounts when the row is expanded,
  // so mounting IS the trigger. No manual effect needed.
  const { data, isLoading, isError, error } = useOrderDetailQuery(orderId, true);

  if (isLoading) return <div className="detail detail--loading">Loading details…</div>;
  if (isError) {
    return (
      <div className="detail detail--error" role="alert">
        Could not load details: {(error as Error).message}
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="detail">
      <div className="detail__header">
        <div className="detail__client">
          <strong>{data.clientName}</strong>
          <span className="detail__account">( {data.accountLabel} )</span>
          <button type="button" className="btn btn--link">Full review details ↗</button>
        </div>
        <div className="detail__actions">
          {data.availableActions.includes('ACCEPT') && (
            <button type="button" className="btn btn--accept">ACCEPT</button>
          )}
          {data.availableActions.includes('REJECT') && (
            <button type="button" className="btn btn--reject">Reject ▾</button>
          )}
        </div>
      </div>

      {/* <dl> is the semantically right element for label/value pairs.
          It also reflows to one column on mobile with two lines of CSS. */}
      <dl className="detail__fields">
        <div><dt>Net Amount:</dt><dd>{formatMoney(data.netAmount, true)}</dd></div>
        <div><dt>Price:</dt><dd>{formatMoney(data.price)}</dd></div>
        <div><dt>Exchange Rate:</dt><dd>{data.exchangeRate}</dd></div>
        <div><dt>O/S Limit:</dt><dd>{data.outstandingLimit.toFixed(1)}</dd></div>
        <div><dt>Reference Number:</dt><dd>{data.referenceNumber}</dd></div>
        <div><dt>Date / Time:</dt><dd>{formatDateTime(data.submittedAt)}</dd></div>
        <div><dt>Telephone:</dt><dd>{data.telephone}</dd></div>
        <div><dt>User ID:</dt><dd>{data.userId}</dd></div>
      </dl>

      {data.warnings.length > 0 && (
        <section className="warnings">
          <h3 className="warnings__title">Warning(s)</h3>
          <ul>
            {data.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
