import { Link } from 'react-router-dom';
import { Package, ChevronRight, Clock, CheckCircle2, Truck } from 'lucide-react';
import { formatPrice, formatDate } from '@/utils/format';
import { EmptyState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { demoOrders } from '@/utils/demo-data';
import type { OrderStatus } from '@/types';

const statusVariants: Record<OrderStatus, 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PREPARING: 'info',
  READY_FOR_PICKUP: 'warning',
  OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success',
  CANCELLED: 'error',
};

const statusIcons: Record<OrderStatus, typeof Clock> = {
  PENDING: Clock,
  CONFIRMED: CheckCircle2,
  PREPARING: Package,
  READY_FOR_PICKUP: Package,
  OUT_FOR_DELIVERY: Truck,
  DELIVERED: CheckCircle2,
  CANCELLED: Package,
};

export function OrdersPage() {
  const orders = demoOrders;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">My Orders</h1>
      <p className="text-sm text-gray-500 mb-6">Track and manage your orders.</p>

      {orders.length === 0 ? (
        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title="No orders yet"
          description="When you place an order, it will appear here for tracking."
          action={
            <Link
              to="/browse"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary-600 px-6 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
            >
              Start Shopping
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const StatusIcon = statusIcons[order.status] ?? Clock;
            return (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
                  <StatusIcon className="h-6 w-6 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      Order #{order.id.slice(-6).toUpperCase()}
                    </p>
                    <Badge variant={statusVariants[order.status]}>{order.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDate(order.createdAt)} · {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold text-gray-900">{formatPrice(order.total)}</p>
                  <ChevronRight className="h-4 w-4 text-gray-400 ml-auto mt-1" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
