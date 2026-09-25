import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  ShoppingCart,
  Package,
  Bell,
  Bike,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { catalogService } from '@/services/catalogService';
import { cn } from '@/utils/format';
import { getCategoryIcon } from '@/utils/icons';
import { businessApi } from '@/api/business';
import { ordersApi } from '@/api/orders';
import type { Order } from '@/types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function CustomerDashboard() {
  const { user, refreshUser } = useAuth();
  const { itemCount } = useCart();

  const { data: categories = [] } = useQuery({
    queryKey: ['customer-dashboard-categories'],
    queryFn: () => catalogService.getCategories(),
  });
  const { data: applicationData } = useQuery({
    queryKey: ['business-application'],
    queryFn: businessApi.getApplication,
  });
  const { data: ordersData, isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['customer-dashboard-orders'],
    queryFn: ordersApi.list,
  });
  const activeOrders = ((ordersData?.data ?? []) as Order[]).filter(
    (order) => !['DELIVERED', 'CANCELLED'].includes(order.status)
  );
  const application = applicationData?.data;
  const openApprovedBusiness = async () => {
    await refreshUser();
    window.location.assign('/business');
  };
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  const greeting = fullName ? `${getGreeting()}, ${fullName}` : 'Welcome back';

  const quickActions = [
    { label: 'Browse Catalogue', desc: 'Explore products', icon: ShoppingBag, path: '/browse', color: 'bg-primary-600' },
    { label: 'View Cart', desc: `${itemCount} item${itemCount !== 1 ? 's' : ''}`, icon: ShoppingCart, path: '/cart', color: 'bg-accent-600' },
    { label: 'Track Orders', desc: 'Your order history', icon: Package, path: '/orders', color: 'bg-secondary-600' },
    { label: 'Notifications', desc: 'Latest updates', icon: Bell, path: '/notifications', color: 'bg-success-600' },
    { label: 'Become a Rider', desc: 'Apply for rider access', icon: Bike, path: '/rider/register', color: 'bg-accent-600' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome */}
      <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 p-6 sm:p-8 text-white shadow-sm">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          {greeting}
        </h1>
        <p className="mt-1.5 text-primary-100 text-sm sm:text-base">
          What would you like delivered today?
        </p>
        <Link
          to="/browse"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 transition-colors"
        >
          Start Shopping <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.path}
              to={action.path}
              className="group flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
            >
              <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white', action.color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{action.label}</p>
                <p className="text-xs text-gray-500 truncate">{action.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 grid lg:grid-cols-3 gap-6">
        {application && application.status !== 'NONE' && (
          <div className="lg:col-span-3 rounded-2xl border border-secondary-200 bg-secondary-50 p-5">
            <h2 className="font-display text-lg font-bold text-gray-900">Business application</h2>
            <p className="mt-2 text-sm text-gray-700">
              {application.status === 'PENDING' && 'Your business application is pending admin approval. We will notify you when a decision is made.'}
              {application.status === 'VERIFIED' && 'Your business application is approved. You can now access your business workspace.'}
              {application.status === 'REJECTED' && `Your business application was rejected.${application.verification?.verificationNotes ? ` Reason: ${application.verification.verificationNotes}` : ''}`}
              {application.status === 'SUSPENDED' && 'Your business application is currently suspended. Please contact support.'}
            </p>
            {application.status === 'VERIFIED' && (
              <button type="button" onClick={() => void openApprovedBusiness()} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary-700">
                Open business workspace <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        <div className="lg:col-span-1">
          <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Active Order</h2>
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
            {ordersLoading ? <p className="text-sm text-gray-600">Loading your orders...</p> : ordersError ? <p role="alert" className="text-sm text-red-700">We could not load your orders. Refresh the page to try again.</p> : activeOrders.length > 0 ? (
              <div className="space-y-3 text-left">
                {activeOrders.slice(0, 3).map((order) => (
                  <Link key={order.id} to={`/orders/${order.id}`} className="block rounded-xl border border-gray-200 bg-white p-3 hover:border-primary-300">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-gray-900">Order #{order.id.slice(-8)}</span>
                      <span className="rounded-full bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700">{order.status.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                  </Link>
                ))}
                <Link to="/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700">View all orders <ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>
            ) : <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Package className="h-6 w-6 text-gray-400" />
            </div>
            <p className="mt-3 text-sm font-medium text-gray-900">No active orders</p>
            <p className="mt-1 text-xs text-gray-500">Orders are created from the real backend once checkout is complete.</p>
            <Link
              to="/browse"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              Browse products <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            </>}
          </div>
        </div>

        {/* Categories */}
        <div className="lg:col-span-2">
          <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Popular Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categories.slice(0, 6).map((cat) => {
              const IconComp = getCategoryIcon(cat.icon);
              return (
                <Link
                  key={cat.id}
                  to={`/browse?category=${cat.slug}`}
                  className="group flex flex-col items-start gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 group-hover:bg-primary-100 transition-colors">
                    <IconComp className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{cat.name}</span>
                  <span className="text-xs text-gray-400 line-clamp-1">{cat.description}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Browse by category full list */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-5 w-5 text-primary-600" />
          <h2 className="font-display text-lg font-bold text-gray-900">Shop by Category</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.map((cat) => {
            const IconComp = getCategoryIcon(cat.icon);
            return (
              <Link
                key={cat.id}
                to={`/browse?category=${cat.slug}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 group-hover:bg-primary-100 transition-colors">
                  <IconComp className="h-7 w-7" />
                </div>
                <span className="text-sm font-semibold text-gray-900 text-center">{cat.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
