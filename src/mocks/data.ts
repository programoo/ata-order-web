import { faker } from '@faker-js/faker';
import type { OrderSummary, OrderDetail, Operation } from '../types/order';

/**
 * IMPORTANT: seed the generator.
 * Without this, every page reload reshuffles the data, sort order changes
 * under you, and you can never tell a real bug from noise. A seeded
 * generator gives you a stable fixture you can reason about — and screenshot.
 */
faker.seed(20230101);

const DESCRIPTIONS = [
  'NATIONAL BANK OF CDA',
  'ROYAL BANK OF CANADA',
  'BANK OF MONTREAL',
  'TORONTO-DOMINION BANK',
  'CANADIAN NATIONAL RAIL',
];

const PRICES = [135, 526, 744, 369, 909, 660, 672];
const QUANTITIES = [5, 11, 32, 60, 90, 800, 1000];

/** Pads a number to the 8-digit account format seen in the mockup. */
const pad8 = (n: number) => String(n).padStart(8, '0');

function makeOrder(index: number): OrderSummary {
  const quantity = faker.helpers.arrayElement(QUANTITIES);
  // Most orders are unfilled ("Waiting"); a few show partial fills.
  const filledQuantity = faker.datatype.boolean({ probability: 0.2 })
    ? faker.number.int({ min: 1, max: Math.max(1, Math.floor(quantity / 2)) })
    : 0;

  const orderDate = faker.date.between({
    from: '2022-12-01T00:00:00Z',
    to: '2023-01-31T23:59:59Z',
  });
  // Expiration is same-day in the mockup; keep that relationship.
  const expiration = new Date(orderDate.getTime());

  return {
    id: `ord-${pad8(index)}`,
    account: index === 0 ? '10000000' : pad8(index),
    operation: faker.helpers.arrayElement<Operation>(['BUY', 'SELL']),
    symbol: null, // renders as "NA"
    description: faker.helpers.arrayElement(DESCRIPTIONS),
    quantity,
    filledQuantity,
    price: { amount: faker.helpers.arrayElement(PRICES), currency: 'USD' },
    status: 'WAITING',
    orderDateTime: orderDate.toISOString(),
    expirationDateTime: expiration.toISOString(),
    referenceNo: String(faker.number.int({ min: 10_000_000, max: 99_999_999 })),
    externalRef: `2-${faker.string.alphanumeric({ length: 7, casing: 'upper' })}-${index % 10}`,
  };
}

/** 123 orders, to match the "Search results : 123" label in the mockup. */
export const ORDERS: OrderSummary[] = Array.from({ length: 123 }, (_, i) => makeOrder(i));

const WARNING_POOL = [
  'To trade this security in this account, a currency conversion will be made at the current rate.',
  'A similar order has already been submitted.',
  'Your transaction will be processed the following business day.',
  'It is not possible to calculate the buying power of this order.',
  'A cancellation will not be possible during business hours on market orders. You can call a representative for more information.',
  'For the above-mentioned reason(s), your order will be processed by one of our representatives.',
];

/**
 * Detail is generated on demand and memoized, mirroring a real backend
 * where /orders/{id}/detail is a separate, heavier query.
 */
const detailCache = new Map<string, OrderDetail>();

export function getOrderDetail(orderId: string): OrderDetail | undefined {
  const order = ORDERS.find((o) => o.id === orderId);
  if (!order) return undefined;

  const cached = detailCache.get(orderId);
  if (cached) return cached;

  const exchangeRate = 1.3357;
  const detail: OrderDetail = {
    orderId,
    clientName: 'FIRST-NAME LAST-NAME',
    accountLabel: '10103ZA - US Margin',
    netAmount: {
      amount: Number((order.price.amount * (order.quantity / 100) * 0.853).toFixed(2)),
      currency: 'USD',
    },
    price: order.price,
    exchangeRate,
    outstandingLimit: 140.0,
    referenceNumber: '1234567890',
    submittedAt: order.orderDateTime,
    telephone: '000-000-0000',
    userId: '12344321',
    warnings: WARNING_POOL,
    availableActions: ['ACCEPT', 'REJECT'],
  };

  detailCache.set(orderId, detail);
  return detail;
}
