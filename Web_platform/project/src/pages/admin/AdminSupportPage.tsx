import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LifeBuoy,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
} from 'lucide-react';
import { adminApi } from '@/api/admin';
import { EmptyState } from '@/components/ui/States';
import { formatDate } from '@/utils/format';
import type { OperationalIssueItem } from '@/types';

export function AdminSupportPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);

  // New Issue Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [issueType, setIssueType] = useState<OperationalIssueItem['issueType']>('UNASSIGNED_RIDER');
  const [priority, setPriority] = useState<OperationalIssueItem['priority']>('MEDIUM');
  const [description, setDescription] = useState('');

  // Resolve Modal
  const [resolvingIssue, setResolvingIssue] = useState<OperationalIssueItem | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<'RESOLVED' | 'DISMISSED'>('RESOLVED');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const issuesQuery = useQuery({
    queryKey: ['admin-operational-issues', statusFilter, page],
    queryFn: () =>
      adminApi.listOperationalIssues({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page,
        limit: 15,
      }),
  });

  const createIssueMutation = useMutation({
    mutationFn: adminApi.createOperationalIssue,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-operational-issues'] });
      setIsCreateModalOpen(false);
      setOrderId('');
      setDescription('');
    },
    onError: (err: unknown) => {
      alert(err instanceof Error ? err.message : 'Failed to record operational issue');
    },
  });

  const resolveIssueMutation = useMutation({
    mutationFn: ({ id, status, resolutionNotes }: { id: string; status: 'RESOLVED' | 'DISMISSED'; resolutionNotes: string }) =>
      adminApi.resolveOperationalIssue(id, { status, resolutionNotes }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-operational-issues'] });
      setResolvingIssue(null);
      setResolutionNotes('');
    },
    onError: (err: unknown) => {
      alert(err instanceof Error ? err.message : 'Failed to resolve issue');
    },
  });

  const issues = (issuesQuery.data?.data || []) as OperationalIssueItem[];
  const pagination = issuesQuery.data?.pagination;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Please enter a description for the operational problem.');
      return;
    }
    createIssueMutation.mutate({
      orderId: orderId.trim() || undefined,
      issueType,
      priority,
      description: description.trim(),
    });
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingIssue) return;
    if (!resolutionNotes.trim()) {
      alert('Please document the resolution notes for audit accountability.');
      return;
    }
    resolveIssueMutation.mutate({
      id: resolvingIssue.id,
      status: resolutionStatus,
      resolutionNotes: resolutionNotes.trim(),
    });
  };

  const getPriorityBadge = (p: OperationalIssueItem['priority']) => {
    switch (p) {
      case 'CRITICAL':
        return <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">Critical</span>;
      case 'HIGH':
        return <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">High</span>;
      case 'MEDIUM':
        return <span className="rounded-md bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">Medium</span>;
      default:
        return <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">Low</span>;
    }
  };

  const getStatusBadge = (s: OperationalIssueItem['status']) => {
    switch (s) {
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> Resolved
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
            <Clock className="h-3 w-3" /> Investigating
          </span>
        );
      case 'DISMISSED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
            Dismissed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
            <AlertTriangle className="h-3 w-3" /> Open
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Support & Operational Interventions</h1>
            <p className="text-xs text-gray-500">Record, assign, and resolve active delivery and platform friction.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Record Operational Issue
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-3 shadow-xs">
        <Filter className="h-4 w-4 text-gray-400 shrink-0" />
        <div className="flex rounded-xl bg-gray-100 p-1 shrink-0">
          {(['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'] as const).map((tab) => (
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
              {tab === 'ALL' ? 'All Issues' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/75 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Priority</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Linked Order</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Assigned Admin</th>
                <th className="px-5 py-3.5">Logged</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {issuesQuery.isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-500">
                    Loading operational issues...
                  </td>
                </tr>
              ) : issues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12">
                    <EmptyState
                      icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
                      title="No open issues"
                      description="All operational interventions and platform tickets are resolved."
                    />
                  </td>
                </tr>
              ) : (
                issues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">{getPriorityBadge(issue.priority)}</td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-gray-900 text-xs">
                        {issue.issueType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 max-w-sm">
                      <p className="text-xs text-gray-900 font-medium line-clamp-2">{issue.description}</p>
                      {issue.resolutionNotes && (
                        <p className="mt-1 text-[11px] text-emerald-700 bg-emerald-50/50 p-1.5 rounded border border-emerald-100">
                          <span className="font-semibold">Resolution:</span> {issue.resolutionNotes}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">
                      {issue.orderId ? (
                        <span className="font-semibold text-gray-900">#{issue.orderId.slice(0, 8)}</span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-4">{getStatusBadge(issue.status)}</td>
                    <td className="px-5 py-4 text-xs text-gray-600">
                      {issue.assignedAdminName || 'Unassigned'}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {formatDate(issue.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {issue.status !== 'RESOLVED' && issue.status !== 'DISMISSED' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setResolvingIssue(issue);
                            setResolutionNotes('');
                          }}
                          className="rounded-lg border border-slate-900 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          Resolve
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Completed</span>
                      )}
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
              {pagination.total} issues
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

      {/* Create Issue Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">Log Operational Problem / Escalation</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Issue Category</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value as OperationalIssueItem['issueType'])}
                  className="w-full rounded-xl border border-gray-200 p-2 text-xs text-gray-900 focus:border-slate-900 focus:outline-none"
                >
                  <option value="UNASSIGNED_RIDER">Unassigned Rider / Dispatch Delay</option>
                  <option value="BUSINESS_UNRESPONSIVE">Merchant Unresponsive / Prep Delay</option>
                  <option value="RIDER_CANCELLED">Rider Cancellation After Assignment</option>
                  <option value="DELIVERY_DELAY">Delivery In-Transit Delay</option>
                  <option value="PAYMENT_ISSUE">Payment Reversal / Settlement Dispute</option>
                  <option value="OTHER">Other Operational Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as OperationalIssueItem['priority'])}
                  className="w-full rounded-xl border border-gray-200 p-2 text-xs text-gray-900 focus:border-slate-900 focus:outline-none"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High (Active Order Stalled)</option>
                  <option value="CRITICAL">Critical (Immediate Escalation Required)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Related Order ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2 text-xs text-gray-900 font-mono focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description & Field Context</label>
                <textarea
                  rows={3}
                  placeholder="Detail the issue encountered by the customer, merchant, or courier..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createIssueMutation.isPending || !description.trim()}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  {createIssueMutation.isPending ? 'Logging...' : 'Save Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Issue Modal */}
      {resolvingIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">Resolve Operational Issue</h3>
              <button
                type="button"
                onClick={() => setResolvingIssue(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-700 space-y-1">
                <p>
                  <span className="font-semibold text-gray-900">Issue:</span> {resolvingIssue.issueType.replace('_', ' ')}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Details:</span> {resolvingIssue.description}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Resolution Outcome</label>
                <select
                  value={resolutionStatus}
                  onChange={(e) => setResolutionStatus(e.target.value as 'RESOLVED' | 'DISMISSED')}
                  className="w-full rounded-xl border border-gray-200 p-2 text-xs text-gray-900 focus:border-slate-900 focus:outline-none"
                >
                  <option value="RESOLVED">Resolved (Intervention Completed)</option>
                  <option value="DISMISSED">Dismissed (False Alarm / Duplicate)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Resolution Notes (Required for Audit Trail)
                </label>
                <textarea
                  rows={3}
                  placeholder="Document how this issue was resolved (e.g. manually reassigned to Rider Musa, customer informed)..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingIssue(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveIssueMutation.isPending || !resolutionNotes.trim()}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {resolveIssueMutation.isPending ? 'Saving...' : 'Complete Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
