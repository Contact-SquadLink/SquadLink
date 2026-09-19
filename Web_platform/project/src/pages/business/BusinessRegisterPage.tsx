import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { businessApi } from '@/api/business';
import { useAuth } from '@/hooks/useAuth';

interface BusinessFormState {
  name: string;
  description: string;
  phoneNumber: string;
  email: string;
  addressLine: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  minimumOrderAmount: string;
}

const initialForm: BusinessFormState = {
  name: '',
  description: '',
  phoneNumber: '',
  email: '',
  addressLine: '',
  city: '',
  state: '',
  latitude: '',
  longitude: '',
  minimumOrderAmount: '0',
};

function normalizeNumber(value: string, field: 'latitude' | 'longitude' | 'minimumOrderAmount') {
  if (value.trim() === '') {
    return field === 'minimumOrderAmount' ? 0 : 0;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

export function BusinessRegisterPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [form, setForm] = useState<BusinessFormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=%2Fbusiness%2Fregister', { replace: true });
      return;
    }

    if (user.role === 'BUSINESS_USER') {
      navigate('/business', { replace: true });
    }
  }, [navigate, user]);

  const handleChange = (field: keyof BusinessFormState) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const validateForm = () => {
    if (!form.name.trim() || form.name.trim().length < 2) {
      return 'Business name is required and must be at least 2 characters long.';
    }

    if (form.addressLine.trim().length < 3) {
      return 'Please provide a valid business address line.';
    }

    if (!form.city.trim() || form.city.trim().length < 2) {
      return 'City is required.';
    }

    if (!form.state.trim() || form.state.trim().length < 2) {
      return 'State is required.';
    }

    if (form.description.trim().length > 5000) {
      return 'Business description must be 5000 characters or fewer.';
    }

    const latitude = Number(form.latitude);
    if (form.latitude.trim() === '' || Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      return 'Latitude must be a number between -90 and 90.';
    }

    const longitude = Number(form.longitude);
    if (form.longitude.trim() === '' || Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      return 'Longitude must be a number between -180 and 180.';
    }

    const minimumOrderAmount = Number(form.minimumOrderAmount);
    if (Number.isNaN(minimumOrderAmount) || minimumOrderAmount < 0) {
      return 'Minimum order amount must be zero or greater.';
    }

    if (form.phoneNumber.trim() && form.phoneNumber.trim().length < 7) {
      return 'Business phone number must be at least 7 characters long when provided.';
    }

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return 'Business email is invalid.';
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      navigate('/login?redirect=%2Fbusiness%2Fregister');
      return;
    }

    if (user.role === 'BUSINESS_USER') {
      navigate('/business', { replace: true });
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setSuccessMessage(null);
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        email: form.email.trim() || undefined,
        addressLine: form.addressLine.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        latitude: normalizeNumber(form.latitude, 'latitude') as number,
        longitude: normalizeNumber(form.longitude, 'longitude') as number,
        minimumOrderAmount: Math.max(0, Math.trunc(Number(form.minimumOrderAmount) || 0)),
      };

      await businessApi.createBusiness(payload);

      const refreshedUser = await refreshUser();
      if (refreshedUser?.role !== 'BUSINESS_USER') {
        throw new Error('Business registration submitted successfully, but your account role has not updated yet. Please refresh or sign in again.');
      }

      setSuccessMessage('Business registration submitted successfully. Your business is currently pending verification.');

      window.setTimeout(() => {
        navigate('/business', { replace: true });
      }, 1200);
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'We could not submit your business application right now. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
            <ShoppingBag className="h-4 w-4" />
            Back to home
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Pending verification
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-100 text-secondary-700">
                <Store className="h-6 w-6" />
              </div>
              <h1 className="font-display text-3xl font-bold text-gray-900">Register your business</h1>
              <p className="mt-2 max-w-xl text-sm text-gray-600">
                Create the business profile for your account. The backend will create the business, set the verification state, and promote the authenticated customer to BUSINESS_USER once the transaction succeeds.
              </p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                  Business name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange('name')}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  placeholder="SQUADLINK Market"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
                  Business description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange('description')}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  placeholder="Tell customers about your business, products, and delivery coverage."
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="phoneNumber" className="mb-1 block text-sm font-medium text-gray-700">
                    Phone number
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      value={form.phoneNumber}
                      onChange={handleChange('phoneNumber')}
                      className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                      placeholder="+234 800 000 0000"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                    Business email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    placeholder="hello@yourbusiness.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="addressLine" className="mb-1 block text-sm font-medium text-gray-700">
                  Address line <span className="text-red-500">*</span>
                </label>
                <input
                  id="addressLine"
                  name="addressLine"
                  type="text"
                  value={form.addressLine}
                  onChange={handleChange('addressLine')}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  placeholder="12 Market Road"
                  required
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="city" className="mb-1 block text-sm font-medium text-gray-700">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={form.city}
                    onChange={handleChange('city')}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    placeholder="Lagos"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="state" className="mb-1 block text-sm font-medium text-gray-700">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="state"
                    name="state"
                    type="text"
                    value={form.state}
                    onChange={handleChange('state')}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    placeholder="Lagos State"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="latitude" className="mb-1 block text-sm font-medium text-gray-700">
                    Latitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="latitude"
                    name="latitude"
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    value={form.latitude}
                    onChange={handleChange('latitude')}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    placeholder="6.5244"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="longitude" className="mb-1 block text-sm font-medium text-gray-700">
                    Longitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="longitude"
                    name="longitude"
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    value={form.longitude}
                    onChange={handleChange('longitude')}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    placeholder="3.3792"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="minimumOrderAmount" className="mb-1 block text-sm font-medium text-gray-700">
                  Minimum order amount
                </label>
                <input
                  id="minimumOrderAmount"
                  name="minimumOrderAmount"
                  type="number"
                  min={0}
                  step="1"
                  value={form.minimumOrderAmount}
                  onChange={handleChange('minimumOrderAmount')}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  placeholder="0"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit business registration'
                )}
              </button>
            </form>
          </div>

          <aside className="rounded-3xl border border-gray-200 bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                <MapPin className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Business onboarding</p>
                <h2 className="text-xl font-bold text-gray-900">What happens next</h2>
              </div>
            </div>

            <ol className="space-y-4 text-sm text-gray-700">
              <li className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <p className="font-semibold text-gray-900">1. Create your customer account</p>
                <p className="mt-1 text-gray-600">You sign up as a normal customer before applying to operate a business.</p>
              </li>
              <li className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <p className="font-semibold text-gray-900">2. Submit your business profile</p>
                <p className="mt-1 text-gray-600">The backend creates the business record and starts verification.</p>
              </li>
              <li className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <p className="font-semibold text-gray-900">3. Await verification</p>
                <p className="mt-1 text-gray-600">Once the backend completes the transaction, your account is refreshed as BUSINESS_USER.</p>
              </li>
            </ol>

            <div className="mt-8 rounded-2xl border border-primary-200 bg-primary-50 p-4 text-sm text-primary-800">
              <p className="font-semibold">Backend-driven transition</p>
              <p className="mt-1">The server transaction creates the business, marks it pending verification, and updates the customer role to BUSINESS_USER. The frontend refreshes the authenticated user through /api/v1/auth/me.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
