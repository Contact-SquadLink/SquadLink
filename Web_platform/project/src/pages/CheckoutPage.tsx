import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { checkoutApi, ordersApi } from '@/api/orders';
import { paymentApi } from '@/api/payment';
import { formatPrice, cn } from '@/utils/format';
import { normalizePhoneNumber } from '@/utils/phone';
import { formatNigerianPhone, phoneDigits } from '@/utils/nigerian-phone';
import type { CheckoutPreview, OrderItem } from '@/types';

const DELIVERY_FEE = 250;
const PLATFORM_FEE = 150;

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, isSyncing } = useCart();
  const { user } = useAuth();

  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<'PAYSTACK' | 'FLUTTERWAVE'>('PAYSTACK');
  const [deliveryAddressLine, setDeliveryAddressLine] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('Bauchi');
  const [deliveryState, setDeliveryState] = useState('Bauchi');
  const [latitude, setLatitude] = useState('10.2833');
  const [longitude, setLongitude] = useState('9.8167');
  const [deliveryContactPhone, setDeliveryContactPhone] = useState('');
  const [phoneEdited, setPhoneEdited] = useState(false);
  const profilePhone = user?.phoneNumber ?? user?.phone;

  useEffect(() => {
    if (!phoneEdited && profilePhone) {
      setDeliveryContactPhone(formatNigerianPhone(profilePhone));
    }
  }, [phoneEdited, profilePhone]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toFixed(6));
          setLongitude(position.coords.longitude.toFixed(6));
        },
        () => {
          // Keep default if permission not granted
        },
        { timeout: 5000 }
      );
    }
  }, []);

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
    if (isSyncing || items.length === 0 || !hasValidDeliveryDetails) {
      setPreview(null);
      return;
    }

    let isMounted = true;
    const timeoutId = setTimeout(async () => {
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
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [deliveryAddressLine, deliveryCity, deliveryState, hasValidDeliveryDetails, isSyncing, items, latitudeValue, longitudeValue, normalizedContactPhone]);

  useEffect(() => {
    if (items.length === 0 && !orderPlaced && !placingOrder && !placedOrderId) {
      navigate('/cart');
    }
  }, [items.length, orderPlaced, placingOrder, placedOrderId, navigate]);

  const estimatedDeliveryFee = items.length > 0 ? DELIVERY_FEE : 0;
  const deliveryFee = preview?.deliveryFee ?? estimatedDeliveryFee;
  const platformFee = preview?.platformFee ?? (items.length > 0 ? PLATFORM_FEE : 0);
  const total = preview?.total ?? subtotal + deliveryFee + platformFee;

  const orderItems: OrderItem[] = items.map((i) => ({
    productId: i.productId,
    name: i.name,
    quantity: i.quantity,
    price: i.price,
    subtotal: i.price * i.quantity,
  }));

  const handleInitiateCheckout = useCallback(async () => {
    if (isSyncing || placingOrder || placedOrderId || items.length === 0) {
      return;
    }

    if (!deliveryAddressLine.trim() || deliveryAddressLine.trim().length < 3) {
      setPreviewError('Please enter your delivery street address (at least 3 characters).');
      return;
    }

    if (!deliveryCity.trim() || deliveryCity.trim().length < 2) {
      setPreviewError('Please enter your delivery city.');
      return;
    }

    if (!deliveryState.trim() || deliveryState.trim().length < 2) {
      setPreviewError('Please enter your delivery state.');
      return;
    }

    if (!normalizedContactPhone) {
      setPreviewError('Please enter a valid 10-digit Nigerian delivery contact phone number.');
      return;
    }

    let effectiveLat = latitudeValue;
    let effectiveLng = longitudeValue;
    if (
      !Number.isFinite(effectiveLat) ||
      effectiveLat < -90 ||
      effectiveLat > 90 ||
      !Number.isFinite(effectiveLng) ||
      effectiveLng < -180 ||
      effectiveLng > 180
    ) {
      effectiveLat = 10.2833;
      effectiveLng = 9.8167;
      setLatitude('10.2833');
      setLongitude('9.8167');
    }

    setPlacingOrder(true);
    setPreviewError(null);

    let orderId: string | null = null;
    try {
      const payload = {
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        deliveryAddressLine: deliveryAddressLine.trim(),
        deliveryCity: deliveryCity.trim(),
        deliveryState: deliveryState.trim(),
        latitude: effectiveLat,
        longitude: effectiveLng,
        deliveryContactPhone: normalizedContactPhone,
      };

      const idempotencyKey = globalThis.crypto?.randomUUID?.() ?? `order-${Date.now()}`;
      const response = await ordersApi.create(payload, idempotencyKey);
      orderId = response.data.orderId;
      setPlacedOrderId(orderId);

      // Initialize transaction with selected gateway (Paystack / Flutterwave)
      const callbackUrl = `${window.location.origin}/orders/${orderId}`;
      const initRes = await paymentApi.initialize({
        orderId,
        gateway: selectedGateway,
        callbackUrl,
      });

      // Navigate directly to the live gateway checkout page.
      // The cart will be cleared by the server when the order is confirmed after payment.
      // Do NOT call clearCart() here — if the user cancels payment they must be able to return.
      if (initRes.data.checkoutUrl) {
        window.location.href = initRes.data.checkoutUrl;
        return;
      }

      // Fallback: navigate to the order page so the user can retry payment
      navigate(`/orders/${orderId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to initiate order payment.';
      if (orderId) {
        navigate(`/orders/${orderId}`, { state: { paymentNotice: message } });
      } else {
        setPreviewError(message);
      }
    } finally {
      setPlacingOrder(false);
    }
  }, [deliveryAddressLine, deliveryCity, deliveryState, isSyncing, items, latitudeValue, longitudeValue, navigate, normalizedContactPhone, placedOrderId, placingOrder, selectedGateway]);

  if (items.length === 0 && !orderPlaced && !placedOrderId) {
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
                <div className="flex flex-wrap items-center gap-3 pt-1">
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
                        () => setPreviewError('Unable to detect GPS location. Pilot coordinates (10.2833, 9.8167) will be used.')
                      );
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-800 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100 hover:bg-primary-100 transition-colors"
                  >
                    📍 Use my current GPS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryCity('Bauchi');
                      setDeliveryState('Bauchi');
                      setLatitude('10.2833');
                      setLongitude('9.8167');
                      setPreviewError(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-200 transition-colors"
                  >
                    Set Bauchi Pilot Zone (10.2833, 9.8167)
                  </button>
                </div>
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
                  <span className="text-gray-600">
                    Delivery fee
                    {preview?.estimatedRoadDistanceKm != null && preview.estimatedRoadDistanceKm > 0 && (
                      <span className="ml-1 text-xs text-gray-500 font-normal">
                        (~{preview.estimatedRoadDistanceKm} km)
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-gray-700">{formatPrice(deliveryFee)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Platform fee</span>
                  <span className="font-semibold text-gray-700">{formatPrice(platformFee)}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-display text-xl font-bold text-gray-900">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              {/* Payment Gateway Provider Selector */}
              <div className="mt-6 space-y-3">
                <label className="block text-xs font-semibold uppercase text-gray-500">
                  Select Payment Gateway
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedGateway('PAYSTACK')}
                    className={cn(
                      'flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all',
                      selectedGateway === 'PAYSTACK'
                        ? 'border-primary-600 bg-primary-50/50 text-primary-900 font-bold ring-2 ring-primary-500/20'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    )}
                  >
                    <span className="text-sm font-semibold">Paystack</span>
                    <span className="text-[10px] text-gray-500">Cards, Transfer, USSD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedGateway('FLUTTERWAVE')}
                    className={cn(
                      'flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all',
                      selectedGateway === 'FLUTTERWAVE'
                        ? 'border-primary-600 bg-primary-50/50 text-primary-900 font-bold ring-2 ring-primary-500/20'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    )}
                  >
                    <span className="text-sm font-semibold">Flutterwave</span>
                    <span className="text-[10px] text-gray-500">Mobile Money & Cards</span>
                  </button>
                </div>
              </div>

              {previewError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                  {previewError}
                </div>
              )}

              <button
                type="button"
                onClick={handleInitiateCheckout}
                disabled={placingOrder || Boolean(placedOrderId)}
                className={cn(
                  'mt-4 flex w-full items-center justify-center gap-2 rounded-xl h-12 text-sm font-semibold text-white transition-all shadow-md',
                  placingOrder
                    ? 'bg-primary-400 cursor-wait'
                    : 'bg-primary-600 hover:bg-primary-700 active:scale-[0.99] cursor-pointer hover:shadow-lg'
                )}
              >
                {placingOrder ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Connecting to {selectedGateway === 'PAYSTACK' ? 'Paystack' : 'Flutterwave'}...
                  </>
                ) : placedOrderId ? (
                  <>Order awaiting payment</>
                ) : (
                  <>
                    Pay {formatPrice(total)} with {selectedGateway}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

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
          <Link
            to={`/orders/${placedOrderId}`}
            className="mt-4 inline-flex text-sm font-semibold text-primary-700 hover:text-primary-800"
          >
            Continue to payment for order #{placedOrderId.slice(-8)}
          </Link>
        )}
      </div>
    </div>
  );
}
