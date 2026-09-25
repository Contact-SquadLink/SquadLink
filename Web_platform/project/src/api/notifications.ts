import { apiRequest } from './client';
import type { Notification, ApiListResponse } from '@/types';

export const notificationsApi = {
  list: () =>
    apiRequest<ApiListResponse<Notification>>('/api/v1/notifications'),

  markRead: (id: string) =>
    apiRequest<void>(`/api/v1/notifications/${id}/read`, { method: 'POST' }),

  pushConfig: () =>
    apiRequest<{ success: boolean; data: { available: boolean; publicKey: string | null } }>('/api/v1/notifications/push/config'),

  pushSubscription: () =>
    apiRequest<{ success: boolean; data: { enabled: boolean } }>('/api/v1/notifications/push/subscription'),

  subscribeToPush: (subscription: PushSubscriptionJSON) =>
    apiRequest<{ success: boolean; data: { enabled: boolean } }>('/api/v1/notifications/push/subscription', {
      method: 'POST',
      body: subscription,
    }),

  unsubscribeFromPush: (endpoint: string) =>
    apiRequest<{ success: boolean; data: { enabled: boolean } }>('/api/v1/notifications/push/subscription', {
      method: 'DELETE',
      body: { endpoint },
    }),
};
