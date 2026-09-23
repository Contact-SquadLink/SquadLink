import { apiRequest } from './client';
import type { Delivery, ApiListResponse, ApiSingleResponse } from '@/types';

export const riderApi = {
  listDeliveries: () =>
    apiRequest<ApiListResponse<Delivery>>('/api/v1/rider/deliveries'),

  getDelivery: (deliveryId: string) =>
    apiRequest<ApiSingleResponse<Delivery>>(`/api/v1/rider/deliveries/${deliveryId}`),

  setAvailable: (available: boolean) =>
    apiRequest<ApiSingleResponse<{ available: boolean }>>(
      '/api/v1/rider/availability',
      { method: 'POST', body: { available } }
    ),

  verifyPickup: (deliveryId: string, credential: string) =>
    apiRequest<ApiSingleResponse<Delivery>>(`/api/v1/deliveries/${deliveryId}/pickup/verify`, {
      method: 'POST',
      body: { credential },
    }),

  markInTransit: (deliveryId: string) =>
    apiRequest<ApiSingleResponse<Delivery>>(`/api/v1/deliveries/${deliveryId}/in-transit`, {
      method: 'POST',
    }),

  markArrived: (deliveryId: string) =>
    apiRequest<ApiSingleResponse<Delivery>>(`/api/v1/deliveries/${deliveryId}/arrived`, {
      method: 'POST',
    }),
};
