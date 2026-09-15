import { apiRequest } from './client';
import type { User, ApiResponseEnvelope, Role } from '@/types';

export interface RegisterPayload {
  email?: string;
  phoneNumber?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface LoginResponseData {
  user: User;
  accessToken: string;
}

export interface MeResponseData {
  id: string;
  userId: string;
  email: string | null;
  phoneNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  role: Role;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiRequest<ApiResponseEnvelope<User>>('/api/v1/auth/register', {
      method: 'POST',
      body: {
        email: payload.email?.trim() || undefined,
        phoneNumber: (payload.phoneNumber ?? payload.phone)?.trim() || undefined,
        password: payload.password,
        firstName: payload.firstName?.trim() || undefined,
        lastName: payload.lastName?.trim() || undefined,
      },
      skipAuth: true,
    }),

  login: (payload: LoginPayload) =>
    apiRequest<ApiResponseEnvelope<LoginResponseData>>('/api/v1/auth/login', {
      method: 'POST',
      body: payload,
      skipAuth: true,
    }),

  me: () =>
    apiRequest<ApiResponseEnvelope<MeResponseData>>('/api/v1/auth/me'),
};
