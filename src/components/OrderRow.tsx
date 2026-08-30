import { useState } from 'react';
import type { ColumnDef } from '../constants/columns';
import type { OrderSummary } from '../types/order';
import { StatusBadge } from './StatusBadge';
import { OrderDetailPanel } from './OrderDetailPanel';
import {
  formatDateTime, formatMoney, formatOperation, formatQuantity, formatSymbol,
} from '../utils/format';

/**
 * One renderer per column key. This is what lets the SAME row component
 * serve both the 13-column desktop table and the 4-column mobile one —
 * the row never knows which layout it's in, it just maps over whatever
 * columns it was handed.
 */
function renderCell(order: OrderSummary, column: ColumnDef) {
  switch (column.key) {
    case 'account':            return <span className="cell-link">{order.account}</span>;
    case 'operation':          return formatOperation(order.operation);
    case 'symbol':             return formatSymbol(order.symbol);
    case 'description':        return order.description;
    case 'quantity':           return formatQuantity(order.quantity);
    case 'filledQuantity':     return formatQuantity(order.filledQuantity);
    case 'price':              return formatMoney(order.price);
    case 'status':             return <StatusBadge status={order.status} />;
    case 'orderDateTime':      return formatDateTime(order.orderDateTime);
    case 'expirationDateTime': return formatDateTime(order.expirationDateTime);
    case 'referenceNo':        return order.referenceNo;
    case 'externalRef':        return order.externalRef;
    case 'actions':            return <button type="button" className="btn btn--icon" aria-label="More actions">⋯</button>;
    default:                   return null;
  }
}

interface Props {
  order: OrderSummary;
  columns: ReadonlyArray<ColumnDef>;
}

export function OrderRow({ order, columns }: Props) {
  const [expanded, setExpanded] = useState(false);
  const detailId = `detail-${order.id}`;

  return (
    <tbody className={expanded ? 'row-group row-group--expanded' : 'row-group'}>
      <tr className="order-row">
        <td className="order-row__toggle">
          {/*
            aria-expanded + aria-controls is what makes this usable with a
            screen reader. A bare clickable chevron <div> announces nothing.
          */}
          <button
            type="button"
            className="btn btn--icon"
            aria-expanded={expanded}
            aria-controls={detailId}
            aria-label={expanded ? `Collapse order ${order.account}` : `Expand order ${order.account}`}
            onClick={() => setExpanded((v) => !v)}
          >
            <span className={expanded ? 'chevron chevron--down' : 'chevron'}>›</span>
          </button>
        </td>

        {columns.map((column) => (
          <td key={String(column.key)} data-align={column.align ?? 'left'}>
            {renderCell(order, column)}
          </td>
        ))}
      </tr>

      {/*
        Mounted only when expanded — that's what makes the detail fetch lazy.
        Rendering it hidden with CSS would fire 123 requests on page load.
      */}
      {expanded && (
        <tr id={detailId} className="detail-row">
          <td colSpan={columns.length + 1}>
            <OrderDetailPanel orderId={order.id} />
          </td>
        </tr>
      )}
    </tbody>
  );
}
