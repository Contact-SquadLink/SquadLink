import { apiRequest } from './client';
import type {
  Business,
  ApiListResponse,
  ApiSingleResponse,
} from '@/types';

export const adminApi = {
  listBusinesses: () =>
    apiRequest<ApiListResponse<Business>>('/api/v1/admin/businesses'),

  getBusiness: (businessId: string) =>
    apiRequest<ApiSingleResponse<Business>>(`/api/v1/admin/businesses/${businessId}`),

  // TODO: Backend dependency — verification action endpoint
  // (e.g., POST /api/v1/admin/businesses/:id/verify) may not exist yet.
  // Do not call this until the backend endpoint is confirmed.
  verifyBusiness: (businessId: string) =>
    apiRequest<ApiSingleResponse<Business>>(
      `/api/v1/admin/businesses/${businessId}/verify`,
      { method: 'POST' }
    ),
};
