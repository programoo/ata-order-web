import { apiGet } from './client';
import type { OrderDetail, OrderSearchCriteria, OrderSummary, Page } from '../types/order';

export function fetchOrders(
  criteria: OrderSearchCriteria,
  page: number,
  size: number,
  sort: string,
): Promise<Page<OrderSummary>> {
  return apiGet<Page<OrderSummary>>('/orders', {
    period: criteria.period,
    status: criteria.status,
    from: criteria.from,
    to: criteria.to,
    page,
    size,
    sort,
  });
}

export function fetchOrderDetail(orderId: string): Promise<OrderDetail> {
  return apiGet<OrderDetail>(`/orders/${orderId}/detail`);
}
