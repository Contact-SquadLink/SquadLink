import { apiRequest } from './client';
import type { ApiSingleResponse } from '@/types';

export interface InitializePaymentPayload {
  orderId: string;
  gateway?: 'PAYSTACK' | 'FLUTTERWAVE';
  callbackUrl?: string;
}

export interface PaymentInitializationData {
  gateway: 'PAYSTACK' | 'FLUTTERWAVE';
  checkoutUrl: string;
  reference: string;
  paymentId: string;
  paymentAttemptId: string;
  amount: number;
  currency: string;
}

export interface PaymentVerificationData {
  orderId: string;
  paymentId: string;
  status: string;
  orderStatus: string;
  amount: number;
  provider: string | null;
}

export const paymentApi = {
  initialize: (payload: InitializePaymentPayload) =>
    apiRequest<ApiSingleResponse<PaymentInitializationData>>('/api/v1/payments/initialize', {
      method: 'POST',
      body: payload,
    }),

  verify: (reference: string) =>
    apiRequest<ApiSingleResponse<PaymentVerificationData>>(`/api/v1/payments/verify/${reference}`),
};
