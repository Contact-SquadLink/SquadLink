import { useState } from 'react';
import { X, KeyRound, CheckCircle2, AlertCircle, ArrowLeft, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { authApi } from '@/api/auth';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIdentifier?: string;
  onSuccess?: () => void;
}

export function ForgotPasswordModal({
  isOpen,
  onClose,
  initialIdentifier = '',
  onSuccess,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<'request' | 'reset' | 'success'>('request');
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpHint, setOtpHint] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setError(null);
    setIsLoading(true);

    try {
      const res = await authApi.forgotPassword(identifier.trim());
      if (res.data?.otpCode) {
        setOtpHint(res.data.otpCode);
      }
      setStep('reset');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to initiate password reset. Please verify your email or phone number.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await authApi.resetPassword({
        identifier: identifier.trim(),
        code: code.trim(),
        newPassword,
      });
      setStep('success');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to reset password. Please verify the code and try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetForm = () => {
    setStep('request');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setOtpHint(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleResetForm}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-gray-100 transition-all duration-300 z-10"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={handleResetForm}
          className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {step === 'request' && (
          <div>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 mb-3">
                <KeyRound className="h-6 w-6" />
              </div>
              <h2 className="font-display text-xl font-bold tracking-tight text-gray-900">
                Recover Account
              </h2>
              <p className="mt-1 text-xs text-gray-500 max-w-xs">
                Enter the email or phone number associated with your account. Account recovery requires a verified email or phone number.
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-100 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email or Phone Number
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. user@example.com or 08012345678"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[11px] text-amber-800 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  For account security, only users with a verified phone number or email address can reset their password via OTP.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading || !identifier.trim()}
                className="w-full inline-flex items-center justify-center rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  'Send Recovery OTP'
                )}
              </button>
            </form>
          </div>
        )}

        {step === 'reset' && (
          <div>
            <button
              type="button"
              onClick={() => {
                setStep('request');
                setError(null);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 mb-4 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-3">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="font-display text-xl font-bold tracking-tight text-gray-900">
                Set New Password
              </h2>
              <p className="mt-1 text-xs text-gray-500 max-w-xs">
                We sent a 6-digit recovery code to <span className="font-semibold text-gray-800">{identifier}</span>.
              </p>
            </div>

            {otpHint && (
              <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50 p-3 text-xs text-primary-800 text-center font-mono font-bold tracking-widest">
                [Testing OTP Code: {otpHint}]
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-100 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  6-Digit Recovery Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center tracking-widest text-lg font-mono rounded-xl border border-gray-300 px-3.5 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || code.length !== 6 || !newPassword || !confirmPassword}
                className="w-full inline-flex items-center justify-center rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  'Reset & Secure Password'
                )}
              </button>
            </form>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="font-display text-xl font-bold text-gray-900">Password Updated!</h2>
            <p className="mt-2 text-xs text-gray-600">
              Your password has been successfully reset. You can now log in using your new credentials.
            </p>
            <button
              type="button"
              onClick={handleResetForm}
              className="mt-6 w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-all cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
