import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Store, ChevronRight, MapPin, Phone, Mail, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { adminApi } from '@/api/admin';
import type { BusinessVerificationHistoryRecord, BusinessVerificationRecord } from '@/types';

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

export function AdminBusinessesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-business-verifications'],
    queryFn: adminApi.listBusinesses,
  });

  const businesses = Array.isArray(data?.data) ? (data.data as BusinessVerificationRecord[]) : [];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Businesses</h1>
      <p className="text-sm text-gray-500 mb-6">Review business registrations and verification status.</p>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          We could not load the business verification list.
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-gray-600">Loading businesses…</p>
      ) : businesses.length === 0 ? (
        <EmptyState
          icon={<Store className="h-7 w-7" />}
          title="No businesses registered"
          description="Registered businesses will appear here for verification."
        />
      ) : (
        <div className="space-y-3">
          {businesses.map((business) => (
            <Link
              key={business.businessId}
              to={`/admin/businesses/${business.businessId}`}
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
                <Store className="h-6 w-6 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{business.businessName}</p>
                <p className="text-xs text-gray-500 truncate">
                  {business.businessEmail || business.businessPhoneNumber || 'No contact info'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={getStatusBadgeVariant(business.status)}>
                  {getStatusLabel(business.status)}
                </Badge>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminBusinessDetailPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-business-verification', businessId],
    queryFn: () => adminApi.getBusiness(businessId as string),
    enabled: !!businessId,
  });

  const verification = data?.data?.verification as BusinessVerificationRecord | undefined;
  const history = (data?.data?.history as BusinessVerificationHistoryRecord[] | undefined) ?? [];

  const verifyMutation = useMutation({
    mutationFn: () => adminApi.reviewBusiness(businessId as string, { status: 'VERIFIED', notes: 'Approved by admin review.' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-business-verification', businessId] });
      void queryClient.invalidateQueries({ queryKey: ['admin-business-verifications'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => adminApi.reviewBusiness(businessId as string, { status: 'REJECTED', notes: 'Rejected by admin review.' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-business-verification', businessId] });
      void queryClient.invalidateQueries({ queryKey: ['admin-business-verifications'] });
    },
  });

  const businessStatus = verification?.status ?? 'PENDING';

  if (isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-gray-600">Loading business details…</div>;
  }

  if (error || !verification) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <EmptyState
          icon={<Store className="h-7 w-7" />}
          title="Business not found"
          description="This business record could not be loaded from the verification system."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/admin/businesses"
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-primary-700 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Businesses
      </Link>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
              <Store className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-gray-900">{verification.businessName}</h1>
              <Badge variant={getStatusBadgeVariant(businessStatus)} className="mt-2">
                {getStatusLabel(businessStatus)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          {verification.city && verification.state && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" /> {verification.city}, {verification.state}
            </div>
          )}
          {verification.businessPhoneNumber && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" /> {verification.businessPhoneNumber}
            </div>
          )}
          {verification.businessEmail && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" /> {verification.businessEmail}
            </div>
          )}
        </div>

        {verification.status === 'PENDING' && (
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-success-600 px-4 text-sm font-semibold text-white hover:bg-success-700 transition-colors disabled:opacity-70"
            >
              {verifyMutation.isPending ? 'Verifying…' : 'Verify Business'}
            </button>
            <button
              type="button"
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-error-200 px-4 text-sm font-semibold text-error-600 hover:bg-error-50 transition-colors disabled:opacity-70"
            >
              {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Verification History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-600">No review history has been recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">{getStatusLabel(entry.newStatus)}</p>
                  <span className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleString()}</span>
                </div>
                {entry.reason && <p className="mt-2 text-sm text-gray-600">{entry.reason}</p>}
                {entry.changedBy && <p className="mt-2 text-xs text-gray-500">Reviewed by user ID: {entry.changedBy}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
