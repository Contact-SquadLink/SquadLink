import { Bell, BellRing, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDate } from '@/utils/format';
import { EmptyState } from '@/components/ui/States';
import type { Notification } from '@/types';
import { notificationsApi } from '@/api/notifications';
import { ApiRequestError } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';

function decodeApplicationServerKey(value: string): ArrayBuffer {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0)).buffer as ArrayBuffer;
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [browserSubscribed, setBrowserSubscribed] = useState(false);
  const handledPushNotification = useRef<string | null>(null);
  const pushConfigQuery = useQuery({ queryKey: ['push-config'], queryFn: notificationsApi.pushConfig });
  const pushStatusQuery = useQuery({ queryKey: ['push-subscription'], queryFn: notificationsApi.pushSubscription });
  const { data, isLoading, error } = useQuery({
    queryKey: ['customer-notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: 15000,
  });
  const notifications = (data?.data ?? []) as Notification[];

  const pushMutation = useMutation({
    mutationFn: async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        throw new Error('This browser does not support web push notifications.');
      }

      if (browserSubscribed) {
        const registration = await navigator.serviceWorker.getRegistration('/');
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await notificationsApi.unsubscribeFromPush(subscription.endpoint);
          await subscription.unsubscribe();
        }
        return false;
      }

      const publicKey = pushConfigQuery.data?.data.publicKey;
      if (!pushConfigQuery.data?.data.available || !publicKey) {
        throw new Error('Push notifications are not configured for this service yet.');
      }
      if (Notification.permission === 'denied') {
        throw new Error('Notifications are blocked in browser settings. Allow notifications for this site, then try again.');
      }
      const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Browser notification permission was not granted.');

      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.getSubscription()
        ?? await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationServerKey(publicKey),
        });
      await notificationsApi.subscribeToPush(subscription.toJSON());
      return true;
    },
    onSuccess: (enabled) => {
      setBrowserSubscribed(enabled);
      setPushError(null);
      void queryClient.invalidateQueries({ queryKey: ['push-subscription'] });
    },
    onError: (caughtError) => setPushError(caughtError instanceof Error ? caughtError.message : 'Unable to update push notification settings.'),
  });

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.getRegistration('/').then(async (registration) => {
      const subscription = await registration?.pushManager.getSubscription();
      setBrowserSubscribed(Boolean(subscription));
    }).catch(() => setBrowserSubscribed(false));
  }, []);

  const openNotification = useCallback(async (notification: Notification) => {
    setActionError(null);
    if (!notification.read) {
      try {
        await notificationsApi.markRead(notification.id);
        await queryClient.invalidateQueries({ queryKey: ['customer-notifications'] });
      } catch {
        setActionError('We could not update this notification as read. You can still open its destination.');
      }
    }
    if (notification.orderId) {
      if (user?.role === 'RIDER' && notification.deliveryId) navigate(`/rider/deliveries/${notification.deliveryId}`);
      else if (user?.role === 'BUSINESS_USER') navigate(`/business/orders/${notification.orderId}`);
      else if (user?.role === 'CUSTOMER') navigate(`/orders/${notification.orderId}`);
      else navigate(user?.role === 'RIDER' ? '/rider' : '/admin');
      return;
    }
    if (notification.type.startsWith('BUSINESS_APPLICATION_')) navigate(user?.role === 'CUSTOMER' ? '/business/register' : '/business');
    else if (notification.type.startsWith('RIDER_APPLICATION_')) navigate(user?.role === 'CUSTOMER' ? '/rider/register' : '/rider');
    else navigate(user?.role === 'BUSINESS_USER' ? '/business' : user?.role === 'RIDER' ? '/rider' : user?.role === 'ADMIN' ? '/admin' : '/dashboard');
  }, [navigate, queryClient, user?.role]);

  useEffect(() => {
    const notificationId = new URLSearchParams(location.search).get('open');
    if (!notificationId || isLoading || handledPushNotification.current === notificationId) return;
    const notification = (data?.data ?? []).find((item) => item.id === notificationId);
    if (!notification) return;
    handledPushNotification.current = notificationId;
    navigate('/notifications', { replace: true });
    void openNotification(notification);
  }, [data, isLoading, location.search, navigate, openNotification]);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Notifications</h1>
      <p className="text-sm text-gray-500 mb-6">Stay updated on your orders and deliveries.</p>
      {actionError && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}

      <section className="mb-6 flex flex-wrap items-center justify-between gap-4 border-y border-gray-200 py-4">
        <div className="flex items-start gap-3">
          <BellRing className="mt-0.5 h-5 w-5 text-primary-700" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Push notifications</h2>
            <p className="mt-1 text-sm text-gray-600">Get account activity on this device, even when SQUADLINK is not open.</p>
            {pushConfigQuery.error instanceof ApiRequestError && pushConfigQuery.error.statusCode === 404 && <p role="alert" className="mt-1 text-xs text-red-700">The deployed backend does not have the push setup endpoint yet. Deploy the backend push-notification update; the frontend cannot enable push until then.</p>}
            {pushConfigQuery.error && !(pushConfigQuery.error instanceof ApiRequestError && pushConfigQuery.error.statusCode === 404) && <p role="alert" className="mt-1 text-xs text-red-700">Push setup could not be reached. Check your connection and backend deployment.</p>}
            {!pushConfigQuery.data?.data.available && !pushConfigQuery.error && !pushConfigQuery.isLoading && <p className="mt-1 text-xs text-gray-500">Push delivery is not configured on the backend yet. In-app notifications remain available.</p>}
            {pushStatusQuery.data?.data.enabled && !browserSubscribed && <p className="mt-1 text-xs text-gray-500">Push is enabled on another device.</p>}
            {pushError && <p role="alert" className="mt-1 text-xs text-red-700">{pushError}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => pushMutation.mutate()}
          disabled={pushMutation.isPending || pushConfigQuery.isLoading || (!browserSubscribed && !pushConfigQuery.data?.data.available)}
          aria-pressed={browserSubscribed}
          className={`inline-flex h-10 min-w-36 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${browserSubscribed ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-primary-700 text-white hover:bg-primary-800'}`}
        >
          {pushMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
          {browserSubscribed ? 'Disable on this device' : 'Enable push'}
        </button>
      </section>

      {isLoading ? (
        <p className="text-sm text-gray-600">Loading notifications...</p>
      ) : error && !(error instanceof ApiRequestError && error.statusCode === 404) ? (
        <p className="text-sm text-red-600">We could not load your notifications right now. Please try again later.</p>
      ) : error ? (
        <EmptyState
          icon={<Bell className="h-7 w-7" />}
          title="No notifications yet"
          description="Your order and delivery updates will appear here when they are available."
        />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-7 w-7" />}
          title="No notifications"
          description="Order updates and delivery alerts will appear here."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => void openNotification(n)}
              className={`w-full rounded-lg border bg-white p-5 text-left transition-colors ${
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
                  <p className="mt-2 text-xs font-semibold text-primary-700">Open related {notificationTargetLabel(n, user?.role)}</p>
                  <p className="mt-2 text-xs text-gray-400">{formatDate(n.createdAt)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function notificationTargetLabel(notification: Notification, role?: string): string {
  if (notification.orderId) {
    if (role === 'RIDER') return notification.deliveryId ? 'delivery' : 'order';
    if (role === 'BUSINESS_USER') return 'business order';
    return 'order';
  }
  if (notification.type.startsWith('BUSINESS_APPLICATION_')) return 'business workspace';
  if (notification.type.startsWith('RIDER_APPLICATION_')) return 'rider workspace';
  return 'dashboard';
}
