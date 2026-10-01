import { apiRequest } from './client';
import type {
  AdminAccessRequest,
  AdminUserItem,
  ApiListResponse,
  ApiSingleResponse,
  BusinessVerificationHistoryRecord,
  BusinessVerificationRecord,
  CustomerDetail,
  CustomerSummary,
  DeliveryMonitorItem,
  LiveOperationItem,
  OperationalIssueItem,
  PlatformSummaryData,
  SystemHealthData,
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
  // 1. Dashboard summary with time filtering & role-governed admin masking
  getPlatformSummary: (timeFilter?: string) => {
    const qs = timeFilter && timeFilter !== 'all' ? `?timeFilter=${timeFilter}` : '';
    return apiRequest<ApiSingleResponse<PlatformSummaryData>>(`/api/v1/admin/platform/summary${qs}`);
  },

  // 2. Live Operations Attention Queue
  getLiveOperationsQueue: () =>
    apiRequest<ApiListResponse<LiveOperationItem>>('/api/v1/admin/platform/live-ops'),

  // 3. Customer Management
  listCustomers: (params?: { search?: string; status?: string; limit?: number; offset?: number }) => {
    const search = new URLSearchParams();
    if (params?.search) search.set('search', params.search);
    if (params?.status) search.set('status', params.status);
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.offset) search.set('offset', String(params.offset));
    const qs = search.toString();
    return apiRequest<ApiListResponse<CustomerSummary>>(`/api/v1/admin/platform/customers${qs ? `?${qs}` : ''}`);
  },

  getCustomerDetails: (customerId: string) =>
    apiRequest<ApiSingleResponse<CustomerDetail>>(`/api/v1/admin/platform/customers/${customerId}`),

  suspendCustomer: (customerId: string, reason: string) =>
    apiRequest<ApiSingleResponse<{ userId: string; status: string }>>(`/api/v1/admin/platform/customers/${customerId}/suspend`, {
      method: 'POST',
      body: { reason },
    }),

  unsuspendCustomer: (customerId: string, reason: string) =>
    apiRequest<ApiSingleResponse<{ userId: string; status: string }>>(`/api/v1/admin/platform/customers/${customerId}/unsuspend`, {
      method: 'POST',
      body: { reason },
    }),

  // 4. Deliveries Monitoring
  listDeliveries: (params?: { status?: string; limit?: number; offset?: number }) => {
    const search = new URLSearchParams();
    if (params?.status) search.set('status', params.status);
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.offset) search.set('offset', String(params.offset));
    const qs = search.toString();
    return apiRequest<ApiListResponse<DeliveryMonitorItem>>(`/api/v1/admin/platform/deliveries${qs ? `?${qs}` : ''}`);
  },

  // 5. Administrator Management (Super Admin Exclusive)
  listAdminUsers: () =>
    apiRequest<ApiListResponse<AdminUserItem>>('/api/v1/admin/platform/admin-users'),

  createAdminUser: (payload: { email: string; password: string; firstName: string; lastName: string; phoneNumber: string; permissions?: string[] }) =>
    apiRequest<ApiSingleResponse<{ id: string; email: string; status: string }>>('/api/v1/admin/platform/admin-users', {
      method: 'POST',
      body: payload,
    }),

  updateAdminPermissions: (adminId: string, permissions: string[]) =>
    apiRequest<ApiSingleResponse<{ targetUserId: string; permissions: string[] }>>(`/api/v1/admin/platform/admin-users/${adminId}/permissions`, {
      method: 'PUT',
      body: { permissions },
    }),

  toggleAdminStatus: (adminId: string, isActive: boolean, reason?: string) =>
    apiRequest<ApiSingleResponse<{ targetUserId: string; isActive: boolean }>>(`/api/v1/admin/platform/admin-users/${adminId}/status`, {
      method: 'POST',
      body: { isActive, reason },
    }),

  // 6. System Health
  getSystemHealth: () =>
    apiRequest<ApiSingleResponse<SystemHealthData>>('/api/v1/admin/platform/system-health'),

  // 7. Operational Issues & Support Queue
  listOperationalIssues: (params?: { status?: string; severity?: string; limit?: number; offset?: number }) => {
    const search = new URLSearchParams();
    if (params?.status) search.set('status', params.status);
    if (params?.severity) search.set('severity', params.severity);
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.offset) search.set('offset', String(params.offset));
    const qs = search.toString();
    return apiRequest<ApiListResponse<OperationalIssueItem>>(`/api/v1/admin/platform/issues${qs ? `?${qs}` : ''}`);
  },

  createOperationalIssue: (payload: { orderId?: string; issueType: string; severity?: string; title: string; description?: string }) =>
    apiRequest<ApiSingleResponse<{ id: string; status: string }>>('/api/v1/admin/platform/issues', {
      method: 'POST',
      body: payload,
    }),

  resolveOperationalIssue: (issueId: string, resolutionNotes: string) =>
    apiRequest<ApiSingleResponse<{ id: string; status: string }>>(`/api/v1/admin/platform/issues/${issueId}/resolve`, {
      method: 'POST',
      body: { resolutionNotes },
    }),

  // 8. Business Verification Queues
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

  // 9. Rider Verification Queues
  listRiders: () =>
    apiRequest<ApiListResponse<RiderVerificationRecord>>('/api/v1/admin/rider-verifications'),

  reviewRider: (riderId: string, payload: { status: VerificationStatus; notes?: string | null }) =>
    apiRequest<ApiSingleResponse<RiderVerificationRecord>>(`/api/v1/admin/rider-verifications/${riderId}`, { method: 'PUT', body: payload }),

  // 10. Access Requests
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

  // 11. Super Admin Control Center Methods
  getObservabilityDashboard: () =>
    apiRequest<ApiSingleResponse<import('@/types').ObservabilityDashboardData>>('/api/v1/admin/platform/observability'),

  listSuperAdminOrders: (params?: { stage?: string; limit?: number; offset?: number }) => {
    const search = new URLSearchParams();
    if (params?.stage) search.set('stage', params.stage);
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.offset) search.set('offset', String(params.offset));
    const qs = search.toString();
    return apiRequest<ApiListResponse<import('@/types').SuperAdminOrderSummary>>(`/api/v1/admin/platform/orders${qs ? `?${qs}` : ''}`);
  },

  inspectSuperAdminOrder: (orderId: string) =>
    apiRequest<ApiSingleResponse<{
      order: Record<string, unknown>;
      orderStatusHistory: Array<Record<string, unknown>>;
      deliveryStatusHistory: Array<Record<string, unknown>>;
      ledgerEntries: import('@/types').LedgerEntryItem[];
      auditLogs: import('@/types').AuditLogItem[];
    }>>(`/api/v1/admin/platform/orders/${orderId}`),

  forceTransitionOrder: (orderId: string, payload: { targetStage: string; reason: string }) =>
    apiRequest<ApiSingleResponse<{
      orderId: string;
      deliveryId: string;
      targetStage: string;
      previousOrderStatus: string;
      newOrderStatus: string;
      newDeliveryStatus: string;
      reason: string;
    }>>(`/api/v1/admin/platform/orders/${orderId}/force-transition`, {
      method: 'POST',
      body: payload,
    }),

  getPlatformLedger: (params?: { orderId?: string; accountName?: string; limit?: number; offset?: number }) => {
    const search = new URLSearchParams();
    if (params?.orderId) search.set('orderId', params.orderId);
    if (params?.accountName) search.set('accountName', params.accountName);
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.offset) search.set('offset', String(params.offset));
    const qs = search.toString();
    return apiRequest<ApiSingleResponse<import('@/types').LedgerSummary>>(`/api/v1/admin/platform/ledger${qs ? `?${qs}` : ''}`);
  },

  listAuditLogs: (params?: { entityType?: string; action?: string; actorUserId?: string; limit?: number; offset?: number }) => {
    const search = new URLSearchParams();
    if (params?.entityType) search.set('entityType', params.entityType);
    if (params?.action) search.set('action', params.action);
    if (params?.actorUserId) search.set('actorUserId', params.actorUserId);
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.offset) search.set('offset', String(params.offset));
    const qs = search.toString();
    return apiRequest<ApiListResponse<import('@/types').AuditLogItem>>(`/api/v1/admin/platform/audit-logs${qs ? `?${qs}` : ''}`);
  },

  getPlatformConfig: () =>
    apiRequest<ApiSingleResponse<Record<string, { value: Record<string, unknown>; description?: string; updatedAt?: string }>>>('/api/v1/admin/platform/config'),

  updatePlatformConfig: (payload: { key: string; value: Record<string, unknown>; reason?: string }) =>
    apiRequest<ApiSingleResponse<{ key: string; value: Record<string, unknown>; description?: string; updatedAt?: string }>>('/api/v1/admin/platform/config', {
      method: 'PUT',
      body: payload,
    }),

  listParticipants: (role?: string) => {
    const qs = role ? `?role=${role}` : '';
    return apiRequest<ApiListResponse<Record<string, unknown>>>(`/api/v1/admin/platform/participants${qs}`);
  },

  listAccounts: () => apiRequest<ApiListResponse<PlatformAccount>>('/api/v1/admin/platform/accounts'),
  suspendAccount: (userId: string, reason: string) => apiRequest<ApiSingleResponse<{ userId: string; status: string }>>(`/api/v1/admin/platform/accounts/${userId}/suspend`, { method: 'POST', body: { reason } }),
  unsuspendAccount: (userId: string, reason: string) => apiRequest<ApiSingleResponse<{ userId: string; status: string }>>(`/api/v1/admin/platform/accounts/${userId}/unsuspend`, { method: 'POST', body: { reason } }),
  deleteAccount: (userId: string, reason: string) => apiRequest<ApiSingleResponse<{ userId: string; status: string }>>(`/api/v1/admin/platform/accounts/${userId}`, { method: 'DELETE', body: { reason } }),
};
