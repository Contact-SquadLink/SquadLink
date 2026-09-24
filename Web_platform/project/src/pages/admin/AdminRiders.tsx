import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { adminApi, type RiderVerificationRecord } from '@/api/admin';
import type { VerificationStatus } from '@/types';

function variant(status: VerificationStatus): 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  return status === 'VERIFIED' ? 'success' : status === 'REJECTED' ? 'error' : status === 'SUSPENDED' ? 'neutral' : 'warning';
}

export function AdminRidersPage() {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-rider-verifications'], queryFn: adminApi.listRiders });
  const review = useMutation({
    mutationFn: ({ riderId, status }: { riderId: string; status: VerificationStatus }) => adminApi.reviewRider(riderId, { status, notes: notes[riderId] || null }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['admin-rider-verifications'] }); },
  });
  const riders = (data?.data ?? []) as RiderVerificationRecord[];

  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><h1 className="font-display text-2xl font-bold text-gray-900">Rider verification</h1><p className="mt-1 text-sm text-gray-500">Review rider applications before they can receive deliveries.</p>{isLoading && <p className="mt-6 text-sm text-gray-600">Loading rider applications...</p>}{error && <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">We could not load rider applications.</p>}{!isLoading && !error && riders.length === 0 && <div className="mt-6"><EmptyState title="No rider applications" description="New rider applications will appear here." /></div>}<div className="mt-6 space-y-4">{riders.map((rider) => <div key={rider.riderId} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-gray-900">{rider.firstName || rider.lastName ? `${rider.firstName ?? ''} ${rider.lastName ?? ''}`.trim() : rider.email || 'Rider applicant'}</h2><p className="mt-1 text-sm text-gray-500">{rider.email ?? rider.phoneNumber ?? 'No contact'} · {rider.vehicleType ?? 'Vehicle pending'} · {rider.vehicleRegistration ?? 'Registration pending'}</p></div><Badge variant={variant(rider.status)}>{rider.status}</Badge></div><textarea value={notes[rider.riderId] ?? rider.verificationNotes ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [rider.riderId]: event.target.value }))} placeholder="Review notes" rows={2} className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={review.isPending || rider.status === 'VERIFIED'} onClick={() => review.mutate({ riderId: rider.riderId, status: 'VERIFIED' })} className="rounded-lg bg-success-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Approve</button><button type="button" disabled={review.isPending || rider.status === 'REJECTED'} onClick={() => review.mutate({ riderId: rider.riderId, status: 'REJECTED' })} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Reject</button><button type="button" disabled={review.isPending || rider.status === 'SUSPENDED'} onClick={() => review.mutate({ riderId: rider.riderId, status: 'SUSPENDED' })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">Suspend</button></div></div>)}</div></div>;
}
