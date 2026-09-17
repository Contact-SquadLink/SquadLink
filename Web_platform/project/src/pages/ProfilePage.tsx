import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/Badge';
import { Mail, Phone, Shield, Calendar, User as UserIcon } from 'lucide-react';
import type { Role } from '@/types';

const roleLabels: Record<Role, string> = {
  CUSTOMER: 'Customer',
  BUSINESS_USER: 'Business User',
  RIDER: 'Rider',
  ADMIN: 'Administrator',
};

export function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  const phone = user.phoneNumber || user.phone;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Profile</h1>
      <p className="text-sm text-gray-500 mb-6">Your account information.</p>

      {/* Profile card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 text-2xl font-bold">
            {(user.firstName || user.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-gray-900">
              {fullName || 'User'}
            </h2>
            <Badge variant="default" className="mt-1">{roleLabels[user.role]}</Badge>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
            <UserIcon className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">First Name</p>
              <p className="text-sm font-semibold text-gray-900">
                {user.firstName || 'Not set'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
            <UserIcon className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Last Name</p>
              <p className="text-sm font-semibold text-gray-900">
                {user.lastName || 'Not set'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
            <Mail className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Email</p>
              <p className="text-sm font-semibold text-gray-900">{user.email || 'Not set'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
            <Phone className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Phone</p>
              <p className="text-sm font-semibold text-gray-900">{phone || 'Not set'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
            <Shield className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Role</p>
              <p className="text-sm font-semibold text-gray-900">{roleLabels[user.role]}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-xl bg-accent-50 border border-accent-200 p-4">
          <Calendar className="h-5 w-5 text-accent-600 shrink-0" />
          <p className="text-sm text-accent-700">
            Profile editing is not yet available. Contact support to update your information.
          </p>
        </div>
      </div>
    </div>
  );
}
