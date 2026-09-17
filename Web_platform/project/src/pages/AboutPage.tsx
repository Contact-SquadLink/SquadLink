import { Target, Users, Truck, Sparkles, Package, ShieldCheck } from 'lucide-react';

const values = [
  {
    icon: Users,
    title: 'Three-Sided Connection',
    description: 'Customers, businesses, and riders — each with a clear role and structured workflow.',
  },
  {
    icon: Truck,
    title: 'Last-Mile Coordination',
    description: 'Structured delivery assignments with pickup verification and OTP-confirmed delivery.',
  },
  {
    icon: Target,
    title: 'Local-First',
    description: 'Built for local commerce — connecting nearby businesses with nearby customers.',
  },
  {
    icon: Sparkles,
    title: 'Unified Discovery',
    description: 'One catalogue across multiple businesses. The platform determines the best fulfilling business.',
  },
  {
    icon: Package,
    title: 'Structured Operations',
    description: 'Clear state machines for orders and deliveries. Every transition is tracked and logged.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Verification',
    description: 'OTP-based delivery confirmation ensures orders reach the right customer.',
  },
];

export function AboutPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary-50 to-white py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider">About SQUADLINK</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-gray-900 sm:text-5xl">
            Connecting local commerce with reliable delivery
          </h1>
          <p className="mt-5 text-lg text-gray-600 leading-relaxed">
            SQUADLINK is a local commerce and last-mile delivery coordination
            platform that connects customers, businesses, and riders through
            a single, structured system.
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">The Problem</h2>
          <div className="mt-4 space-y-4 text-gray-600 leading-relaxed">
            <p>
              Local commerce is often fragmented. Customers struggle to discover
              nearby businesses and their products. Businesses lack the digital
              tools to manage catalogues, inventory, and incoming orders
              efficiently. Delivery is uncoordinated, with no structured
              workflow for assigning riders, verifying pickups, or confirming
              deliveries.
            </p>
            <p>
              This fragmentation means lost sales for businesses, frustrating
              experiences for customers, and inefficient delivery operations.
              There is no single platform that connects all three participants
              with clear workflows and real-time tracking.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 lg:py-20 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">Our Mission</h2>
          <div className="mt-4 space-y-4 text-gray-600 leading-relaxed">
            <p>
              SQUADLINK's mission is to bridge the gap between local commerce
              and delivery by providing a unified platform where customers can
              discover products, businesses can manage their operations, and
              riders can coordinate deliveries — all with clear, structured
              workflows.
            </p>
            <p>
              The platform is designed around three key participants:
              customers who need products, businesses that supply them, and
              riders who deliver them. Each participant has a dedicated
              interface with tools tailored to their role.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">What SQUADLINK Values</h2>
            <p className="mt-3 text-gray-600">The principles that guide the platform's design and development.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold text-gray-900">{v.title}</h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{v.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Note */}
      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500">
            SQUADLINK is in development. Company history, team details, and
            official statistics will be added as they are finalized.
          </p>
        </div>
      </section>
    </div>
  );
}
