import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Store, Bike, Search } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 via-white to-white">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary-100/50 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-24 h-72 w-72 rounded-full bg-secondary-100/40 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left: Copy */}
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-sm font-medium text-primary-800">
              <span className="flex h-2 w-2 rounded-full bg-primary-600 animate-pulse" />
              Local commerce, delivered.
            </div>

            <h1 className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Shop local.
              <br />
              <span className="text-primary-600">Get it delivered.</span>
            </h1>

            <p className="mt-5 max-w-lg text-lg leading-relaxed text-gray-600">
              SQUADLINK connects you with local businesses and delivery riders.
              Browse products, place an order, and track your delivery — all in
              one place.
            </p>

            {/* Primary CTAs */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/browse"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-primary-600 px-7 text-base font-semibold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all hover:shadow-xl hover:shadow-primary-600/30 py-3.5"
              >
                <Search className="h-5 w-5" />
                Start Shopping
              </Link>
              <Link
                to="/#how-it-works"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-7 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors py-3.5"
              >
                How It Works
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Secondary CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <Link
                to="/register?intent=business"
                className="inline-flex items-center gap-2 font-medium text-gray-600 hover:text-primary-700 transition-colors"
              >
                <Store className="h-4 w-4 text-primary-600" />
                Join as a Business
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 font-medium text-gray-600 hover:text-primary-700 transition-colors"
              >
                <Bike className="h-4 w-4 text-primary-600" />
                Become a Rider
              </Link>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="relative animate-fade-in hidden sm:block">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://images.pexels.com/photos/4177708/pexels-photo-4177708.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
                alt="Customer shopping for groceries"
                className="w-full h-[420px] object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/20 to-transparent" />
            </div>

            {/* Floating cards */}
            <div className="absolute -bottom-5 -left-5 rounded-xl bg-white p-4 shadow-xl border border-gray-100 max-w-[200px]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-100">
                  <ShoppingBag className="h-5 w-5 text-secondary-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Products</p>
                  <p className="text-sm font-bold text-gray-900">Browse freely</p>
                </div>
              </div>
            </div>

            <div className="absolute -top-5 -right-5 rounded-xl bg-white p-4 shadow-xl border border-gray-100 max-w-[200px]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                  <Bike className="h-5 w-5 text-primary-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Delivery</p>
                  <p className="text-sm font-bold text-gray-900">Track in real time</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-16 grid grid-cols-3 gap-4 rounded-2xl bg-white p-6 shadow-sm border border-gray-100 lg:gap-8">
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">3</p>
            <p className="mt-1 text-xs font-medium text-gray-500 sm:text-sm">Participant Roles</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">1</p>
            <p className="mt-1 text-xs font-medium text-gray-500 sm:text-sm">Unified Catalogue</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">OTP</p>
            <p className="mt-1 text-xs font-medium text-gray-500 sm:text-sm">Secure Delivery</p>
          </div>
        </div>
      </div>
    </section>
  );
}
