import { apiRequest } from './client';
import type { Delivery, ApiListResponse, ApiSingleResponse } from '@/types';

export const riderApi = {
  register: (payload: { vehicleType: 'MOTORCYCLE' | 'KEKE'; vehicleRegistration: string; phoneNumber?: string; firstName?: string; lastName?: string }) =>
    apiRequest<ApiSingleResponse<{ role: string; verificationStatus: 'PENDING'; riderId: string | null }>>('/api/v1/rider/register', { method: 'POST', body: payload }),

  getProfile: () =>
    apiRequest<ApiSingleResponse<{ riderId: string; active: boolean; available: boolean; verificationStatus?: string; vehicleType: string | null; vehicleRegistration: string | null }>>('/api/v1/rider/me'),

  listDeliveries: () =>
    apiRequest<ApiListResponse<Delivery>>('/api/v1/rider/deliveries'),

  getDelivery: (deliveryId: string) =>
    apiRequest<ApiSingleResponse<Delivery>>(`/api/v1/rider/deliveries/${deliveryId}`),

  acceptAssignment: (deliveryId: string) =>
    apiRequest<ApiSingleResponse<Delivery>>(`/api/v1/rider/deliveries/${deliveryId}/accept`, { method: 'POST' }),

  rejectAssignment: (deliveryId: string, reason?: string) =>
    apiRequest<ApiSingleResponse<Delivery>>(`/api/v1/rider/deliveries/${deliveryId}/reject`, { method: 'POST', body: { reason } }),

  setAvailable: (available: boolean) =>
    apiRequest<ApiSingleResponse<{ available: boolean }>>(
      '/api/v1/rider/availability',
      { method: 'POST', body: { available } }
    ),

  setLocation: (latitude: number, longitude: number) =>
    apiRequest<ApiSingleResponse<{ latitude: number; longitude: number }>>('/api/v1/rider/location', { method: 'POST', body: { latitude, longitude } }),

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

  confirmDelivery: (deliveryId: string, otp: string) =>
    apiRequest<ApiSingleResponse<Delivery>>(`/api/v1/deliveries/${deliveryId}/confirm`, {
      method: 'POST',
      body: { otp },
    }),
};
