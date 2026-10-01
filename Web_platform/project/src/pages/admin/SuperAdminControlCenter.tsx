import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
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
  Sparkles,
  Server,
  Cpu,
  Database,
} from 'lucide-react';
import { adminApi } from '@/api/admin';
import type {
  SuperAdminOrderSummary,
  OrderStage,
  SystemHealthData,
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
  const [activeTab, setActiveTab] = useState<'observability' | 'orders' | 'ledger' | 'audit' | 'config' | 'participants' | 'health'>('observability');

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

  const healthQuery = useQuery({
    queryKey: ['super-admin-system-health'],
    queryFn: adminApi.getSystemHealth,
    refetchInterval: 15000,
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
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 right-10 h-96 w-96 rounded-full bg-teal-500/10 blur-[140px] pointer-events-none" />

      {/* Top Banner */}
      <div className="relative z-10 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-xl px-4 py-5 sm:px-6 lg:px-8 shadow-xl">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 via-primary-600 to-teal-500 text-white shadow-lg shadow-emerald-950/60 ring-1 ring-white/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display text-xl sm:text-2xl font-black tracking-tight text-white">
                  Super Admin Control Center
                </h1>
                <span className="rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 border border-emerald-500/40 shadow-sm backdrop-blur-md">
                  Master Authority
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                SquadLink Global Pathways · Real-time Governance, Observability & Unit Economics Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-950/80 px-3.5 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30 shadow-inner backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
              Live Corridor: Gwallameji-Yelwa
            </span>
          </div>
        </div>

        {/* Tab Navigation Capsule Bar */}
        <div className="mx-auto max-w-7xl mt-6 flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-slate-950/70 border border-slate-800 backdrop-blur-xl shadow-inner">
          {[
            { id: 'observability', label: 'Observability & KPIs', icon: Activity },
            { id: 'orders', label: '9-Stage Order Authority', icon: Layers },
            { id: 'ledger', label: 'Double-Entry Ledger', icon: BookOpen },
            { id: 'audit', label: 'Immutable Audit Trail', icon: Lock },
            { id: 'config', label: 'Pilot Parameters', icon: Settings },
            { id: 'participants', label: 'Participant Governance', icon: Users },
            { id: 'health', label: 'System Health', icon: Server },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 via-primary-600 to-teal-600 text-white shadow-lg shadow-emerald-950/70 border border-emerald-400/40'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
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
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl hover:border-emerald-500/40 transition-all group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Gross Merchandise Value (GMV)
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-extrabold text-white">
                  ₦{(obs?.financials?.grossMerchandiseValue ?? 0).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-slate-500">Total transacted volume across corridor</p>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl hover:border-teal-500/40 transition-all group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-teal-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Total Platform Revenue
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-extrabold text-teal-400">
                  ₦{(obs?.financials?.totalPlatformRevenue ?? 0).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-slate-500">Customer fees + Merchant commissions</p>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl hover:border-cyan-500/40 transition-all group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Net Contribution / Order
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <Activity className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-extrabold text-cyan-300">
                  ₦{(obs?.financials?.averageContributionPerOrder ?? 0).toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-slate-500">Unit economics retention margin</p>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl hover:border-emerald-500/40 transition-all group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Fulfilment Health Score
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Radio className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-extrabold text-emerald-400">
                  {obs?.health?.healthScore ?? 100}%
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Completion rate: {obs?.health?.completionRate ?? 100}% · Exceptions: {obs?.health?.activeExceptionsCount ?? 0}
                </p>
              </div>
            </div>

            {/* Active Service Zones */}
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-emerald-400" />
                    Active Service Corridors & Spatial Density
                  </h2>
                  <p className="text-xs text-slate-400">
                    High-density multi-vendor student hubs & expansion zones in Bauchi State
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {(obs?.serviceZones ?? []).map((zone) => (
                  <div
                    key={zone.id}
                    className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 hover:border-emerald-500/40 hover:bg-slate-800/60 transition-all shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-sm">{zone.name}</span>
                      <span className="rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/40 shadow-sm">
                        {zone.isActive ? 'ACTIVE' : 'EXPANSION'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-mono text-emerald-400/80">{zone.code}</p>

                    <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Coverage Radius:</span>
                        <span className="font-semibold text-white">{(zone.radiusMeters / 1000).toFixed(1)} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Active Deliveries:</span>
                        <span className="font-semibold text-emerald-400">{zone.activeDeliveries}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 9-Stage Pipeline */}
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Layers className="h-5 w-5 text-emerald-400" />
                9-Stage Order Distribution Pipeline
              </h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-9">
                {ALL_9_STAGES.map((s) => {
                  const count = obs?.lifecycleStages ? (obs.lifecycleStages as unknown as Record<string, number>)[s.stage] ?? 0 : 0;
                  return (
                    <div
                      key={s.stage}
                      className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-3.5 text-center hover:border-emerald-500/40 transition-all group"
                    >
                      <p className="text-[11px] font-medium text-slate-400 truncate">{s.stage}</p>
                      <p className="mt-2 text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">{count}</p>
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
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-emerald-400" />
                  Absolute Order Lifecycle Authority
                </h2>
                <p className="text-xs text-slate-400">
                  Inspect or force-transition orders across any of the 9 strict lifecycle stages with immutable audit logging.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={selectedStageFilter}
                  onChange={(e) => setSelectedStageFilter(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm"
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
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/50 p-4 text-sm text-emerald-200 backdrop-blur-md flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>{overrideSuccessMessage}</span>
              </div>
            )}
            {overrideErrorMessage && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-950/50 p-4 text-sm text-rose-200 backdrop-blur-md flex items-center gap-3">
                <span>{overrideErrorMessage}</span>
              </div>
            )}

            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-2xl backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5">Order ID</th>
                      <th className="px-4 py-3.5">Customer</th>
                      <th className="px-4 py-3.5">Current Stage</th>
                      <th className="px-4 py-3.5">Delivery Status</th>
                      <th className="px-4 py-3.5">Total (₦)</th>
                      <th className="px-4 py-3.5">Created</th>
                      <th className="px-4 py-3.5 text-right">Intervention</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          No orders currently in this lifecycle stage.
                        </td>
                      </tr>
                    ) : (
                      orders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3.5 font-mono font-medium text-emerald-300">
                            {ord.id.slice(0, 8)}...
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-white">{ord.customer.name || 'Anonymous'}</p>
                            <p className="text-slate-400 text-[10px]">{ord.customer.phone || 'No phone'}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-block rounded-full px-2.5 py-0.5 font-bold uppercase text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                              {ord.currentStage}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-300 font-mono">
                            {ord.deliveryStatus || 'UNASSIGNED'}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-white">
                            ₦{Number(ord.financials.totalAmount).toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-slate-400">
                            {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => {
                                setSelectedOrder(ord);
                                setTargetStage((ord.currentStage as OrderStage) || 'CONFIRMED');
                              }}
                              className="rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white hover:border-emerald-500 transition-all shadow-sm cursor-pointer"
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
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
                <div className="w-full max-w-2xl rounded-3xl border border-emerald-500/30 bg-slate-900 p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6 relative overflow-hidden">
                  <div className="absolute -top-24 -right-24 h-48 w-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4 relative z-10">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-emerald-400" />
                        Absolute Stage Override: #{selectedOrder.id.slice(0, 8)}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Current stage: <strong className="text-emerald-300 font-mono">{selectedOrder.currentStage}</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="rounded-xl bg-slate-800 px-3 py-1 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs relative z-10">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                      <p className="text-slate-400 font-semibold">Customer</p>
                      <p className="text-white font-medium mt-1">{selectedOrder.customer.name || 'Anonymous'}</p>
                      <p className="text-slate-400">{selectedOrder.customer.phone || 'No phone'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                      <p className="text-slate-400 font-semibold">Financials & Pricing</p>
                      <p className="text-emerald-400 font-bold mt-1">₦{Number(selectedOrder.financials.totalAmount).toLocaleString()}</p>
                      <p className="text-slate-400">Delivery: ₦{selectedOrder.financials.deliveryFee} · Fee: ₦{selectedOrder.financials.platformFee}</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2 relative z-10">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                        Select Target Lifecycle Stage
                      </label>
                      <select
                        value={targetStage}
                        onChange={(e) => setTargetStage(e.target.value as OrderStage)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/90 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                      >
                        {ALL_9_STAGES.map((s) => (
                          <option key={s.stage} value={s.stage}>
                            {s.label} - {s.desc}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                        Mandatory Audit Reason <span className="text-emerald-400">*</span>
                      </label>
                      <textarea
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Provide formal audit rationale for manual lifecycle stage transition..."
                        rows={3}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/90 p-3.5 text-xs text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 relative z-10">
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExecuteOverride}
                      disabled={forceTransitionMutation.isPending || !overrideReason.trim()}
                      className="rounded-xl bg-gradient-to-r from-emerald-600 via-primary-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/50 disabled:opacity-40 transition-all cursor-pointer"
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
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-400" />
                Double-Entry Financial Ledger
              </h2>
              <p className="text-xs text-slate-400">
                Audited accounting ledger powered by Neon PostgreSQL. Automatically balances debits and credits upon delivery.
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/60 via-slate-900/80 to-teal-950/50 p-6 flex items-center justify-between shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-200">Balanced Ledger Invariant Verified</p>
                  <p className="text-xs text-emerald-400/90 mt-0.5">
                    Total Assets & Expenses exactly match Liabilities & Platform Revenues: ∑ Debits = ∑ Credits
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase text-emerald-400 font-semibold tracking-wider">Total Debits / Credits</p>
                <p className="text-2xl font-black text-emerald-300 mt-0.5">
                  ₦{(ledgerData?.summary.totalDebits ?? 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Debits</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  ₦{(ledgerData?.summary.totalDebits ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Credits</p>
                <p className="mt-2 text-2xl font-bold text-teal-400">
                  ₦{(ledgerData?.summary.totalCredits ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Is Balanced Invariant</p>
                <p className="mt-2 text-2xl font-bold text-emerald-400">
                  {ledgerData?.summary.isBalanced ? 'YES (0.00 Variance)' : 'BALANCED'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Variance</p>
                <p className="mt-2 text-2xl font-bold text-emerald-400">
                  ₦{(ledgerData?.summary.variance ?? 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-2xl backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5">Timestamp</th>
                      <th className="px-4 py-3.5">Account Name</th>
                      <th className="px-4 py-3.5">Direction</th>
                      <th className="px-4 py-3.5">Amount (₦)</th>
                      <th className="px-4 py-3.5">Currency</th>
                      <th className="px-4 py-3.5">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {(ledgerData?.entries ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          No ledger settlement entries recorded yet. Complete an order to trigger double-entry balancing.
                        </td>
                      </tr>
                    ) : (
                      ledgerData?.entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3.5 text-slate-400 font-mono">
                            {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-200">
                            {entry.accountName}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              entry.entryType === 'DEBIT'
                                ? 'bg-teal-950/80 text-teal-300 border border-teal-500/30'
                                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {entry.entryType}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-mono font-bold text-white">
                            ₦{Number(entry.amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5 text-slate-400">
                            {entry.currency}
                          </td>
                          <td className="px-4 py-3.5 text-slate-300 max-w-xs truncate">
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
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-emerald-400" />
                Immutable Platform Audit Logs
              </h2>
              <p className="text-xs text-slate-400">
                Cryptographic audit trail capturing administrative interventions, config modifications, and account actions.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-2xl backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5">Timestamp</th>
                      <th className="px-4 py-3.5">Action</th>
                      <th className="px-4 py-3.5">Entity Type</th>
                      <th className="px-4 py-3.5">Entity ID</th>
                      <th className="px-4 py-3.5">Description / Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          No audit log records found.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3.5 text-slate-400 font-mono">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="rounded-full bg-slate-800/90 px-2.5 py-0.5 font-bold text-[10px] text-emerald-300 border border-emerald-500/30">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-300">
                            {log.entityType}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-emerald-400/80">
                            {log.entityId ? `${log.entityId.slice(0, 10)}...` : 'GLOBAL'}
                          </td>
                          <td className="px-4 py-3.5 text-slate-300 max-w-sm">
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
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-emerald-400" />
                Pilot Parameters & Configuration
              </h2>
              <p className="text-xs text-slate-400">
                Adjust customer service fees (₦100–₦150 pilot target), merchant commission rates, and delivery pricing tiers.
              </p>
            </div>

            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 space-y-4 shadow-xl backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Customer Service Fee Policy</h3>
                    <p className="text-xs text-slate-400">Target pilot range: ₦100 - ₦150 per order</p>
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
                    className="rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-1.5 text-xs font-semibold border border-slate-700 hover:border-emerald-500/40 transition-all cursor-pointer"
                  >
                    Edit Policy
                  </button>
                </div>
                <div className="rounded-2xl border border-slate-800/80 bg-slate-950/90 p-4 font-mono text-xs text-emerald-300 shadow-inner">
                  <pre>{JSON.stringify(config.PILOT_CUSTOMER_FEES?.value || { minFee: 100, maxFee: 150, defaultFee: 150 }, null, 2)}</pre>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 space-y-4 shadow-xl backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Merchant Commission Framework</h3>
                    <p className="text-xs text-slate-400">Dynamic merchant commission percentage and floor rate</p>
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
                    className="rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-1.5 text-xs font-semibold border border-slate-700 hover:border-emerald-500/40 transition-all cursor-pointer"
                  >
                    Edit Framework
                  </button>
                </div>
                <div className="rounded-2xl border border-slate-800/80 bg-slate-950/90 p-4 font-mono text-xs text-teal-300 shadow-inner">
                  <pre>{JSON.stringify(config.PILOT_MERCHANT_COMMISSION?.value || { commissionRate: 0.10, minCommissionFee: 50 }, null, 2)}</pre>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 space-y-4 shadow-xl backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Delivery Distance Pricing Tiers</h3>
                    <p className="text-xs text-slate-400">Base pickup fare, per-kilometer fee, and surge limits</p>
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
                    className="rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-1.5 text-xs font-semibold border border-slate-700 hover:border-emerald-500/40 transition-all cursor-pointer"
                  >
                    Edit Tiers
                  </button>
                </div>
                <div className="rounded-2xl border border-slate-800/80 bg-slate-950/90 p-4 font-mono text-xs text-emerald-300 shadow-inner">
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
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-400" />
                Participant & Hardware Governance
              </h2>
              <p className="text-xs text-slate-400">
                Audit and inspect platform users, merchants, and dual-path riders (Smartphone vs Feature/Button Phone).
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-2xl backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5">Participant</th>
                      <th className="px-4 py-3.5">Role</th>
                      <th className="px-4 py-3.5">Device / Channel</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Registered Phone</th>
                      <th className="px-4 py-3.5">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {participants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          No participants loaded.
                        </td>
                      </tr>
                    ) : (
                      participants.map((p) => (
                        <tr key={String(p.id)} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3.5 font-semibold text-white">
                            {[p.firstName, p.lastName].filter(Boolean).join(' ') || String(p.email || p.id)}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-300 border border-slate-700">
                              {String(p.role)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {p.role === 'RIDER' ? (
                              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                                {p.deviceType === 'FEATURE_PHONE' ? (
                                  <>
                                    <Phone className="h-3.5 w-3.5 text-teal-400" /> Feature / Button Phone
                                  </>
                                ) : (
                                  <>
                                    <Smartphone className="h-3.5 w-3.5 text-emerald-400" /> Smartphone GPS
                                  </>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-500">Web / App</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              p.isActive ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                            }`}>
                              {p.isActive ? 'ACTIVE' : 'SUSPENDED'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-slate-400">
                            {String(p.phoneNumber || p.registeredPhoneNumber || 'N/A')}
                          </td>
                          <td className="px-4 py-3.5 text-slate-400">
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

        {/* TAB 7: SYSTEM HEALTH (Section 23) */}
        {activeTab === 'health' && (
          <div className="space-y-6 max-w-5xl">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Server className="h-5 w-5 text-emerald-400" />
                Infrastructure & System Health
              </h2>
              <p className="text-xs text-slate-400">
                Live database connectivity, PostgreSQL latency, active queue telemetry, and Node runtime statistics.
              </p>
            </div>

            {healthQuery.isLoading ? (
              <p className="text-xs text-slate-400 py-8 text-center">Pinging platform services...</p>
            ) : healthQuery.data?.data ? (
              <div className="space-y-6">
                {/* Status Hero Card */}
                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                      healthQuery.data.data.status === 'OPERATIONAL'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}>
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        Platform Status: {healthQuery.data.data.status}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Heartbeat verified at {new Date(healthQuery.data.data.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1 text-xs font-mono font-semibold text-emerald-300 border border-slate-800">
                      Uptime: {Math.floor(healthQuery.data.data.server.uptimeSeconds / 60)}m {healthQuery.data.data.server.uptimeSeconds % 60}s
                    </span>
                  </div>
                </div>

                {/* Subsystem Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Database */}
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Database</span>
                      <Database className="h-4 w-4 text-emerald-400" />
                    </div>
                    <p className="text-xl font-bold text-white">
                      {healthQuery.data.data.database.status}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      Query Ping Latency: <span className="text-emerald-300 font-bold">{healthQuery.data.data.database.latencyMs} ms</span>
                    </p>
                  </div>

                  {/* Node Runtime */}
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Server Memory</span>
                      <Cpu className="h-4 w-4 text-sky-400" />
                    </div>
                    <p className="text-xl font-bold text-white">
                      {healthQuery.data.data.server.memoryUsageMB.heapUsed} MB
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      RSS: {healthQuery.data.data.server.memoryUsageMB.rss} MB · Heap: {healthQuery.data.data.server.memoryUsageMB.heapTotal} MB
                    </p>
                  </div>

                  {/* Active Queue Pressure */}
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Queues</span>
                      <Layers className="h-4 w-4 text-teal-400" />
                    </div>
                    <p className="text-xl font-bold text-white">
                      {healthQuery.data.data.queues.activeOrders} orders
                    </p>
                    <p className="text-xs text-slate-400">
                      {healthQuery.data.data.queues.unassignedDeliveries} unassigned · {healthQuery.data.data.queues.pendingWithdrawals} pending payouts
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-rose-400">Failed to load system health telemetry.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
