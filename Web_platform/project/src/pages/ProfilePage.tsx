import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/Badge';
import {
  Mail,
  Phone,
  Shield,
  Calendar,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Lock,
  Loader2,
  AtSign,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';
import { formatDate } from '@/utils/format';
import { authApi } from '@/api/auth';
import type { Role } from '@/types';

const roleLabels: Record<Role, string> = {
  CUSTOMER: 'Customer',
  BUSINESS_USER: 'Business Owner',
  RIDER: 'Courier / Rider',
  ADMIN: 'Administrator',
  SUPER_ADMIN: 'Super Administrator',
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function ProfilePage() {
  const { user, refreshUser } = useAuth();

  // Form states
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  // UI status
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Verification modal states
  const [verifyType, setVerifyType] = useState<'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Avatar upload modal
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customAvatarInput, setCustomAvatarInput] = useState('');

  if (!user) return null;

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  const phone = user.phoneNumber || user.phone;

  // Rate-limiting calculation
  let isRateLimited = false;
  let daysRemaining = 0;
  let nextAvailableDate: Date | null = null;

  if (user.profileUpdatedAt) {
    const elapsed = Date.now() - new Date(user.profileUpdatedAt).getTime();
    if (elapsed < SEVEN_DAYS_MS) {
      isRateLimited = true;
      daysRemaining = Math.ceil((SEVEN_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000));
      nextAvailableDate = new Date(new Date(user.profileUpdatedAt).getTime() + SEVEN_DAYS_MS);
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRateLimited) return;

    setIsUpdating(true);
    setUpdateSuccess(null);
    setUpdateError(null);

    try {
      const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
      if (cleanUsername && !/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
        throw new Error('Username must be 3–30 characters and only contain letters, numbers, and underscores.');
      }

      await authApi.updateProfile({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        username: cleanUsername || undefined,
        avatarUrl: avatarUrl.trim() || null,
      });

      setUpdateSuccess('Profile updated successfully! Next profile edit will be available in 7 days.');
      await refreshUser();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartVerification = async (type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION') => {
    setVerifyType(type);
    setVerifyCode('');
    setOtpNotice(null);
    setOtpError(null);
    setIsRequestingOtp(true);

    try {
      const res = await authApi.requestCode(type);
      setOtpNotice(res.data.message || 'Verification code sent! Please check your message.');
      if (res.data.otpCode) {
        setVerifyCode(res.data.otpCode);
      }
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Unable to send verification code.');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleConfirmVerification = async () => {
    if (!verifyType || !verifyCode.trim()) return;
    setIsSubmittingOtp(true);
    setOtpError(null);

    try {
      const res = await authApi.confirmVerification(verifyType, verifyCode.trim());
      setOtpNotice(res.data.message || 'Verified successfully!');
      await refreshUser();
      setTimeout(() => {
        setVerifyType(null);
      }, 1200);
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Invalid verification code. Please try again.');
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUpdateError('Image must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
        setShowAvatarModal(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Profile & Security</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your unique identification, profile details, and account security verification.</p>
      </div>

      {/* Profile Header Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="relative group">
            {avatarUrl || user.avatarUrl ? (
              <img
                src={avatarUrl || user.avatarUrl || ''}
                alt="Profile"
                className="h-20 w-20 rounded-2xl object-cover border-2 border-primary-200 shadow-xs"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-400 text-white text-3xl font-bold shadow-xs">
                {(user.firstName || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            {!isRateLimited && (
              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                className="absolute -bottom-1.5 -right-1.5 rounded-full bg-white p-2 shadow-md border border-gray-200 text-gray-700 hover:text-primary-600 hover:bg-gray-50 transition-colors"
                title="Change Profile Picture"
              >
                <Camera className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold text-gray-900">
                {fullName || 'SquadLink Member'}
              </h2>
              <Badge variant="default">{roleLabels[user.role]}</Badge>
            </div>
            <p className="mt-1 font-mono text-sm font-semibold text-primary-700 flex items-center gap-1">
              <AtSign className="h-3.5 w-3.5" />
              {user.username || 'unassigned'}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Account created on {formatDate(user.createdAt || new Date().toISOString())}
            </p>
          </div>
        </div>
      </div>

      {/* Account Verification Status Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-5 w-5 text-primary-600" />
          <h2 className="font-display text-lg font-bold text-gray-900">Account Security & Verification</h2>
        </div>
        <p className="text-xs text-gray-600 mb-6">
          Verified contact details protect your account and are required to recover your account if you forget your password.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Email Verification Card */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Email Address
                </span>
                {user.emailVerifiedAt ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                    <Check className="h-3 w-3" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                    <AlertTriangle className="h-3 w-3" /> Unverified
                  </span>
                )}
              </div>
              <p className="mt-2 font-medium text-sm text-gray-900 truncate">
                {user.email || 'No email provided'}
              </p>
              {user.emailVerifiedAt && (
                <p className="mt-1 text-[11px] text-gray-500">
                  Verified on {formatDate(user.emailVerifiedAt)}
                </p>
              )}
            </div>

            {!user.emailVerifiedAt && user.email && (
              <button
                type="button"
                onClick={() => handleStartVerification('EMAIL_VERIFICATION')}
                className="mt-4 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-700 transition-colors self-start"
              >
                Verify Email Now
              </button>
            )}
          </div>

          {/* Phone Verification Card */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Phone Number
                </span>
                {user.phoneVerifiedAt ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                    <Check className="h-3 w-3" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                    <AlertTriangle className="h-3 w-3" /> Unverified
                  </span>
                )}
              </div>
              <p className="mt-2 font-medium text-sm text-gray-900 truncate">
                {phone || 'No phone number provided'}
              </p>
              {user.phoneVerifiedAt && (
                <p className="mt-1 text-[11px] text-gray-500">
                  Verified on {formatDate(user.phoneVerifiedAt)}
                </p>
              )}
            </div>

            {!user.phoneVerifiedAt && phone && (
              <button
                type="button"
                onClick={() => handleStartVerification('PHONE_VERIFICATION')}
                className="mt-4 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-700 transition-colors self-start"
              >
                Verify Phone Now
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Details (With 7-day rate-limiting rule) */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-gray-900">Personal Details & Username</h2>
            <p className="text-xs text-gray-500 mt-0.5">Your unique @username is displayed on reviews, dispatch tracking, and public interactions.</p>
          </div>
        </div>

        {/* Rate Limiting Notice Banner */}
        {isRateLimited ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <Lock className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-xs text-amber-900">Profile Details Locked (1 Edit Per Week Policy)</p>
              <p className="text-xs text-amber-800 mt-1">
                To prevent misuse, impersonation, or casual identity swapping, account details can only be updated once every 7 days.
                You can make edits again in <span className="font-bold">{daysRemaining} day{daysRemaining === 1 ? '' : 's'}</span>
                {nextAvailableDate ? ` (${formatDate(nextAvailableDate.toISOString())})` : ''}.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-800 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
            <span>Profile details can only be changed once every 7 days. Ensure your entries are accurate before saving.</span>
          </div>
        )}

        {updateSuccess && (
          <div className="mb-4 rounded-xl bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{updateSuccess}</span>
          </div>
        )}

        {updateError && (
          <div className="mb-4 rounded-xl bg-red-50 p-3.5 text-xs font-semibold text-red-800 border border-red-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{updateError}</span>
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-xs font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                disabled={isRateLimited || isUpdating}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="First name"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-xs font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                disabled={isRateLimited || isUpdating}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="username" className="block text-xs font-medium text-gray-700 mb-1">
              Unique Username
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-gray-400 font-mono text-sm">@</span>
              <input
                id="username"
                type="text"
                disabled={isRateLimited || isUpdating}
                value={username.replace(/^@/, '')}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full rounded-xl border border-gray-300 pl-8 pr-3.5 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="username_123"
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Must be 3–30 characters using only lowercase letters, numbers, and underscores.
            </p>
          </div>

          {!isRateLimited && (
            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdating}
                className="rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs"
              >
                {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                {isUpdating ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Verification OTP Modal */}
      {verifyType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-primary-700">
                <ShieldCheck className="h-5 w-5" />
                <h3 className="font-display text-base font-bold text-gray-900">
                  {verifyType === 'EMAIL_VERIFICATION' ? 'Verify Email' : 'Verify Phone'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVerifyType(null)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-4">
              Enter the 6-digit verification code sent to your {verifyType === 'EMAIL_VERIFICATION' ? 'email' : 'phone number'}.
            </p>

            {otpNotice && (
              <div className="mb-4 rounded-lg bg-blue-50 p-2.5 text-xs text-blue-800 border border-blue-100">
                {otpNotice}
              </div>
            )}

            {otpError && (
              <div className="mb-4 rounded-lg bg-red-50 p-2.5 text-xs text-red-800 border border-red-100">
                {otpError}
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="otpCode" className="block text-xs font-medium text-gray-700 mb-1">
                6-Digit Code
              </label>
              <input
                id="otpCode"
                type="text"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center font-mono text-2xl tracking-[0.3em] font-bold rounded-xl border border-gray-300 py-2.5 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={verifyCode.length < 4 || isSubmittingOtp}
                onClick={handleConfirmVerification}
                className="w-full rounded-xl bg-primary-600 py-2.5 text-xs font-bold text-white hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
              >
                {isSubmittingOtp && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isSubmittingOtp ? 'Verifying...' : 'Confirm Verification'}
              </button>
              <button
                type="button"
                disabled={isRequestingOtp}
                onClick={() => handleStartVerification(verifyType)}
                className="w-full py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 text-center"
              >
                {isRequestingOtp ? 'Sending code...' : 'Resend code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-bold text-gray-900">Change Profile Picture</h3>
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Upload Image File</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFile}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                />
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-2 text-xs text-gray-400">or enter image URL</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <div>
                <input
                  type="url"
                  value={customAvatarInput}
                  onChange={(e) => setCustomAvatarInput(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(false)}
                  className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!customAvatarInput.trim()}
                  onClick={() => {
                    setAvatarUrl(customAvatarInput.trim());
                    setShowAvatarModal(false);
                  }}
                  className="rounded-xl bg-primary-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  Use URL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
