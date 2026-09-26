import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Search, ShoppingBag, Package } from 'lucide-react';
import { catalogService } from '@/services/catalogService';
import { ProductCard, ProductCardSkeleton } from '@/components/catalog/ProductCard';
import { Reveal } from '@/components/ui/Reveal';
import { revealStagger } from '@/utils/reveal';

export function PublicCatalogSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['home-catalog'],
    queryFn: () => catalogService.list({ availability: 'in-stock' }),
  });
  const products = data?.products.slice(0, 4) ?? [];

  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <Reveal>
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider">Browse the Catalogue</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-gray-900 sm:text-4xl">
              Discover products from local businesses
            </h2>
            <p className="mt-3 text-lg text-gray-600 max-w-2xl">
              Browse the unified catalogue — no account needed. Add items to your cart and check out when you are ready.
            </p>
          </Reveal>
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors shrink-0"
          >
            View All Products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => <ProductCardSkeleton key={index} />)}
          </div>
        ) : products.length > 0 ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product, index) => <Reveal key={`${product.businessId}-${product.id}`} delay={revealStagger(index)}><ProductCard product={product} /></Reveal>)}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm">
              <Package className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-xl font-bold text-gray-900">No public products are currently available</h3>
            <p className="mt-2 text-sm text-gray-600">
              Approved businesses will publish their catalogue items here once they have selected, priced, and configured the products they want to sell.
            </p>
          </div>
        )}
        {isError && <p className="mt-4 text-center text-sm text-red-600">The catalogue could not be loaded right now.</p>}

        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl bg-gray-50 p-8 sm:flex-row">
          <Reveal className="flex items-center gap-4">
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
          </Reveal>
          <Reveal delay={100}>
          <Link
            to="/browse"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
          >
            <ShoppingBag className="h-4 w-4" />
            Browse Products
          </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
