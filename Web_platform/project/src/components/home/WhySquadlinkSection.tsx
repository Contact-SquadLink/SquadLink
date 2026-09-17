import { Search, Store, Bike, ShieldCheck, Truck, Bell, PackageCheck, MapPin } from 'lucide-react';

const features = [
  {
    icon: Search,
    title: 'Unified Product Discovery',
    description: 'Browse a single catalogue across multiple local businesses without choosing a specific shop.',
  },
  {
    icon: Store,
    title: 'Local Business Participation',
    description: 'Registered businesses manage their catalogue, inventory, and incoming orders in one dashboard.',
  },
  {
    icon: Bike,
    title: 'Coordinated Delivery',
    description: 'Riders receive structured assignments with pickup verification and delivery confirmation.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Delivery Verification',
    description: 'OTP-based confirmation ensures orders reach the right customer at the right door.',
  },
  {
    icon: Bell,
    title: 'Real-Time Notifications',
    description: 'Stay informed at every stage — from order placement to rider arrival and delivery.',
  },
  {
    icon: PackageCheck,
    title: 'Structured Order Workflow',
    description: 'Every order follows a clear state machine: pending, confirmed, preparing, ready, out for delivery, delivered.',
  },
];

export function WhySquadlinkSection() {
  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider">Why SQUADLINK</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-gray-900 sm:text-4xl">
            Built for local commerce
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            A structured platform that coordinates customers, businesses, and
            riders with clear workflows and transparent tracking.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group rounded-2xl border border-gray-100 bg-white p-7 shadow-sm hover:shadow-md hover:border-primary-200 transition-all duration-300"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors duration-300">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Delivery model banner */}
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 p-8 lg:p-10 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-primary-100">
                <Truck className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">Delivery Model</span>
              </div>
              <h3 className="mt-3 font-display text-2xl font-bold">
                Browse, order, track — SQUADLINK handles the coordination
              </h3>
              <p className="mt-2 text-primary-100 max-w-2xl">
                Customers don't choose the fulfilling business. The platform
                determines the best business based on availability and location.
                Riders are assigned, pickups are verified, and deliveries are
                confirmed with OTP.
              </p>
            </div>
            <div className="flex gap-3 lg:gap-4">
              <div className="flex flex-col items-center gap-2 rounded-xl bg-white/10 px-5 py-4 backdrop-blur-sm">
                <MapPin className="h-6 w-6 text-primary-200" />
                <span className="text-xs font-medium text-primary-100">Local</span>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-xl bg-white/10 px-5 py-4 backdrop-blur-sm">
                <ShieldCheck className="h-6 w-6 text-primary-200" />
                <span className="text-xs font-medium text-primary-100">Verified</span>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-xl bg-white/10 px-5 py-4 backdrop-blur-sm">
                <Bell className="h-6 w-6 text-primary-200" />
                <span className="text-xs font-medium text-primary-100">Tracked</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
