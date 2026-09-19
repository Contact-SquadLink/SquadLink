import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, ArrowLeft } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice } from '@/utils/format';
import { EmptyState } from '@/components/ui/States';

export function CartPage() {
  const { items, subtotal, itemCount, updateQuantity, removeItem, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
    } else {
      navigate('/checkout');
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="font-display text-2xl font-bold text-gray-900 mb-8">Your Cart</h1>
          <EmptyState
            icon={<ShoppingCart className="h-7 w-7" />}
            title="Your cart is empty"
            description="Browse the catalogue and add products to your cart. No account needed to start shopping."
            action={
              <Link
                to="/browse"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary-600 px-6 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
              >
                Browse Products
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Your Cart</h1>
            <p className="mt-1 text-sm text-gray-500">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
          <button
            onClick={clearCart}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-error-600 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Clear all
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                {/* Image */}
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-50">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ShoppingCart className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                  <p className="text-sm text-gray-500">
                    {formatPrice(item.price)} {item.unit && `/ ${item.unit}`}
                  </p>
                  <p className="mt-1 text-sm font-bold text-gray-900">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-gray-200">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="flex h-9 w-9 items-center justify-center text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-l-lg transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-semibold text-gray-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="flex h-9 w-9 items-center justify-center text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-r-lg transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:text-error-600 hover:bg-error-50 transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            <Link
              to="/browse"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors pt-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Continue shopping
            </Link>
          </div>

          {/* Summary */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Delivery fee</span>
                  <span className="text-gray-500">Calculated at checkout</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">VAT</span>
                  <span className="text-gray-500">Calculated at checkout</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                  <span className="font-bold text-gray-900">Estimated total</span>
                  <span className="font-display text-lg font-bold text-gray-900">
                    {formatPrice(subtotal)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 h-12 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
              >
                Proceed to Checkout
                <ArrowRight className="h-4 w-4" />
              </button>

              {!isAuthenticated && (
                <p className="mt-3 text-center text-xs text-gray-500">
                  You will need to log in or create an account to complete your order.
                  Your cart will be preserved.
                </p>
              )}

              <p className="mt-4 text-xs text-gray-400">
                Guest cart is temporary. Prices and availability are confirmed by the backend at checkout.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
