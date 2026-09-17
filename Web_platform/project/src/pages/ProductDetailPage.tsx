import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  Star,
  Package,
  Check,
  Info,
  ChevronRight,
} from 'lucide-react';
import { catalogService } from '@/services/catalogService';
import { ProductCard } from '@/components/catalog/ProductCard';
import { Badge } from '@/components/ui/Badge';
import { Spinner, EmptyState } from '@/components/ui/States';
import { useCart } from '@/hooks/useCart';
import { formatPrice, cn } from '@/utils/format';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem, getItemQuantity } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => catalogService.getById(id!),
    enabled: !!id,
    retry: 1,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    setQuantity(1);
    setAdded(false);
  }, [id]);

  if (isLoading) {
    return (
      <div className="bg-white min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link to="/browse" className="hover:text-primary-600">Browse</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-400">Product details</span>
          </div>
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="aspect-square rounded-2xl bg-gray-100 animate-pulse" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 rounded bg-gray-100 animate-pulse" />
              <div className="h-6 w-24 rounded bg-gray-100 animate-pulse" />
              <div className="h-4 w-full rounded bg-gray-100 animate-pulse" />
              <div className="h-4 w-5/6 rounded bg-gray-100 animate-pulse" />
              <div className="h-12 w-full rounded bg-gray-100 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.product) {
    return (
      <div className="bg-white min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <Link to="/browse" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary-600 mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Browse
          </Link>
          <EmptyState
            icon={<Package className="h-7 w-7" />}
            title="Product not found"
            description="This product may have been removed or is temporarily unavailable."
            action={
              <Link to="/browse" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                Browse all products
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const { product, source, related } = data;
  const inStock = product.inStock !== false && product.available !== false;
  const inCart = getItemQuantity(product.id);

  const handleAddToCart = () => {
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const categoryLabel = product.category
    ? product.category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : '';

  return (
    <div className="bg-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/browse" className="hover:text-primary-600">Browse</Link>
          <ChevronRight className="h-4 w-4" />
          {product.category && (
            <>
              <Link to={`/browse?category=${product.category}`} className="hover:text-primary-600 capitalize">
                {categoryLabel}
              </Link>
              <ChevronRight className="h-4 w-4" />
            </>
          )}
          <span className="text-gray-400 truncate max-w-40">{product.name}</span>
        </nav>

        {/* Demo notice */}
        {source === 'demo' && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-accent-200 bg-accent-50 p-4">
            <Info className="h-5 w-5 text-accent-600 shrink-0 mt-0.5" />
            <p className="text-sm text-accent-700">
              Showing a demonstration product. When the backend catalogue is connected, real products from local businesses will appear here.
            </p>
          </div>
        )}

        {/* Product layout */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image */}
          <div className="relative">
            <div className="aspect-square overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-16 w-16 text-gray-300" />
                </div>
              )}
            </div>
            {!inStock && (
              <div className="absolute top-4 right-4">
                <Badge variant="error">Out of Stock</Badge>
              </div>
            )}
            {product.featured && inStock && (
              <div className="absolute top-4 left-4">
                <Badge variant="success">Featured</Badge>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            {product.category && (
              <span className="text-sm font-medium text-primary-600 capitalize">{categoryLabel}</span>
            )}
            <h1 className="mt-1 font-display text-2xl font-bold text-gray-900 sm:text-3xl">
              {product.name}
            </h1>

            {/* Rating */}
            {product.rating !== undefined && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'h-4 w-4',
                        star <= Math.round(product.rating!)
                          ? 'fill-secondary-400 text-secondary-400'
                          : 'fill-gray-200 text-gray-200'
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-700">{product.rating.toFixed(1)}</span>
                {product.reviewCount !== undefined && (
                  <span className="text-sm text-gray-500">({product.reviewCount} reviews)</span>
                )}
              </div>
            )}

            {/* Price */}
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-gray-900">
                {formatPrice(product.price, product.currency)}
              </span>
              {product.unit && (
                <span className="text-sm text-gray-500">/ {product.unit}</span>
              )}
            </div>

            {/* Availability */}
            <div className="mt-3 flex items-center gap-2">
              {inStock ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-600">
                  <Check className="h-4 w-4" /> In Stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-error-600">
                  <Package className="h-4 w-4" /> Out of Stock
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-gray-900">Description</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {product.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Quantity + Add to cart */}
            <div className="mt-8 flex items-center gap-3">
              <div className="flex items-center rounded-xl border border-gray-200">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-11 w-11 items-center justify-center text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-l-xl transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center text-base font-semibold text-gray-900">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-11 w-11 items-center justify-center text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-r-xl transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!inStock}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-xl h-11 px-6 text-sm font-semibold transition-all',
                  inStock
                    ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                {added ? (
                  <><Check className="h-5 w-5" /> Added to Cart!</>
                ) : (
                  <><ShoppingCart className="h-5 w-5" /> Add to Cart</>
                )}
              </button>
            </div>

            {inCart > 0 && !added && (
              <p className="mt-3 text-sm text-primary-600 font-medium">
                {inCart} already in cart
              </p>
            )}

            {/* Checkout link */}
            {inCart > 0 && (
              <button
                onClick={() => navigate('/cart')}
                className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                View cart & checkout →
              </button>
            )}
          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-xl font-bold text-gray-900 mb-6">Related Products</h2>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
