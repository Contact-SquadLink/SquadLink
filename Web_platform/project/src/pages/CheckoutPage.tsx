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
import { useAuth } from '@/hooks/useAuth';
import { checkoutApi, ordersApi } from '@/api/orders';
import { formatPrice, cn } from '@/utils/format';
import { normalizePhoneNumber } from '@/utils/phone';
import { formatNigerianPhone, phoneDigits } from '@/utils/nigerian-phone';
import type { CheckoutPreview, OrderItem } from '@/types';

const DELIVERY_FEE = 500;
const VAT_RATE = 0.075;

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();

  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [showSandboxPayment, setShowSandboxPayment] = useState(false);
  const [deliveryAddressLine, setDeliveryAddressLine] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryState, setDeliveryState] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [deliveryContactPhone, setDeliveryContactPhone] = useState('');
  const [phoneEdited, setPhoneEdited] = useState(false);
  const profilePhone = user?.phoneNumber ?? user?.phone;

  useEffect(() => {
    if (!phoneEdited && profilePhone) {
      setDeliveryContactPhone(formatNigerianPhone(profilePhone));
    }
  }, [phoneEdited, profilePhone]);

  const latitudeValue = Number(latitude);
  const longitudeValue = Number(longitude);
  const normalizedContactPhone = normalizePhoneNumber(deliveryContactPhone);
  const hasValidLocation =
    latitude.trim() !== '' &&
    longitude.trim() !== '' &&
    Number.isFinite(latitudeValue) &&
    latitudeValue >= -90 &&
    latitudeValue <= 90 &&
    Number.isFinite(longitudeValue) &&
    longitudeValue >= -180 &&
    longitudeValue <= 180 &&
    normalizedContactPhone !== null;
  const hasValidDeliveryDetails =
    deliveryAddressLine.trim().length >= 3 &&
    deliveryCity.trim().length >= 2 &&
    deliveryState.trim().length >= 2 &&
    hasValidLocation;

  useEffect(() => {
    if (items.length === 0 || !hasValidDeliveryDetails) {
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
          deliveryAddressLine: deliveryAddressLine.trim(),
          deliveryCity: deliveryCity.trim(),
          deliveryState: deliveryState.trim(),
          latitude: latitudeValue,
          longitude: longitudeValue,
          deliveryContactPhone: normalizedContactPhone as string,
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
  }, [deliveryAddressLine, deliveryCity, deliveryState, hasValidDeliveryDetails, items, latitudeValue, longitudeValue, normalizedContactPhone]);

  useEffect(() => {
    if (items.length === 0 && !orderPlaced && !placingOrder) {
      navigate('/cart');
    }
  }, [items.length, orderPlaced, placingOrder, navigate]);

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
    if (placingOrder || items.length === 0 || !hasValidDeliveryDetails) {
      setPreviewError('Enter a valid delivery address and location before placing the order.');
      return;
    }

    setPlacingOrder(true);
    setPreviewError(null);

    try {
      const payload = {
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        deliveryAddressLine: deliveryAddressLine.trim(),
        deliveryCity: deliveryCity.trim(),
        deliveryState: deliveryState.trim(),
        latitude: latitudeValue,
        longitude: longitudeValue,
        deliveryContactPhone: normalizedContactPhone as string,
      };

      const idempotencyKey = globalThis.crypto?.randomUUID?.() ?? `order-${Date.now()}`;
      const response = await ordersApi.create(payload, idempotencyKey);
      const orderId = response.data.orderId;

      if (!response.data.payment) {
        throw new Error('Payment details were not returned for this order.');
      }

      await ordersApi.completeSandboxPayment(
        response.data.payment.paymentId,
        response.data.payment.paymentAttemptId,
        '4084 0840 8408 4081'
      );

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
  }, [clearCart, deliveryAddressLine, deliveryCity, deliveryState, hasValidDeliveryDetails, items, latitudeValue, longitudeValue, navigate, normalizedContactPhone, placingOrder]);

  if (items.length === 0 && !orderPlaced) {
    return null;
  }

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
              <h2 className="font-display text-lg font-bold text-gray-900 mb-1">Delivery details</h2>
              <p className="mb-4 text-sm text-gray-500">
                Add the address and map coordinates where your order should be delivered.
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="deliveryAddressLine" className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    id="deliveryAddressLine"
                    value={deliveryAddressLine}
                    onChange={(event) => setDeliveryAddressLine(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="12 Market Street"
                    minLength={3}
                    maxLength={255}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="deliveryCity" className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      id="deliveryCity"
                      value={deliveryCity}
                      onChange={(event) => setDeliveryCity(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3.5 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="Abuja"
                      minLength={2}
                      maxLength={100}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="deliveryState" className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      id="deliveryState"
                      value={deliveryState}
                      onChange={(event) => setDeliveryState(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3.5 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="FCT"
                      minLength={2}
                      maxLength={100}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="deliveryContactPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery contact phone
                  </label>
                    <div className="flex w-full rounded-lg border border-gray-300">
                      <span className="flex items-center border-r border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-600">+234</span>
                      <input
                      id="deliveryContactPhone"
                      type="tel"
                      value={phoneDigits(deliveryContactPhone)}
                    onChange={(event) => {
                      setPhoneEdited(true);
                      setDeliveryContactPhone(formatNigerianPhone(event.target.value));
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="9011390588"
                    inputMode="numeric"
                    minLength={10}
                    maxLength={10}
                    required
                      />
                    </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Nigerian local numbers and international country-code formats are accepted.
                  </p>
                  {deliveryContactPhone && !normalizedContactPhone && (
                    <p className="mt-1 text-xs text-error-600">
                      Enter a valid Nigerian or international phone number.
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude
                    </label>
                    <input
                      id="latitude"
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(event) => setLatitude(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3.5 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="9.0765"
                      min={-90}
                      max={90}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude
                    </label>
                    <input
                      id="longitude"
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(event) => setLongitude(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3.5 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="7.3986"
                      min={-180}
                      max={180}
                      required
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!navigator.geolocation) {
                      setPreviewError('Location detection is not available in this browser.');
                      return;
                    }
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        setLatitude(position.coords.latitude.toFixed(6));
                        setLongitude(position.coords.longitude.toFixed(6));
                        setPreviewError(null);
                      },
                      () => setPreviewError('Unable to detect your location. Enter the coordinates manually.')
                    );
                  }}
                  className="text-sm font-semibold text-primary-700 hover:text-primary-800"
                >
                  Use my current location
                </button>
              </div>
            </div>
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
                disabled={placingOrder || !hasValidDeliveryDetails}
                className={cn(
                  'mt-6 flex w-full items-center justify-center gap-2 rounded-xl h-12 text-sm font-semibold text-white transition-colors',
                  placingOrder || !hasValidDeliveryDetails
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
