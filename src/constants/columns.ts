import type { OrderSummary } from '../types/order';

export interface ColumnDef {
  key: keyof OrderSummary | 'actions';
  label: string;
  /** Shown on the mobile layout? The assignment requires exactly
   *  Account, Operation, Symbol and Status. */
  mobile: boolean;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
}

/**
 * SINGLE SOURCE OF TRUTH for the table shape.
 *
 * The alternative — two hand-written JSX blocks for desktop and mobile —
 * drifts the moment someone adds a column. Here, adding a column is one
 * entry and both layouts stay correct by construction.
 */
export const ORDER_COLUMNS: ReadonlyArray<ColumnDef> = [
  { key: 'account', label: 'Account', mobile: true, sortable: true },
  { key: 'operation', label: 'Operation', mobile: true, sortable: true },
  { key: 'symbol', label: 'Symbol', mobile: true, sortable: true },
  { key: 'description', label: 'Description', mobile: false, sortable: true },
  { key: 'quantity', label: 'Qty.', mobile: false, align: 'right', sortable: true },
  { key: 'filledQuantity', label: 'Filled Qty', mobile: false, align: 'right' },
  { key: 'price', label: 'Price', mobile: false, align: 'right' },
  { key: 'status', label: 'Status', mobile: true },
  { key: 'orderDateTime', label: 'Date', mobile: false, sortable: true },
  { key: 'expirationDateTime', label: 'Expiration', mobile: false },
  { key: 'referenceNo', label: 'No. Ref.', mobile: false },
  { key: 'externalRef', label: 'Ext. Ref.', mobile: false },
  { key: 'actions', label: '', mobile: false, align: 'center' },
];

export function visibleColumns(isMobile: boolean): ReadonlyArray<ColumnDef> {
  return isMobile ? ORDER_COLUMNS.filter((c) => c.mobile) : ORDER_COLUMNS;
}
