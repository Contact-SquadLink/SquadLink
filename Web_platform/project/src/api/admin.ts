import { apiRequest } from './client';
import type {
  AdminAccessRequest,
  ApiListResponse,
  ApiSingleResponse,
  BusinessVerificationHistoryRecord,
  BusinessVerificationRecord,
  VerificationStatus,
} from '@/types';

export const adminApi = {
  listBusinesses: () =>
    apiRequest<ApiListResponse<BusinessVerificationRecord>>('/api/v1/admin/business-verifications'),

  getBusiness: (businessId: string) =>
    apiRequest<
      ApiSingleResponse<{
        verification: BusinessVerificationRecord;
        history: BusinessVerificationHistoryRecord[];
      }>
    >(`/api/v1/admin/business-verifications/${businessId}`),

  reviewBusiness: (businessId: string, payload: { status: VerificationStatus; notes?: string | null }) =>
    apiRequest<ApiSingleResponse<BusinessVerificationRecord>>(
      `/api/v1/admin/business-verifications/${businessId}`,
      {
        method: 'PUT',
        body: payload,
      }
    ),

  listAccessRequests: () =>
    apiRequest<ApiListResponse<AdminAccessRequest>>('/api/v1/admin/access-requests'),

  approveAccessRequest: (userId: string, payload?: { notes?: string | null }) =>
    apiRequest<ApiSingleResponse<{ id: string; status: 'APPROVED'; notes: string | null; reviewedByUserId: string; reviewedAt: string }>>(
      `/api/v1/admin/access-requests/${userId}/approve`,
      {
        method: 'POST',
        body: payload ?? {},
      }
    ),

  rejectAccessRequest: (userId: string, payload?: { notes?: string | null }) =>
    apiRequest<ApiSingleResponse<{ id: string; status: 'REJECTED'; notes: string | null; reviewedByUserId: string; reviewedAt: string }>>(
      `/api/v1/admin/access-requests/${userId}/reject`,
      {
        method: 'POST',
        body: payload ?? {},
      }
    ),
};
