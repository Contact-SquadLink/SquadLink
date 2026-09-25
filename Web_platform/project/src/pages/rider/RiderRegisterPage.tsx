import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bike, CheckCircle2 } from 'lucide-react';
import { riderApi } from '@/api/rider';
import { formatNigerianPhone, isCompleteNigerianPhone, phoneDigits } from '@/utils/nigerian-phone';

export function RiderRegisterPage() {
  const [vehicleType, setVehicleType] = useState<'MOTORCYCLE' | 'KEKE'>('MOTORCYCLE');
  const [vehicleRegistration, setVehicleRegistration] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (phoneNumber && !isCompleteNigerianPhone(phoneNumber)) {
      setError('Phone number must contain exactly 10 digits after +234.');
      return;
    }
    try {
      await riderApi.register({ vehicleType, vehicleRegistration, phoneNumber: phoneNumber || undefined, firstName: firstName || undefined, lastName: lastName || undefined });
      setSubmitted(true);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to submit rider application.');
    }
  };

  if (submitted) {
    return <div className="mx-auto max-w-xl px-4 py-16 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-success-600" /><h1 className="mt-4 font-display text-2xl font-bold text-gray-900">Application submitted</h1><p className="mt-2 text-sm text-gray-600">Your rider application is pending admin review. You will receive a notification when a decision is made.</p><Link to="/notifications" className="mt-6 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white">View notifications</Link></div>;
  }

  return <div className="mx-auto max-w-xl px-4 py-10 sm:px-6"><Link to="/" className="text-sm font-semibold text-primary-700">Back home</Link><div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-700"><Bike className="h-6 w-6" /></div><div><h1 className="font-display text-2xl font-bold text-gray-900">Become a rider</h1><p className="text-sm text-gray-500">Submit your details for verification.</p></div></div>{error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<form onSubmit={submit} className="mt-6 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="First name" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" /><input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Last name" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div><div className="flex w-full rounded-lg border border-gray-300"><span className="flex items-center border-r border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-600">+234</span><input value={phoneDigits(phoneNumber)} onChange={(event) => setPhoneNumber(formatNigerianPhone(event.target.value))} inputMode="numeric" maxLength={10} placeholder="9011390588" className="min-w-0 flex-1 rounded-r-lg px-3 py-2 text-sm outline-none" /></div><div className="grid gap-4 sm:grid-cols-2"><select value={vehicleType} onChange={(event) => setVehicleType(event.target.value as 'MOTORCYCLE' | 'KEKE')} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="MOTORCYCLE">Motorcycle</option><option value="KEKE">Keke</option></select><input required value={vehicleRegistration} onChange={(event) => setVehicleRegistration(event.target.value)} placeholder="Vehicle registration" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div><button type="submit" className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white">Submit application</button></form></div></div>;
}
