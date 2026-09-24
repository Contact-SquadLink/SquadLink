import { Link } from 'react-router-dom';
import { Store, TrendingUp, Package, ClipboardList, ArrowRight, Bike, MapPin, Bell, Route, ShieldCheck } from 'lucide-react';

const businessBenefits = [
  { icon: MapPin, title: 'Reach Nearby Customers', description: 'Get discovered by local shoppers browsing the unified catalogue.' },
  { icon: Package, title: 'Digital Catalogue', description: 'List your products and manage inventory in a structured dashboard.' },
  { icon: ClipboardList, title: 'Order Management', description: 'Receive, accept, and prepare orders with clear status tracking.' },
  { icon: TrendingUp, title: 'Growth Opportunity', description: 'Participate in the local commerce ecosystem with delivery coordination.' },
];

const riderBenefits = [
  { icon: Bell, title: 'Delivery Assignments', description: 'Receive structured delivery assignments matched to your availability.' },
  { icon: ShieldCheck, title: 'Pickup Verification', description: 'Verify pickups from businesses before transporting orders.' },
  { icon: Route, title: 'Structured Workflow', description: 'Follow a clear delivery state machine from pickup to confirmation.' },
  { icon: Package, title: 'Manage Deliveries', description: 'Track your assigned deliveries and update status in real time.' },
];

export function BusinessCTASection() {
  return (
    <section className="py-20 bg-secondary-50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary-100 px-4 py-1.5 text-sm font-medium text-secondary-800">
              <Store className="h-4 w-4" />
              For Businesses
            </div>
            <h2 className="mt-5 font-display text-3xl font-bold text-gray-900 sm:text-4xl">
              Grow your business with SQUADLINK
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Join the platform, list your products in the unified catalogue,
              and receive orders from nearby customers. SQUADLINK coordinates
              the delivery — you focus on what you do best.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {businessBenefits.map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.title} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                      <Icon className="h-5 w-5 text-secondary-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{b.title}</h3>
                      <p className="mt-1 text-sm text-gray-600">{b.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Link
              to="/register?intent=business"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-secondary-500 px-6 text-base font-semibold text-secondary-950 shadow-sm hover:bg-secondary-400 transition-colors"
            >
              Partner With SQUADLINK
              <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="mt-3 text-xs text-gray-400">
              Business onboarding and verification follow the backend's actual workflow.
            </p>
          </div>

          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-xl">
              <img
                src="https://images.pexels.com/photos/8476594/pexels-photo-8476594.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
                alt="Local business market stall"
                className="w-full h-[400px] object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function RiderCTASection() {
  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="relative order-2 lg:order-1">
            <div className="rounded-2xl overflow-hidden shadow-xl">
              <img
                src="https://images.pexels.com/photos/37059837/pexels-photo-37059837.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
                alt="Delivery rider on motorcycle"
                className="w-full h-[400px] object-cover"
                loading="lazy"
              />
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent-100 px-4 py-1.5 text-sm font-medium text-accent-800">
              <Bike className="h-4 w-4" />
              For Riders
            </div>
            <h2 className="mt-5 font-display text-3xl font-bold text-gray-900 sm:text-4xl">
              Deliver with SQUADLINK
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Receive delivery assignments, verify pickups, and complete
              deliveries through a structured workflow with OTP confirmation.
              You focus on the ride — SQUADLINK handles the coordination.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {riderBenefits.map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.title} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-50 shadow-sm">
                      <Icon className="h-5 w-5 text-accent-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{b.title}</h3>
                      <p className="mt-1 text-sm text-gray-600">{b.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Link
              to="/rider/register"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-accent-600 px-6 text-base font-semibold text-white shadow-sm hover:bg-accent-700 transition-colors"
            >
              Rider onboarding managed by SQUADLINK
              <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="mt-3 text-xs text-gray-400">
              Rider onboarding is currently managed by SQUADLINK. Contact the team for rider onboarding details.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
