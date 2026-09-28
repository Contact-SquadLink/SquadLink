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
  const handledPushNotification = useRef<string | null>(null);
  const pushConfigQuery = useQuery({ queryKey: ['push-config'], queryFn: notificationsApi.pushConfig, enabled: Boolean(user), retry: false });
  const pushStatusQuery = useQuery({ queryKey: ['push-subscription', user?.id], queryFn: notificationsApi.pushSubscription, enabled: Boolean(user), retry: false });
  const isAccountPushEnabled = Boolean(pushStatusQuery.data?.data.enabled);

  const { data, isLoading, error } = useQuery({
    queryKey: ['customer-notifications', user?.id],
    queryFn: notificationsApi.list,
    enabled: Boolean(user),
    retry: false,
    refetchInterval: (query) => query.state.error instanceof ApiRequestError
      && [401, 403, 404].includes(query.state.error.statusCode)
      ? false
      : 15000,
  });
  const notifications = (data?.data ?? []) as Notification[];

  const pushMutation = useMutation({
    mutationFn: async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        throw new Error('This browser does not support web push notifications.');
      }

      if (isAccountPushEnabled) {
        // Disable push notifications strictly for THIS account
        const registration = await navigator.serviceWorker.getRegistration('/');
        const subscription = await registration?.pushManager.getSubscription();
        await notificationsApi.unsubscribeFromPush(subscription?.endpoint || undefined);
        // Note: We deliberately do NOT call subscription.unsubscribe() here.
        // Doing so would kill push notifications for other accounts sharing this device.
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
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationServerKey(publicKey),
        });
      }
      await notificationsApi.subscribeToPush(subscription.toJSON());
      return true;
    },
    onSuccess: () => {
      setPushError(null);
      void queryClient.invalidateQueries({ queryKey: ['push-subscription', user?.id] });
    },
    onError: (caughtError) => setPushError(caughtError instanceof Error ? caughtError.message : 'Unable to update push notification settings.'),
  });

  const openNotification = useCallback(async (notification: Notification) => {
    setActionError(null);
    if (!notification.read) {
      try {
        await notificationsApi.markRead(notification.id);
        await queryClient.invalidateQueries({ queryKey: ['customer-notifications', user?.id] });
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
    else navigate(user?.role === 'BUSINESS_USER' ? '/business' : user?.role === 'RIDER' ? '/rider' : ['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '') ? '/admin' : '/dashboard');
  }, [navigate, queryClient, user?.id, user?.role]);

  useEffect(() => {
    const notificationId = new URLSearchParams(location.search).get('open');
    if (!notificationId || isLoading || handledPushNotification.current === notificationId) return;
    const notification = (data?.data ?? []).find((item) => item.id === notificationId);
    if (!notification) return;
    handledPushNotification.current = notificationId;
    navigate('/notifications', { replace: true });
    void openNotification(notification);
  }, [data, isLoading, location.search, navigate, openNotification]);

  const userDisplayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.email || 'Account';
  const roleDisplay = user?.role === 'SUPER_ADMIN'
    ? 'Super Admin'
    : user?.role === 'ADMIN'
    ? 'Admin'
    : user?.role === 'RIDER'
    ? 'Rider'
    : user?.role === 'BUSINESS_USER'
    ? 'Business'
    : 'Customer';

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Notifications</h1>
      <p className="text-sm text-gray-500 mb-6">Stay updated on your orders and deliveries.</p>
      {actionError && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}

      {/* Account-Isolated Notification Control */}
      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isAccountPushEnabled ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-500'
            }`}>
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">Push Notifications</h2>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isAccountPushEnabled
                    ? 'border border-success-200 bg-success-50 text-success-700'
                    : 'border border-gray-200 bg-gray-50 text-gray-600'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isAccountPushEnabled ? 'bg-success-600' : 'bg-gray-400'}`} />
                  {isAccountPushEnabled ? 'Active for this account' : 'Disabled for this account'}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Receiving updates for <span className="font-semibold text-gray-900">{userDisplayName}</span> ({roleDisplay}).
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                Notification controls are strictly private to this account. Toggling here will not affect other accounts on this device.
              </p>
              {pushConfigQuery.error instanceof ApiRequestError && pushConfigQuery.error.statusCode === 404 && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-red-700">The deployed backend does not have the push setup endpoint yet.</p>
              )}
              {pushConfigQuery.error && !(pushConfigQuery.error instanceof ApiRequestError && pushConfigQuery.error.statusCode === 404) && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-red-700">Push setup could not be reached. Check your connection.</p>
              )}
              {!pushConfigQuery.data?.data.available && !pushConfigQuery.error && !pushConfigQuery.isLoading && (
                <p className="mt-1.5 text-xs text-gray-500">Push delivery is not configured on the backend yet. In-app notifications remain available.</p>
              )}
              {pushError && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-red-700">{pushError}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => pushMutation.mutate()}
            disabled={pushMutation.isPending || pushConfigQuery.isLoading || (!isAccountPushEnabled && !pushConfigQuery.data?.data.available)}
            aria-pressed={isAccountPushEnabled}
            className={`inline-flex h-10 min-w-44 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
              isAccountPushEnabled
                ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                : 'bg-primary-600 text-white shadow-sm hover:bg-primary-700'
            }`}
          >
            {pushMutation.isPending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            {isAccountPushEnabled ? 'Disable for this account' : 'Enable push notifications'}
          </button>
        </div>
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
