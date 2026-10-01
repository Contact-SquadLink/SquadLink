import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Truck,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Bike,
  Store,
  User,
} from 'lucide-react';
import { adminApi } from '@/api/admin';
import { EmptyState } from '@/components/ui/States';
import { formatDate, formatPrice } from '@/utils/format';
import type { DeliveryMonitorItem } from '@/types';

export function AdminDeliveriesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const deliveriesQuery = useQuery({
    queryKey: ['admin-deliveries', statusFilter, page],
    queryFn: () =>
      adminApi.listDeliveries({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page,
        limit: 15,
      }),
  });

  const rawDeliveries = (deliveriesQuery.data?.data || []) as DeliveryMonitorItem[];
  const deliveries = rawDeliveries.filter((d) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.orderId.toLowerCase().includes(term) ||
      d.businessName.toLowerCase().includes(term) ||
      (d.riderName && d.riderName.toLowerCase().includes(term)) ||
      d.customerName.toLowerCase().includes(term)
    );
  });

  const pagination = deliveriesQuery.data?.pagination;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> Delivered
          </span>
        );
      case 'IN_TRANSIT':
      case 'PICKED_UP':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 border border-sky-200">
            <Truck className="h-3 w-3" /> In Transit
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
            <Bike className="h-3 w-3" /> Rider Assigned
          </span>
        );
      case 'CANCELLED':
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
            <AlertCircle className="h-3 w-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Delivery Monitoring</h1>
            <p className="text-xs text-gray-500">Live corridor and courier fulfilment tracking across SquadLink.</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order ID, merchant, rider, or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          <div className="flex rounded-xl bg-gray-100 p-1 shrink-0">
            {(['ALL', 'PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setStatusFilter(tab);
                  setPage(1);
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'ALL' ? 'All Deliveries' : tab.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/75 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Order</th>
                <th className="px-5 py-3.5">Business & Customer</th>
                <th className="px-5 py-3.5">Assigned Rider</th>
                <th className="px-5 py-3.5">Fulfilment Status</th>
                <th className="px-5 py-3.5">Route</th>
                <th className="px-5 py-3.5">Fee</th>
                <th className="px-5 py-3.5">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {deliveriesQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">
                    Loading delivery records...
                  </td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12">
                    <EmptyState
                      icon={<Truck className="h-8 w-8 text-gray-400" />}
                      title="No deliveries found"
                      description="No deliveries matched your filter or search criteria."
                    />
                  </td>
                </tr>
              ) : (
                deliveries.map((del) => (
                  <tr key={del.deliveryId} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-mono text-xs font-bold text-gray-900">
                        #{del.orderId.slice(0, 8)}
                      </p>
                      <p className="text-[11px] text-gray-400">ID: {del.deliveryId.slice(0, 6)}...</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900">
                          <Store className="h-3.5 w-3.5 text-gray-400" />
                          <span>{del.businessName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          <span>{del.customerName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {del.riderName ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900">
                          <Bike className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{del.riderName}</span>
                        </div>
                      ) : (
                        <span className="inline-block rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                          Awaiting Rider
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {getStatusBadge(del.deliveryStatus || del.orderStatus)}
                    </td>
                    <td className="px-5 py-4 text-xs max-w-xs">
                      <div className="space-y-0.5 truncate text-gray-600">
                        <p className="truncate">
                          <span className="font-semibold text-gray-700">Pickup:</span> {del.pickupAddress || 'Business location'}
                        </p>
                        <p className="truncate">
                          <span className="font-semibold text-gray-700">Drop-off:</span> {del.deliveryAddress || 'Customer address'}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-900 text-xs">
                      {formatPrice(del.deliveryFee)}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {formatDate(del.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 text-xs text-gray-500">
            <div>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} deliveries
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <span className="font-semibold text-gray-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
