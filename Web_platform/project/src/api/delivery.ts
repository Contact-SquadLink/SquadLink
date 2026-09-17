import { apiRequest } from './client';
import type { Delivery, ApiSingleResponse } from '@/types';

export const deliveryApi = {
  verifyPickup: (deliveryId: string) =>
    apiRequest<ApiSingleResponse<Delivery>>(
      `/api/v1/deliveries/${deliveryId}/pickup/verify`,
      { method: 'POST' }
    ),

  markInTransit: (deliveryId: string) =>
    apiRequest<ApiSingleResponse<Delivery>>(
      `/api/v1/deliveries/${deliveryId}/in-transit`,
      { method: 'POST' }
    ),

  markArrived: (deliveryId: string) =>
    apiRequest<ApiSingleResponse<Delivery>>(
      `/api/v1/deliveries/${deliveryId}/arrived`,
      { method: 'POST' }
    ),

  submitOtp: (deliveryId: string, otp: string) =>
    apiRequest<ApiSingleResponse<Delivery>>(
      `/api/v1/deliveries/${deliveryId}/otp`,
      { method: 'POST', body: { otp } }
    ),

  confirmDelivery: (deliveryId: string) =>
    apiRequest<ApiSingleResponse<Delivery>>(
      `/api/v1/deliveries/${deliveryId}/confirm`,
      { method: 'POST' }
    ),
};
