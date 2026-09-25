import { apiRequest } from './client';
import type { ApiSingleResponse } from '@/types';

export interface ContactMessagePayload {
  name: string;
  email: string;
  message: string;
}

export const contactApi = {
  submit: (payload: ContactMessagePayload) =>
    apiRequest<ApiSingleResponse<{ id: string; createdAt: string }>>('/api/v1/contact', {
      method: 'POST',
      body: payload,
      skipAuth: true,
    }),
};