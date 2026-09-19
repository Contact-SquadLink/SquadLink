import { apiRequest } from './client';
import type {
  CheckoutPreview,
  Order,
  OrderCreationResult,
  ApiSingleResponse,
  ApiListResponse,
} from '@/types';

export interface CheckoutPreviewPayload {
  items: { productId: string; quantity: number }[];
}

export interface CreateOrderPayload {
  items: { productId: string; quantity: number }[];
}

export const checkoutApi = {
  preview: (payload: CheckoutPreviewPayload) =>
    apiRequest<ApiSingleResponse<CheckoutPreview>>('/api/v1/checkout/preview', {
      method: 'POST',
      body: payload,
    }),
};

export const ordersApi = {
  create: (payload: CreateOrderPayload, idempotencyKey: string) =>
    apiRequest<ApiSingleResponse<OrderCreationResult>>('/api/v1/orders', {
      method: 'POST',
      body: payload,
      headers: { 'Idempotency-Key': idempotencyKey },
    }),

  list: () => apiRequest<ApiListResponse<Order>>('/api/v1/orders'),

  getById: (id: string) =>
    apiRequest<ApiSingleResponse<Order>>(`/api/v1/orders/${id}`),
};
