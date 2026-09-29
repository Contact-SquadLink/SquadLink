import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  User,
  Store,
  Bike,
  Shield,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';
import type { Role } from '@/types';

const roleTabs: { role: Role; label: string; icon: typeof User }[] = [
  { role: 'CUSTOMER', label: 'Customer', icon: User },
  { role: 'BUSINESS_USER', label: 'Business', icon: Store },
  { role: 'RIDER', label: 'Rider', icon: Bike },
  { role: 'ADMIN', label: 'Admin', icon: Shield },
];

function safeRedirect(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }
  const clean = value.split('?')[0];
  if (['/unauthorized', '/login', '/register'].includes(clean)) {
    return null;
  }
  return value;
}

function roleCanOpenPath(role: Role, path: string): boolean {
  if (path === '/unauthorized' || path.startsWith('/unauthorized')) return false;
  if (role === 'SUPER_ADMIN') return true;
  if (role === 'ADMIN') {
    return !path.startsWith('/customer');
  }
  if (role === 'BUSINESS_USER') {
    return path.startsWith('/business') || path.startsWith('/earnings') || path.startsWith('/profile') || path.startsWith('/notifications') || path === '/' || path.startsWith('/browse');
  }
  if (role === 'RIDER') {
    return path.startsWith('/rider') || path.startsWith('/earnings') || path.startsWith('/profile') || path.startsWith('/notifications') || path === '/' || path.startsWith('/browse');
  }
  // CUSTOMER
  if (path.startsWith('/business/register') || path.startsWith('/rider/register')) return true;
  if (path.startsWith('/business') || path.startsWith('/rider') || path.startsWith('/admin') || path.startsWith('/earnings')) {
    return false;
  }
  return true;
}

function defaultPathForRole(role: Role): string {
  if (role === 'SUPER_ADMIN') return '/admin/control-center';
  if (role === 'ADMIN') return '/admin';
  if (role === 'BUSINESS_USER') return '/business';
  if (role === 'RIDER') return '/rider';
  return '/dashboard';
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const roleParam = (searchParams.get('role')?.toUpperCase() as Role) || 'CUSTOMER';

  const [selectedRole, setSelectedRole] = useState<Role>(
    roleTabs.some((t) => t.role === roleParam) ? roleParam : 'CUSTOMER'
  );
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    if (roleParam && roleTabs.some((t) => t.role === roleParam)) {
      setSelectedRole(roleParam);
    }
  }, [roleParam]);

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

      const destination = safeRedirect(redirect);
      const destinationUrl = destination ? new URL(destination, window.location.origin) : null;
      const isGenericNotificationLanding =
        destinationUrl?.pathname === '/notifications' && !destinationUrl.searchParams.has('open');

      if (destination && !isGenericNotificationLanding && roleCanOpenPath(user.role, destination)) {
        navigate(destination);
        return;
      }

      if (selectedRole === 'BUSINESS_USER') {
        if (user.role === 'BUSINESS_USER') {
          navigate('/business');
        } else if (user.role === 'CUSTOMER') {
          navigate('/business/register');
        } else {
          navigate(defaultPathForRole(user.role));
        }
        return;
      }

      if (selectedRole === 'RIDER') {
        if (user.role === 'RIDER') {
          navigate('/rider');
        } else if (user.role === 'CUSTOMER') {
          navigate('/rider/register');
        } else {
          navigate(defaultPathForRole(user.role));
        }
        return;
      }

      navigate(defaultPathForRole(user.role));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Invalid credentials. Please verify your details.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const registerLink =
    selectedRole === 'BUSINESS_USER'
      ? '/business/register'
      : selectedRole === 'RIDER'
      ? '/rider/register'
      : '/register';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50/60 via-gray-50 to-primary-50/40 flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Return to Home */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-500 hover:text-primary-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md rounded-3xl bg-white p-7 sm:p-9 shadow-2xl border border-gray-100/80 transition-all duration-300 animate-slide-up">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link to="/" className="inline-block group">
            <img
              src="/squadlink-logo.png"
              alt="SquadLink"
              className="h-16 w-16 sm:h-18 sm:w-18 object-contain mb-3 drop-shadow-md transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Welcome to <span className="text-gray-900">SQUAD</span>
            <span className="text-primary-600">LINK</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Select your account type and sign in to continue
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-gray-100 rounded-xl mb-6">
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
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isSelected
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className={`h-4 w-4 mb-1 ${isSelected ? 'text-primary-600' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-100 animate-fade-in flex items-start gap-2">
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
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
                  ? 'contact.squadlink@gmail.com'
                  : selectedRole === 'RIDER'
                  ? '08012345678 or rider@squadlink.ng'
                  : 'email@example.com or 08012345678'
              }
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 inline-flex items-center justify-center rounded-xl bg-primary-600 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 transition-all"
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

        {/* Footer */}
        <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col items-center gap-2 text-center text-xs text-gray-500">
          <p>
            Don't have an account?{' '}
            <Link
              to={registerLink}
              className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
            >
              Register here
            </Link>
          </p>
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
