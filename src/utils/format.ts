import { format, parseISO } from 'date-fns';
import type { Money, Operation } from '../types/order';

/** "2022-12-22T03:02:14Z" -> "2022/12/22 03:02:14" (matches the mockup) */
export function formatDateTime(iso: string): string {
  return format(parseISO(iso), 'yyyy/MM/dd HH:mm:ss');
}

/** Formatting money is a VIEW concern — this is the only place it happens. */
export function formatMoney({ amount, currency }: Money, withCurrency = false): string {
  const value = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return withCurrency ? `${value} ${currency}` : value;
}

export const formatQuantity = (n: number): string => new Intl.NumberFormat('en-US').format(n);

const OPERATION_LABELS: Record<Operation, string> = { BUY: 'Buy', SELL: 'Sell' };

/** Enums are UPPER_SNAKE on the wire and Title Case in the UI.
 *  Keeping the map here means the wire format never leaks into JSX. */
export const formatOperation = (op: Operation): string => OPERATION_LABELS[op];

export const formatSymbol = (symbol: string | null): string => symbol ?? 'NA';

/** yyyy-MM-dd for <input type="date"> and for the API. */
export const toDateInputValue = (d: Date): string => format(d, 'yyyy-MM-dd');
