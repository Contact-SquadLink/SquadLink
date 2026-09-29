import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  ShoppingBag,
  Loader2,
  Bike,
  ShieldCheck,
  Zap,
  Star,
  Clock,
  Sparkles,
  CheckCircle2,
  AtSign,
} from 'lucide-react';
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
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Auto-suggested username preview if user has not typed a custom username
  const suggestedUsername = (
    username.trim() ||
    (firstName.trim() ? `${firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.floor(1000 + Math.random() * 9000)}` : '')
  );

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

    if (!agreedToTerms) {
      setError("Please agree to SquadLink's Terms of Service and Privacy Policy to continue.");
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
        username: username.trim() || undefined,
        email: cleanEmail || undefined,
        phoneNumber: cleanPhone || undefined,
        password,
        termsAccepted: true,
      });

      if (intent === 'business') {
        const nextPath =
          registeredUser.role === 'BUSINESS_USER'
            ? '/business'
            : registeredUser.role === 'RIDER'
            ? '/rider'
            : '/business/register';
        navigate(nextPath);
      } else {
        navigate(safeRedirect(redirect) || '/dashboard');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Registration failed. Please check your details and try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col relative overflow-hidden">
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(14px) rotate(-1deg); }
        }
        @keyframes pulse-radar {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 0.3; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        .anim-float { animation: float-slow 6s ease-in-out infinite; }
        .anim-float-rev { animation: float-reverse 7s ease-in-out infinite; }
        .anim-radar { animation: pulse-radar 3s ease-in-out infinite; }
      `}</style>

      {/* High Quality SquadLink Photographic Hero Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/squadlink-signup-hero.jpg"
          alt="SquadLink Logistics & Delivery Network"
          className="h-full w-full object-cover object-center filter brightness-[0.34] contrast-[1.12] scale-[1.02] transform transition-transform duration-1000"
        />
        {/* Cinematic Multi-layered Overlays matching SquadLink Green/Cyan/Slate Palette */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary-900/35 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-emerald-900/30 via-transparent to-transparent" />

        {/* Ambient atmospheric glows */}
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary-500/20 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 -right-40 h-[500px] w-[500px] rounded-full bg-emerald-500/15 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 left-1/3 h-[500px] w-[500px] rounded-full bg-cyan-600/15 blur-[120px] pointer-events-none" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-20 border-b border-white/10 bg-slate-950/75 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/squadlink-logo.png"
              alt="SquadLink"
              className="h-9 w-9 object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
            />
            <span className="font-display text-xl font-bold text-white tracking-tight">
              SQUAD<span className="text-primary-400">LINK</span>
            </span>
          </Link>
          <Link
            to={`/login?role=CUSTOMER${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-white/10 hover:border-white/25 transition-all"
          >
            Already have an account? <span className="text-primary-400 font-bold ml-1">Sign In</span>
          </Link>
        </div>
      </header>

      {/* Main Interactive Layout */}
      <main className="relative z-10 flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 w-full items-center">
          
          {/* Left Column: Interactive Animated Showcase (Hero/Visuals) */}
          <div className="lg:col-span-6 space-y-6 text-white order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-3.5 py-1.5 text-xs font-semibold text-primary-300 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary-400 animate-spin" />
              <span>Next-Gen Hyperlocal Campus & City Logistics</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Join the fastest <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-emerald-300 to-cyan-400">
                delivery network
              </span> in town.
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-lg leading-relaxed">
              Experience seamless ordering from verified local restaurants, grocery markets, and merchants — with live courier tracking and protected payouts.
            </p>

            {/* Animated Interactive Delivery Status Cards */}
            <div className="space-y-4 pt-2">
              {/* Floating Card 1: Live Courier Dispatch */}
              <div className="anim-float rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md shadow-xl flex items-center gap-4 max-w-md">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-emerald-500 text-white shadow-md">
                  <Bike className="h-6 w-6" />
                  <span className="anim-radar absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white">Courier En Route ⚡</p>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Live GPS
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate mt-0.5">
                    Assigned courier accepted order · 18 mins to doorstep
                  </p>
                </div>
              </div>

              {/* Floating Card 2: Security & Escrow Protection */}
              <div className="anim-float-rev rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md shadow-xl flex items-center gap-4 max-w-md ml-auto lg:mr-8">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-primary-600 text-white shadow-md">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white">Full Customer Protection 🛡️</p>
                    <span className="text-[10px] font-semibold text-primary-300 bg-primary-500/10 px-2 py-0.5 rounded-full border border-primary-500/20">
                      Verified
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate mt-0.5">
                    Cancel anytime before payment · 100% money back guarantee
                  </p>
                </div>
              </div>
            </div>

            {/* Live Platform Stats Ticker */}
            <div className="grid grid-cols-3 gap-3 pt-4 max-w-md">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                <p className="font-display text-xl sm:text-2xl font-black text-white">15k+</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Fulfilled Orders</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                <p className="font-display text-xl sm:text-2xl font-black text-emerald-400">&lt; 25m</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Avg Delivery</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                <div className="flex items-center justify-center gap-1 font-display text-xl sm:text-2xl font-black text-amber-400">
                  <span>4.9</span>
                  <Star className="h-4 w-4 fill-amber-400" />
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Customer Rating</p>
              </div>
            </div>
          </div>

          {/* Right Column: Account Creation Card */}
          <div className="lg:col-span-6 order-1 lg:order-2">
            <div className="w-full max-w-lg mx-auto rounded-3xl border border-white/40 bg-white/95 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-slate-950/40 ring-1 ring-black/5">
              <div className="mb-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 border border-emerald-200 mb-2.5">
                  {intent === 'business' ? '🏬 Merchant Partner Network' : '⚡ Swift Hyperlocal Delivery'}
                </span>
                <h2 className="font-display text-2xl font-bold text-gray-900 tracking-tight">
                  {intent === 'business' ? 'Create Merchant Account' : 'Create Customer Account'}
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  {intent === 'business'
                    ? 'Register your account to begin managing your online store and catalogue'
                    : 'Sign up to start ordering food, drinks, and packages on SquadLink'}
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="firstName" className="block text-xs font-semibold text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. John"
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-xs font-semibold text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Doe"
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Unique Username Field with Live Preview */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="username" className="block text-xs font-semibold text-gray-700">
                      Unique Username <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    {suggestedUsername && (
                      <span className="text-[10px] text-primary-600 font-mono font-medium">
                        @{suggestedUsername}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-gray-400 font-mono">@</span>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder={suggestedUsername || 'unique_handle'}
                      maxLength={30}
                      className="w-full rounded-xl border border-gray-300 pl-7 pr-3 py-2 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Your unique handle across orders, deliveries, and communications.
                  </p>
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="phoneNumber" className="block text-xs font-semibold text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <div className="flex w-full rounded-xl border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500">
                    <span className="flex items-center border-r border-gray-200 bg-gray-50 px-3 text-xs font-bold text-gray-600">
                      +234
                    </span>
                    <input
                      id="phoneNumber"
                      type="tel"
                      value={phoneDigits(phoneNumber)}
                      onChange={(e) => setPhoneNumber(formatNigerianPhone(e.target.value))}
                      placeholder="9011390588"
                      inputMode="numeric"
                      maxLength={10}
                      className="min-w-0 flex-1 px-3 py-2 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 pr-9 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400 hover:text-gray-600"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 pr-9 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((visible) => !visible)}
                        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400 hover:text-gray-600"
                        aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                      >
                        {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mandatory Legal Compliance Checkbox */}
                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/80 p-3.5 transition-colors focus-within:border-primary-400">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      id="terms-checkbox"
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer shrink-0"
                    />
                    <span className="text-xs text-gray-600 leading-snug">
                      I agree to SquadLink’s{' '}
                      <Link to="/terms" target="_blank" rel="noopener noreferrer" className="font-bold text-primary-600 hover:underline">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="font-bold text-primary-600 hover:underline">
                        Privacy Policy
                      </Link>
                      , and certify that all provided information is accurate. I understand that providing false details or causing harm will result in immediate account termination and legal liability.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!agreedToTerms || isLoading}
                  className="w-full mt-3 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary-600 via-emerald-600 to-teal-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/20 hover:from-primary-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              {/* Alternate Registrations */}
              <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col items-center gap-2 text-center text-xs text-gray-500">
                <p>
                  Already have an account?{' '}
                  <Link
                    to={`/login?role=CUSTOMER${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`}
                    className="font-semibold text-primary-600 hover:text-primary-700"
                  >
                    Sign In here
                  </Link>
                </p>

                <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-400">
                  <Link to="/business/register" className="hover:text-primary-600 transition-colors">
                    Merchant Sign Up &rarr;
                  </Link>
                  <span>·</span>
                  <Link to="/rider/register" className="hover:text-primary-600 transition-colors">
                    Rider Sign Up &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
