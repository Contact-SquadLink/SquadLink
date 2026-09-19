import { apiRequest } from './client';
import type {
  Order,
  Business,
  BusinessOrderSummary,
  ApiListResponse,
  ApiSingleResponse,
  ApiResponseEnvelope,
} from '@/types';

export interface CreateBusinessPayload {
  name: string;
  description?: string;
  phoneNumber?: string;
  email?: string;
  addressLine: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  minimumOrderAmount?: number;
}

export const businessApi = {
  listOrders: () =>
    apiRequest<ApiListResponse<BusinessOrderSummary>>('/api/v1/business/orders'),

  getOrder: (orderId: string) =>
    apiRequest<ApiSingleResponse<Order>>(`/api/v1/orders/${orderId}`),

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

  createBusiness: (payload: CreateBusinessPayload) =>
    apiRequest<ApiResponseEnvelope<Business>>('/api/v1/businesses/', {
      method: 'POST',
      body: {
        name: payload.name.trim(),
        description: payload.description?.trim() || undefined,
        phoneNumber: payload.phoneNumber?.trim() || undefined,
        email: payload.email?.trim() || undefined,
        addressLine: payload.addressLine.trim(),
        city: payload.city.trim(),
        state: payload.state.trim(),
        latitude: payload.latitude,
        longitude: payload.longitude,
        minimumOrderAmount: payload.minimumOrderAmount ?? 0,
      },
    }),

  getMyBusiness: () =>
    apiRequest<ApiResponseEnvelope<Business>>('/api/v1/businesses/me'),
};

