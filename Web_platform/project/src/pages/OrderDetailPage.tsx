import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Package, CheckCircle2, Truck, Store, MapPin } from 'lucide-react';
import { EmptyState } from '@/components/ui/States';
import { formatDate, formatPrice } from '@/utils/format';
import { ordersApi } from '@/api/orders';
import { deliveryApi } from '@/api/delivery';
import type { Order } from '@/types';

const orderStages: Record<string, string[]> = {
  PENDING: ['Order created'],
  CONFIRMED: ['Order created', 'Business confirmed'],
  PREPARING: ['Order created', 'Business confirmed', 'Preparing'],
  READY_FOR_PICKUP: ['Order created', 'Business confirmed', 'Preparing', 'Ready for pickup'],
  OUT_FOR_DELIVERY: ['Order created', 'Business confirmed', 'Preparing', 'Ready for pickup', 'Out for delivery'],
  DELIVERED: ['Order created', 'Business confirmed', 'Preparing', 'Ready for pickup', 'Out for delivery', 'Delivered'],
};

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['customer-order', orderId],
    queryFn: () => ordersApi.getById(orderId as string),
    enabled: Boolean(orderId),
  });
  const [deliveryOtp, setDeliveryOtp] = useState<string | null>(null);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);

  const order = (data?.data ?? null) as Order | null;

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
          <span className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700">
            {order.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100">
            <div className="h-2.5 rounded-full bg-primary-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <h2 className="text-sm font-semibold text-gray-900">Order lifecycle</h2>
              <div className="mt-4 space-y-3">
                {stageList.map((stage, index) => {
                  const active = index <= stageList.length - 1;
                  const Icon = index <= 3 ? Store : index <= 5 ? Truck : index === 5 ? MapPin : CheckCircle2;
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
                <div className="flex items-center justify-between"><span>VAT</span><span>{formatPrice(order.vat ?? 0)}</span></div>
                <div className="border-t border-gray-200 pt-2 flex items-center justify-between font-semibold text-gray-900"><span>Total</span><span>{formatPrice(order.total)}</span></div>
              </div>
            </div>

            <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4">
              <p className="text-sm font-semibold text-primary-900">Order status</p>
              <p className="mt-2 text-sm text-primary-700">
                Updated from the backend using the actual order lifecycle for this account.
              </p>
              <p className="mt-3 text-xs text-primary-600">Created {formatDate(order.createdAt)}</p>
            </div>

            {canRequestOtp && delivery && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <h2 className="text-sm font-semibold text-amber-950">Delivery confirmation</h2>
                <p className="mt-2 text-sm text-amber-800">
                  Request an OTP when the rider arrives. Keep it private and share it only with the rider at delivery.
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
    </div>
  );
}
