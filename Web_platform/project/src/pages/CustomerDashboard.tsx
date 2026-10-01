import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  ShoppingCart,
  Package,
  Bell,
  Bike,
  Building2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  X,
  FileText,
  DollarSign,
  MapPin,
  Smartphone,
  AlertCircle,
  Clock,
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
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { itemCount } = useCart();

  const [showRiderModal, setShowRiderModal] = useState(false);
  const [showBusinessModal, setShowBusinessModal] = useState(false);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowRiderModal(false);
        setShowBusinessModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Banner */}
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

      {/* Center Partner Opportunities Hub */}
      <div className="mt-8 rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50/70 to-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              Partner With SquadLink
            </div>
            <h2 className="font-display text-xl font-bold text-gray-900">
              Grow Your Business or Earn as a Courier
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Join our network of verified riders and physical merchants across Bauchi city.
            </p>
          </div>
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-5">
          {/* Become a Rider Card */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 flex flex-col justify-between hover:border-amber-300 transition-all">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                  <Bike className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  80% Delivery Payout
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-gray-900">
                Become a Rider
              </h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Turn your motorcycle or machine into steady daily earnings. Receive 80% of every delivery fee with a guaranteed minimum ₦400/trip, distance bonuses, and flexible bank withdrawals.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-md bg-white border border-amber-200 px-2 py-1 text-amber-900 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" /> 18+ Age & Valid ID
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-white border border-amber-200 px-2 py-1 text-amber-900 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" /> Roadworthy Machine
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-white border border-amber-200 px-2 py-1 text-amber-900 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" /> Fast Withdrawals
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowRiderModal(true)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors shadow-sm"
            >
              <Bike className="h-4 w-4" /> Become a Rider
            </button>
          </div>

          {/* Register Your Business Card */}
          <div className="rounded-2xl border border-primary-200 bg-primary-50/40 p-5 flex flex-col justify-between hover:border-primary-300 transition-all">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
                  <Building2 className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-bold text-primary-800">
                  Merchant Storefront
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-gray-900">
                Register Your Business
              </h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Connect your supermarket, restaurant, or store to customers across Bauchi. We provide on-demand dispatch courier pickups, order verification, and automatic bank settlements.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-md bg-white border border-primary-200 px-2 py-1 text-primary-900 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary-600" /> Physical Store in Bauchi
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-white border border-primary-200 px-2 py-1 text-primary-900 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary-600" /> In-Person Verification
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-white border border-primary-200 px-2 py-1 text-primary-900 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary-600" /> Courier Verification
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowBusinessModal(true)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Building2 className="h-4 w-4" /> Register Your Business
            </button>
          </div>
        </div>
      </div>

      {/* Orders and Categories Section */}
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
            {ordersLoading ? (
              <p className="text-sm text-gray-600">Loading your orders...</p>
            ) : ordersError ? (
              <p role="alert" className="text-sm text-red-700">We could not load your orders. Refresh the page to try again.</p>
            ) : activeOrders.length > 0 ? (
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
                <Link to="/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700">
                  View all orders <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <>
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
              </>
            )}
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

      {/* RIDER REQUIREMENTS MODAL */}
      {showRiderModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowRiderModal(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowRiderModal(false)}
              className="absolute top-5 right-5 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
                <Bike className="h-7 w-7" />
              </div>
              <div className="min-w-0 pr-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold mb-1">
                  SquadLink Dispatch Partner
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-gray-900">
                  Become a SquadLink Rider
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Review the mandatory eligibility standards, documents, and rules required to work as a verified courier in Bauchi.
                </p>
              </div>
            </div>

            {/* Rules & Requirements List */}
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <CheckCircle2 className="h-4 w-4 text-amber-600" />
                  1. Age & Legal Identification (18+)
                </h4>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed pl-6">
                  You must be at least 18 years of age and hold a valid government-issued ID (National Identity NIN slip/card, Permanent Voter's Card, International Passport, or valid Nigerian Driver's License).
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <CheckCircle2 className="h-4 w-4 text-amber-600" />
                  2. Roadworthy Machine / Vehicle & Helmet
                </h4>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed pl-6">
                  You must have access to a roadworthy motorcycle, bicycle, or dispatch machine in sound mechanical condition with working headlamps, tail lights, and rearview mirrors. Wearing a standard safety crash helmet is strictly mandatory on all trips.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <CheckCircle2 className="h-4 w-4 text-amber-600" />
                  3. Valid Documentation & Proof of Ownership
                </h4>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed pl-6">
                  Must provide valid vehicle particulars/registration documents, proof of ownership or written authorization from the vehicle owner, and a clear passport photograph during onboarding.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <Smartphone className="h-4 w-4 text-amber-600" />
                  4. GPS Smartphone & Internet Connection
                </h4>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed pl-6">
                  You need an active Android or iOS smartphone with working GPS location services and reliable mobile data to receive dispatch assignments, follow map routes, and verify customer delivery drop-offs.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  5. Delivery OTP Confirmation & Package Integrity
                </h4>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed pl-6">
                  Customer deliveries require the secret 6-digit confirmation OTP upon arrival. SquadLink enforces zero tolerance for opening, tampering with, or damaging food packages and customer goods.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <h4 className="flex items-center gap-2 text-sm font-bold text-amber-950">
                  <DollarSign className="h-4 w-4 text-amber-700" />
                  6. Earnings & Fast Bank Withdrawals
                </h4>
                <p className="mt-1 text-xs text-amber-900 leading-relaxed pl-6">
                  Riders receive <strong>80% of every delivery fee</strong> with a guaranteed minimum of <strong>₦400 per trip</strong>, plus stepped corridor distance bonuses for longer runs. Your earnings accumulate in your rider wallet and can be withdrawn directly to your Nigerian commercial bank account.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowRiderModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRiderModal(false);
                  navigate('/rider/register');
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 text-sm font-semibold text-white hover:bg-amber-700 transition-colors shadow-sm"
              >
                Proceed to Rider Registration <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BUSINESS REQUIREMENTS MODAL */}
      {showBusinessModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowBusinessModal(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowBusinessModal(false)}
              className="absolute top-5 right-5 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-md">
                <Building2 className="h-7 w-7" />
              </div>
              <div className="min-w-0 pr-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-800 text-xs font-semibold mb-1">
                  Merchant Partner Program
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-gray-900">
                  Register Your Business on SquadLink
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Important requirements, physical premises rules, and verification standards for merchants in Bauchi.
                </p>
              </div>
            </div>

            {/* Rules & Requirements List */}
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <MapPin className="h-4 w-4 text-primary-600" />
                  1. Physical Commercial Location in Bauchi
                </h4>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed pl-6">
                  You must operate an established, physical store, restaurant, supermarket, pharmacy, or commercial kitchen with a verifiable street address located in our active Bauchi service corridors.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <ShieldCheck className="h-4 w-4 text-primary-600" />
                  2. Physical On-Site Verification & Store Inspection
                </h4>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed pl-6">
                  Before your digital storefront is published to customers, a SquadLink partner operations officer will physically visit your business location to verify your premises, hygiene, stock capability, and operational legitimacy.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <Package className="h-4 w-4 text-primary-600" />
                  3. In-Person Courier Order Verification & Pickup
                </h4>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed pl-6">
                  You must be willing to have verified SquadLink dispatch riders visit your premises to inspect and confirm packaged orders (item count, correct packaging, food freshness) before taking custody and dispatching to customers.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <FileText className="h-4 w-4 text-primary-600" />
                  4. Honest Catalog Pricing & Active Stock Control
                </h4>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed pl-6">
                  All menu items, products, and prices displayed on SquadLink must accurately mirror your in-store retail prices. You must actively manage your catalogue and toggle off unavailable items to maintain high fulfillment ratings.
                </p>
              </div>

              <div className="rounded-2xl border border-primary-200 bg-primary-50/70 p-4">
                <h4 className="flex items-center gap-2 text-sm font-bold text-primary-950">
                  <DollarSign className="h-4 w-4 text-primary-700" />
                  5. Bank Account & Settlement Disbursement
                </h4>
                <p className="mt-1 text-xs text-primary-900 leading-relaxed pl-6">
                  You must provide a valid commercial Nigerian bank account under your business or registered trade name. Customer payments are held in escrow and settled directly into your account according to agreed settlement cycles.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowBusinessModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBusinessModal(false);
                  if (application?.status === 'VERIFIED') {
                    void openApprovedBusiness();
                  } else {
                    navigate('/business/register');
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-sm"
              >
                {application?.status === 'VERIFIED' ? 'Open Business Workspace' : 'Proceed to Business Registration'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
