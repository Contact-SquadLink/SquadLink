import { BarChart3, TrendingUp, Users, Package, Store, Bike } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatPrice } from '@/utils/format';
import { demoOrders, demoBusinesses, demoDeliveries } from '@/utils/demo-data';

export function AdminOperationsPage() {
  const stats = {
    activeUsers: 1247,
    ordersToday: demoOrders.length,
    deliveryRate: 94,
    activeRiders: 18,
  };

  const recentOrders = demoOrders.slice(0, 6);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Operations</h1>
      <p className="text-sm text-gray-500 mb-6">Platform-wide operational overview and audit information.</p>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Users, label: 'Active Users', value: stats.activeUsers.toLocaleString(), color: 'bg-primary-100 text-primary-700' },
          { icon: Package, label: 'Orders Today', value: stats.ordersToday.toString(), color: 'bg-accent-100 text-accent-700' },
          { icon: TrendingUp, label: 'Delivery Rate', value: `${stats.deliveryRate}%`, color: 'bg-success-100 text-success-700' },
          { icon: Bike, label: 'Active Riders', value: stats.activeRiders.toString(), color: 'bg-secondary-100 text-secondary-700' },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${metric.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-gray-900">{metric.value}</p>
              <p className="text-xs text-gray-500">{metric.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mb-6">
        <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Recent Orders</h2>
        <div className="space-y-2">
          {recentOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between rounded-xl border border-gray-100 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                  <Package className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    #{order.id.slice(-6).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(order.createdAt)} · {order.items.length} items</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-900">{formatPrice(order.total)}</span>
                <Badge variant={order.status === 'DELIVERED' ? 'success' : order.status === 'CANCELLED' ? 'error' : 'info'}>
                  {order.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Business summary */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mb-6">
        <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Business Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center gap-2 text-gray-500">
              <Store className="h-4 w-4" />
              <span className="text-xs">Total</span>
            </div>
            <p className="mt-1 font-display text-xl font-bold text-gray-900">{demoBusinesses.length}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs">Verified</span>
            </div>
            <p className="mt-1 font-display text-xl font-bold text-success-600">
              {demoBusinesses.filter((b) => b.isVerified).length}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs">Pending</span>
            </div>
            <p className="mt-1 font-display text-xl font-bold text-warning-600">
              {demoBusinesses.filter((b) => !b.isVerified).length}
            </p>
          </div>
        </div>
      </div>

      {/* Delivery performance */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Delivery Performance</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-xs text-gray-500">Total Deliveries</span>
            <p className="mt-1 font-display text-xl font-bold text-gray-900">{demoDeliveries.length}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Active</span>
            <p className="mt-1 font-display text-xl font-bold text-accent-600">
              {demoDeliveries.filter((d) => d.status !== 'DELIVERED').length}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Completed</span>
            <p className="mt-1 font-display text-xl font-bold text-success-600">
              {demoDeliveries.filter((d) => d.status === 'DELIVERED').length}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Success Rate</span>
            <p className="mt-1 font-display text-xl font-bold text-gray-900">94%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
