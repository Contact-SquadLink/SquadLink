import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { adminApi, type PlatformAccount } from '@/api/admin';
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
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-business-verifications'],
    queryFn: adminApi.listBusinesses,
  });

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

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          We could not load the business verification queue.
        </div>
      ) : null}

      {summaryQuery.data?.data && <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4"><div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><Users className="h-5 w-5 text-primary-600" /><p className="mt-3 text-2xl font-bold text-gray-900">{summaryQuery.data.data.customers}</p><p className="text-xs text-gray-500">Customer accounts</p></div><div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><Store className="h-5 w-5 text-primary-600" /><p className="mt-3 text-2xl font-bold text-gray-900">{summaryQuery.data.data.businesses}</p><p className="text-xs text-gray-500">Business accounts</p></div><div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><Bike className="h-5 w-5 text-primary-600" /><p className="mt-3 text-2xl font-bold text-gray-900">{summaryQuery.data.data.riders}</p><p className="text-xs text-gray-500">Rider accounts</p></div><div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><UserCog className="h-5 w-5 text-primary-600" /><p className="mt-3 text-2xl font-bold text-gray-900">{summaryQuery.data.data.admins}</p><p className="text-xs text-gray-500">Admin accounts</p></div></div>}

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
    </div>
  );
}
