import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bike, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { riderApi } from '@/api/rider';
import { formatNigerianPhone, isCompleteNigerianPhone, phoneDigits } from '@/utils/nigerian-phone';

export function RiderRegisterPage() {
  const [vehicleType, setVehicleType] = useState<'MOTORCYCLE' | 'KEKE'>('MOTORCYCLE');
  const [vehicleRegistration, setVehicleRegistration] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!agreedToTerms) {
      setError('You must certify your rider credentials and agree to SquadLink’s Terms of Service and Privacy Policy.');
      return;
    }

    if (phoneNumber && !isCompleteNigerianPhone(phoneNumber)) {
      setError('Phone number must contain exactly 10 digits after +234.');
      return;
    }

    setIsSubmitting(true);
    try {
      await riderApi.register({
        vehicleType,
        vehicleRegistration: vehicleRegistration.trim(),
        phoneNumber: phoneNumber || undefined,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined
      });
      setSubmitted(true);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to submit rider application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success-600" />
        <h1 className="mt-4 font-display text-2xl font-bold text-gray-900">Application submitted</h1>
        <p className="mt-2 text-sm text-gray-600">
          Your rider application is pending admin review. You will receive an in-app notification when a decision is made.
        </p>
        <Link
          to="/notifications"
          className="mt-6 inline-flex rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition"
        >
          View notifications
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <Link to="/" className="text-sm font-semibold text-primary-700 hover:text-primary-800 transition">
        &larr; Back home
      </Link>
      <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
            <Bike className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Become a SquadLink Rider</h1>
            <p className="text-sm text-gray-500">Earn with fast, hyperlocal dispatch in your community.</p>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">First Name</label>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="First name"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name</label>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Last name"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
            <div className="flex w-full rounded-xl border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500">
              <span className="flex items-center border-r border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-600">
                +234
              </span>
              <input
                value={phoneDigits(phoneNumber)}
                onChange={(event) => setPhoneNumber(formatNigerianPhone(event.target.value))}
                inputMode="numeric"
                maxLength={10}
                placeholder="9011390588"
                className="min-w-0 flex-1 px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Vehicle Type</label>
              <select
                value={vehicleType}
                onChange={(event) => setVehicleType(event.target.value as 'MOTORCYCLE' | 'KEKE')}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="MOTORCYCLE">Motorcycle (Bike)</option>
                <option value="KEKE">Keke (Tricycle)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Vehicle Registration Plate</label>
              <input
                required
                value={vehicleRegistration}
                onChange={(event) => setVehicleRegistration(event.target.value)}
                placeholder="e.g. LAG-123-XY"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

          {/* Legal Compliance Checkbox */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3.5 text-xs text-gray-600">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer shrink-0"
              />
              <span className="leading-snug">
                I agree to SquadLink’s{' '}
                <Link to="/terms" target="_blank" rel="noopener noreferrer" className="font-bold text-primary-600 hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="font-bold text-primary-600 hover:underline">
                  Privacy Policy
                </Link>
                , and certify that I hold a valid driver's licence/rider permit, roadworthiness documents, and that all information is truthful. I understand that reckless conduct or false submissions will result in immediate suspension, legal liability, and complete indemnification of SquadLink.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={!agreedToTerms || isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting application...
              </>
            ) : (
              'Submit Rider Application'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
