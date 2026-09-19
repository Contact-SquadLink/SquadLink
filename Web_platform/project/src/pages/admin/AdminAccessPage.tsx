import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCheck, UserX, ShieldAlert } from 'lucide-react';
import { adminApi } from '@/api/admin';
import type { AdminAccessRequest } from '@/types';

export function AdminAccessPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-access-requests'],
    queryFn: adminApi.listAccessRequests,
  });

  const approveMutation = useMutation({
    mutationFn: (userId: string) => adminApi.approveAccessRequest(userId, { notes: 'Approved by the main Squadlink admin.' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-access-requests'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (userId: string) => adminApi.rejectAccessRequest(userId, { notes: 'Rejected by the main Squadlink admin.' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-access-requests'] });
    },
  });

  const requests = (data?.data as AdminAccessRequest[] | undefined) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Admin Access</h1>
          <p className="text-sm text-gray-500">Review requests for platform admin access.</p>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          We could not load admin access requests.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
          Loading access requests…
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-900">No pending admin requests</p>
          <p className="mt-2 text-sm text-gray-500">All admin access approvals are up to date.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-base font-semibold text-gray-900">{request.requestedUserName || 'Unnamed admin request'}</p>
                  <p className="text-sm text-gray-500">{request.requestedUserEmail || 'No email provided'}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Requested {new Date(request.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => approveMutation.mutate(request.requestedUserId ?? request.id)}
                    disabled={approveMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-success-600 px-4 py-2 text-sm font-semibold text-white hover:bg-success-700 disabled:opacity-70"
                  >
                    <UserCheck className="h-4 w-4" />
                    {approveMutation.isPending ? 'Approving…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectMutation.mutate(request.requestedUserId ?? request.id)}
                    disabled={rejectMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg border border-error-200 px-4 py-2 text-sm font-semibold text-error-600 hover:bg-error-50 disabled:opacity-70"
                  >
                    <UserX className="h-4 w-4" />
                    {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
