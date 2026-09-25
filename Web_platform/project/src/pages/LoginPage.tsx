import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ShoppingBag,
  User,
  Store,
  Bike,
  Shield,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { Role } from '@/types';
import { cn } from '@/utils/format';

const roleConfig: {
  role: Role;
  title: string;
  description: string;
  icon: typeof User;
  gradient: string;
  iconBg: string;
  features: string[];
}[] = [
  {
    role: 'CUSTOMER',
    title: 'Customer',
    description: 'Shop products from local businesses and get them delivered.',
    icon: User,
    gradient: 'from-primary-500 to-primary-700',
    iconBg: 'bg-primary-600',
    features: ['Browse the catalogue', 'Add to cart & checkout', 'Track your orders'],
  },
  {
    role: 'BUSINESS_USER',
    title: 'Business',
    description: 'Manage your store, products, and incoming orders.',
    icon: Store,
    gradient: 'from-accent-500 to-accent-700',
    iconBg: 'bg-accent-600',
    features: ['Add & manage products', 'Receive and fulfil orders', 'Track business performance'],
  },
  {
    role: 'RIDER',
    title: 'Rider',
    description: 'Pick up and deliver orders to customers in your area.',
    icon: Bike,
    gradient: 'from-secondary-500 to-secondary-700',
    iconBg: 'bg-secondary-600',
    features: ['See assigned deliveries', 'Update delivery status', 'Track earnings'],
  },
  {
    role: 'ADMIN',
    title: 'Admin',
    description: 'Oversee the platform, verify businesses, and monitor operations.',
    icon: Shield,
    gradient: 'from-gray-700 to-gray-900',
    iconBg: 'bg-gray-800',
    features: ['Verify businesses', 'Monitor all operations', 'Manage the platform'],
  },
];

function safeRedirect(value: string | null): string | null {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
}

function roleCanOpenPath(role: Role, path: string): boolean {
  if (path.startsWith('/business')) return role === 'BUSINESS_USER' || role === 'ADMIN';
  if (path.startsWith('/rider')) return role === 'RIDER' || role === 'ADMIN';
  if (path.startsWith('/admin')) return role === 'ADMIN';
  if (path.startsWith('/earnings')) return role === 'BUSINESS_USER' || role === 'RIDER';
  return true;
}

function defaultPathForRole(role: Role): string {
  if (role === 'ADMIN') return '/admin';
  if (role === 'BUSINESS_USER') return '/business';
  if (role === 'RIDER') return '/rider';
  return '/dashboard';
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const roleParam = searchParams.get('role');
  const { login } = useAuth();
  const isAdminRole = roleParam === 'ADMIN';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = (role: Role) => {
    navigate(`/login?role=${role}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await login(identifier, password);

      const destination = safeRedirect(redirect);
      if (destination && roleCanOpenPath(user.role, destination)) {
        navigate(destination);
        return;
      }

      if (roleParam === 'BUSINESS_USER') {
        if (user.role === 'BUSINESS_USER') {
          navigate('/business');
        } else if (user.role === 'CUSTOMER') {
          navigate('/business/register');
        } else if (user.role === 'RIDER') {
          navigate('/rider');
        } else {
          navigate('/business');
        }
        return;
      }

      navigate(defaultPathForRole(user.role));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (roleParam === 'CUSTOMER' || roleParam === 'BUSINESS_USER' || roleParam === 'RIDER' || roleParam === 'ADMIN') {
    const roleTitle = roleConfig.find((c) => c.role === roleParam)?.title || roleParam;
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <span className="font-display text-xl font-bold text-gray-900">SQUA<span className="text-primary-600">LINK</span></span>
            </Link>
            <Link
              to="/login"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              ← Back to role selection
            </Link>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="font-display text-3xl font-bold text-gray-900">{roleTitle} Login</h1>
              <p className="mt-2 text-gray-600">
                {isAdminRole
                  ? 'Admin access is provisioned by the platform owner. Sign in with your assigned credentials.'
                  : `Sign in to your SquaLink ${roleTitle.toLowerCase()} account`}
              </p>
            </div>

            <div className="bg-white px-6 py-8 shadow-xl rounded-2xl border border-gray-100">
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div>
                  <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1">
                    Email or Phone Number
                  </label>
                  <input
                    id="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    placeholder="e.g. user@example.com or +123456789"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 pr-11 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="mt-6 flex flex-col gap-3 text-center text-sm">
                {!isAdminRole && (
                  <Link
                    to={`/register?role=CUSTOMER${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`}
                    className="text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    Don't have an account? Create Account
                  </Link>
                )}
                {isAdminRole && (
                  <p className="text-xs text-gray-500">
                    Admin accounts are created by the platform owner and are not self-registered.
                  </p>
                )}
                <button
                  onClick={() => navigate('/login')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Back to role selection
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }


  if (roleParam && roleParam !== 'CUSTOMER') {
    const roleTitle = roleConfig.find((c) => c.role === roleParam)?.title || roleParam;
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight text-gray-900">
                SQUAD<span className="text-primary-600">LINK</span>
              </span>
            </Link>
            <Link
              to="/login"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              ← Back to role selection
            </Link>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center">
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
              {roleTitle} Login
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              {roleTitle} authentication form is currently under development. Please log in as a Customer or return to role selection.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
            >
              Back to Role Selection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-gray-900">
              SQUAD<span className="text-primary-600">LINK</span>
            </span>
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl">
          {/* Heading */}
          <div className="text-center mb-10">
            <h1 className="font-display text-3xl font-bold text-gray-900 sm:text-4xl">
              Choose how you want to explore
            </h1>
            <p className="mt-3 text-base text-gray-600 max-w-2xl mx-auto">
              SQUADLINK connects customers, businesses, and riders on one platform.
              Select a role below to sign in or explore.
            </p>
          </div>

          {/* Role cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {roleConfig.map((config) => {
              const Icon = config.icon;
              return (
                <button
                  key={config.role}
                  onClick={() => handleRoleSelect(config.role)}
                  className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary-200 hover:-translate-y-0.5"
                >
                  {/* Gradient banner */}
                  <div className={cn('absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r', config.gradient)} />

                  <div className="flex items-start gap-4">
                    <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm', config.iconBg)}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-display text-xl font-bold text-gray-900">
                        {config.title}
                      </h2>
                      <p className="mt-1 text-sm text-gray-600">
                        {config.description}
                      </p>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="mt-5 space-y-2">
                    {config.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success-100">
                          <svg className="h-2.5 w-2.5 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-primary-600 group-hover:text-primary-700">
                    Sign in as {config.title}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer note */}
          <p className="mt-8 text-center text-xs text-gray-400">
            Authentication is powered by the SQUADLINK backend API.
          </p>
        </div>
      </div>
    </div>
  );
}
