import { Link } from 'react-router-dom';
import {
  Shield,
  Store,
  CheckCircle2,
  Clock,
  ArrowRight,
  LayoutDashboard,
  Package,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { demoBusinesses, demoOrders } from '@/utils/demo-data';

export function AdminDashboard() {
  const businesses = demoBusinesses;
  const orders = demoOrders;

  const stats = {
    total: businesses.length,
    verified: businesses.filter((b) => b.isVerified).length,
    pending: businesses.filter((b) => !b.isVerified).length,
  };

  const revenue = orders
    .filter((o) => o.status === 'DELIVERED')
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Admin Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">Platform operations, business verification, and oversight.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-white">
            <Store className="h-5 w-5" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">Total Businesses</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 text-success-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-gray-900">{stats.verified}</p>
          <p className="text-xs text-gray-500">Verified</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-100 text-warning-700">
            <Clock className="h-5 w-5" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-gray-900">{stats.pending}</p>
          <p className="text-xs text-gray-500">Pending Verification</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-gray-900">
            {'\u20A6'}{(revenue / 1000).toFixed(1)}k
          </p>
          <p className="text-xs text-gray-500">Platform Revenue</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          to="/admin/businesses"
          className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
            <Shield className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-bold text-gray-900">Business Verification</h3>
            <p className="text-sm text-gray-500">Review and verify businesses</p>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
        </Link>
        <Link
          to="/admin/operations"
          className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-bold text-gray-900">Operations</h3>
            <p className="text-sm text-gray-500">Platform operational overview</p>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
        </Link>
      </div>

      {/* Recent businesses */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-gray-900">Businesses</h2>
          <Link
            to="/admin/businesses"
            className="text-sm font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
          >
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {businesses.length === 0 ? (
          <EmptyState
            icon={<Store className="h-7 w-7" />}
            title="No businesses registered"
            description="Registered businesses will appear here for verification."
          />
        ) : (
          <div className="space-y-2">
            {businesses.slice(0, 5).map((business) => (
              <Link
                key={business.id}
                to={`/admin/businesses/${business.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-100 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                    <Store className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{business.name}</p>
                    <p className="text-xs text-gray-500">{business.email || business.address || 'No contact info'}</p>
                  </div>
                </div>
                <Badge variant={business.isVerified ? 'success' : 'warning'}>
                  {business.isVerified ? 'Verified' : 'Pending'}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent orders overview */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-gray-900">Recent Orders</h2>
          <Link
            to="/admin/operations"
            className="text-sm font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
          >
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="space-y-2">
          {orders.slice(0, 5).map((order) => (
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
                  <p className="text-xs text-gray-500">{order.items.length} items</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-900">
                  {'\u20A6'}{order.total.toLocaleString()}
                </span>
                <Badge variant={order.status === 'DELIVERED' ? 'success' : order.status === 'CANCELLED' ? 'error' : 'info'}>
                  {order.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
