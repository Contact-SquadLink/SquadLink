import { Search, ShoppingCart, CreditCard, Package, Bike, CheckCircle2, Store, ClipboardList } from 'lucide-react';

const customerSteps = [
  { icon: Search, label: 'Browse', description: 'Find products in the unified catalogue' },
  { icon: ShoppingCart, label: 'Add to Cart', description: 'Select items and quantities' },
  { icon: CreditCard, label: 'Checkout', description: 'Review and place your order' },
  { icon: Store, label: 'Business Prepares', description: 'The business accepts and prepares' },
  { icon: Bike, label: 'Rider Pickup', description: 'A rider picks up your order' },
  { icon: CheckCircle2, label: 'Delivery', description: 'Confirm with OTP at your door' },
];

const businessSteps = [
  { icon: Store, label: 'Register', description: 'Create a business account' },
  { icon: ClipboardList, label: 'Verification', description: 'Platform verifies your business' },
  { icon: Package, label: 'Configure Catalogue', description: 'Set up products and inventory' },
  { icon: ShoppingCart, label: 'Receive Order', description: 'Get notified of new orders' },
  { icon: CheckCircle2, label: 'Accept & Prepare', description: 'Confirm and prepare the order' },
  { icon: Bike, label: 'Ready for Pickup', description: 'Mark order ready for rider' },
];

const riderSteps = [
  { icon: Bike, label: 'Register', description: 'Onboard as a delivery rider' },
  { icon: CheckCircle2, label: 'Go Available', description: 'Mark yourself available' },
  { icon: Package, label: 'Receive Assignment', description: 'Get matched with a delivery' },
  { icon: Store, label: 'Verify Pickup', description: 'Confirm pickup from business' },
  { icon: Bike, label: 'Transport', description: 'Deliver to the customer' },
  { icon: CheckCircle2, label: 'Confirm Delivery', description: 'Complete with OTP verification' },
];

interface FlowProps {
  title: string;
  icon: typeof Search;
  steps: { icon: typeof Search; label: string; description: string }[];
  accent: string;
}

function FlowCard({ title, icon: Icon, steps, accent }: FlowProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow lg:p-7">
      <div className="flex items-center gap-3 mb-6">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-display text-lg font-bold text-gray-900">{title}</h3>
      </div>

      <div className="space-y-1">
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          return (
            <div key={step.label}>
              <div className="flex items-start gap-3 py-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-600">
                  <StepIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{step.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                </div>
                <span className="text-xs font-bold text-gray-300 mt-0.5">{idx + 1}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className="ml-4 h-3 w-px bg-gray-200" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 bg-gray-50 scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider">How It Works</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-gray-900 sm:text-4xl">
            One platform, three participants
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            SQUADLINK coordinates customers, businesses, and riders through a
            structured workflow — from browsing to delivery confirmation.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <FlowCard
            title="For Customers"
            icon={ShoppingCart}
            steps={customerSteps}
            accent="bg-primary-100 text-primary-700"
          />
          <FlowCard
            title="For Businesses"
            icon={Store}
            steps={businessSteps}
            accent="bg-secondary-100 text-secondary-700"
          />
          <FlowCard
            title="For Riders"
            icon={Bike}
            steps={riderSteps}
            accent="bg-accent-100 text-accent-700"
          />
        </div>

        <p className="mt-8 text-center text-sm text-gray-400">
          These diagrams are explanatory only. The backend manages all state transitions.
        </p>
      </div>
    </section>
  );
}
