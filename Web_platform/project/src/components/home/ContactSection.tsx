import { Mail, Phone, MapPin, Building2, Bike, LifeBuoy } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import { revealStagger } from '@/utils/reveal';

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

export function ContactSection() {
  return (
    <section id="contact" className="py-20 bg-gray-50 scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider">Contact</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-gray-900 sm:text-4xl">
            Get in touch
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Have questions? We are here to help. Reach out through the
            appropriate channel below.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {contactChannels.map((channel) => {
            const Icon = channel.icon;
              return (
              <Reveal key={channel.label} delay={revealStagger(contactChannels.indexOf(channel))}>
              <div className="rounded-2xl border border-gray-100 bg-white p-7 text-center shadow-sm hover:shadow-md transition-shadow">
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
              </Reveal>
            );
          })}
        </div>

        {/* Additional info */}
        <Reveal className="mt-12 rounded-2xl bg-white border border-gray-100 p-8 shadow-sm">
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
        </Reveal>

        <p className="mt-6 text-center text-xs text-gray-400">
          Send a message through the contact page and our team will respond.
        </p>
      </div>
    </section>
  );
}
