import { apiRequest } from './client';
import type {
  AdminAccessRequest,
  ApiListResponse,
  ApiSingleResponse,
  BusinessVerificationHistoryRecord,
  BusinessVerificationRecord,
  VerificationStatus,
} from '@/types';

export interface RiderVerificationRecord {
  id: string;
  riderId: string;
  userId: string;
  email: string | null;
  phoneNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  vehicleType: string | null;
  vehicleRegistration: string | null;
  riderIsActive: boolean;
  status: VerificationStatus;
  verifiedBy: string | null;
  verificationNotes: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformAccount {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  adminApproved: boolean;
  suspendedAt: string | null;
  suspensionReason: string | null;
  deletedAt: string | null;
  deletionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export const adminApi = {
  getPlatformSummary: () => apiRequest<ApiSingleResponse<Record<string, number>>>('/api/v1/admin/platform/summary'),
  listAccounts: () => apiRequest<ApiListResponse<PlatformAccount>>('/api/v1/admin/platform/accounts'),
  suspendAccount: (userId: string, reason: string) => apiRequest<ApiSingleResponse<{ userId: string; status: string }>>(`/api/v1/admin/platform/accounts/${userId}/suspend`, { method: 'POST', body: { reason } }),
  unsuspendAccount: (userId: string, reason: string) => apiRequest<ApiSingleResponse<{ userId: string; status: string }>>(`/api/v1/admin/platform/accounts/${userId}/unsuspend`, { method: 'POST', body: { reason } }),
  deleteAccount: (userId: string, reason: string) => apiRequest<ApiSingleResponse<{ userId: string; status: string }>>(`/api/v1/admin/platform/accounts/${userId}`, { method: 'DELETE', body: { reason } }),
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

  listRiders: () =>
    apiRequest<ApiListResponse<RiderVerificationRecord>>('/api/v1/admin/rider-verifications'),

  reviewRider: (riderId: string, payload: { status: VerificationStatus; notes?: string | null }) =>
    apiRequest<ApiSingleResponse<RiderVerificationRecord>>(`/api/v1/admin/rider-verifications/${riderId}`, { method: 'PUT', body: payload }),
};
