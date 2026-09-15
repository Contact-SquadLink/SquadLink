import { Link } from 'react-router-dom';
import { ArrowRight, Search, ShoppingBag, Package, ShoppingCart, Check } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '@/types';
import { useCart } from '@/hooks/useCart';
import { formatPrice, cn } from '@/utils/format';

// Showcase products for the homepage preview. When the backend is running,
// the full /browse page fetches real products from the API.
const showcaseProducts: Product[] = [
  {
    id: 'showcase-1',
    name: 'Fresh Oranges',
    description: 'Sweet, juicy oranges from local farms',
    price: 1500,
    currency: 'NGN',
    imageUrl: 'https://images.pexels.com/photos/38665120/pexels-photo-38665120.jpeg?auto=compress&cs=tinysrgb&h=400&w=400',
    category: 'Produce',
    unit: 'bag',
    inStock: true,
    available: true,
  },
  {
    id: 'showcase-2',
    name: 'Beans (Brown)',
    description: 'Quality brown beans, perfect for cooking',
    price: 3200,
    currency: 'NGN',
    imageUrl: 'https://images.pexels.com/photos/36930125/pexels-photo-36930125.jpeg?auto=compress&cs=tinysrgb&h=400&w=400',
    category: 'Staples',
    unit: 'kg',
    inStock: true,
    available: true,
  },
  {
    id: 'showcase-3',
    name: 'Roasted Groundnuts',
    description: 'Freshly roasted groundnuts from Enugu',
    price: 800,
    currency: 'NGN',
    imageUrl: 'https://images.pexels.com/photos/39289748/pexels-photo-39289748.jpeg?auto=compress&cs=tinysrgb&h=400&w=400',
    category: 'Snacks',
    unit: 'pack',
    inStock: true,
    available: true,
  },
  {
    id: 'showcase-4',
    name: 'Agbalumo',
    description: 'Seasonal fresh agbalumo from Abuja markets',
    price: 1200,
    currency: 'NGN',
    imageUrl: 'https://images.pexels.com/photos/28752785/pexels-photo-28752785.jpeg?auto=compress&cs=tinysrgb&h=400&w=400',
    category: 'Produce',
    unit: 'pack',
    inStock: true,
    available: true,
  },
];

function ShowcaseCard({ product }: { product: Product }) {
  const { addItem, getItemQuantity } = useCart();
  const quantity = getItemQuantity(product.id);
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = () => {
    addItem(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <div className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary-200">
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {product.category && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-gray-700">
              {product.category}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900">{product.name}</h3>
        <p className="mt-1 text-xs text-gray-500 line-clamp-2">{product.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-display text-lg font-bold text-gray-900">
            {formatPrice(product.price, product.currency)}
          </span>
          {product.unit && (
            <span className="text-xs text-gray-400">/ {product.unit}</span>
          )}
        </div>
        <button
          onClick={handleAdd}
          className={cn(
            'mt-3 flex w-full items-center justify-center gap-2 rounded-lg h-9 text-sm font-semibold transition-colors',
            justAdded
              ? 'bg-success-500 text-white'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          )}
        >
          {justAdded ? (
            <>
              <Check className="h-4 w-4" />
              Added to cart
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              {quantity > 0 ? `Add More (${quantity})` : 'Add to Cart'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

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
              Browse the unified catalogue — no account needed. Add items to
              your cart and check out when you are ready.
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

        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {showcaseProducts.map((product) => (
            <ShowcaseCard key={product.id} product={product} />
          ))}
        </div>

        {/* CTA banner */}
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

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <Package className="h-3.5 w-3.5" />
          Showcase products shown. Full catalogue is populated from the backend API when available.
        </p>
      </div>
    </section>
  );
}
