import type { Period, OrderStatus } from '../types/order';

/**
 * MVP-1 fixes Period to 'Transmission' and Status to 'Waiting'.
 * We still render real <select> elements driven by these arrays, so
 * MVP-2 means appending an entry here — no component changes.
 */
export const PERIOD_OPTIONS: ReadonlyArray<{ value: Period; label: string }> = [
  { value: 'TRANSMISSION', label: 'Transmission' },
];

export const STATUS_OPTIONS: ReadonlyArray<{ value: OrderStatus; label: string }> = [
  { value: 'WAITING', label: 'Waiting' },
];

export const DEFAULT_PAGE_SIZE = 20;
