export type Role = 'CUSTOMER' | 'BUSINESS_USER' | 'RIDER' | 'ADMIN';

export interface User {
  id: string;
  email?: string | null;
  phoneNumber?: string | null;
  role: Role;
  isActive?: boolean;
  emailVerifiedAt?: string | null;
  phoneVerifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  images?: string[];
  category?: string;
  unit?: string;
  inStock?: boolean;
  available?: boolean;
  rating?: number;
  reviewCount?: number;
  featured?: boolean;
  popular?: boolean;
  tags?: string[];
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string;
  unit?: string;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
}

export interface CheckoutPreviewItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface CheckoutPreview {
  items: CheckoutPreviewItem[];
  subtotal: number;
  deliveryFee: number;
  vat: number;
  total: number;
  fulfillingBusiness?: {
    id: string;
    name: string;
  };
  availabilityErrors?: string[];
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  vat: number;
  total: number;
  createdAt: string;
  updatedAt?: string;
}

export type DeliveryStatus =
  | 'SEARCHING_RIDER'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'DELIVERED';

export interface Delivery {
  id: string;
  orderId: string;
  status: DeliveryStatus;
  riderId?: string;
  riderName?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
}

export interface Business {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  isVerified: boolean;
  verificationStatus?: string;
}

export interface Rider {
  id: string;
  userId: string;
  isAvailable: boolean;
  currentDeliveryId?: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
}

export interface ApiListResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface ApiSingleResponse<T> {
  data: T;
}

export interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  requestId?: string;
}
