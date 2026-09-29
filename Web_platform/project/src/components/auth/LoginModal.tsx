import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { X, Eye, EyeOff, Loader2, User, Store, Bike, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import type { Role } from '@/types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: Role;
}

const roleTabs: { role: Role; label: string; icon: typeof User }[] = [
  { role: 'CUSTOMER', label: 'Customer', icon: User },
  { role: 'BUSINESS_USER', label: 'Business', icon: Store },
  { role: 'RIDER', label: 'Rider', icon: Bike },
  { role: 'ADMIN', label: 'Admin', icon: Shield },
];

export function LoginModal({ isOpen, onClose, initialRole = 'CUSTOMER' }: LoginModalProps) {
  const [selectedRole, setSelectedRole] = useState<Role>(initialRole);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setSelectedRole(initialRole);
    setError(null);
  }, [initialRole, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await login(
        identifier,
        password,
        selectedRole === 'ADMIN' ? 'ADMIN' : undefined
      );

      onClose();

      // Navigate based on resolved role
      if (user.role === 'SUPER_ADMIN') {
        navigate('/admin/control-center');
      } else if (user.role === 'ADMIN') {
        navigate('/admin');
      } else if (user.role === 'BUSINESS_USER') {
        navigate('/business');
      } else if (user.role === 'RIDER') {
        navigate('/rider');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Invalid credentials. Please verify your details.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-gray-100 transition-all duration-300 animate-slide-up z-10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-headline"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Brand Header with Official Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="/squadlink-logo.png"
            alt="SquadLink"
            className="h-12 w-12 object-contain mb-3 drop-shadow-sm"
          />
          <h2 id="modal-headline" className="font-display text-2xl font-bold tracking-tight text-gray-900">
            Welcome to <span className="text-gray-900">SQUAD</span>
            <span className="text-primary-600">LINK</span>
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Select your account type and sign in to continue
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-gray-100 rounded-xl mb-5">
          {roleTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = selectedRole === tab.role;
            return (
              <button
                key={tab.role}
                type="button"
                onClick={() => {
                  setSelectedRole(tab.role);
                  setError(null);
                }}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isSelected
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className={`h-4 w-4 mb-0.5 ${isSelected ? 'text-primary-600' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-100 animate-fade-in">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder={
                selectedRole === 'ADMIN'
                  ? 'admin@squadlink.ng'
                  : selectedRole === 'RIDER'
                  ? '08012345678 or rider@squadlink.ng'
                  : 'email@example.com or 08012345678'
              }
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700">Password</label>
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(true)}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 inline-flex items-center justify-center rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              `Sign In as ${roleTabs.find((r) => r.role === selectedRole)?.label}`
            )}
          </button>
        </form>

        {/* Footer links */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col items-center gap-2 text-center text-xs text-gray-500">
          <p>
            Don't have an account?{' '}
            <Link
              to={
                selectedRole === 'BUSINESS_USER'
                  ? '/business/register'
                  : selectedRole === 'RIDER'
                  ? '/rider/register'
                  : '/register'
              }
              onClick={onClose}
              className="font-semibold text-primary-600 hover:text-primary-700"
            >
              Register here
            </Link>
          </p>
          <Link
            to={`/login?role=${selectedRole}`}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            Go to full login page &rarr;
          </Link>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialIdentifier={identifier}
      />
    </div>
  );
}
