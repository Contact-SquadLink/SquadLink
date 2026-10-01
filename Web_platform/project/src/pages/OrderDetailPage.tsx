import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  Truck,
  Store,
  MapPin,
  CreditCard,
  RefreshCw,
  XCircle,
  PhoneCall,
  User as UserIcon,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { EmptyState } from '@/components/ui/States';
import { formatDate, formatPrice } from '@/utils/format';
import { ordersApi } from '@/api/orders';
import { deliveryApi } from '@/api/delivery';
import { paymentApi } from '@/api/payment';
import type { Order } from '@/types';

const orderStages: Record<string, string[]> = {
  PENDING: ['Order created'],
  CONFIRMED: ['Order created', 'Payment confirmed'],
  PREPARING: ['Order created', 'Payment confirmed', 'Store preparing'],
  READY_FOR_PICKUP: ['Order created', 'Payment confirmed', 'Store preparing', 'Ready for courier'],
  OUT_FOR_DELIVERY: ['Order created', 'Payment confirmed', 'Store preparing', 'Ready for courier', 'Out for delivery'],
  DELIVERED: ['Order created', 'Payment confirmed', 'Store preparing', 'Ready for courier', 'Out for delivery', 'Delivered'],
  CANCELLED: ['Order created', 'Cancelled'],
};

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const paymentReference =
    searchParams.get('reference') ||
    searchParams.get('trxref') ||
    searchParams.get('tx_ref') ||
    searchParams.get('transaction_id');
  const paymentStatusParam = searchParams.get('status');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['customer-order', orderId],
    queryFn: () => ordersApi.getById(orderId as string),
    enabled: Boolean(orderId),
    refetchInterval: 10000,
  });

  const [deliveryOtp, setDeliveryOtp] = useState<string | null>(null);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<'PAYSTACK' | 'FLUTTERWAVE'>('PAYSTACK');

  // Cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const order = (data?.data ?? null) as Order | null;

  // Auto-verify payment if returning from Paystack / Flutterwave with reference
  useEffect(() => {
    if (paymentStatusParam === 'cancelled') {
      setPaymentNotice('Payment was cancelled at the gateway checkout. You can retry payment below at any time.');
      return;
    }

    if (paymentReference && order && order.status === 'PENDING' && !isVerifyingPayment) {
      setIsVerifyingPayment(true);
      setPaymentNotice('Verifying payment clearance with gateway...');
      paymentApi
        .verify(paymentReference)
        .then(() => {
          setPaymentNotice('Payment verified successfully! Order is confirmed.');
          refetch();
        })
        .catch((err) => {
          setPaymentNotice(
            err instanceof Error ? err.message : 'Payment clearance pending. Click verify below to retry.'
          );
        })
        .finally(() => {
          setIsVerifyingPayment(false);
        });
    }
  }, [paymentReference, paymentStatusParam, order?.status]);

  const handlePayNow = async (gateway: 'PAYSTACK' | 'FLUTTERWAVE' = selectedGateway) => {
    if (!orderId) return;
    setIsInitiatingPayment(true);
    setPaymentNotice(null);
    try {
      const callbackUrl = `${window.location.origin}/orders/${orderId}`;
      const res = await paymentApi.initialize({
        orderId,
        gateway,
        callbackUrl,
      });
      if (res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      }
    } catch (err) {
      setPaymentNotice(err instanceof Error ? err.message : 'Unable to initialize payment.');
    } finally {
      setIsInitiatingPayment(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!orderId) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      await ordersApi.cancel(orderId, cancelReason.trim() || undefined);
      setShowCancelModal(false);
      refetch();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel order.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-primary-700 transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>
        <p className="text-sm text-gray-600">Loading order details…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-primary-700 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>

        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title="Order not found"
          description={
            orderId
              ? `The order ${orderId} could not be found in your account.`
              : 'This order is not available.'
          }
        />
      </div>
    );
  }

  const stageList = orderStages[order.status] ?? ['Order created'];
  const currentStageIndex = Math.max(stageList.length - 1, 0);
  const progress = ((currentStageIndex + 1) / Math.max(stageList.length, 1)) * 100;
  const delivery = order.delivery;
  const rider = delivery?.rider;
  const riderAccepted = Boolean(delivery?.riderAccepted && rider);

  const canRequestOtp = delivery?.status === 'IN_TRANSIT' || delivery?.status === 'ARRIVED';

  const requestOtp = async () => {
    if (!delivery) return;
    setOtpLoading(true);
    setOtpMessage(null);
    try {
      const response = await deliveryApi.requestOtp(delivery.id);
      setDeliveryOtp(response.data.otp);
      setOtpMessage(`This OTP expires in ${response.data.expiresInMinutes} minutes.`);
    } catch (requestError) {
      setOtpMessage(requestError instanceof Error ? requestError.message : 'Unable to issue the delivery OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/orders"
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-primary-700 transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </Link>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">Order #{order.id.slice(-8)}</p>
            <h1 className="mt-2 font-display text-2xl font-bold text-gray-900">Order Tracking</h1>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            order.status === 'CANCELLED'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : order.status === 'DELIVERED'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-primary-50 text-primary-700 border border-primary-200'
          }`}>
            {order.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Progress</span>
            <span>{order.status === 'CANCELLED' ? '0' : Math.round(progress)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100">
            <div
              className={`h-2.5 rounded-full transition-all ${order.status === 'CANCELLED' ? 'bg-red-500' : 'bg-primary-600'}`}
              style={{ width: `${order.status === 'CANCELLED' ? 100 : progress}%` }}
            />
          </div>
        </div>

        {/* Unpaid Pending Order Action Bar */}
        {order.status === 'PENDING' && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-amber-100 p-2 text-amber-700">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-amber-950">Awaiting Payment Clearance</h3>
                  <p className="mt-1 text-xs text-amber-800">
                    This order is placed and awaiting payment confirmation. Once payment clears, the store will prepare your items and a courier will be assigned.
                  </p>
                  {paymentNotice && (
                    <p className="mt-2 text-xs font-semibold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-md inline-block">
                      {paymentNotice}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void handlePayNow('PAYSTACK')}
                  disabled={isInitiatingPayment}
                  className="rounded-xl bg-primary-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isInitiatingPayment ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Connecting...
                    </>
                  ) : (
                    <>Pay with Paystack</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void handlePayNow('FLUTTERWAVE')}
                  disabled={isInitiatingPayment}
                  className="rounded-xl bg-amber-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isInitiatingPayment ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Connecting...
                    </>
                  ) : (
                    <>Pay with Flutterwave</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <XCircle className="h-4 w-4 text-red-500" />
                  Cancel Order
                </button>
                {paymentReference && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsVerifyingPayment(true);
                      paymentApi.verify(paymentReference).then(() => refetch()).finally(() => setIsVerifyingPayment(false));
                    }}
                    disabled={isVerifyingPayment}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <RefreshCw className={isVerifyingPayment ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
                    Verify
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cancelled Order Notice */}
        {order.status === 'CANCELLED' && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50/80 p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-red-100 p-2 text-red-600">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-red-950">This Order Has Been Cancelled</h3>
                <p className="mt-1 text-xs text-red-800">
                  This order was cancelled before payment or rejected by dispatch. Any temporary inventory reservations have been released back to the store.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Delivery / Courier Tracking Section (After Payment) */}
        {order.status !== 'PENDING' && order.status !== 'CANCELLED' && delivery && (
          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
            <div className="flex items-center justify-between border-b border-blue-200/60 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-700" />
                <h3 className="font-display text-base font-bold text-blue-950">Courier & Delivery Status</h3>
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                {delivery.status.replace(/_/g, ' ')}
              </span>
            </div>

            {riderAccepted && rider ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl bg-white p-4 border border-blue-100 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold text-lg">
                      {(rider.firstName || 'R').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-display text-sm font-bold text-gray-900">
                          {[rider.firstName, rider.lastName].filter(Boolean).join(' ') || 'Assigned Courier'}
                        </p>
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      </div>
                      <p className="text-xs text-blue-600 font-medium">@{rider.username || 'courier'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {rider.vehicleType ? `${rider.vehicleType} • ` : ''}
                        {rider.vehicleRegistration ? `Plate ${rider.vehicleRegistration}` : 'Verified Rider'}
                      </p>
                    </div>
                  </div>

                  {rider.phoneNumber && (
                    <a
                      href={`tel:${rider.phoneNumber}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs"
                    >
                      <PhoneCall className="h-3.5 w-3.5" />
                      Call Courier ({rider.phoneNumber})
                    </a>
                  )}
                </div>

                <div className="rounded-xl bg-blue-100/60 p-3.5 text-xs text-blue-900">
                  <p className="font-semibold">
                    {delivery.status === 'ASSIGNED' && '🛵 Rider accepted and is heading to the store to pick up your package.'}
                    {(delivery.status as string) === 'RIDER_AT_PICKUP' && '🏪 Rider has arrived at the store and is collecting your order.'}
                    {delivery.status === 'PICKED_UP' && '📦 Package collected! Rider is preparing to depart toward your location.'}
                    {delivery.status === 'IN_TRANSIT' && '🚀 Rider is on the way with your package! Keep your phone nearby.'}
                    {delivery.status === 'ARRIVED' && '📍 Rider has arrived at your delivery address! Request your delivery OTP below.'}
                    {delivery.status === 'DELIVERED' && '✅ Order delivered successfully. Thank you for using SquadLink!'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-white p-4 border border-blue-100 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <Truck className="h-5 w-5 animate-pulse" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold text-gray-900">Finding Nearest Courier...</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      We are dispatching verified local dispatchers in your zone. Courier name, vehicle details, and contact number will display as soon as a courier accepts.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <h2 className="text-sm font-semibold text-gray-900">Order lifecycle</h2>
              <div className="mt-4 space-y-3">
                {stageList.map((stage, index) => {
                  const active = index <= stageList.length - 1;
                  const Icon = index <= 2 ? Store : index <= 4 ? Truck : index === 5 ? MapPin : CheckCircle2;
                  return (
                    <div key={`${stage}-${index}`} className="flex items-start gap-3">
                      <div className={active ? 'text-primary-600' : 'text-gray-300'}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className={active ? 'text-sm font-semibold text-gray-900' : 'text-sm text-gray-400'}>
                          {stage}
                        </p>
                      </div>
                      {active && <CheckCircle2 className="h-4 w-4 text-success-500" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <h2 className="text-sm font-semibold text-gray-900">Items</h2>
              <div className="mt-3 space-y-3">
                {order.items.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between gap-3 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.quantity} x {formatPrice(item.price)}</p>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{formatPrice(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <h2 className="text-sm font-semibold text-gray-900">Order summary</h2>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
                <div className="flex items-center justify-between"><span>Delivery fee</span><span>{formatPrice(order.deliveryFee)}</span></div>
                <div className="flex items-center justify-between"><span>Platform fee</span><span>{formatPrice(order.platformFee ?? 150)}</span></div>
                <div className="border-t border-gray-200 pt-2 flex items-center justify-between font-semibold text-gray-900"><span>Total</span><span>{formatPrice(order.total)}</span></div>
              </div>
            </div>

            <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4">
              <p className="text-sm font-semibold text-primary-900">Order status</p>
              <p className="mt-2 text-sm text-primary-700">
                Updated from the backend using the live order lifecycle and verified courier assignment.
              </p>
              <p className="mt-3 text-xs text-primary-600">Created {formatDate(order.createdAt)}</p>
            </div>

            {canRequestOtp && delivery && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <h2 className="text-sm font-semibold text-amber-950">Delivery confirmation</h2>
                <p className="mt-2 text-sm text-amber-800">
                  Request an OTP when the courier arrives. Keep it private and share it only with the rider at delivery.
                </p>
                <button
                  type="button"
                  onClick={requestOtp}
                  disabled={otpLoading}
                  className="mt-4 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {otpLoading ? 'Requesting...' : deliveryOtp ? 'Request a new OTP' : 'Request delivery OTP'}
                </button>
                {deliveryOtp && (
                  <div className="mt-4 rounded-lg border border-amber-300 bg-white p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-amber-700">Your delivery OTP</p>
                    <p className="mt-1 font-mono text-2xl font-bold tracking-[0.3em] text-amber-950">{deliveryOtp}</p>
                    <p className="mt-2 text-xs text-amber-700">Give this OTP to the rider after your order has arrived. The rider will validate it.</p>
                  </div>
                )}
                <p className="mt-4 text-sm font-semibold text-amber-800">Share this six-digit code with the rider. The rider confirms delivery.</p>
                {otpMessage && <p className="mt-2 text-xs text-amber-800">{otpMessage}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <h3 className="font-display text-lg font-bold text-gray-900">Cancel Unpaid Order?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to cancel Order #{order.id.slice(-8)}? Any reserved items will be released back to the store immediately.
            </p>
            {cancelError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-100">
                {cancelError}
              </div>
            )}
            <div className="mb-4">
              <label htmlFor="cancelReason" className="block text-xs font-medium text-gray-700 mb-1">
                Reason for cancellation (optional)
              </label>
              <textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Changed my mind, ordered by mistake"
                rows={2}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
