import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Bike, Package, ArrowRight, Clock, MapPin, CheckCircle2, LocateFixed, LoaderCircle, RefreshCw } from 'lucide-react';
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
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const profileQuery = useQuery({ queryKey: ['rider-profile'], queryFn: riderApi.getProfile, refetchInterval: 15000 });
  const { data, isLoading, error: deliveriesError } = useQuery({
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
    onSuccess: () => {
      setIsLocating(false);
      setLocationError(null);
      void queryClient.invalidateQueries({ queryKey: ['rider-profile'] });
      void queryClient.invalidateQueries({ queryKey: ['rider-deliveries'] });
    },
    onError: () => setIsLocating(false),
  });
  const profile = profileQuery.data?.data;
  const updateLocation = () => {
    setLocationError(null);
    setIsLocating(true);
    if (!navigator.geolocation) {
      setLocationError('This browser does not support location access.');
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => locationMutation.mutate({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => {
        setIsLocating(false);
        setLocationError(error.code === error.PERMISSION_DENIED
          ? 'Location access is blocked. Allow location access for this site in your browser settings, then try again.'
          : error.code === error.POSITION_UNAVAILABLE
            ? 'Your device could not determine its location. Check location services and try again.'
            : 'Location request timed out. Try again when your device has a clearer location signal.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
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
            <p className="text-xs text-primary-700">{profileQuery.isLoading ? 'Loading rider profile...' : profileQuery.error ? 'Rider profile is unavailable.' : profile?.verificationStatus === 'VERIFIED' ? profile.active ? 'Verified rider account.' : 'Your verification is complete, but the rider account is inactive.' : profile?.verificationStatus ? `Application status: ${profile.verificationStatus.toLowerCase()}.` : 'Your account is awaiting verification.'}</p>
          </div>
          {profile?.verificationStatus === 'VERIFIED' && <Badge variant={profile.available ? 'success' : 'neutral'}>{profile.available ? 'Online · accepting requests' : 'Offline · not accepting requests'}</Badge>}
        </div>
        {profile?.verificationStatus === 'VERIFIED' && <>
          <p className="mt-3 text-sm text-gray-600">{profile.available ? 'You can receive new delivery requests.' : 'Go online when you are ready to receive delivery requests.'} Updating your location helps prioritize nearby deliveries.</p>
          {!profile.active && <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Your rider profile is inactive. Contact the platform administrator before trying to receive assignments.</p>}
          {profile.active && !profile.vehicleType && <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">No active vehicle is connected to this rider profile, so the assignment engine cannot assign deliveries yet. Ask the platform administrator to complete vehicle setup.</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => availabilityMutation.mutate(!profile.available)} disabled={!profile.active || availabilityMutation.isPending || locationMutation.isPending || isLocating || (!profile.available && !profile.vehicleType)} className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{availabilityMutation.isPending ? 'Updating...' : profile.available ? 'Go offline' : 'Go online'}</button>
            <button type="button" onClick={updateLocation} disabled={!profile.active || locationMutation.isPending || isLocating} className="inline-flex items-center gap-2 rounded-lg border border-primary-200 px-3 py-2 text-sm font-semibold text-primary-700 disabled:opacity-50">
              {isLocating || locationMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              {isLocating ? 'Getting location...' : locationMutation.isPending ? 'Saving location...' : 'Update location'}
            </button>
          </div>
        </>}
        {(locationError || availabilityMutation.error || locationMutation.error) && <p role="alert" className="mt-3 text-sm text-red-700">{locationError ?? (locationMutation.error ? locationMutation.error instanceof Error && 'statusCode' in locationMutation.error && locationMutation.error.statusCode === 500 ? 'The backend could not save your location. Try again later; saved location helps assignment priority, but verified riders can still be considered without it.' : locationMutation.error instanceof Error ? locationMutation.error.message : 'Unable to save your location.' : availabilityMutation.error instanceof Error ? availabilityMutation.error.message : 'Unable to update rider availability.')}</p>}
      </div>

      {profileQuery.error && <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">We could not load your rider profile. Please refresh to try again.</p>}
      {deliveriesError && <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">We could not load your deliveries. Please refresh to try again.</p>}

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

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-gray-900">Your deliveries</h2>
        <button type="button" onClick={() => { void queryClient.invalidateQueries({ queryKey: ['rider-deliveries'] }); }} disabled={isLoading} aria-label="Refresh deliveries" title="Refresh deliveries" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /></button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-600">Loading rider deliveries…</p>
      ) : deliveriesError ? null : deliveries.length === 0 ? (
        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title={profile?.available ? 'Waiting for delivery requests' : 'No active deliveries'}
          description={profile?.available ? 'You are online. New assignments will appear here when a ready order matches your availability and active vehicle.' : 'Go online when you are ready to receive assignments.'}
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
