/** Grey placeholder rows. Sized like real rows so nothing shifts on load. */
export function TableSkeleton({ columns, rows = 8 }: { columns: number; rows?: number }) {
  return (
    <div className="table-wrap" aria-busy="true" aria-label="Loading orders">
      <table className="order-table">
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r} className="order-row">
              {Array.from({ length: columns }, (__, c) => (
                <td key={c}><span className="skeleton" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
