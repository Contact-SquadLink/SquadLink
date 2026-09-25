import { FormEvent, useState } from 'react';
import { Mail, Phone, MapPin, Building2, Bike, LifeBuoy } from 'lucide-react';
import { contactApi } from '@/api/contact';

const CONTACT_EMAIL = 'contact.sqadlink@gmail.com';
const CONTACT_PHONE = '+2349011390588';
const CONTACT_LOCATION = 'Yelwa, Bauchi L.G.A Bauchi state';

const contactChannels = [
  {
    icon: LifeBuoy,
    label: 'General Support',
    email: CONTACT_EMAIL,
    description: 'Questions about using SQUADLINK',
  },
  {
    icon: Building2,
    label: 'Business Enquiries',
    email: CONTACT_EMAIL,
    description: 'Partner with SQUADLINK as a business',
  },
  {
    icon: Bike,
    label: 'Rider Enquiries',
    email: CONTACT_EMAIL,
    description: 'Join SQUADLINK as a delivery rider',
  },
];

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      await contactApi.submit({ name, email, message });
      setName('');
      setEmail('');
      setMessage('');
      setStatus('Your message has been submitted successfully.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to submit your message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <section className="bg-gradient-to-b from-primary-50 to-white py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider">Contact</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-gray-900">Get in touch</h1>
          <p className="mt-4 text-lg text-gray-600">
            Have questions? Reach out through the appropriate channel below.
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {contactChannels.map((channel) => {
              const Icon = channel.icon;
              return (
                <div
                  key={channel.label}
                  className="rounded-2xl border border-gray-100 bg-white p-7 text-center shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold text-gray-900">
                    {channel.label}
                  </h3>
                  <p className="mt-1.5 text-sm text-gray-500">{channel.description}</p>
                  <a
                    href={`mailto:${channel.email}`}
                    className="mt-4 inline-block text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    {channel.email}
                  </a>
                </div>
              );
            })}
          </div>

          <div className="mt-12 rounded-2xl bg-gray-50 border border-gray-100 p-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Mail className="h-5 w-5 text-primary-600 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Email</p>
                  <p className="text-sm font-semibold text-gray-900">{CONTACT_EMAIL}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Phone className="h-5 w-5 text-primary-600 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Phone</p>
                  <p className="text-sm font-semibold text-gray-900">{CONTACT_PHONE}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <MapPin className="h-5 w-5 text-primary-600 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Location</p>
                  <p className="text-sm font-semibold text-gray-900">{CONTACT_LOCATION}</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-bold text-gray-900">Send a message</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <textarea required minLength={10} maxLength={5000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="How can we help?" rows={5} className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <button type="submit" disabled={submitting} className="mt-4 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {submitting ? 'Sending...' : 'Send message'}
            </button>
            {status && <p className="mt-3 text-sm text-gray-600">{status}</p>}
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            We respond through the contact details above.
          </p>
        </div>
      </section>
    </div>
  );
}
