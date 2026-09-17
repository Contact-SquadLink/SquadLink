import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Package,
  Store,
  ClipboardList,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { formatPrice, formatDate } from '@/utils/format';
import { demoOrders } from '@/utils/demo-data';
import type { Order, OrderStatus } from '@/types';

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
  const orders = demoOrders;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Business Orders</h1>
      <p className="text-sm text-gray-500 mb-6">Accept, prepare, and mark orders ready for pickup.</p>

      {orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-7 w-7" />}
          title="No orders yet"
          description="When customers place orders with your business, they will appear here."
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/business/orders/${order.id}`}
              className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
                  <Package className="h-6 w-6 text-gray-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    #{order.id.slice(-6).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(order.createdAt)} · {order.items.length} items
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-lg font-bold text-gray-900">{formatPrice(order.total)}</span>
                <Badge variant={statusVariants[order.status]}>
                  {order.status.replace(/_/g, ' ')}
                </Badge>
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

  const advanceStatus = () => {
    const flow: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const idx = flow.indexOf(order.status);
    if (idx < flow.length - 1) {
      setOrder({ ...order, status: flow[idx + 1] });
    }
  };

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
            Order #{order.id.slice(-6).toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{formatDate(order.createdAt)}</p>
        </div>
        <Badge variant={statusVariants[order.status]}>
          {order.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* Actions */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mb-6">
        <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Actions</h2>

        {order.status === 'PENDING' && (
          <button
            onClick={advanceStatus}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" /> Accept Order
          </button>
        )}

        {order.status === 'CONFIRMED' && (
          <button
            onClick={advanceStatus}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary-500 px-6 text-sm font-semibold text-secondary-950 hover:bg-secondary-400 transition-colors"
          >
            <Store className="h-4 w-4" /> Mark Ready for Pickup
          </button>
        )}

        {(order.status === 'PREPARING' || order.status === 'READY_FOR_PICKUP') && (
          <div className="flex items-center gap-2 rounded-xl bg-success-50 border border-success-200 p-4">
            <CheckCircle2 className="h-5 w-5 text-success-600" />
            <p className="text-sm font-semibold text-success-800">
              {order.status === 'READY_FOR_PICKUP'
                ? 'Order is ready for rider pickup.'
                : 'Order is being prepared.'}
            </p>
          </div>
        )}

        {(order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED') && (
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-4">
            <Package className="h-5 w-5 text-gray-400" />
            <p className="text-sm text-gray-600">
              {order.status === 'DELIVERED'
                ? 'Order has been delivered.'
                : 'Order is out for delivery.'}
            </p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mb-6">
        <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Items</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div>
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
        <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Payment</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-semibold text-gray-900">{formatPrice(order.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Delivery</span><span className="text-gray-700">{formatPrice(order.deliveryFee)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">VAT</span><span className="text-gray-700">{formatPrice(order.vat)}</span></div>
          <div className="border-t border-gray-100 pt-3 flex justify-between"><span className="font-bold text-gray-900">Total</span><span className="font-display text-xl font-bold text-gray-900">{formatPrice(order.total)}</span></div>
        </div>
      </div>
    </div>
  );
}
