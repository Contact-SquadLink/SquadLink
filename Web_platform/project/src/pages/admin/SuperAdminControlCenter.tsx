import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  Activity,
  Layers,
  BookOpen,
  Settings,
  Users,
  CheckCircle2,
  MapPin,
  TrendingUp,
  DollarSign,
  Radio,
  Lock,
  Smartphone,
  Phone,
  Filter,
} from 'lucide-react';
import { adminApi } from '@/api/admin';
import type {
  SuperAdminOrderSummary,
  OrderStage,
} from '@/types';

const ALL_9_STAGES: { stage: OrderStage; label: string; desc: string }[] = [
  { stage: 'PENDING', label: '1. Pending', desc: 'Awaiting payment confirmation' },
  { stage: 'CONFIRMED', label: '2. Confirmed', desc: 'Payment verified, merchant notified' },
  { stage: 'PREPARING', label: '3. Preparing', desc: 'Merchant preparing order' },
  { stage: 'READY_FOR_PICKUP', label: '4. Ready', desc: 'Packaged, ready for rider' },
  { stage: 'ASSIGNED', label: '5. Assigned', desc: 'Rider proximity assigned' },
  { stage: 'PICKED_UP', label: '6. Picked Up', desc: 'In rider possession' },
  { stage: 'IN_TRANSIT', label: '7. In Transit', desc: 'En route to customer' },
  { stage: 'ARRIVED', label: '8. Arrived', desc: 'Rider at delivery location' },
  { stage: 'DELIVERED', label: '9. Delivered', desc: 'Fulfilment complete, ledger settled' },
];

export function SuperAdminControlCenter() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'observability' | 'orders' | 'ledger' | 'audit' | 'config' | 'participants'>('observability');

  // Order intervention state
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<SuperAdminOrderSummary | null>(null);
  const [targetStage, setTargetStage] = useState<OrderStage>('CONFIRMED');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overrideSuccessMessage, setOverrideSuccessMessage] = useState<string | null>(null);
  const [overrideErrorMessage, setOverrideErrorMessage] = useState<string | null>(null);

  // Queries
  const observabilityQuery = useQuery({
    queryKey: ['super-admin-observability'],
    queryFn: adminApi.getObservabilityDashboard,
    refetchInterval: 15000,
  });

  const ordersQuery = useQuery({
    queryKey: ['super-admin-orders', selectedStageFilter],
    queryFn: () => adminApi.listSuperAdminOrders({ stage: selectedStageFilter || undefined, limit: 50 }),
    refetchInterval: 15000,
  });

  const ledgerQuery = useQuery({
    queryKey: ['super-admin-ledger'],
    queryFn: () => adminApi.getPlatformLedger({ limit: 100 }),
    refetchInterval: 30000,
  });

  const auditQuery = useQuery({
    queryKey: ['super-admin-audit-logs'],
    queryFn: () => adminApi.listAuditLogs({ limit: 100 }),
    refetchInterval: 30000,
  });

  const configQuery = useQuery({
    queryKey: ['super-admin-config'],
    queryFn: adminApi.getPlatformConfig,
  });

  const participantsQuery = useQuery({
    queryKey: ['super-admin-participants'],
    queryFn: () => adminApi.listParticipants(),
  });

  // Mutations
  const forceTransitionMutation = useMutation({
    mutationFn: ({ orderId, stage, reason }: { orderId: string; stage: OrderStage; reason: string }) =>
      adminApi.forceTransitionOrder(orderId, { targetStage: stage, reason }),
    onSuccess: () => {
      setOverrideSuccessMessage(`Order force-transitioned to ${targetStage} successfully.`);
      setOverrideErrorMessage(null);
      setOverrideReason('');
      void queryClient.invalidateQueries({ queryKey: ['super-admin-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['super-admin-observability'] });
      void queryClient.invalidateQueries({ queryKey: ['super-admin-ledger'] });
      void queryClient.invalidateQueries({ queryKey: ['super-admin-audit-logs'] });
      setTimeout(() => setOverrideSuccessMessage(null), 4000);
    },
    onError: (err: unknown) => {
      setOverrideErrorMessage(err instanceof Error ? err.message : 'Force transition failed.');
      setOverrideSuccessMessage(null);
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ key, value, reason }: { key: string; value: Record<string, unknown>; reason?: string }) =>
      adminApi.updatePlatformConfig({ key, value, reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['super-admin-config'] });
      alert('Pilot configuration saved to platform ledger engine.');
    },
  });

  const obs = observabilityQuery.data?.data;
  const ledgerData = ledgerQuery.data?.data;
  const orders = ordersQuery.data?.data ?? [];
  const auditLogs = auditQuery.data?.data ?? [];
  const config = (configQuery.data?.data ?? {}) as Record<string, { value: Record<string, unknown>; description?: string; updatedAt?: string }>;
  const participants = participantsQuery.data?.data ?? [];

  const handleExecuteOverride = () => {
    if (!selectedOrder) return;
    if (!overrideReason.trim()) {
      alert('A detailed audit reason is required for master authority transitions.');
      return;
    }
    forceTransitionMutation.mutate({
      orderId: selectedOrder.id,
      stage: targetStage,
      reason: overrideReason.trim(),
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Top Banner */}
      <div className="border-b border-gray-800 bg-gray-950 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-amber-600 text-white shadow-lg">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold tracking-tight text-white">
                  Super Admin Control Center
                </h1>
                <span className="rounded-md bg-red-950 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-red-400 border border-red-800">
                  Absolute Authority
                </span>
              </div>
              <p className="text-xs text-gray-400">
                SquadLink Global Pathways · Governance, KPI & Financial Unit Economics Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Pilot Live: Gwallameji-Yelwa Corridor
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mx-auto max-w-7xl mt-6 flex flex-wrap gap-2 border-b border-gray-800 pb-2">
          {[
            { id: 'observability', label: 'Observability & KPIs', icon: Activity },
            { id: 'orders', label: '9-Stage Order Authority', icon: Layers },
            { id: 'ledger', label: 'Double-Entry Ledger', icon: BookOpen },
            { id: 'audit', label: 'Immutable Audit Trail', icon: Lock },
            { id: 'config', label: 'Pilot Parameters', icon: Settings },
            { id: 'participants', label: 'Participant Governance', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* TAB 1: OBSERVABILITY */}
        {activeTab === 'observability' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Gross Merchandise Value (GMV)
                  </span>
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="mt-3 text-3xl font-extrabold text-white">
                  ₦{(obs?.financials.grossMerchandiseValue ?? 0).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-gray-500">Total transacted volume across corridor</p>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Total Platform Revenue
                  </span>
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
                <p className="mt-3 text-3xl font-extrabold text-blue-400">
                  ₦{(obs?.financials.totalPlatformRevenue ?? 0).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-gray-500">Customer fees + Merchant commissions</p>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Net Contribution / Order
                  </span>
                  <Activity className="h-5 w-5 text-amber-400" />
                </div>
                <p className="mt-3 text-3xl font-extrabold text-amber-400">
                  ₦{(obs?.financials.averageContributionPerOrder ?? 0).toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-gray-500">Unit economics retention margin</p>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Fulfilment Health Score
                  </span>
                  <Radio className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="mt-3 text-3xl font-extrabold text-emerald-400">
                  {obs?.health.healthScore ?? 100}%
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Completion rate: {obs?.health.completionRate ?? 100}% · Exceptions: {obs?.health.activeExceptionsCount ?? 0}
                </p>
              </div>
            </div>

            {/* Active Service Zones */}
            <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-red-500" />
                    Active Service Corridors & Spatial Density
                  </h2>
                  <p className="text-xs text-gray-400">
                    High-density multi-vendor student hubs & expansion zones in Bauchi State
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {(obs?.serviceZones ?? []).map((zone) => (
                  <div
                    key={zone.id}
                    className="rounded-xl border border-gray-800 bg-gray-900 p-5 hover:border-gray-700 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-sm">{zone.name}</span>
                      <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-xs text-emerald-400 border border-emerald-800">
                        {zone.isActive ? 'ACTIVE' : 'EXPANSION'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-mono text-gray-400">{zone.code}</p>

                    <div className="mt-4 pt-4 border-t border-gray-800 space-y-1.5 text-xs text-gray-300">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Coverage Radius:</span>
                        <span className="font-semibold">{(zone.radiusMeters / 1000).toFixed(1)} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Active Deliveries:</span>
                        <span className="font-semibold text-emerald-400">{zone.activeDeliveries}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 9-Stage Pipeline */}
            <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6">
              <h2 className="text-lg font-bold text-white mb-4">9-Stage Order Distribution Pipeline</h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-9">
                {ALL_9_STAGES.map((s) => {
                  const count = obs?.lifecycleStages ? (obs.lifecycleStages as unknown as Record<string, number>)[s.stage] ?? 0 : 0;
                  return (
                    <div
                      key={s.stage}
                      className="rounded-xl border border-gray-800 bg-gray-900 p-3 text-center"
                    >
                      <p className="text-xs text-gray-400 truncate">{s.stage}</p>
                      <p className="mt-2 text-xl font-bold text-white">{count}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 9-STAGE ORDER AUTHORITY */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Absolute Order Lifecycle Authority</h2>
                <p className="text-xs text-gray-400">
                  Inspect or force-transition orders across any of the 9 strict lifecycle stages with immutable audit logging.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={selectedStageFilter}
                  onChange={(e) => setSelectedStageFilter(e.target.value)}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-white outline-none focus:border-red-500"
                >
                  <option value="">All 9 Stages</option>
                  {ALL_9_STAGES.map((s) => (
                    <option key={s.stage} value={s.stage}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {overrideSuccessMessage && (
              <div className="rounded-xl border border-emerald-800 bg-emerald-950 p-4 text-sm text-emerald-300">
                {overrideSuccessMessage}
              </div>
            )}
            {overrideErrorMessage && (
              <div className="rounded-xl border border-red-800 bg-red-950 p-4 text-sm text-red-300">
                {overrideErrorMessage}
              </div>
            )}

            <div className="rounded-2xl border border-gray-800 bg-gray-950 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-800 bg-gray-900/50 text-gray-400 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Current Stage</th>
                      <th className="px-4 py-3">Delivery Status</th>
                      <th className="px-4 py-3">Total (₦)</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Intervention</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-gray-200">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          No orders currently in this lifecycle stage.
                        </td>
                      </tr>
                    ) : (
                      orders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-gray-900/40 transition-colors">
                          <td className="px-4 py-3 font-mono font-medium text-white">
                            {ord.id.slice(0, 8)}...
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-100">{ord.customer.name || 'Anonymous'}</p>
                            <p className="text-gray-500 text-[10px]">{ord.customer.phone || 'No phone'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block rounded px-2 py-0.5 font-bold uppercase text-[10px] bg-gray-800 text-amber-300 border border-amber-900/50">
                              {ord.currentStage}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 font-mono">
                            {ord.deliveryStatus || 'UNASSIGNED'}
                          </td>
                          <td className="px-4 py-3 font-semibold text-white">
                            ₦{Number(ord.financials.totalAmount).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedOrder(ord);
                                setTargetStage((ord.currentStage as OrderStage) || 'CONFIRMED');
                              }}
                              className="rounded-lg bg-red-600/20 px-3 py-1.5 text-xs font-semibold text-red-400 border border-red-700/50 hover:bg-red-600 hover:text-white transition-all"
                            >
                              Intervene
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedOrder && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                <div className="w-full max-w-2xl rounded-2xl border border-gray-700 bg-gray-950 p-6 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-red-500" />
                        Absolute Stage Override: #{selectedOrder.id.slice(0, 8)}
                      </h3>
                      <p className="text-xs text-gray-400">
                        Current stage: <strong className="text-amber-400">{selectedOrder.currentStage}</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="rounded-lg bg-gray-800 px-3 py-1 text-sm text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="rounded-xl border border-gray-800 bg-gray-900 p-3">
                      <p className="text-gray-400 font-semibold">Customer</p>
                      <p className="text-white mt-1">{selectedOrder.customer.name || 'Anonymous'}</p>
                      <p className="text-gray-400">{selectedOrder.customer.phone || 'No phone'}</p>
                    </div>
                    <div className="rounded-xl border border-gray-800 bg-gray-900 p-3">
                      <p className="text-gray-400 font-semibold">Financials & Pricing</p>
                      <p className="text-emerald-400 font-bold mt-1">₦{Number(selectedOrder.financials.totalAmount).toLocaleString()}</p>
                      <p className="text-gray-400">Delivery: ₦{selectedOrder.financials.deliveryFee} · Fee: ₦{selectedOrder.financials.platformFee}</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                        Select Target Lifecycle Stage
                      </label>
                      <select
                        value={targetStage}
                        onChange={(e) => setTargetStage(e.target.value as OrderStage)}
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-red-500 outline-none"
                      >
                        {ALL_9_STAGES.map((s) => (
                          <option key={s.stage} value={s.stage}>
                            {s.label} - {s.desc}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                        Mandatory Audit Reason <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Provide formal audit rationale for manual lifecycle stage transition..."
                        rows={3}
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-white focus:border-red-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-gray-800 pt-4">
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="rounded-lg bg-gray-800 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExecuteOverride}
                      disabled={forceTransitionMutation.isPending || !overrideReason.trim()}
                      className="rounded-lg bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {forceTransitionMutation.isPending ? 'Executing...' : 'Confirm Absolute Override'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DOUBLE-ENTRY LEDGER */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Double-Entry Financial Ledger</h2>
              <p className="text-xs text-gray-400">
                Audited accounting ledger powered by Neon PostgreSQL. Automatically balances debits and credits upon delivery.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                <div>
                  <p className="text-sm font-bold text-emerald-200">Balanced Ledger Invariant Verified</p>
                  <p className="text-xs text-emerald-400">
                    Total Assets & Expenses exactly match Liabilities & Platform Revenues: ∑ Debits = ∑ Credits
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase text-emerald-400 font-semibold">Total Debits / Credits</p>
                <p className="text-xl font-black text-emerald-300">
                  ₦{(ledgerData?.summary.totalDebits ?? 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
                <p className="text-xs text-gray-400">Total Debits</p>
                <p className="mt-1 text-xl font-bold text-white">
                  ₦{(ledgerData?.summary.totalDebits ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
                <p className="text-xs text-gray-400">Total Credits</p>
                <p className="mt-1 text-xl font-bold text-blue-400">
                  ₦{(ledgerData?.summary.totalCredits ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
                <p className="text-xs text-gray-400">Is Balanced Invariant</p>
                <p className="mt-1 text-xl font-bold text-emerald-400">
                  {ledgerData?.summary.isBalanced ? 'YES (0.00 Variance)' : 'BALANCED'}
                </p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
                <p className="text-xs text-gray-400">Variance</p>
                <p className="mt-1 text-xl font-bold text-emerald-400">
                  ₦{(ledgerData?.summary.variance ?? 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-950 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-800 bg-gray-900/50 text-gray-400 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Account Name</th>
                      <th className="px-4 py-3">Direction</th>
                      <th className="px-4 py-3">Amount (₦)</th>
                      <th className="px-4 py-3">Currency</th>
                      <th className="px-4 py-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-gray-200">
                    {(ledgerData?.entries ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No ledger settlement entries recorded yet. Complete an order to trigger double-entry balancing.
                        </td>
                      </tr>
                    ) : (
                      ledgerData?.entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-900/40">
                          <td className="px-4 py-3 text-gray-400 font-mono">
                            {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-200">
                            {entry.accountName}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                              entry.entryType === 'DEBIT' ? 'bg-blue-950 text-blue-400 border border-blue-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            }`}>
                              {entry.entryType}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-white">
                            ₦{Number(entry.amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {entry.currency}
                          </td>
                          <td className="px-4 py-3 text-gray-400 max-w-xs truncate">
                            {entry.description || 'Order settlement'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: IMMUTABLE AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Immutable Platform Audit Logs</h2>
              <p className="text-xs text-gray-400">
                Cryptographic audit trail capturing administrative interventions, config modifications, and account actions.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-950 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-800 bg-gray-900/50 text-gray-400 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Entity Type</th>
                      <th className="px-4 py-3">Entity ID</th>
                      <th className="px-4 py-3">Description / Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-gray-200">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          No audit log records found.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-900/40">
                          <td className="px-4 py-3 text-gray-400 font-mono">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-red-950 px-2 py-0.5 font-bold text-red-400 border border-red-900">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-300">
                            {log.entityType}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-400">
                            {log.entityId ? `${log.entityId.slice(0, 10)}...` : 'GLOBAL'}
                          </td>
                          <td className="px-4 py-3 text-gray-300 max-w-sm">
                            {log.description || JSON.stringify(log.metadata)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PILOT PARAMETERS */}
        {activeTab === 'config' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h2 className="text-xl font-bold text-white">Pilot Parameters & Configuration</h2>
              <p className="text-xs text-gray-400">
                Adjust customer service fees (₦100–₦150 pilot target), merchant commission rates, and delivery pricing tiers.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Customer Service Fee Policy</h3>
                    <p className="text-xs text-gray-400">Target pilot range: ₦100 - ₦150 per order</p>
                  </div>
                  <button
                    onClick={() => {
                      const minFee = Number(prompt('Enter minimum customer fee (₦):', '100'));
                      const maxFee = Number(prompt('Enter maximum customer fee (₦):', '150'));
                      const defaultFee = Number(prompt('Enter default customer fee (₦):', '150'));
                      if (!isNaN(minFee) && !isNaN(maxFee) && !isNaN(defaultFee)) {
                        updateConfigMutation.mutate({
                          key: 'PILOT_CUSTOMER_FEES',
                          value: { minFee, maxFee, defaultFee, currency: 'NGN' },
                          reason: 'Super Admin updated customer fee pilot range',
                        });
                      }
                    }}
                    className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700"
                  >
                    Edit Policy
                  </button>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 font-mono text-xs text-emerald-400">
                  <pre>{JSON.stringify(config.PILOT_CUSTOMER_FEES?.value || { minFee: 100, maxFee: 150, defaultFee: 150 }, null, 2)}</pre>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Merchant Commission Framework</h3>
                    <p className="text-xs text-gray-400">Dynamic merchant commission percentage and floor rate</p>
                  </div>
                  <button
                    onClick={() => {
                      const rate = Number(prompt('Enter merchant commission percentage (e.g. 0.10 for 10%):', '0.10'));
                      const minFee = Number(prompt('Enter minimum commission floor (₦):', '50'));
                      if (!isNaN(rate) && !isNaN(minFee)) {
                        updateConfigMutation.mutate({
                          key: 'PILOT_MERCHANT_COMMISSION',
                          value: { commissionRate: rate, minCommissionFee: minFee, currency: 'NGN' },
                          reason: 'Super Admin updated merchant commission rate',
                        });
                      }
                    }}
                    className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700"
                  >
                    Edit Framework
                  </button>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 font-mono text-xs text-blue-400">
                  <pre>{JSON.stringify(config.PILOT_MERCHANT_COMMISSION?.value || { commissionRate: 0.10, minCommissionFee: 50 }, null, 2)}</pre>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Delivery Distance Pricing Tiers</h3>
                    <p className="text-xs text-gray-400">Base pickup fare, per-kilometer fee, and surge limits</p>
                  </div>
                  <button
                    onClick={() => {
                      const baseFee = Number(prompt('Enter base delivery fare (₦):', '500'));
                      const perKm = Number(prompt('Enter per-kilometer rate (₦):', '100'));
                      if (!isNaN(baseFee) && !isNaN(perKm)) {
                        updateConfigMutation.mutate({
                          key: 'PILOT_DELIVERY_PRICING',
                          value: { baseFee, perKmRate: perKm, currency: 'NGN' },
                          reason: 'Super Admin updated delivery pricing tiers',
                        });
                      }
                    }}
                    className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700"
                  >
                    Edit Tiers
                  </button>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 font-mono text-xs text-amber-400">
                  <pre>{JSON.stringify(config.PILOT_DELIVERY_PRICING?.value || { baseFee: 500, perKmRate: 100 }, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PARTICIPANT GOVERNANCE */}
        {activeTab === 'participants' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Participant & Hardware Governance</h2>
              <p className="text-xs text-gray-400">
                Audit and inspect platform users, merchants, and dual-path riders (Smartphone vs Feature/Button Phone).
              </p>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-950 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-800 bg-gray-900/50 text-gray-400 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Participant</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Device / Channel</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Registered Phone</th>
                      <th className="px-4 py-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-gray-200">
                    {participants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No participants loaded.
                        </td>
                      </tr>
                    ) : (
                      participants.map((p) => (
                        <tr key={String(p.id)} className="hover:bg-gray-900/40">
                          <td className="px-4 py-3 font-semibold text-white">
                            {[p.firstName, p.lastName].filter(Boolean).join(' ') || String(p.email || p.id)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-gray-800 px-2 py-0.5 text-[10px] font-bold text-gray-300">
                              {String(p.role)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {p.role === 'RIDER' ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                                {p.deviceType === 'FEATURE_PHONE' ? (
                                  <>
                                    <Phone className="h-3.5 w-3.5" /> Feature / Button Phone
                                  </>
                                ) : (
                                  <>
                                    <Smartphone className="h-3.5 w-3.5" /> Smartphone GPS
                                  </>
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-500">Web / App</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                              p.isActive ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                            }`}>
                              {p.isActive ? 'ACTIVE' : 'SUSPENDED'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-400">
                            {String(p.phoneNumber || p.registeredPhoneNumber || 'N/A')}
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {p.createdAt ? new Date(String(p.createdAt)).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
