import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Package, Star } from 'lucide-react';
import type { Product } from '@/types';
import { useCart } from '@/hooks/useCart';
import { formatPrice, cn } from '@/utils/format';
import { Badge } from '@/components/ui/Badge';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, getItemQuantity } = useCart();
  const quantity = getItemQuantity(product.id);
  const [localQty, setLocalQty] = useState(1);

  const inStock = product.inStock !== false && product.available !== false;

  const handleAdd = () => {
    if (localQty > 0) {
      addItem(product, localQty);
      setLocalQty(1);
    }
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary-200">
      {/* Image */}
      <Link to={`/product/${product.id}`} className="relative aspect-square overflow-hidden bg-gray-50 block">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-12 w-12 text-gray-300" />
          </div>
        )}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <Badge variant="error">Out of Stock</Badge>
          </div>
        )}
        {product.featured && inStock && (
          <div className="absolute top-3 right-3">
            <Badge variant="success">Featured</Badge>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2 hover:text-primary-700 transition-colors">
            {product.name}
          </h3>
        </Link>
        {product.description && (
          <p className="mt-1 text-xs text-gray-500 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Rating */}
        {product.rating !== undefined && (
          <div className="mt-2 flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-secondary-400 text-secondary-400" />
            <span className="text-xs font-medium text-gray-700">{product.rating.toFixed(1)}</span>
            {product.reviewCount !== undefined && (
              <span className="text-xs text-gray-400">({product.reviewCount})</span>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <span className="font-display text-lg font-bold text-gray-900">
            {formatPrice(product.price, product.currency)}
          </span>
          {product.unit && (
            <span className="text-xs text-gray-400">/ {product.unit}</span>
          )}
        </div>

        {/* Quantity + Add */}
        <div className="mt-4 flex items-center gap-2">
          {inStock && (
            <div className="flex items-center rounded-lg border border-gray-200">
              <button
                onClick={() => setLocalQty((q) => Math.max(1, q - 1))}
                className="flex h-9 w-9 items-center justify-center text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-l-lg transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-9 text-center text-sm font-semibold text-gray-900">
                {localQty}
              </span>
              <button
                onClick={() => setLocalQty((q) => q + 1)}
                className="flex h-9 w-9 items-center justify-center text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-r-lg transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
          <button
            onClick={handleAdd}
            disabled={!inStock}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg h-9 text-sm font-semibold transition-colors',
              inStock
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            <ShoppingCart className="h-4 w-4" />
            {quantity > 0 ? 'Add More' : 'Add'}
          </button>
        </div>
        {quantity > 0 && (
          <p className="mt-2 text-xs text-primary-600 font-medium">
            {quantity} in cart
          </p>
        )}
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="aspect-square bg-gray-100 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 rounded bg-gray-100 animate-pulse" />
        <div className="h-3 w-full rounded bg-gray-100 animate-pulse" />
        <div className="h-6 w-20 rounded bg-gray-100 animate-pulse" />
        <div className="h-9 w-full rounded bg-gray-100 animate-pulse" />
      </div>
    </div>
  );
}
