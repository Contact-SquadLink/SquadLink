import { apiRequest } from './client';
import type { User, ApiResponseEnvelope, Role } from '@/types';

export interface RegisterPayload {
  email?: string;
  phoneNumber?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  termsAccepted?: boolean;
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
  username: string | null;
  avatarUrl: string | null;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  profileUpdatedAt: string | null;
  role: Role;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string | null;
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
        username: payload.username?.trim() || undefined,
        termsAccepted: Boolean(payload.termsAccepted)
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

  updateProfile: (payload: UpdateProfilePayload) =>
    apiRequest<ApiResponseEnvelope<User>>('/api/v1/auth/me/profile', {
      method: 'PATCH',
      body: payload,
    }),

  requestCode: (type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET', identifier?: string) =>
    apiRequest<ApiResponseEnvelope<{ success: boolean; message: string; expiresInMinutes: number; otpCode?: string }>>(
      '/api/v1/auth/verify/request-code',
      {
        method: 'POST',
        body: { type, identifier },
      }
    ),

  confirmVerification: (type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION', code: string) =>
    apiRequest<ApiResponseEnvelope<{ success: boolean; message: string; user?: User }>>(
      '/api/v1/auth/verify/confirm',
      {
        method: 'POST',
        body: { type, code },
      }
    ),

  forgotPassword: (identifier: string) =>
    apiRequest<ApiResponseEnvelope<{ success: boolean; message: string; expiresInMinutes: number; otpCode?: string }>>(
      '/api/v1/auth/password/forgot',
      {
        method: 'POST',
        body: { identifier },
        skipAuth: true,
      }
    ),

  resetPassword: (payload: { identifier: string; code: string; newPassword: string }) =>
    apiRequest<ApiResponseEnvelope<{ success: boolean; message: string }>>(
      '/api/v1/auth/password/reset',
      {
        method: 'POST',
        body: payload,
        skipAuth: true,
      }
    ),
};
