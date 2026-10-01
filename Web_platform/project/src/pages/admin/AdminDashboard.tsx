import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Store,
  Bike,
  ShieldAlert,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  Check,
  X,
  Filter,
  Package,
  Layers,
  Truck,
  RotateCcw,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { adminApi } from '@/api/admin';
import { earningsApi } from '@/api/earnings';
import { formatDate, formatPrice } from '@/utils/format';
import type { BusinessVerificationRecord, LiveOperationItem } from '@/types';

function getStatusBadgeVariant(status: BusinessVerificationRecord['status']) {
  switch (status) {
    case 'VERIFIED':
      return 'success';
    case 'REJECTED':
      return 'error';
    case 'SUSPENDED':
      return 'neutral';
    default:
      return 'warning';
  }
}

export function AdminDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.email === 'contact.squadlink@gmail.com';

  const [timePeriod, setTimePeriod] = useState<'today' | '7d' | '30d' | '90d' | 'all'>('7d');
  const [withdrawalFilter, setWithdrawalFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED'>('ALL');
  const [withdrawalActionLoading, setWithdrawalActionLoading] = useState<string | null>(null);

  // Platform summary query
  const summaryQuery = useQuery({
    queryKey: ['admin-platform-summary', timePeriod],
    queryFn: () => adminApi.getPlatformSummary(timePeriod),
    refetchInterval: 30000,
  });

  // Live Operations query
  const liveOpsQuery = useQuery({
    queryKey: ['admin-live-operations'],
    queryFn: adminApi.getLiveOperations,
    refetchInterval: 15000,
  });

  // Verification queue query
  const businessesQuery = useQuery({
    queryKey: ['admin-business-verifications'],
    queryFn: adminApi.listBusinesses,
  });

  // Withdrawals query
  const withdrawalsQuery = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: () => earningsApi.listWithdrawals(),
  });

  const handleReviewWithdrawal = async (id: string, status: 'APPROVED' | 'REJECTED' | 'PAID') => {
    let reason: string | undefined;
    if (status === 'REJECTED') {
      const inputReason = window.prompt('Please provide a reason for declining this withdrawal:');
      if (inputReason === null) return;
      reason = inputReason.trim() || 'Declined during administrative review';
    }
    setWithdrawalActionLoading(id);
    try {
      await earningsApi.reviewWithdrawal(id, status, reason);
      await queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update withdrawal');
    } finally {
      setWithdrawalActionLoading(null);
    }
  };

  const summary = summaryQuery.data?.data;
  const liveOps = (liveOpsQuery.data?.data || []) as LiveOperationItem[];
  const businesses = Array.isArray(businessesQuery.data?.data)
    ? (businessesQuery.data.data as BusinessVerificationRecord[])
    : [];

  const timePeriodLabels: Record<typeof timePeriod, string> = {
    today: 'Today',
    '7d': '7 Days',
    '30d': '30 Days',
    '90d': '90 Days',
    all: 'All Time',
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-gray-900">Admin Operations Center</h1>
            {isSuperAdmin ? (
              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-bold text-white tracking-wider">
                Super Admin
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                Operations Admin
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Operational governance, corridor monitoring, and fulfilment oversight.
          </p>
        </div>

        {/* Time Filters */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-gray-100 p-1">
            {(['today', '7d', '30d', '90d', 'all'] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setTimePeriod(period)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  timePeriod === period
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {timePeriodLabels[period]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Super Admin Control Center Banner (Differentiated Experience) */}
      {isSuperAdmin && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-900 p-6 text-white shadow-md border border-slate-800 relative overflow-hidden">
          <div className="space-y-1 relative z-10 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300 border border-emerald-400/30">
                Super Admin Command & Governance
              </span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white">
              Platform Economics, Ledger & Emergency Controls
            </h2>
            <p className="text-xs text-slate-300">
              Access double-entry platform ledger, 9-stage order state overrides, pricing tiers, and audit trails.
            </p>
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <Link
              to="/admin/management"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
            >
              <Users className="h-3.5 w-3.5" /> Manage Admins
            </Link>
            <Link
              to="/admin/control-center"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              Control Center <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Row 1: Platform Population Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Customers */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customers</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            {summaryQuery.isLoading ? '…' : summary?.population?.customers?.total ?? 0}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
            <span className="text-emerald-600 font-medium">
              {summary?.population?.customers?.active ?? 0} active
            </span>
            <span>·</span>
            <Link to="/admin/customers" className="text-slate-900 font-semibold hover:underline">
              Manage →
            </Link>
          </div>
        </div>

        {/* Businesses */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Businesses</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <Store className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            {summaryQuery.isLoading ? '…' : summary?.population?.businesses?.total ?? 0}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
            <span className="text-emerald-600 font-medium">
              {summary?.population?.businesses?.verified ?? 0} verified
            </span>
            <span>·</span>
            <span className="text-amber-600 font-medium">
              {summary?.population?.businesses?.pending ?? 0} pending
            </span>
          </div>
        </div>

        {/* Riders */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Riders</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Bike className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            {summaryQuery.isLoading ? '…' : summary?.population?.riders?.total ?? 0}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
            <span className="text-emerald-600 font-medium">
              {summary?.population?.riders?.verified ?? 0} verified
            </span>
            <span>·</span>
            <span className="text-sky-600 font-medium">
              {summary?.population?.riders?.active ?? 0} available
            </span>
          </div>
        </div>

        {/* Administrators (Shown ONLY if accessible - Super Admin or permitted) */}
        {summary?.population?.admins !== null && summary?.population?.admins !== undefined ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Administrators</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Lock className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">
              {summaryQuery.isLoading ? '…' : summary.population.admins}
            </p>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
              <span className="text-slate-600 font-medium">System governance</span>
              {isSuperAdmin && (
                <>
                  <span>·</span>
                  <Link to="/admin/management" className="text-slate-900 font-semibold hover:underline">
                    Roster →
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Operational Health Fallback Card for Ordinary Admins */
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Attention Needed</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-amber-600">{liveOps.length}</p>
            <p className="mt-1 text-[11px] text-gray-500">Active fulfilment bottlenecks</p>
          </div>
        )}
      </div>

      {/* Row 2: Live Operations Attention Queue (Section 10) */}
      <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-gray-900">
                Live Operations — Attention Queue
              </h2>
              <p className="text-xs text-gray-500">
                Stalled orders, unassigned dispatches, preparation delays, and cancellations.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
            {liveOps.length} items requiring review
          </span>
        </div>

        {liveOpsQuery.isLoading ? (
          <p className="py-6 text-center text-xs text-gray-500">Checking active operations...</p>
        ) : liveOps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
            <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" />
            <p className="mt-2 text-sm font-semibold text-gray-900">All Operations Flowing Smoothly</p>
            <p className="text-xs text-gray-500">
              No orders are currently waiting for acceptance, rider assignment, or reporting delays.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50/75 uppercase font-semibold text-gray-500 tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Attention Reason</th>
                  <th className="px-4 py-2.5">Order</th>
                  <th className="px-4 py-2.5">Business & Customer</th>
                  <th className="px-4 py-2.5">Current Status</th>
                  <th className="px-4 py-2.5">Duration</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {liveOps.map((item) => (
                  <tr key={item.orderId} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                        <AlertTriangle className="h-3 w-3 shrink-0" /> {item.reason}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-gray-900">
                      #{item.orderId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{item.businessName}</p>
                      <p className="text-[11px] text-gray-500">{item.customerName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="neutral">{item.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {item.minutesElapsed} mins ago
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/admin/support"
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Intervene <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row 3: Operations 9-Stage Breakdown */}
      <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-base font-bold text-gray-900">
              Fulfillment Pipeline Overview ({timePeriodLabels[timePeriod]})
            </h2>
            <p className="text-xs text-gray-500">Volume distribution across order lifecycle states.</p>
          </div>
          <Link
            to="/admin/deliveries"
            className="text-xs font-semibold text-slate-900 hover:underline inline-flex items-center gap-1"
          >
            Monitor Deliveries <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
            <span className="text-[11px] font-medium text-gray-400 uppercase">Pending Payment</span>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {summary?.operations?.pendingPayment ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
            <span className="text-[11px] font-medium text-gray-400 uppercase">Awaiting Merchant</span>
            <p className="mt-1 text-xl font-bold text-amber-600">
              {summary?.operations?.awaitingAcceptance ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
            <span className="text-[11px] font-medium text-gray-400 uppercase">Preparing</span>
            <p className="mt-1 text-xl font-bold text-sky-600">
              {summary?.operations?.preparing ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
            <span className="text-[11px] font-medium text-gray-400 uppercase">Awaiting Rider</span>
            <p className="mt-1 text-xl font-bold text-indigo-600">
              {summary?.operations?.readyForPickup ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
            <span className="text-[11px] font-medium text-gray-400 uppercase">In Transit</span>
            <p className="mt-1 text-xl font-bold text-blue-600">
              {summary?.operations?.inTransit ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
            <span className="text-[11px] font-medium text-gray-400 uppercase">Delivered</span>
            <p className="mt-1 text-xl font-bold text-emerald-600">
              {summary?.operations?.delivered ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Row 4: Financial Snapshot (Restricted to permitted / Super Admin) */}
      {summary?.financial && (
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-gray-900">
                Financial Volume Snapshot ({timePeriodLabels[timePeriod]})
              </h2>
              <p className="text-xs text-gray-500">Gross Merchandise Value, Platform Fee Revenue, and Courier Settlements.</p>
            </div>
            {isSuperAdmin && (
              <Link
                to="/admin/control-center"
                className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
              >
                Open Full Ledger <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <span className="text-xs font-semibold text-gray-500 uppercase">Gross Merchandise Value (GMV)</span>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatPrice(summary.financial.gmv)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Total consumer transactions completed</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <span className="text-xs font-semibold text-gray-500 uppercase">SquadLink Derived Revenue</span>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatPrice(summary.financial.platformFeeRevenue)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Platform service fees retained</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
              <span className="text-xs font-semibold text-emerald-800 uppercase">Recipient Settlements</span>
              <p className="mt-2 text-2xl font-bold text-emerald-700">
                {formatPrice(summary.financial.riderPayouts)}
              </p>
              <p className="text-[11px] text-emerald-600 mt-1">Settled to fulfilling merchants & riders</p>
            </div>
          </div>
        </div>
      )}

      {/* Row 5: Quick Navigation to Queues */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link
          to="/admin/businesses"
          className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:border-slate-900 hover:shadow-sm transition-all"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
            <Store className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-sm font-bold text-gray-900">Business Verification</h3>
            <p className="text-xs text-gray-500">{businesses.filter((b) => b.status === 'PENDING').length} pending approval</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400" />
        </Link>

        <Link
          to="/admin/riders"
          className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:border-slate-900 hover:shadow-sm transition-all"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
            <Bike className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-sm font-bold text-gray-900">Rider Verification</h3>
            <p className="text-xs text-gray-500">Inspect courier onboardings</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400" />
        </Link>

        <Link
          to="/admin/support"
          className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:border-slate-900 hover:shadow-sm transition-all"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-sm font-bold text-gray-900">Support & Issues</h3>
            <p className="text-xs text-gray-500">Record & resolve friction</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400" />
        </Link>
      </div>

      {/* Row 6: Withdrawal Requests (Payouts Review Queue) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-gray-900">Withdrawal Requests (Payouts)</h2>
              <p className="text-xs text-gray-500">Review and authorize bank payouts for couriers and merchants.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
            {(['ALL', 'PENDING', 'APPROVED', 'PAID', 'REJECTED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setWithdrawalFilter(st)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  withdrawalFilter === st
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {withdrawalsQuery.isLoading ? (
          <p className="text-xs text-gray-500 py-6 text-center">Loading withdrawal requests...</p>
        ) : withdrawalsQuery.isError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
            Platform withdrawal requests are restricted to authorized administrators.
          </div>
        ) : !withdrawalsQuery.data?.data || withdrawalsQuery.data.data.length === 0 ? (
          <EmptyState
            icon={<Banknote className="h-7 w-7 text-gray-400" />}
            title="No withdrawal requests"
            description="When merchants or couriers request earnings payouts, they will appear here for authorization."
          />
        ) : (
          <div className="space-y-3">
            {withdrawalsQuery.data.data
              .filter((w) => (withdrawalFilter === 'ALL' ? true : w.status === withdrawalFilter))
              .map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-all bg-gray-50/30"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm">
                        {item.firstName && item.lastName ? `${item.firstName} ${item.lastName}` : item.email}
                      </span>
                      {item.username && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                          @{item.username}
                        </span>
                      )}
                      <Badge variant="neutral">{item.role}</Badge>
                      <Badge
                        variant={
                          item.status === 'PAID'
                            ? 'success'
                            : item.status === 'APPROVED'
                            ? 'info'
                            : item.status === 'REJECTED'
                            ? 'error'
                            : 'warning'
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>

                    <div className="text-xs text-gray-600 space-y-0.5">
                      <p>
                        <span className="font-semibold text-gray-700">Bank:</span> {item.payoutDetails?.bankName || 'N/A'} ·{' '}
                        <span className="font-semibold text-gray-700">Acct No:</span> {item.payoutDetails?.accountNumber || 'N/A'} ·{' '}
                        <span className="font-semibold text-gray-700">Name:</span> {item.payoutDetails?.accountName || 'N/A'}
                      </p>
                      <p className="text-[11px] text-gray-400">Requested: {formatDate(item.createdAt)}</p>
                      {item.reviewReason && (
                        <p className="text-rose-600 font-medium">Reason: {item.reviewReason}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:self-center">
                    <div className="text-right sm:mr-3">
                      <p className="text-base font-bold text-gray-900">{formatPrice(Number(item.amount))}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{item.currency || 'NGN'}</p>
                    </div>

                    {item.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={withdrawalActionLoading === item.id}
                          onClick={() => handleReviewWithdrawal(item.id, 'APPROVED')}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button
                          type="button"
                          disabled={withdrawalActionLoading === item.id}
                          onClick={() => handleReviewWithdrawal(item.id, 'REJECTED')}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" /> Reject
                        </button>
                      </div>
                    )}

                    {item.status === 'APPROVED' && (
                      <button
                        type="button"
                        disabled={withdrawalActionLoading === item.id}
                        onClick={() => handleReviewWithdrawal(item.id, 'PAID')}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" /> Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Row 7: Business Verification Queue Preview */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-base font-bold text-gray-900">Business Verification Queue</h2>
            <p className="text-xs text-gray-500">Merchant onboarding applications awaiting document review.</p>
          </div>
          <Link
            to="/admin/businesses"
            className="text-xs font-semibold text-slate-900 hover:underline inline-flex items-center gap-1"
          >
            View All ({businesses.length}) <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {businessesQuery.isLoading ? (
          <p className="text-xs text-gray-500 py-4 text-center">Loading businesses...</p>
        ) : businesses.length === 0 ? (
          <EmptyState
            icon={<Store className="h-7 w-7 text-gray-400" />}
            title="No businesses pending"
            description="All business merchant registrations have been processed."
          />
        ) : (
          <div className="space-y-2">
            {businesses.slice(0, 5).map((business) => (
              <Link
                key={business.businessId}
                to={`/admin/businesses/${business.businessId}`}
                className="flex items-center justify-between rounded-xl border border-gray-100 p-3 hover:bg-gray-50/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50">
                    <Store className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{business.businessName}</p>
                    <p className="text-xs text-gray-500">
                      {business.businessEmail || business.businessPhoneNumber || 'No contact info'}
                    </p>
                  </div>
                </div>
                <Badge variant={getStatusBadgeVariant(business.status)}>
                  {business.status}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
