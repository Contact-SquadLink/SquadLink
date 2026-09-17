import { apiRequest } from './client';
import type { Order, ApiListResponse, ApiSingleResponse } from '@/types';

export const businessApi = {
  listOrders: () =>
    apiRequest<ApiListResponse<Order>>('/api/v1/business/orders'),

  acceptOrder: (orderId: string) =>
    apiRequest<ApiSingleResponse<Order>>(
      `/api/v1/business/orders/${orderId}/accept`,
      { method: 'POST' }
    ),

  markOrderReady: (orderId: string) =>
    apiRequest<ApiSingleResponse<Order>>(
      `/api/v1/business/orders/${orderId}/ready`,
      { method: 'POST' }
    ),
};
