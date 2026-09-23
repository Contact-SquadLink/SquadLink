import { Bell, CheckCircle2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@/utils/format';
import { EmptyState } from '@/components/ui/States';
import type { Notification } from '@/types';
import { notificationsApi } from '@/api/notifications';

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['customer-notifications'],
    queryFn: notificationsApi.list,
  });
  const notifications = (data?.data ?? []) as Notification[];

  const markRead = async (notification: Notification) => {
    if (notification.read) return;
    await notificationsApi.markRead(notification.id);
    await queryClient.invalidateQueries({ queryKey: ['customer-notifications'] });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Notifications</h1>
      <p className="text-sm text-gray-500 mb-6">Stay updated on your orders and deliveries.</p>

      {isLoading ? (
        <p className="text-sm text-gray-600">Loading notifications...</p>
      ) : error ? (
        <p className="text-sm text-red-600">We could not load your notifications right now.</p>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-7 w-7" />}
          title="No notifications"
          description="Order updates and delivery alerts will appear here."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => void markRead(n)}
              role={n.read ? undefined : 'button'}
              tabIndex={n.read ? undefined : 0}
              onKeyDown={(event) => {
                if (!n.read && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  void markRead(n);
                }
              }}
              className={`rounded-2xl border bg-white p-5 shadow-sm transition-colors ${
                n.read ? 'border-gray-100' : 'border-primary-200 bg-primary-50/30 cursor-pointer'
              }`}
            >
              <div className="flex items-start gap-3">
                {!n.read && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100">
                    <Bell className="h-4 w-4 text-primary-600" />
                  </div>
                )}
                {n.read && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                    <CheckCircle2 className="h-4 w-4 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{n.message}</p>
                  <p className="mt-2 text-xs text-gray-400">{formatDate(n.createdAt)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
