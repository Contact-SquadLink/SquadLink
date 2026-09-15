import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { formatPrice, cn } from '@/utils/format';
import type { Order, OrderItem } from '@/types';

const DELIVERY_FEE = 500;
const VAT_RATE = 0.075;

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  const deliveryFee = items.length > 0 ? DELIVERY_FEE : 0;
  const vat = Math.round(subtotal * VAT_RATE);
  const total = subtotal + deliveryFee + vat;

  const handlePlaceOrder = useCallback(() => {
    if (placingOrder) return;
    setPlacingOrder(true);
    setTimeout(() => {
      const orderId = `ord-${Date.now().toString().slice(-6)}`;
      setPlacedOrderId(orderId);
      setOrderPlaced(true);
      clearCart();
      setPlacingOrder(false);
      setTimeout(() => navigate(`/orders/${orderId}`), 1500);
    }, 800);
  }, [placingOrder, clearCart, navigate]);

  useEffect(() => {
    if (items.length === 0 && !orderPlaced && !placingOrder) {
      navigate('/cart');
    }
  }, [items.length, orderPlaced, placingOrder, navigate]);

  if (items.length === 0 && !orderPlaced) {
    return null;
  }

  const orderItems: OrderItem[] = items.map((i) => ({
    productId: i.productId,
    name: i.name,
    quantity: i.quantity,
    price: i.price,
    subtotal: i.price * i.quantity,
  }));

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-primary-700 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cart
        </Link>

        <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Checkout</h1>
        <p className="text-sm text-gray-500 mb-8">Review your order before placing it.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Order Items</h2>
              <div className="space-y-3">
                {orderItems.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} x {formatPrice(item.price)}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {formatPrice(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary + Place Order */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Delivery fee</span>
                  <span className="text-gray-700">{formatPrice(deliveryFee)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">VAT (7.5%)</span>
                  <span className="text-gray-700">{formatPrice(vat)}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-display text-xl font-bold text-gray-900">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={placingOrder}
                className={cn(
                  'mt-6 flex w-full items-center justify-center gap-2 rounded-xl h-12 text-sm font-semibold text-white transition-colors',
                  placingOrder
                    ? 'bg-primary-400'
                    : 'bg-primary-600 hover:bg-primary-700'
                )}
              >
                {placingOrder ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    Place Order
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Your order will be processed once your backend is connected.
                  This is a demo checkout with simulated order placement.
                </p>
              </div>
            </div>
          </div>
        </div>

        {orderPlaced && (
          <div className="mt-8 flex items-center gap-3 rounded-xl border border-success-200 bg-success-50 p-5">
            <Check className="h-5 w-5 text-success-600" />
            <p className="text-sm font-semibold text-success-800">
              Order placed successfully! Redirecting to order tracking...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
