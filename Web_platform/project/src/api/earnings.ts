import { apiRequest } from './client';

export interface EarningsSummary {
  recipientType: 'RIDER' | 'BUSINESS';
  totalEarned: number;
  totalWithdrawn: number;
  availableBalance: number;
  earnings: Array<{ id: string; amount: number | string; description: string; deliveryId: string; orderId: string; createdAt: string }>;
  withdrawals: Array<{ id: string; amount: number | string; status: string; payoutDetails: Record<string, string>; reviewReason: string | null; createdAt: string }>;
}

export const earningsApi = {
  getMine: () => apiRequest<{ success: boolean; data: EarningsSummary }>('/api/v1/earnings/me'),
  requestWithdrawal: (amount: number, payoutDetails: Record<string, string>) => apiRequest('/api/v1/earnings/me/withdrawals', { method: 'POST', body: { amount, payoutDetails } }),
};