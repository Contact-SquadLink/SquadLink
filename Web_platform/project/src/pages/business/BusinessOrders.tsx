import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  Package,
  Store,
  ClipboardList,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { formatDate } from '@/utils/format';
import { businessApi } from '@/api/business';
import type { BusinessOrderSummary, OrderStatus } from '@/types';

const statusVariants: Record<OrderStatus, 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PREPARING: 'info',
  READY_FOR_PICKUP: 'warning',
  OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success',
  CANCELLED: 'error',
};

export function BusinessOrdersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['business-orders'],
    queryFn: businessApi.listOrders,
    refetchInterval: 15000,
  });

  const orders = useMemo(
    () => (Array.isArray(data?.data) ? (data.data as BusinessOrderSummary[]) : []),
    [data],
  );

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Business Orders</h1>
      <p className="text-sm text-gray-500 mb-6">Accept, prepare, and mark orders ready for pickup.</p>

      {isLoading ? (
        <p className="text-sm text-gray-600">Loading business orders…</p>
      ) : error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">We could not load business orders. Refresh or sign in again if your session expired.</p>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-7 w-7" />}
          title="No orders yet"
          description="When customers place orders with your business, they will appear here."
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.orderId}
              to={`/business/orders/${order.orderId}`}
              className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
                  <Package className="h-6 w-6 text-gray-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    #{order.orderId.slice(-6).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={statusVariants[(order.status as OrderStatus) ?? 'PENDING']}>
                  {(order.status ?? 'PENDING').replace(/_/g, ' ')}
                </Badge>
                {order.status === 'READY_FOR_PICKUP' && <span className={`text-xs font-semibold ${order.riderAssigned ? 'text-success-700' : 'text-amber-800'}`}>{order.riderAssigned ? 'Rider assigned' : 'Searching for rider'}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function BusinessOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const queryClient = useQueryClient();
  const [pickupCredential, setPickupCredential] = useState<string | null>(null);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['business-orders'],
    queryFn: businessApi.listOrders,
  });

  const orders = useMemo(
    () => (Array.isArray(data?.data) ? (data.data as BusinessOrderSummary[]) : []),
    [data],
  );
  const order = useMemo(() => orders.find((entry) => entry.orderId === orderId), [orders, orderId]);

  const acceptMutation = useMutation({
    mutationFn: () => businessApi.acceptOrder(orderId as string),
    onMutate: () => setActionError(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business-orders'] }),
    onError: (caughtError) => setActionError(caughtError instanceof Error ? caughtError.message : 'Unable to accept order.'),
  });

  const readyMutation = useMutation({
    mutationFn: () => businessApi.markOrderReady(orderId as string),
    onMutate: () => { setActionError(null); setAssignmentMessage(null); },
    onSuccess: (response) => {
      setPickupCredential(response.data.delivery.pickupCredential ?? null);
      setAssignmentMessage(response.data.delivery.status === 'ASSIGNED'
        ? 'A rider has been assigned. The rider will see this delivery in their dashboard.'
        : 'No eligible rider is available right now. The order remains ready and assignment can be retried.');
      return queryClient.invalidateQueries({ queryKey: ['business-orders'] });
    },
    onError: (caughtError) => setActionError(caughtError instanceof Error ? caughtError.message : 'Unable to mark order ready.'),
  });

  const retryRiderMutation = useMutation({
    mutationFn: () => businessApi.retryRiderAssignment(orderId as string),
    onMutate: () => { setActionError(null); setAssignmentMessage(null); },
    onSuccess: (response) => {
      setPickupCredential(response.data.delivery.pickupCredential ?? null);
      setAssignmentMessage(response.data.delivery.status === 'ASSIGNED'
        ? 'A rider has been assigned. The rider will see this delivery in their dashboard.'
        : 'No eligible rider is available right now. The order remains ready; try again after a verified rider goes online.');
      return queryClient.invalidateQueries({ queryKey: ['business-orders'] });
    },
    onError: (caughtError) => setActionError(caughtError instanceof Error ? caughtError.message : 'Unable to retry rider assignment.'),
  });

  const reissueCredentialMutation = useMutation({
    mutationFn: () => businessApi.reissuePickupCredential(orderId as string),
    onSuccess: (response) => setPickupCredential(response.data.credential),
    onError: (caughtError) => setActionError(caughtError instanceof Error ? caughtError.message : 'Unable to reissue pickup credential.'),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => businessApi.cancelOrder(orderId as string, reason),
    onMutate: () => setActionError(null),
    onSuccess: () => {
      setShowCancelModal(false);
      setCancelReason('');
      return queryClient.invalidateQueries({ queryKey: ['business-orders'] });
    },
    onError: (caughtError) => setActionError(caughtError instanceof Error ? caughtError.message : 'Unable to cancel order.'),
  });

  if (isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-gray-600">Loading order details…</div>;
  }

  if (error) {
    return <div className="mx-auto max-w-3xl px-4 py-8"><Link to="/business/orders" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600"><ArrowLeft className="h-4 w-4" /> Back to Orders</Link><p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">We could not load this order. Refresh or sign in again if your session expired.</p></div>;
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title="Order not found"
          description="This order is not available to this business yet."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/business/orders"
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-primary-700 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Order #{order.orderId.slice(-6).toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{formatDate(order.createdAt)}</p>
        </div>
        <Badge variant={statusVariants[(order.status as OrderStatus) ?? 'PENDING']}>
          {(order.status ?? 'PENDING').replace(/_/g, ' ')}
        </Badge>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mb-6">
        <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Actions</h2>
        {actionError && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
        {assignmentMessage && <p role="status" className={`mb-4 rounded-lg border p-3 text-sm ${assignmentMessage.startsWith('A rider') ? 'border-success-200 bg-success-50 text-success-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{assignmentMessage}</p>}

        <div className="flex flex-wrap items-center gap-3">
          {order.status === 'CONFIRMED' && (
            <button
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending || cancelMutation.isPending}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 text-sm font-semibold text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Accept Order
            </button>
          )}

          {order.status === 'PREPARING' && (
            <button
              onClick={() => readyMutation.mutate()}
              disabled={readyMutation.isPending || cancelMutation.isPending}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary-500 px-6 text-sm font-semibold text-secondary-950 hover:bg-secondary-400 transition-colors disabled:opacity-50"
            >
              <Store className="h-4 w-4" /> Mark Ready for Pickup
            </button>
          )}

          {order.status === 'READY_FOR_PICKUP' && (
            <button
              type="button"
              onClick={() => retryRiderMutation.mutate()}
              disabled={retryRiderMutation.isPending || cancelMutation.isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary-200 px-5 text-sm font-semibold text-primary-700 hover:bg-primary-50 transition-colors disabled:opacity-50"
            >
              {retryRiderMutation.isPending ? 'Searching...' : 'Retry rider assignment'}
            </button>
          )}

          {order.status === 'READY_FOR_PICKUP' && (
            <button
              type="button"
              onClick={() => reissueCredentialMutation.mutate()}
              disabled={reissueCredentialMutation.isPending || cancelMutation.isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-200 px-5 text-sm font-semibold text-amber-800 hover:bg-amber-50 transition-colors disabled:opacity-50"
            >
              {reissueCredentialMutation.isPending ? 'Issuing...' : 'Reissue pickup code'}
            </button>
          )}

          {/* Cancellation button for cancellable business order stages */}
          {['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(order.status) && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              disabled={cancelMutation.isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <XCircle className="h-4 w-4 text-red-500" /> Cancel Request
            </button>
          )}
        </div>

        {(order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED') && (
          <div className="flex items-center gap-2 rounded-xl bg-success-50 border border-success-200 p-4">
            <CheckCircle2 className="h-5 w-5 text-success-600" />
            <p className="text-sm font-semibold text-success-800">
              {order.status === 'OUT_FOR_DELIVERY' ? 'Order is out for delivery with the courier.' : 'Order has been delivered.'}
            </p>
          </div>
        )}

        {order.status === 'CANCELLED' && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-4">
            <XCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm font-semibold text-red-800">
              This order has been cancelled. Any reserved inventory and courier assignments have been released.
            </p>
          </div>
        )}

        {pickupCredential && order.status === 'READY_FOR_PICKUP' && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">Pickup code for the assigned rider</p>
            <p className="mt-2 font-mono text-2xl font-bold tracking-[0.25em] text-amber-950">
              {pickupCredential}
            </p>
            <p className="mt-2 text-xs text-amber-800">
              Give this code to the assigned rider at pickup. It is only shown after a rider is assigned.
            </p>
          </div>
        )}
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-gray-900">Cancel Delivery Request</h3>
                <p className="text-xs text-gray-500">Order #{order.orderId.slice(-6).toUpperCase()}</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Cancelling this order will release all reserved inventory items back to your store catalog, cancel any active courier search or assignment, and notify the customer.
            </p>

            <div className="space-y-3 mb-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">Reason for Cancellation</label>
              <div className="space-y-1.5">
                {[
                  'Items or ingredients currently out of stock',
                  'Store closing or kitchen emergency',
                  'Delivery address unreachable / outside coverage',
                  'Customer requested order cancellation',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCancelReason(preset)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-xs transition-colors border ${
                      cancelReason === preset
                        ? 'border-primary-600 bg-primary-50 text-primary-900 font-semibold'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Or specify another reason..."
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                disabled={cancelMutation.isPending}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={() => cancelMutation.mutate(cancelReason)}
                disabled={cancelMutation.isPending}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Summary</h2>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-center justify-between"><span>Fulfillment status</span><span className="font-medium text-gray-900">{order.fulfillmentStatus ?? 'N/A'}</span></div>
          <div className="flex items-center justify-between"><span>Order status</span><span className="font-medium text-gray-900">{order.status}</span></div>
        </div>
      </div>
    </div>
  );
}
