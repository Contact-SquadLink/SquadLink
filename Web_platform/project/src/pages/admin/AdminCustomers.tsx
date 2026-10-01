import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Filter,
  Ban,
  RotateCcw,
  ShoppingBag,
  Clock,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  X,
  AlertTriangle,
} from 'lucide-react';
import { adminApi } from '@/api/admin';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { formatDate, formatPrice } from '@/utils/format';
import type { CustomerSummary, CustomerDetail } from '@/types';

export function AdminCustomersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [page, setPage] = useState(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Modals
  const [suspendModalCustomer, setSuspendModalCustomer] = useState<CustomerSummary | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [isSuspending, setIsSuspending] = useState(false);

  const customersQuery = useQuery({
    queryKey: ['admin-customers', searchTerm, statusFilter, page],
    queryFn: () =>
      adminApi.listCustomers({
        search: searchTerm || undefined,
        status: statusFilter,
        page,
        limit: 15,
      }),
  });

  const customerDetailQuery = useQuery({
    queryKey: ['admin-customer-detail', selectedCustomerId],
    queryFn: () => (selectedCustomerId ? adminApi.getCustomerDetails(selectedCustomerId) : null),
    enabled: !!selectedCustomerId,
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.suspendAccount(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-customer-detail'] });
      setSuspendModalCustomer(null);
      setSuspendReason('');
      setIsSuspending(false);
    },
    onError: (err: unknown) => {
      alert(err instanceof Error ? err.message : 'Failed to update account status');
      setIsSuspending(false);
    },
  });

  const unsuspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.unsuspendAccount(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-customer-detail'] });
    },
    onError: (err: unknown) => {
      alert(err instanceof Error ? err.message : 'Failed to unsuspend account');
    },
  });

  const handleOpenSuspendModal = (customer: CustomerSummary) => {
    setSuspendModalCustomer(customer);
    setSuspendReason('');
  };

  const handleConfirmSuspend = () => {
    if (!suspendModalCustomer) return;
    if (!suspendReason.trim()) {
      alert('Please provide a valid operational reason for suspension.');
      return;
    }
    setIsSuspending(true);
    suspendMutation.mutate({
      id: suspendModalCustomer.id,
      reason: suspendReason.trim(),
    });
  };

  const handleUnsuspend = (customer: CustomerSummary) => {
    const reason = window.prompt(`Reason for reactivating account for ${customer.firstName || customer.email}:`);
    if (!reason || !reason.trim()) return;
    unsuspendMutation.mutate({
      id: customer.id,
      reason: reason.trim(),
    });
  };

  const customers = customersQuery.data?.data || [];
  const pagination = customersQuery.data?.pagination;
  const detailData = customerDetailQuery.data?.data as CustomerDetail | undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-gray-900">Customer Management</h1>
              <p className="text-xs text-gray-500">Monitor consumer accounts, order volume, and account integrity.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone number..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <div className="flex rounded-xl bg-gray-100 p-1">
            {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setStatusFilter(tab);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'ALL' ? 'All Customers' : tab === 'ACTIVE' ? 'Active' : 'Suspended'}
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
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Contact</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Orders</th>
                <th className="px-5 py-3.5">Total Spent</th>
                <th className="px-5 py-3.5">Joined</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {customersQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12">
                    <EmptyState
                      icon={<Users className="h-8 w-8 text-gray-400" />}
                      title="No customers found"
                      description={searchTerm ? 'No accounts matched your search terms.' : 'No customer accounts registered yet.'}
                    />
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {[c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unnamed Customer'}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">ID: {c.id.slice(0, 8)}...</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-0.5 text-xs text-gray-600">
                        {c.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span>{c.email}</span>
                          </div>
                        )}
                        {c.phoneNumber && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>{c.phoneNumber}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {c.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                          <UserCheck className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
                          <UserX className="h-3 w-3" /> Suspended
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-900">
                      {c.ordersCount}
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-900">
                      {formatPrice(c.totalSpent)}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerId(c.id)}
                          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                        {c.isActive ? (
                          <button
                            type="button"
                            onClick={() => handleOpenSuspendModal(c)}
                            title="Suspend customer account"
                            className="rounded-lg border border-rose-200 bg-white p-1 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUnsuspend(c)}
                            title="Reactivate customer account"
                            className="rounded-lg border border-emerald-200 bg-white p-1 text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
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
              {pagination.total} customers
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

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Customer Profile & Order History</h3>
                <p className="text-xs text-gray-500">Account overview and verified delivery record.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerId(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {customerDetailQuery.isLoading ? (
              <p className="py-8 text-center text-sm text-gray-500">Loading customer details...</p>
            ) : detailData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                    <p className="text-[11px] font-medium text-gray-400 uppercase">Status</p>
                    <p className="mt-1 font-bold text-gray-900">
                      {detailData.isActive ? (
                        <span className="text-emerald-600">Active</span>
                      ) : (
                        <span className="text-rose-600">Suspended</span>
                      )}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                    <p className="text-[11px] font-medium text-gray-400 uppercase">Total Orders</p>
                    <p className="mt-1 font-bold text-gray-900">{detailData.ordersCount}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                    <p className="text-[11px] font-medium text-gray-400 uppercase">Total Spent</p>
                    <p className="mt-1 font-bold text-gray-900">{formatPrice(detailData.totalSpent)}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                    <p className="text-[11px] font-medium text-gray-400 uppercase">Joined</p>
                    <p className="mt-1 font-semibold text-gray-900 text-xs">{formatDate(detailData.createdAt)}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-2">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Account Credentials</p>
                  <p className="text-sm">
                    <span className="text-gray-500">Name:</span>{' '}
                    <span className="font-semibold text-gray-900">
                      {[detailData.firstName, detailData.lastName].filter(Boolean).join(' ') || 'N/A'}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500">Email:</span>{' '}
                    <span className="font-mono text-gray-900">{detailData.email || 'N/A'}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500">Phone:</span>{' '}
                    <span className="font-mono text-gray-900">{detailData.phoneNumber || 'N/A'}</span>
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                    <ShoppingBag className="h-4 w-4 text-slate-700" /> Recent Order History
                  </h4>
                  {detailData.recentOrders.length === 0 ? (
                    <p className="text-xs text-gray-400 py-3">No orders placed by this customer yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {detailData.recentOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="flex items-center justify-between rounded-lg border border-gray-100 p-2.5 text-xs hover:bg-gray-50"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">{ord.businessName}</p>
                            <p className="text-[11px] text-gray-400 font-mono">
                              #{ord.id.slice(0, 8)} · {formatDate(ord.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">{formatPrice(ord.totalAmount)}</p>
                            <span className="inline-block rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                              {ord.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {suspendModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-200">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Suspend Customer Account</h3>
                <p className="text-xs text-gray-500">This action immediately revokes ordering capabilities.</p>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-4">
              Are you sure you want to suspend{' '}
              <span className="font-bold text-gray-900">
                {[suspendModalCustomer.firstName, suspendModalCustomer.lastName].filter(Boolean).join(' ') ||
                  suspendModalCustomer.email ||
                  'this customer'}
              </span>
              ? An audit log entry will be created.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Reason for Suspension (Required for Audit Trail)
              </label>
              <textarea
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Repeated payment reversal dispute / terms violation"
                className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSuspendModalCustomer(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSuspending || !suspendReason.trim()}
                onClick={handleConfirmSuspend}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isSuspending ? 'Suspending...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
