import { Mail, Phone, MapPin, Building2, Bike, LifeBuoy } from 'lucide-react';

const contactChannels = [
  {
    icon: LifeBuoy,
    label: 'General Support',
    email: 'support@squadlink.example',
    description: 'Questions about using SQUADLINK',
  },
  {
    icon: Building2,
    label: 'Business Enquiries',
    email: 'business@squadlink.example',
    description: 'Partner with SQUADLINK as a business',
  },
  {
    icon: Bike,
    label: 'Rider Enquiries',
    email: 'riders@squadlink.example',
    description: 'Join SQUADLINK as a delivery rider',
  },
];

export function ContactPage() {
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
                  <p className="text-sm font-semibold text-gray-900">hello@squadlink.example</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Phone className="h-5 w-5 text-primary-600 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Phone</p>
                  <p className="text-sm font-semibold text-gray-900">+234 800 SQUADLINK</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <MapPin className="h-5 w-5 text-primary-600 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Location</p>
                  <p className="text-sm font-semibold text-gray-900">Nigeria</p>
                </div>
              </div>
            </div>
          </div>

          {/* Backend dependency notice */}
          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-bold text-gray-900">Contact Form</h3>
            <p className="mt-2 text-sm text-gray-600">
              A contact form will be available once a backend endpoint for
              handling contact submissions is implemented. For now, please
              reach out via email.
            </p>
            {/* TODO: Backend dependency — POST /api/v1/contact or equivalent endpoint
                is required to handle contact form submissions. Do not create a
                fake form that appears to send messages without a real backend endpoint. */}
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            Contact details shown are placeholders and will be updated with finalized information.
          </p>
        </div>
      </section>
    </div>
  );
}
