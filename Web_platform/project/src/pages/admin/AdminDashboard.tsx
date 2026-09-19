import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Shield,
  Store,
  CheckCircle2,
  Clock,
  ArrowRight,
  LayoutDashboard,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { adminApi } from '@/api/admin';
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
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-business-verifications'],
    queryFn: adminApi.listBusinesses,
  });

  const businesses = Array.isArray(data?.data) ? (data.data as BusinessVerificationRecord[]) : [];

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
