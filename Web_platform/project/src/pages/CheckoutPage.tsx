import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldCheck,
  CreditCard,
  X,
} from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { checkoutApi, ordersApi } from '@/api/orders';
import { formatPrice, cn } from '@/utils/format';
import type { CheckoutPreview, OrderItem } from '@/types';

const DELIVERY_FEE = 500;
const VAT_RATE = 0.075;

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();

  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [showSandboxPayment, setShowSandboxPayment] = useState(false);

  useEffect(() => {
    if (items.length === 0) {
      setPreview(null);
      return;
    }

    let isMounted = true;

    const loadPreview = async () => {
      try {
        const response = await checkoutApi.preview({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        });

        if (isMounted) {
          setPreview(response.data);
          setPreviewError(null);
        }
      } catch (error) {
        if (isMounted) {
          setPreviewError(error instanceof Error ? error.message : 'Unable to preview this order.');
        }
      }
    };

    loadPreview();

    return () => {
      isMounted = false;
    };
  }, [items]);

  useEffect(() => {
    if (items.length === 0 && !orderPlaced && !placingOrder) {
      navigate('/cart');
    }
  }, [items.length, orderPlaced, placingOrder, navigate]);

  if (items.length === 0 && !orderPlaced) {
    return null;
  }

  const deliveryFee = preview?.deliveryFee ?? (items.length > 0 ? DELIVERY_FEE : 0);
  const vat = preview?.vat ?? Math.round(subtotal * VAT_RATE);
  const total = preview?.total ?? subtotal + deliveryFee + vat;

  const orderItems: OrderItem[] = items.map((i) => ({
    productId: i.productId,
    name: i.name,
    quantity: i.quantity,
    price: i.price,
    subtotal: i.price * i.quantity,
  }));

  const handlePlaceOrder = useCallback(async () => {
    if (placingOrder || items.length === 0) return;

    setPlacingOrder(true);
    setPreviewError(null);

    try {
      const payload = {
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      const idempotencyKey = globalThis.crypto?.randomUUID?.() ?? `order-${Date.now()}`;
      const response = await ordersApi.create(payload, idempotencyKey);
      const orderId = response.data.orderId;

      setPlacedOrderId(orderId);
      setOrderPlaced(true);
      clearCart();

      setTimeout(() => {
        navigate(`/orders/${orderId}`);
      }, 1200);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Unable to place this order.');
    } finally {
      setPlacingOrder(false);
      setShowSandboxPayment(false);
    }
  }, [clearCart, items, navigate, placingOrder]);

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

        {previewError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {previewError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-gray-900">{formatPrice(preview?.subtotal ?? subtotal)}</span>
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
                onClick={() => setShowSandboxPayment(true)}
                disabled={placingOrder || !!previewError}
                className={cn(
                  'mt-6 flex w-full items-center justify-center gap-2 rounded-xl h-12 text-sm font-semibold text-white transition-colors',
                  placingOrder || previewError
                    ? 'bg-primary-400 cursor-not-allowed'
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

              {showSandboxPayment && (
                <div className="mt-4 rounded-2xl border border-primary-200 bg-primary-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-primary-800">
                      <CreditCard className="h-4 w-4" />
                      <span className="text-sm font-semibold">Sandbox payment</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSandboxPayment(false)}
                      className="text-primary-700 hover:text-primary-900"
                      aria-label="Close sandbox payment"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-primary-700">
                    The checkout is validated against the backend order and payment contract before placement. Proceeding submits the real order request.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSandboxPayment(false)}
                      className="flex-1 rounded-xl border border-primary-200 bg-white px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handlePlaceOrder}
                      className="flex-1 rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                    >
                      Confirm Payment
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Orders are validated against the server before placement using the backend checkout preview and idempotent order creation contract.
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

        {placedOrderId && !orderPlaced && (
          <p className="mt-4 text-sm text-gray-500">Order ID: {placedOrderId}</p>
        )}
      </div>
    </div>
  );
}
