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
  deliveryAddressLine: string;
  deliveryCity: string;
  deliveryState: string;
  latitude: number;
  longitude: number;
  deliveryContactPhone: string;
}

export interface CreateOrderPayload {
  items: { productId: string; quantity: number }[];
  deliveryAddressLine: string;
  deliveryCity: string;
  deliveryState: string;
  latitude: number;
  longitude: number;
  deliveryContactPhone: string;
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

  completeSandboxPayment: (paymentId: string, paymentAttemptId: string, cardNumber: string) =>
    apiRequest<ApiSingleResponse<{ paymentId: string; status: string; orderId?: string; deliveryId?: string }>>(
      `/api/v1/payments/${paymentId}/sandbox-complete`,
      {
        method: 'POST',
        body: { paymentAttemptId, cardNumber },
      }
    ),

  list: () => apiRequest<ApiListResponse<Order>>('/api/v1/orders'),

  getById: (id: string) =>
    apiRequest<ApiSingleResponse<Order>>(`/api/v1/orders/${id}`),
};
