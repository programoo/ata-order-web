/**
 * Domain model for the Order Search feature.
 *
 * Design rules (defend these in a code review):
 *  1. Dates cross the wire as ISO-8601 strings, never pre-formatted.
 *     Formatting is a VIEW concern; the backend has no idea about the
 *     user's locale or timezone.
 *  2. Money is { amount, currency }, never a formatted string like "$135.00".
 *     You cannot do math on a string.
 *  3. Enums are string unions, not booleans/ints, so MVP-2 is purely additive.
 */

/** Fixed to a single value for MVP-1, but modeled as a union so adding
 *  'SETTLEMENT' later touches only this file + the constants list. */
export type Period = 'TRANSMISSION';

export type OrderStatus = 'WAITING';

export type Operation = 'BUY' | 'SELL';

export interface Money {
  amount: number;
  /** ISO-4217, e.g. "USD" */
  currency: string;
}

/** One row in the results table. Deliberately small — the list endpoint
 *  may return hundreds of these, so anything only needed on expand
 *  lives in OrderDetail instead. */
export interface OrderSummary {
  id: string;
  account: string;
  operation: Operation;
  /** null when the instrument has no ticker; the UI renders "NA" */
  symbol: string | null;
  description: string;
  quantity: number;
  filledQuantity: number;
  price: Money;
  status: OrderStatus;
  orderDateTime: string;      // ISO-8601
  expirationDateTime: string; // ISO-8601
  referenceNo: string;
  externalRef: string;
}

/** The expanded panel. Fetched lazily, per row, only when the user expands. */
export interface OrderDetail {
  orderId: string;
  clientName: string;
  /** e.g. "10103ZA - US Margin" */
  accountLabel: string;
  netAmount: Money;
  price: Money;
  exchangeRate: number;
  /** "O/S Limit" — outstanding limit */
  outstandingLimit: number;
  referenceNumber: string;
  submittedAt: string; // ISO-8601
  telephone: string;
  userId: string;
  warnings: string[];
  /** Server decides which buttons are legal. Never hardcode this in the UI —
   *  button visibility is business logic and belongs on the backend. */
  availableActions: OrderAction[];
}

export type OrderAction = 'ACCEPT' | 'REJECT';

/** The committed search form values. */
export interface OrderSearchCriteria {
  period: Period;
  status: OrderStatus;
  /** yyyy-MM-dd — a calendar day has no timezone, so no ISO instant here */
  from: string;
  to: string;
}

/** Mirrors Spring Data's Page<T> JSON shape, so swapping the mock for the
 *  real Spring Boot service requires zero client changes. */
export interface Page<T> {
  content: T[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}
