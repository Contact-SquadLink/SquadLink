import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Store,
  CheckCircle2,
  Clock,
  ArrowRight,
  LayoutDashboard,
  XCircle,
  Users,
  Bike,
  UserCog,
  Ban,
  RotateCcw,
  Trash2,
  Banknote,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { adminApi, type PlatformAccount } from '@/api/admin';
import { earningsApi, type AdminWithdrawalRequest } from '@/api/earnings';
import { formatDate, formatPrice } from '@/utils/format';
import type { BusinessVerificationRecord } from '@/types';

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

function getStatusLabel(status: BusinessVerificationRecord['status']) {
  switch (status) {
    case 'VERIFIED':
      return 'Verified';
    case 'REJECTED':
      return 'Rejected';
    case 'SUSPENDED':
      return 'Suspended';
    default:
      return 'Pending Review';
  }
}

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const [withdrawalFilter, setWithdrawalFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED'>('ALL');
  const [withdrawalActionLoading, setWithdrawalActionLoading] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-business-verifications'],
    queryFn: adminApi.listBusinesses,
  });

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

  const businesses = Array.isArray(data?.data) ? (data.data as BusinessVerificationRecord[]) : [];
  const summaryQuery = useQuery({ queryKey: ['platform-summary'], queryFn: adminApi.getPlatformSummary, retry: false });
  const accountsQuery = useQuery({ queryKey: ['platform-accounts'], queryFn: adminApi.listAccounts, retry: false });
  const accounts = (accountsQuery.data?.data ?? []) as PlatformAccount[];
  const accountAction = async (action: 'suspend' | 'unsuspend' | 'delete', account: PlatformAccount) => {
    const reason = window.prompt(`Reason for ${action}ing this account:`)?.trim();
    if (!reason) return;
    if (action === 'suspend') await adminApi.suspendAccount(account.id, reason);
    if (action === 'unsuspend') await adminApi.unsuspendAccount(account.id, reason);
    if (action === 'delete') await adminApi.deleteAccount(account.id, reason);
    await queryClient.invalidateQueries({ queryKey: ['platform-accounts'] });
    await queryClient.invalidateQueries({ queryKey: ['platform-summary'] });
  };

  const stats = {
    total: businesses.length,
    verified: businesses.filter((b) => b.status === 'VERIFIED').length,
    pending: businesses.filter((b) => b.status === 'PENDING').length,
    rejected: businesses.filter((b) => b.status === 'REJECTED').length,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Admin Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">Platform operations, business verification, and oversight.</p>

      {/* Super Admin Absolute Authority Banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/70 p-6 text-white shadow-xl border border-emerald-500/25 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-48 w-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-300 border border-emerald-400/30">
              Super Admin Authority
            </span>
            <span className="text-xs text-slate-400">Governance & Unit Economics</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Command & Control Center
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Live observability (GMV, platform revenue, net contribution), 9-stage order intervention, double-entry ledger balancing, and pilot parameter governance.
          </p>
        </div>
        <Link
          to="/admin/control-center"
          className="relative z-10 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/50 hover:from-emerald-500 hover:to-teal-500 transition-all cursor-pointer"
        >
          Open Control Center <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          We could not load the business verification queue.
        </div>
      ) : null}

      {summaryQuery.error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Platform earnings and transaction metrics are unavailable. This account may not have access to the main-admin reporting endpoints.
        </div>
      ) : null}

      {accountsQuery.error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Platform account management is unavailable for this admin account.</div>}

      {summaryQuery.data?.data && <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4"><div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><Users className="h-5 w-5 text-primary-600" /><p className="mt-3 text-2xl font-bold text-gray-900">{summaryQuery.data.data.customers}</p><p className="text-xs text-gray-500">Customer accounts</p></div><div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><Store className="h-5 w-5 text-primary-600" /><p className="mt-3 text-2xl font-bold text-gray-900">{summaryQuery.data.data.businesses}</p><p className="text-xs text-gray-500">Business accounts</p></div><div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><Bike className="h-5 w-5 text-primary-600" /><p className="mt-3 text-2xl font-bold text-gray-900">{summaryQuery.data.data.riders}</p><p className="text-xs text-gray-500">Rider accounts</p></div><div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><UserCog className="h-5 w-5 text-primary-600" /><p className="mt-3 text-2xl font-bold text-gray-900">{summaryQuery.data.data.admins}</p><p className="text-xs text-gray-500">Admin accounts</p></div></div>}

      {summaryQuery.data?.data && <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4"><div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><CheckCircle2 className="h-5 w-5 text-success-600" /><p className="mt-3 text-2xl font-bold text-gray-900">{summaryQuery.data.data.completed_transactions}</p><p className="text-xs text-gray-500">Completed transactions</p></div><div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><Clock className="h-5 w-5 text-warning-600" /><p className="mt-3 text-2xl font-bold text-gray-900">{summaryQuery.data.data.pending_transactions}</p><p className="text-xs text-gray-500">Pending transactions</p></div><div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><Bike className="h-5 w-5 text-primary-600" /><p className="mt-3 text-2xl font-bold text-gray-900">{summaryQuery.data.data.in_transit_transactions}</p><p className="text-xs text-gray-500">In transit</p></div><div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><Shield className="h-5 w-5 text-secondary-600" /><p className="mt-3 text-2xl font-bold text-gray-900">{summaryQuery.data.data.assigned_transactions}</p><p className="text-xs text-gray-500">Assigned</p></div></div>}

      {summaryQuery.data?.data && <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><p className="text-xs text-gray-500">Completed order value</p><p className="mt-2 text-2xl font-bold text-gray-900">NGN {summaryQuery.data.data.gross_completed_value.toLocaleString()}</p></div><div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><p className="text-xs text-gray-500">Recipient earnings</p><p className="mt-2 text-2xl font-bold text-gray-900">NGN {summaryQuery.data.data.recipient_earnings.toLocaleString()}</p></div><div className="rounded-2xl border border-primary-200 bg-primary-50 p-5 shadow-sm"><p className="text-xs text-primary-700">Derived platform earnings</p><p className="mt-2 text-2xl font-bold text-primary-900">NGN {summaryQuery.data.data.platform_earnings.toLocaleString()}</p></div></div>}

      {accountsQuery.data?.data && <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-display text-lg font-bold text-gray-900">Account authority</h2><p className="text-sm text-gray-500">Suspend, restore, or soft-delete accounts. Every action requires a reason and is audited.</p></div></div><div className="mt-4 space-y-2">{accounts.slice(0, 20).map((account) => <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 py-3"><div><p className="text-sm font-semibold text-gray-900">{[account.firstName, account.lastName].filter(Boolean).join(' ') || account.email || account.phoneNumber || account.id}</p><p className="text-xs text-gray-500">{account.role} · {account.deletedAt ? 'Deleted' : account.isActive ? 'Active' : 'Suspended'}</p></div><div className="flex gap-2">{!account.deletedAt && account.isActive && <button type="button" onClick={() => void accountAction('suspend', account)} title="Suspend account" className="rounded-lg border border-warning-200 p-2 text-warning-700"><Ban className="h-4 w-4" /></button>}{!account.deletedAt && !account.isActive && <button type="button" onClick={() => void accountAction('unsuspend', account)} title="Unsuspend account" className="rounded-lg border border-success-200 p-2 text-success-700"><RotateCcw className="h-4 w-4" /></button>}{!account.deletedAt && <button type="button" onClick={() => void accountAction('delete', account)} title="Delete account" className="rounded-lg border border-red-200 p-2 text-red-700"><Trash2 className="h-4 w-4" /></button>}</div></div>)}</div></div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-white">
            <Store className="h-5 w-5" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-gray-900">{isLoading ? '…' : stats.total}</p>
          <p className="text-xs text-gray-500">Total Businesses</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 text-success-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-gray-900">{isLoading ? '…' : stats.verified}</p>
          <p className="text-xs text-gray-500">Verified</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-100 text-warning-700">
            <Clock className="h-5 w-5" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-gray-900">{isLoading ? '…' : stats.pending}</p>
          <p className="text-xs text-gray-500">Pending Review</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-700">
            <XCircle className="h-5 w-5" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-gray-900">{isLoading ? '…' : stats.rejected}</p>
          <p className="text-xs text-gray-500">Rejected</p>
        </div>
      </div>

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

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-gray-900">Verification Queue</h2>
          <Link
            to="/admin/businesses"
            className="text-sm font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
          >
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-600">Loading businesses…</p>
        ) : businesses.length === 0 ? (
          <EmptyState
            icon={<Store className="h-7 w-7" />}
            title="No businesses registered"
            description="Registered businesses will appear here for verification."
          />
        ) : (
          <div className="space-y-2">
            {businesses.slice(0, 5).map((business) => (
              <Link
                key={business.businessId}
                to={`/admin/businesses/${business.businessId}`}
                className="flex items-center justify-between rounded-xl border border-gray-100 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                    <Store className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{business.businessName}</p>
                    <p className="text-xs text-gray-500">{business.businessEmail || business.businessPhoneNumber || 'No contact info'}</p>
                  </div>
                </div>
                <Badge variant={getStatusBadgeVariant(business.status)}>
                  {getStatusLabel(business.status)}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Withdrawal Requests & Payouts Review */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-gray-900">Withdrawal Requests (Payouts)</h2>
              <p className="text-xs text-gray-500">Review and authorize payouts for riders, merchants, and customers.</p>
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
          <p className="text-sm text-gray-600">Loading withdrawal requests...</p>
        ) : withdrawalsQuery.isError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
            Platform withdrawal requests are only accessible to the primary administrator.
          </div>
        ) : !withdrawalsQuery.data?.data || withdrawalsQuery.data.data.length === 0 ? (
          <EmptyState
            icon={<Banknote className="h-7 w-7 text-gray-400" />}
            title="No withdrawal requests"
            description="When users or couriers request withdrawals, they will appear here for verification and payout."
          />
        ) : (
          <div className="space-y-3">
            {withdrawalsQuery.data.data
              .filter((w) => (withdrawalFilter === 'ALL' ? true : w.status === withdrawalFilter))
              .map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-all bg-gray-50/40"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-gray-900">
                        {item.firstName && item.lastName ? `${item.firstName} ${item.lastName}` : item.email}
                      </span>
                      {item.username && (
                        <span className="rounded-md bg-primary-50 px-1.5 py-0.5 text-xs font-semibold text-primary-700">
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
                        <p className="text-red-600 font-medium">Reason: {item.reviewReason}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:self-center">
                    <div className="text-right sm:mr-3">
                      <p className="text-base font-extrabold text-gray-900">{formatPrice(Number(item.amount))}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{item.currency || 'NGN'}</p>
                    </div>

                    {item.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={withdrawalActionLoading === item.id}
                          onClick={() => handleReviewWithdrawal(item.id, 'APPROVED')}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button
                          type="button"
                          disabled={withdrawalActionLoading === item.id}
                          onClick={() => handleReviewWithdrawal(item.id, 'REJECTED')}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors cursor-pointer"
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
                        className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary-700 disabled:opacity-50 transition-colors cursor-pointer"
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
    </div>
  );
}
