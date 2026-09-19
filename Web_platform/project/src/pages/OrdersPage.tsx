import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, ArrowRight } from 'lucide-react';
import { EmptyState } from '@/components/ui/States';
import { formatPrice } from '@/utils/format';
import { ordersApi } from '@/api/orders';
import type { Order } from '@/types';

export function OrdersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['customer-orders'],
    queryFn: () => ordersApi.list(),
  });

  const orders = Array.isArray(data?.data) ? (data.data as unknown as Order[]) : [];

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">My Orders</h1>
        <p className="text-sm text-gray-500 mb-6">Loading your recent orders…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">My Orders</h1>
        <p className="text-sm text-red-600">We could not load your order history right now.</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">My Orders</h1>
        <p className="text-sm text-gray-500 mb-6">Track and manage your orders.</p>

        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title="No orders yet"
          description="Your order history will appear here after checkout."
          action={
            <Link
              to="/browse"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary-600 px-6 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
            >
              Start Shopping
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">My Orders</h1>
      <p className="text-sm text-gray-500 mb-6">Track your recent order lifecycle.</p>

      <div className="space-y-4">
        {orders.map((order) => (
          <Link
            key={order.id}
            to={`/orders/${order.id}`}
            className="block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">Order #{order.id.slice(-8)}</p>
                <p className="mt-1 text-sm text-gray-600">
                  {order.items.length} item{order.items.length !== 1 ? 's' : ''} · {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-900">{formatPrice(order.total)}</span>
                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                  {order.status}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>View order details</span>
              <ArrowRight className="h-4 w-4 text-primary-600" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
