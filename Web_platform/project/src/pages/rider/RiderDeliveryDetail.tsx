import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Package,
  Store,
  MapPin,
  Truck,
  Home as HomeIcon,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { formatDate, cn } from '@/utils/format';
import { riderApi } from '@/api/rider';
import type { Delivery, DeliveryStatus } from '@/types';

const deliverySteps: { status: DeliveryStatus; label: string; icon: typeof Clock }[] = [
  { status: 'SEARCHING_RIDER', label: 'Searching for Rider', icon: Clock },
  { status: 'ASSIGNED', label: 'Assigned', icon: Package },
  { status: 'PICKED_UP', label: 'Picked Up', icon: Store },
  { status: 'IN_TRANSIT', label: 'In Transit', icon: Truck },
  { status: 'ARRIVED', label: 'Arrived', icon: MapPin },
  { status: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
];

const statusVariants: Record<DeliveryStatus, 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  SEARCHING_RIDER: 'warning',
  ASSIGNED: 'info',
  PICKED_UP: 'info',
  IN_TRANSIT: 'info',
  ARRIVED: 'warning',
  DELIVERED: 'success',
};

function getStepIndex(status: DeliveryStatus): number {
  const idx = deliverySteps.findIndex((s) => s.status === status);
  return idx >= 0 ? idx : 0;
}

export function RiderDeliveryDetailPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const [credential, setCredential] = useState('');
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['rider-delivery', deliveryId],
    queryFn: () => riderApi.getDelivery(deliveryId as string),
    enabled: Boolean(deliveryId),
  });
  const delivery = data?.data as Delivery | undefined;

  if (isLoading) {
    return <p className="mx-auto max-w-3xl px-4 py-8 text-sm text-gray-600">Loading delivery...</p>;
  }

  if (!delivery || !deliveryId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title="Delivery not found"
          description="This delivery could not be found."
        />
      </div>
    );
  }

  const currentStep = getStepIndex(delivery.status);

  const advanceStatus = async () => {
    setIsActing(true);
    setActionError(null);
    try {
      if (delivery.status === 'ASSIGNED') {
        if (credential.trim().length < 12) {
          setActionError('Enter the pickup credential provided by the business.');
          return;
        }
        await riderApi.verifyPickup(delivery.id, credential.trim());
      } else if (delivery.status === 'PICKED_UP') {
        await riderApi.markInTransit(delivery.id);
      } else if (delivery.status === 'IN_TRANSIT') {
        await riderApi.markArrived(delivery.id);
      } else if (delivery.status === 'ARRIVED') {
        if (!/^\d{6}$/.test(deliveryOtp)) {
          setActionError('Enter the six-digit OTP provided by the customer.');
          return;
        }
        await riderApi.confirmDelivery(delivery.id, deliveryOtp);
      }
      window.location.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update delivery status.');
    } finally {
      setIsActing(false);
    }
  };

  const decideAssignment = async (accepted: boolean) => {
    setIsActing(true);
    setActionError(null);
    try {
      if (accepted) await riderApi.acceptAssignment(delivery.id);
      else await riderApi.rejectAssignment(delivery.id, rejectionReason.trim() || undefined);
      window.location.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update assignment.');
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/rider"
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-primary-700 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Deliveries
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Delivery #{delivery.id.slice(-6).toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Order #{delivery.orderId.slice(-6).toUpperCase()}
          </p>
        </div>
        <Badge variant={statusVariants[delivery.status]}>
          {delivery.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* Delivery timeline */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mb-6">
        <h2 className="font-display text-lg font-bold text-gray-900 mb-6">Delivery Progress</h2>
        <div className="space-y-0">
          {deliverySteps.map((step, idx) => {
            const Icon = step.icon;
            const isComplete = idx < currentStep;
            const isCurrent = idx === currentStep;
            const isUpcoming = idx > currentStep;

            return (
              <div key={step.status} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                      isComplete && 'bg-success-500 border-success-500 text-white',
                      isCurrent && 'bg-primary-600 border-primary-600 text-white animate-pulse',
                      isUpcoming && 'bg-white border-gray-200 text-gray-300'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {idx < deliverySteps.length - 1 && (
                    <div className={cn('w-0.5 h-12', isComplete ? 'bg-success-400' : 'bg-gray-200')} />
                  )}
                </div>
                <div className="pt-2">
                  <p className={cn(
                    'text-sm font-semibold',
                    isComplete && 'text-gray-900',
                    isCurrent && 'text-primary-700',
                    isUpcoming && 'text-gray-400'
                  )}>
                    {step.label}
                  </p>
                  {isCurrent && <p className="text-xs text-primary-600 mt-0.5">Current step</p>}
                  {isComplete && <p className="text-xs text-success-600 mt-0.5">Completed</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      {delivery.status !== 'DELIVERED' && delivery.status !== 'SEARCHING_RIDER' && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mb-6">
          <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Actions</h2>

          {delivery.status === 'ASSIGNED' && (
            <div className="space-y-3">
              {delivery.assignmentStatus !== 'ACCEPTED' ? <><div className="rounded-xl border border-secondary-200 bg-secondary-50 p-4 text-sm text-secondary-800">Review the pickup and drop-off details, then accept this assignment before collecting the order.</div><div className="flex flex-wrap gap-2"><ActionButton onClick={() => void decideAssignment(true)} icon={CheckCircle2} label={isActing ? 'Accepting...' : 'Accept assignment'} color="bg-success-600 hover:bg-success-700" /><ActionButton onClick={() => void decideAssignment(false)} icon={ArrowLeft} label={isActing ? 'Rejecting...' : 'Reject assignment'} color="bg-red-600 hover:bg-red-700" /></div><input value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Reason for rejection (optional)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></> : <><input value={credential} onChange={(event) => setCredential(event.target.value)} placeholder="Pickup credential" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /><ActionButton onClick={advanceStatus} icon={ShieldCheck} label={isActing ? 'Verifying...' : 'Verify Pickup'} color="bg-primary-600 hover:bg-primary-700" /></>}
            </div>
          )}

          {delivery.status === 'PICKED_UP' && (
            <ActionButton
              onClick={advanceStatus}
              icon={Truck}
                label={isActing ? 'Updating...' : 'Start Transit'}
              color="bg-accent-600 hover:bg-accent-700"
            />
          )}

          {delivery.status === 'IN_TRANSIT' && (
            <ActionButton
              onClick={advanceStatus}
              icon={MapPin}
                label={isActing ? 'Updating...' : 'Mark Arrived'}
              color="bg-secondary-500 hover:bg-secondary-400"
            />
          )}

          {delivery.status === 'ARRIVED' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-primary-200 bg-primary-50 p-4">
                <KeyRound className="h-5 w-5 text-primary-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-primary-900">Delivery Confirmation</p>
                  <p className="text-sm text-primary-700 mt-1">
                    Ask the customer for their OTP to confirm delivery.
                  </p>
                </div>
              </div>
              <p className="text-sm text-primary-700">Enter the OTP provided by the customer to complete delivery.</p>
              <input value={deliveryOtp} onChange={(event) => setDeliveryOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="Customer OTP" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <ActionButton onClick={advanceStatus} icon={KeyRound} label={isActing ? 'Confirming...' : 'Confirm delivery'} color="bg-primary-600 hover:bg-primary-700" />
            </div>
          )}
        </div>
      )}

      {/* Delivery info */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Delivery Information</h2>
        <div className="space-y-3 text-sm">
          {delivery.pickupAddress && (
            <div className="flex items-start gap-3">
              <Store className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pickup</p>
                <p className="text-sm text-gray-700">{delivery.pickupAddress}</p>
              </div>
            </div>
          )}
          {delivery.deliveryAddress && (
            <div className="flex items-start gap-3">
              <HomeIcon className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Drop-off</p>
                <p className="text-sm text-gray-700">{delivery.deliveryAddress}</p>
              </div>
            </div>
          )}
          {delivery.assignedAt && (
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Assigned</p>
                <p className="text-sm text-gray-700">{formatDate(delivery.assignedAt)}</p>
              </div>
            </div>
          )}
        </div>
        {actionError && <p className="mt-3 text-sm text-error-600">{actionError}</p>}
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  icon: Icon,
  label,
  color,
}: {
  onClick: () => void;
  icon: typeof Clock;
  label: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white transition-colors',
        color
      )}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}
