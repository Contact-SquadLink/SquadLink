import { useQuery } from '@tanstack/react-query';
import { BarChart3, Store, Clock3 } from 'lucide-react';
import { adminApi } from '@/api/admin';
import type { BusinessVerificationRecord } from '@/types';

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

export function AdminOperationsPage() {
  const { data, isLoading } = useQuery({
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
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Operations</h1>
      <p className="text-sm text-gray-500 mb-6">Platform-wide operational overview and verification queue.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Store, label: 'Total Businesses', value: isLoading ? '…' : stats.total.toString(), color: 'bg-primary-100 text-primary-700' },
          { icon: BarChart3, label: 'Verified', value: isLoading ? '…' : stats.verified.toString(), color: 'bg-success-100 text-success-700' },
          { icon: Clock3, label: 'Pending Review', value: isLoading ? '…' : stats.pending.toString(), color: 'bg-warning-100 text-warning-700' },
          { icon: BarChart3, label: 'Rejected', value: isLoading ? '…' : stats.rejected.toString(), color: 'bg-red-100 text-red-700' },
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

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Business Overview</h2>
        <div className="space-y-3">
          {businesses.length === 0 ? (
            <p className="text-sm text-gray-600">No business verification records are available yet.</p>
          ) : (
            businesses.map((business) => (
              <div key={business.businessId} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{business.businessName}</p>
                  <p className="text-xs text-gray-500">{business.businessEmail || business.businessPhoneNumber || 'No contact info'}</p>
                </div>
                <span className="text-xs font-semibold text-gray-700">{getStatusLabel(business.status)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
