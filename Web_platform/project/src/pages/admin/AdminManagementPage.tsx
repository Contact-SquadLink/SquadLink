import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  UserPlus,
  Lock,
  UserX,
  UserCheck,
  Key,
  Check,
  X,
  AlertTriangle,
  Mail,
  Phone,
  Shield,
} from 'lucide-react';
import { adminApi } from '@/api/admin';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { formatDate } from '@/utils/format';
import type { AdminUserItem, AdminPermission } from '@/types';

const PERMISSION_GROUPS: { name: string; permissions: { id: AdminPermission; label: string; desc: string }[] }[] = [
  {
    name: 'Customer Management',
    permissions: [
      { id: 'CUSTOMER_VIEW', label: 'View Customers', desc: 'Browse customer list and profiles' },
      { id: 'CUSTOMER_SUSPEND', label: 'Suspend Customers', desc: 'Suspend or restore customer ordering' },
    ],
  },
  {
    name: 'Business Management',
    permissions: [
      { id: 'BUSINESS_VIEW', label: 'View Businesses', desc: 'View merchant list and details' },
      { id: 'BUSINESS_VERIFY', label: 'Verify Businesses', desc: 'Approve merchant verification queue' },
      { id: 'BUSINESS_REJECT', label: 'Reject Businesses', desc: 'Decline business verification' },
      { id: 'BUSINESS_SUSPEND', label: 'Suspend Businesses', desc: 'Suspend merchant trading capability' },
    ],
  },
  {
    name: 'Rider Operations',
    permissions: [
      { id: 'RIDER_VIEW', label: 'View Riders', desc: 'View courier fleet and availability' },
      { id: 'RIDER_VERIFY', label: 'Verify Riders', desc: 'Approve rider verification queue' },
      { id: 'RIDER_REJECT', label: 'Reject Riders', desc: 'Decline rider verification' },
      { id: 'RIDER_SUSPEND', label: 'Suspend Riders', desc: 'Suspend courier from accepting jobs' },
    ],
  },
  {
    name: 'Orders & Deliveries',
    permissions: [
      { id: 'ORDER_VIEW', label: 'View Orders', desc: 'Inspect platform order records' },
      { id: 'ORDER_INTERVENE', label: 'Intervene Orders', desc: 'Stage override and stage transitions' },
      { id: 'ORDER_CANCEL', label: 'Cancel Orders', desc: 'Cancel orders with operational reason' },
      { id: 'DELIVERY_VIEW', label: 'View Deliveries', desc: 'Corridor tracking and fulfilment times' },
      { id: 'DELIVERY_INTERVENE', label: 'Intervene Deliveries', desc: 'Courier dispatch overrides' },
    ],
  },
  {
    name: 'Financial Control',
    permissions: [
      { id: 'PAYMENT_VIEW', label: 'View Payments', desc: 'Inspect payment transactions and GMV' },
      { id: 'WITHDRAWAL_VIEW', label: 'View Withdrawals', desc: 'Browse payout request queue' },
      { id: 'WITHDRAWAL_APPROVE', label: 'Approve Withdrawals', desc: 'Authorize and mark payouts paid' },
    ],
  },
  {
    name: 'Support & Analytics',
    permissions: [
      { id: 'SUPPORT_VIEW', label: 'View Support Issues', desc: 'Access operational problem reports' },
      { id: 'SUPPORT_RESOLVE', label: 'Resolve Issues', desc: 'Close issues with resolution notes' },
      { id: 'ANALYTICS_VIEW', label: 'View Analytics', desc: 'Access platform operational metrics' },
    ],
  },
  {
    name: 'Super Admin & Governance',
    permissions: [
      { id: 'ADMIN_VIEW', label: 'View Admins', desc: 'Access administrator roster and status' },
      { id: 'ADMIN_CREATE', label: 'Create Admins', desc: 'Invite or provision new admin accounts' },
      { id: 'ADMIN_DISABLE', label: 'Disable Admins', desc: 'Deactivate admin credentials' },
      { id: 'ADMIN_PERMISSION_MANAGE', label: 'Manage Permissions', desc: 'Assign and revoke granular permissions' },
      { id: 'PLATFORM_CONFIG_VIEW', label: 'View Platform Config', desc: 'Read pricing and economic rules' },
      { id: 'PLATFORM_CONFIG_UPDATE', label: 'Update Platform Config', desc: 'Edit pricing tiers and commission rates' },
      { id: 'AUDIT_LOG_VIEW', label: 'View Audit Logs', desc: 'Inspect administrative event trail' },
      { id: 'SECURITY_VIEW', label: 'View Security Events', desc: 'Access security and access reviews' },
    ],
  },
];

export function AdminManagementPage() {
  const queryClient = useQueryClient();

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAdminForPerms, setSelectedAdminForPerms] = useState<AdminUserItem | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<AdminPermission[]>([]);

  // Create form state
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createFirstName, setCreateFirstName] = useState('');
  const [createLastName, setCreateLastName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createRole, setCreateRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');

  const adminsQuery = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: adminApi.listAdminUsers,
  });

  const createAdminMutation = useMutation({
    mutationFn: adminApi.createAdminUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      setIsCreateModalOpen(false);
      setCreateEmail('');
      setCreatePassword('');
      setCreateFirstName('');
      setCreateLastName('');
      setCreatePhone('');
      alert('Administrator created successfully.');
    },
    onError: (err: unknown) => {
      alert(err instanceof Error ? err.message : 'Failed to create administrator');
    },
  });

  const updatePermsMutation = useMutation({
    mutationFn: ({ userId, permissions }: { userId: string; permissions: AdminPermission[] }) =>
      adminApi.updateAdminPermissions(userId, permissions),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      setSelectedAdminForPerms(null);
      alert('Administrator permissions updated successfully.');
    },
    onError: (err: unknown) => {
      alert(err instanceof Error ? err.message : 'Failed to update permissions');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, isActive, reason }: { userId: string; isActive: boolean; reason: string }) =>
      adminApi.toggleAdminStatus(userId, { isActive, reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
    },
    onError: (err: unknown) => {
      alert(err instanceof Error ? err.message : 'Failed to update administrator status');
    },
  });

  const admins = (adminsQuery.data?.data || []) as AdminUserItem[];

  const handleOpenPermsModal = (admin: AdminUserItem) => {
    setSelectedAdminForPerms(admin);
    setSelectedPermissions([...admin.permissions]);
  };

  const handleTogglePermission = (perm: AdminPermission) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSavePermissions = () => {
    if (!selectedAdminForPerms) return;
    updatePermsMutation.mutate({
      userId: selectedAdminForPerms.id,
      permissions: selectedPermissions,
    });
  };

  const handleToggleAdminStatus = (admin: AdminUserItem) => {
    const nextState = !admin.isActive;
    const actionName = nextState ? 'reactivate' : 'deactivate';
    const reason = window.prompt(`Please provide a reason to ${actionName} administrator ${admin.email}:`);
    if (!reason || !reason.trim()) return;

    toggleStatusMutation.mutate({
      userId: admin.id,
      isActive: nextState,
      reason: reason.trim(),
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail.trim() || !createPassword.trim()) {
      alert('Email and temporary password are required.');
      return;
    }
    createAdminMutation.mutate({
      email: createEmail.trim(),
      password: createPassword.trim(),
      firstName: createFirstName.trim() || undefined,
      lastName: createLastName.trim() || undefined,
      phoneNumber: createPhone.trim() || undefined,
      role: createRole,
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-gray-900">Administrator Management</h1>
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase text-white tracking-wider">
                Super Admin Only
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Provision administrators, assign granular operational permissions, and audit authority.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <UserPlus className="h-4 w-4" /> Provision Administrator
        </button>
      </div>

      {adminsQuery.error ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load administrators. Verify your account holds Super Admin authorization.
        </div>
      ) : null}

      {/* Main Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/75 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Administrator</th>
                <th className="px-5 py-3.5">Contact</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Account Status</th>
                <th className="px-5 py-3.5">Granted Permissions</th>
                <th className="px-5 py-3.5">Created</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {adminsQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">
                    Loading administrators...
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12">
                    <EmptyState
                      icon={<Shield className="h-8 w-8 text-gray-400" />}
                      title="No administrators found"
                      description="No administrative accounts have been configured."
                    />
                  </td>
                </tr>
              ) : (
                admins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {[adm.firstName, adm.lastName].filter(Boolean).join(' ') || 'SquadLink Admin'}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">ID: {adm.id.slice(0, 8)}...</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-0.5 text-xs text-gray-600">
                        {adm.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span>{adm.email}</span>
                          </div>
                        )}
                        {adm.phoneNumber && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>{adm.phoneNumber}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {adm.role === 'SUPER_ADMIN' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-bold text-white">
                          <Lock className="h-3 w-3 text-emerald-400" /> SUPER_ADMIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
                          ADMIN
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {adm.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                          <UserCheck className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
                          <UserX className="h-3 w-3" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {adm.role === 'SUPER_ADMIN' ? (
                        <span className="text-xs font-semibold text-emerald-600">
                          All Permissions (Unrestricted)
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-800">
                            {adm.permissions?.length || 0} assigned
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenPermsModal(adm)}
                            className="text-xs font-semibold text-slate-900 underline hover:text-slate-700 cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {formatDate(adm.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {adm.role !== 'SUPER_ADMIN' && (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenPermsModal(adm)}
                            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            Permissions
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleAdminStatus(adm)}
                            className={`rounded-lg border p-1 transition-colors cursor-pointer ${
                              adm.isActive
                                ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={adm.isActive ? 'Deactivate Administrator' : 'Reactivate Administrator'}
                          >
                            {adm.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Management Modal */}
      {selectedAdminForPerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Manage Administrator Permissions</h3>
                <p className="text-xs text-gray-500">
                  Target Admin:{' '}
                  <span className="font-semibold text-gray-800">
                    {selectedAdminForPerms.email || selectedAdminForPerms.id}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAdminForPerms(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.name} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5">
                    {group.name}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.permissions.map((p) => {
                      const checked = selectedPermissions.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                            checked
                              ? 'border-slate-900 bg-white text-slate-900 shadow-xs'
                              : 'border-gray-200 bg-white/70 text-gray-600 hover:bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleTogglePermission(p.id)}
                            className="mt-0.5 rounded border-gray-300 text-slate-900 focus:ring-slate-900"
                          />
                          <div>
                            <p className="text-xs font-bold">{p.label}</p>
                            <p className="text-[11px] text-gray-500">{p.desc}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-6">
              <span className="text-xs text-gray-500">
                {selectedPermissions.length} permissions currently selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAdminForPerms(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updatePermsMutation.isPending}
                  onClick={handleSavePermissions}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  {updatePermsMutation.isPending ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Provision Admin Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">Provision Administrator Account</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@squadlink.ng"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2 text-xs text-gray-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Temporary Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2 text-xs text-gray-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Amina"
                    value={createFirstName}
                    onChange={(e) => setCreateFirstName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 p-2 text-xs text-gray-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Bello"
                    value={createLastName}
                    onChange={(e) => setCreateLastName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 p-2 text-xs text-gray-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+234..."
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2 text-xs text-gray-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Administrative Role</label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as 'ADMIN' | 'SUPER_ADMIN')}
                  className="w-full rounded-xl border border-gray-200 p-2 text-xs text-gray-900 focus:border-slate-900 focus:outline-none"
                >
                  <option value="ADMIN">ADMIN (Operational - Granular Permissions)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Platform Governance - Full Access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAdminMutation.isPending}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  {createAdminMutation.isPending ? 'Provisioning...' : 'Provision Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
