import { apiRequest } from './client';

export interface EarningsSummary {
  recipientType: 'RIDER' | 'BUSINESS' | 'CUSTOMER';
  totalEarned: number;
  totalWithdrawn: number;
  availableBalance: number;
  earnings: Array<{ id: string; amount: number | string; description: string; deliveryId: string; orderId: string; createdAt: string }>;
  withdrawals: Array<{ id: string; amount: number | string; status: string; payoutDetails: Record<string, string>; reviewReason: string | null; createdAt: string }>;
}

export interface AdminWithdrawalRequest {
  id: string;
  userId: string;
  email: string;
  username?: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  amount: number | string;
  currency: string;
  status: string;
  payoutDetails: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    [key: string]: any;
  };
  reviewReason: string | null;
  createdAt: string;
}

export const earningsApi = {
  getMine: () => apiRequest<{ success: boolean; data: EarningsSummary }>('/api/v1/earnings/me'),
  requestWithdrawal: (amount: number, payoutDetails: Record<string, string>) =>
    apiRequest('/api/v1/earnings/me/withdrawals', { method: 'POST', body: { amount, payoutDetails } }),
  listWithdrawals: () =>
    apiRequest<{ success: boolean; data: AdminWithdrawalRequest[] }>('/api/v1/earnings/withdrawals'),
  reviewWithdrawal: (withdrawalId: string, status: 'APPROVED' | 'REJECTED' | 'PAID', reason?: string) =>
    apiRequest(`/api/v1/earnings/withdrawals/${withdrawalId}`, {
      method: 'PUT',
      body: { status, reason },
    }),
};