import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, ShoppingBag, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { formatNigerianPhone, isCompleteNigerianPhone, phoneDigits } from '@/utils/nigerian-phone';

function safeRedirect(value: string | null): string | null {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const intent = searchParams.get('intent');
  const { register, user } = useAuth();

  useEffect(() => {
    if (!user) {
      return;
    }

    if (user.role === 'ADMIN') {
      navigate('/admin', { replace: true });
      return;
    }

    if (intent === 'business') {
      if (user.role === 'CUSTOMER') {
        navigate('/business/register', { replace: true });
        return;
      }

      navigate(user.role === 'BUSINESS_USER' ? '/business' : '/dashboard', { replace: true });
      return;
    }

    if (user.role === 'BUSINESS_USER') {
      navigate('/business', { replace: true });
      return;
    }

    if (user.role === 'RIDER') {
      navigate('/rider', { replace: true });
      return;
    }

    navigate(safeRedirect(redirect) || '/dashboard', { replace: true });
  }, [intent, navigate, redirect, user]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (intent === 'admin') {
      setError('Admin accounts are not self-registered. Please sign in with an existing admin account.');
      return;
    }

    const cleanEmail = email.trim();
    const cleanPhone = phoneNumber.trim();

    if (!cleanEmail && !cleanPhone) {
      setError('Please provide either an email address or a phone number.');
      return;
    }

    if (cleanPhone && !isCompleteNigerianPhone(cleanPhone)) {
      setError('Phone number must contain exactly 10 digits after +234.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    if (user) {
      if (intent === 'business') {
        if (user.role === 'CUSTOMER') {
          navigate('/business/register', { replace: true });
        } else {
          navigate(user.role === 'BUSINESS_USER' ? '/business' : '/dashboard', { replace: true });
        }
      } else {
        navigate(redirect || '/dashboard', { replace: true });
      }
      setIsLoading(false);
      return;
    }

    try {
      const registeredUser = await register({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        email: cleanEmail || undefined,
        phoneNumber: cleanPhone || undefined,
        password,
      });

      if (intent === 'business') {
        const nextPath = registeredUser.role === 'BUSINESS_USER' ? '/business' : registeredUser.role === 'RIDER' ? '/rider' : '/business/register';
        navigate(nextPath);
      } else {
        navigate(safeRedirect(redirect) || '/dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please check your details and try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold text-gray-900">
              SQUA<span className="text-primary-600">LINK</span>
            </span>
          </Link>
          <Link
            to={`/login?role=CUSTOMER${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`}
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            Already have an account? Sign In
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold text-gray-900">
              {intent === 'business' ? 'Create Business Account' : 'Create Customer Account'}
            </h1>
            <p className="mt-2 text-gray-600">
              {intent === 'business'
                ? 'Create your account credentials to begin business registration'
                : 'Join SquaLink to order from local stores'}
            </p>
            {intent === 'admin' && (
              <p className="mt-2 text-sm text-red-600">
                Admin accounts are invited-only and cannot be created from this page.
              </p>
            )}
          </div>

          <div className="bg-white px-6 py-8 shadow-xl rounded-2xl border border-gray-100">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="flex w-full rounded-lg border border-gray-300">
                  <span className="flex items-center border-r border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-600">+234</span>
                  <input
                    id="phoneNumber"
                    type="tel"
                    value={phoneDigits(phoneNumber)}
                    onChange={(e) => setPhoneNumber(formatNigerianPhone(e.target.value))}
                    className="min-w-0 flex-1 rounded-r-lg px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="9011390588"
                    inputMode="numeric"
                    maxLength={10}
                  />
                </div>
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
                    className="w-full px-3.5 py-2 pr-11 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                    placeholder="At least 8 characters"
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

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2 pr-11 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                    placeholder="Repeat your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                    aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <div className="mt-6 flex flex-col gap-3 text-center text-sm">
              <Link
                to={`/login?role=CUSTOMER${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`}
                className="text-primary-600 hover:text-primary-700 font-semibold"
              >
                Already have an account? Sign In
              </Link>
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
