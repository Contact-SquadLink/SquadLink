import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  ClipboardList,
  Store,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { formatDate } from '@/utils/format';
import { businessApi } from '@/api/business';
import type { BusinessOrderSummary, OrderStatus, Business } from '@/types';

const statusVariants: Record<OrderStatus, 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PREPARING: 'info',
  READY_FOR_PICKUP: 'warning',
  OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success',
  CANCELLED: 'error',
};

export function BusinessDashboard() {
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['business-orders'],
    queryFn: businessApi.listOrders,
  });

  const { data: businessData } = useQuery({
    queryKey: ['business-profile'],
    queryFn: businessApi.getMyBusiness,
  });

  const orders = Array.isArray(ordersData?.data) ? (ordersData.data as BusinessOrderSummary[]) : [];
  const business = businessData?.data as Business | undefined;

  const stats = {
    pending: orders.filter((o) => o.status === 'PENDING').length,
    active: orders.filter((o) => ['CONFIRMED', 'PREPARING'].includes(o.status)).length,
    ready: orders.filter((o) => o.status === 'READY_FOR_PICKUP').length,
    delivered: orders.filter((o) => o.status === 'DELIVERED').length,
  };

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Business Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">
        {business?.name ? `Managing ${business.name}` : 'Manage your orders and business operations.'}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Clock} label="Pending" value={stats.pending} color="bg-warning-100 text-warning-700" />
        <StatCard icon={Package} label="Active" value={stats.active} color="bg-accent-100 text-accent-700" />
        <StatCard icon={Store} label="Ready for Pickup" value={stats.ready} color="bg-secondary-100 text-secondary-700" />
        <StatCard icon={CheckCircle2} label="Delivered" value={stats.delivered} color="bg-success-100 text-success-700" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 text-success-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-gray-900">
                {business?.isVerified ? 'Verified' : 'Pending'}
              </p>
              <p className="text-xs text-gray-500">Business status</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-gray-900">{orders.length}</p>
              <p className="text-xs text-gray-500">Orders received</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-gray-900">Recent Orders</h2>
          <Link
            to="/business/orders"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {ordersLoading ? (
          <p className="text-sm text-gray-600">Loading orders…</p>
        ) : recentOrders.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-7 w-7" />}
            title="No orders yet"
            description="When customers place orders with your business, they will appear here."
          />
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <Link
                key={order.orderId}
                to={`/business/orders/${order.orderId}`}
                className="flex items-center justify-between rounded-xl border border-gray-100 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                    <Package className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      #{order.orderId.slice(-6).toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusVariants[(order.status as OrderStatus) ?? 'PENDING']}>
                    {(order.status ?? 'PENDING').replace(/_/g, ' ')}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Clock;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
