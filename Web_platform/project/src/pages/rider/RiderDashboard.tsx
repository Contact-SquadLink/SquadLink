import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, Package, ArrowRight, Clock, MapPin, CheckCircle2, LocateFixed } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { formatDate } from '@/utils/format';
import { riderApi } from '@/api/rider';
import type { Delivery, DeliveryStatus } from '@/types';

const statusVariants: Record<DeliveryStatus, 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  SEARCHING_RIDER: 'warning',
  ASSIGNED: 'info',
  PICKED_UP: 'info',
  IN_TRANSIT: 'info',
  ARRIVED: 'warning',
  DELIVERED: 'success',
};

export function RiderDashboard() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ['rider-profile'], queryFn: riderApi.getProfile, refetchInterval: 15000 });
  const { data, isLoading } = useQuery({
    queryKey: ['rider-deliveries'],
    queryFn: riderApi.listDeliveries,
    refetchInterval: 15000,
  });

  const deliveries = (data?.data ?? []) as Delivery[];
  const activeDeliveries = deliveries.filter((d) => ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'].includes(d.status));
  const completedDeliveries = deliveries.filter((d) => d.status === 'DELIVERED');
  const availabilityMutation = useMutation({
    mutationFn: (available: boolean) => riderApi.setAvailable(available),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rider-profile'] });
      void queryClient.invalidateQueries({ queryKey: ['rider-deliveries'] });
    },
  });
  const locationMutation = useMutation({
    mutationFn: ({ latitude, longitude }: { latitude: number; longitude: number }) => riderApi.setLocation(latitude, longitude),
  });
  const profile = profileQuery.data?.data;
  const updateLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => locationMutation.mutate({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => undefined
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Rider Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">Your assigned deliveries and delivery workflow.</p>

      <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
            <Bike className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-primary-900">Availability</h2>
            <p className="text-xs text-primary-700">{profile?.verificationStatus === 'VERIFIED' ? 'Verified rider account.' : 'Your account is awaiting verification.'}</p>
          </div>
        </div>
        {profile?.verificationStatus === 'VERIFIED' && <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => availabilityMutation.mutate(!profile.available)} disabled={availabilityMutation.isPending} className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{profile.available ? 'Go offline' : 'Go online'}</button><button type="button" onClick={updateLocation} disabled={locationMutation.isPending} className="inline-flex items-center gap-2 rounded-lg border border-primary-200 px-3 py-2 text-sm font-semibold text-primary-700 disabled:opacity-50"><LocateFixed className="h-4 w-4" /> Update location</button></div>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100 text-accent-700">
            <Package className="h-5 w-5" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-gray-900">{activeDeliveries.length}</p>
          <p className="text-xs text-gray-500">Active Deliveries</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 text-success-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-gray-900">{completedDeliveries.length}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-100 text-secondary-700">
            <Bike className="h-5 w-5" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-gray-900">{deliveries.length}</p>
          <p className="text-xs text-gray-500">Total deliveries</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-600">Loading rider deliveries…</p>
      ) : deliveries.length === 0 ? (
        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title="No deliveries assigned"
          description="When deliveries are assigned to you, they will appear here."
        />
      ) : null}

      {activeDeliveries.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Active Deliveries</h2>
          <div className="space-y-3">
            {activeDeliveries.map((delivery) => (
              <Link
                key={delivery.id}
                to={`/rider/deliveries/${delivery.id}`}
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
                  <Package className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">
                    Delivery #{delivery.id.slice(-6).toUpperCase()}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={statusVariants[delivery.status]}>
                      {delivery.status.replace(/_/g, ' ')}
                    </Badge>
                    {delivery.assignedAt && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(delivery.assignedAt)}
                      </span>
                    )}
                  </div>
                  {delivery.deliveryAddress && (
                    <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {delivery.deliveryAddress}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {completedDeliveries.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Completed</h2>
          <div className="space-y-3">
            {completedDeliveries.map((delivery) => (
              <Link
                key={delivery.id}
                to={`/rider/deliveries/${delivery.id}`}
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-primary-200 transition-all opacity-75"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-100 text-success-700">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">
                    Delivery #{delivery.id.slice(-6).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {delivery.deliveredAt ? formatDate(delivery.deliveredAt) : 'Delivered'}
                  </p>
                </div>
                <Badge variant="success">Delivered</Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
