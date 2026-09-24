import { Link } from 'react-router-dom';
import { ArrowRight, Search, ShoppingBag, Package } from 'lucide-react';

export function PublicCatalogSection() {
  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider">Browse the Catalogue</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-gray-900 sm:text-4xl">
              Discover products from local businesses
            </h2>
            <p className="mt-3 text-lg text-gray-600 max-w-2xl">
              Browse the unified catalogue — no account needed. Add items to your cart and check out when you are ready.
            </p>
          </div>
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors shrink-0"
          >
            View All Products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm">
            <Package className="h-6 w-6" />
          </div>
          <h3 className="mt-4 font-display text-xl font-bold text-gray-900">No public products are currently available</h3>
          <p className="mt-2 text-sm text-gray-600">
            Approved businesses will publish their catalogue items here once they have selected, priced, and configured the products they want to sell.
          </p>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl bg-gray-50 p-8 sm:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
              <Search className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-gray-900">
                Ready to start shopping?
              </h3>
              <p className="text-sm text-gray-600">
                Browse the full catalogue and add items to your cart.
              </p>
            </div>
          </div>
          <Link
            to="/browse"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
          >
            <ShoppingBag className="h-4 w-4" />
            Browse Products
          </Link>
        </div>
      </div>
    </section>
  );
}
