import { apiRequest } from './client';
import type { Notification, ApiListResponse } from '@/types';

export const notificationsApi = {
  list: () =>
    apiRequest<ApiListResponse<Notification>>('/api/v1/notifications'),

  markRead: (id: string) =>
    apiRequest<void>(`/api/v1/notifications/${id}/read`, { method: 'POST' }),
};
