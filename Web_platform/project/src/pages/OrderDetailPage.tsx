import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Package,
  Store,
  Bike,
  Home as HomeIcon,
  XCircle,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { formatPrice, formatDate, cn } from '@/utils/format';
import { EmptyState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { demoOrders } from '@/utils/demo-data';
import type { Order, OrderStatus } from '@/types';

const orderSteps: { status: OrderStatus; label: string; icon: typeof Clock }[] = [
  { status: 'PENDING', label: 'Order Placed', icon: Clock },
  { status: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle2 },
  { status: 'PREPARING', label: 'Preparing', icon: Package },
  { status: 'READY_FOR_PICKUP', label: 'Ready for Pickup', icon: Store },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Bike },
  { status: 'DELIVERED', label: 'Delivered', icon: HomeIcon },
];

function getStepIndex(status: OrderStatus): number {
  const idx = orderSteps.findIndex((s) => s.status === status);
  return idx >= 0 ? idx : 0;
}

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [order, setOrder] = useState<Order | undefined>(
    demoOrders.find((o) => o.id === orderId)
  );

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title="Order not found"
          description="This order could not be found."
        />
      </div>
    );
  }

  const currentStep = getStepIndex(order.status);
  const isCancelled = order.status === 'CANCELLED';

  const handleOtpSubmit = () => {
    if (otp.length < 4) {
      setOtpError('OTP must be at least 4 digits.');
      return;
    }
    setOtpError(null);
    setOtpSuccess(true);
    setOrder({ ...order, status: 'DELIVERED' });
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

      {/* Order header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Order #{order.id.slice(-6).toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Placed {formatDate(order.createdAt)}</p>
        </div>
        <Badge variant={isCancelled ? 'error' : 'success'}>
          {order.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* Order timeline */}
      {!isCancelled ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mb-6">
          <h2 className="font-display text-lg font-bold text-gray-900 mb-6">Delivery Progress</h2>
          <div className="space-y-0">
            {orderSteps.map((step, idx) => {
              const Icon = step.icon;
              const isComplete = idx < currentStep;
              const isCurrent = idx === currentStep;
              const isUpcoming = idx > currentStep;

              return (
                <div key={step.status} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                        isComplete && 'bg-success-500 border-success-500 text-white',
                        isCurrent && 'bg-primary-600 border-primary-600 text-white animate-pulse',
                        isUpcoming && 'bg-white border-gray-200 text-gray-300'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    {idx < orderSteps.length - 1 && (
                      <div className={cn('w-0.5 h-12', isComplete ? 'bg-success-400' : 'bg-gray-200')} />
                    )}
                  </div>
                  <div className="pt-2">
                    <p className={cn(
                      'text-sm font-semibold',
                      isComplete && 'text-gray-900',
                      isCurrent && 'text-primary-700',
                      isUpcoming && 'text-gray-400'
                    )}>
                      {step.label}
                    </p>
                    {isCurrent && <p className="text-xs text-primary-600 mt-0.5">In progress...</p>}
                    {isComplete && <p className="text-xs text-success-600 mt-0.5">Completed</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 mb-6">
          <div className="flex items-center gap-3">
            <XCircle className="h-6 w-6 text-error-600" />
            <div>
              <h2 className="font-display text-lg font-bold text-error-900">Order Cancelled</h2>
              <p className="text-sm text-error-700">This order was cancelled. Please contact support if you have questions.</p>
            </div>
          </div>
        </div>
      )}

      {/* OTP section */}
      {order.status === 'OUT_FOR_DELIVERY' && !otpSuccess && (
        <div className="rounded-2xl border border-primary-200 bg-primary-50 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <KeyRound className="h-6 w-6 text-primary-600" />
            <div>
              <h2 className="font-display text-lg font-bold text-primary-900">Delivery Confirmation</h2>
              <p className="text-sm text-primary-700">Enter the OTP provided by your rider to confirm delivery.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter OTP"
              maxLength={6}
              className="h-12 flex-1 rounded-xl border border-primary-200 bg-white px-4 text-lg font-bold tracking-widest text-center text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={handleOtpSubmit}
              disabled={otp.length < 4}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ShieldCheck className="h-4 w-4" />
              Confirm
            </button>
          </div>
          {otpError && <p className="mt-3 text-sm text-error-700">{otpError}</p>}
          <p className="mt-3 text-xs text-primary-600">
            For this demo, any 4+ digit code will confirm the delivery.
          </p>
        </div>
      )}

      {otpSuccess && (
        <div className="rounded-2xl border border-success-200 bg-success-50 p-6 mb-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-success-600" />
            <p className="text-sm font-bold text-success-800">Delivery confirmed successfully!</p>
          </div>
        </div>
      )}

      {/* Order items */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mb-6">
        <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Items</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">{item.quantity} x {formatPrice(item.price)}</p>
              </div>
              <span className="text-sm font-bold text-gray-900">{formatPrice(item.subtotal)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Payment Summary</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold text-gray-900">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Delivery fee</span>
            <span className="text-gray-700">{formatPrice(order.deliveryFee)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">VAT</span>
            <span className="text-gray-700">{formatPrice(order.vat)}</span>
          </div>
          <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-display text-xl font-bold text-gray-900">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
