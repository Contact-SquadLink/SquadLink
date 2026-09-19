import { Bell, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/utils/format';
import { EmptyState } from '@/components/ui/States';
import type { Notification } from '@/types';

const demoNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'ORDER',
    title: 'Order Confirmed',
    message: 'Your order #ORD-002 has been confirmed by the business and is being prepared.',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'notif-2',
    type: 'DELIVERY',
    title: 'Rider Assigned',
    message: 'A rider has been assigned to your order #ORD-005 and is on the way to pick it up.',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'notif-3',
    type: 'DELIVERY',
    title: 'Out for Delivery',
    message: 'Your order #ORD-005 is now out for delivery. The rider will arrive shortly.',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'notif-4',
    type: 'ORDER',
    title: 'Order Delivered',
    message: 'Your order #ORD-006 has been delivered successfully. Enjoy your purchase!',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'notif-5',
    type: 'PROMOTION',
    title: 'Weekend Special',
    message: 'Get 15% off all fresh produce this weekend. Use code FRESH15 at checkout.',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'notif-6',
    type: 'SYSTEM',
    title: 'Welcome to SQUADLINK',
    message: 'Your account has been created. Start browsing products from local businesses near you!',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
];

export function NotificationsPage() {
  const notifications = demoNotifications;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Notifications</h1>
      <p className="text-sm text-gray-500 mb-6">Stay updated on your orders and deliveries.</p>

      {notifications.length === 0 ? (
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
              className={`rounded-2xl border bg-white p-5 shadow-sm transition-colors ${
                n.read ? 'border-gray-100' : 'border-primary-200 bg-primary-50/30'
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
