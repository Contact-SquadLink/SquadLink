export type Role = 'CUSTOMER' | 'BUSINESS_USER' | 'RIDER' | 'ADMIN' | 'SUPER_ADMIN';

export type OrderStage =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'DELIVERED';

export interface User {
  id: string;
  email?: string | null;
  phoneNumber?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  role: Role;
  isActive?: boolean;
  emailVerifiedAt?: string | null;
  phoneVerifiedAt?: string | null;
  profileUpdatedAt?: string | null;
  termsAccepted?: boolean;
  termsAcceptedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface ObservabilityDashboardData {
  financials: {
    grossMerchandiseValue: number;
    totalPlatformRevenue: number;
    totalNetContribution: number;
    averageContributionPerOrder: number;
    completedOrdersCount: number;
    totalGatewayFees: number;
    totalRiderPayouts: number;
    totalMerchantPayouts: number;
  };
  health: {
    healthScore: number;
    completionRate: number;
    cancellationRate: number;
    assignmentAcceptanceRate: number;
    activeExceptionsCount: number;
  };
  lifecycleStages: {
    PENDING: number;
    CONFIRMED: number;
    PREPARING: number;
    READY_FOR_PICKUP: number;
    ASSIGNED: number;
    PICKED_UP: number;
    IN_TRANSIT: number;
    ARRIVED: number;
    DELIVERED: number;
    CANCELLED: number;
    total: number;
  };
  serviceZones: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    radiusMeters: number;
    isActive: boolean;
    totalRiders: number;
    activeRiders: number;
    featurePhoneRiders: number;
    smartphoneRiders: number;
    activeDeliveries: number;
    isPrimaryPilot: boolean;
  }>;
}

export interface SuperAdminOrderSummary {
  id: string;
  orderStatus: string;
  deliveryStatus: string | null;
  deliveryId: string | null;
  currentStage: string;
  customer: { id: string; name: string | null; phone: string | null };
  business: { id: string | null; name: string | null };
  rider: {
    id: string;
    name: string | null;
    phone: string | null;
    deviceType: 'SMARTPHONE' | 'FEATURE_PHONE' | null;
  } | null;
  financials: {
    subtotal: number;
    deliveryFee: number;
    platformFee: number;
    merchantCommission: number;
    totalAmount: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntryItem {
  id: string;
  orderId: string;
  deliveryId?: string;
  entryGroupId: string;
  accountName: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface LedgerSummary {
  entries: LedgerEntryItem[];
  summary: {
    totalDebits: number;
    totalCredits: number;
    isBalanced: boolean;
    variance: number;
  };
}

export interface AuditLogItem {
  id: string;
  actorType: string;
  actorUserId: string | null;
  actorName?: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Product {
  id: string;
  businessId?: string;
  name: string;
  description?: string;
  price: number;
  suggestedPriceAmount?: number;
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
  serverItemId?: string;
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
  platformFee: number;
  vat: number;
  total: number;
  fulfillingBusiness?: {
    id: string;
    name: string;
  };
  availabilityErrors?: string[];
  straightLineDistanceKm?: number;
  estimatedRoadDistanceKm?: number;
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

export interface OrderRiderInfo {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  phoneNumber: string | null;
  vehicleType: string | null;
  vehicleRegistration: string | null;
}

export interface Order {
  id: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  platformFee?: number;
  businessFee?: number;
  vat: number;
  total: number;
  deliveryContactPhone?: string | null;
  pickupPin?: string | null;
  delivery?: {
    id: string;
    status: DeliveryStatus;
    riderAccepted?: boolean;
    rider?: OrderRiderInfo | null;
  } | null;
  createdAt: string;
  updatedAt?: string;
}

export interface BusinessOrderSummary {
  orderId: string;
  status: string;
  fulfillmentStatus?: string;
  deliveryStatus?: string | null;
  riderAssigned?: boolean;
  createdAt: string;
}

export interface OrderCreationResult {
  orderId: string;
  status: string;
  fulfillment?: {
    fulfillmentId: string;
    businessId: string;
    businessName: string;
    distanceMeters: number;
    searchRadiusMeters: number;
    status: string;
  };
  payment?: {
    paymentId: string;
    paymentAttemptId: string;
    status: string;
    amount: number;
    charged: boolean;
  };
  pricing?: {
    currency: string;
    subtotalAmount: number;
    deliveryFeeAmount: number;
    totalAmount: number;
  };
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPriceAmount: number;
    subtotalAmount: number;
  }>;
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
  assignmentStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | null;
  assignmentExpiresAt?: string | null;
  riderId?: string;
  riderName?: string;
  pickupAddress?: string;
  businessPhone?: string | null;
  deliveryAddress?: string;
  deliveryContactPhone?: string | null;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
}

export interface Business {
  id: string;
  name: string;
  description?: string;
  address?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  phone?: string;
  email?: string;
  isVerified: boolean;
  verificationStatus?: string;
  status?: string;
}

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

export type AdminAccessRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AdminAccessRequest {
  id: string;
  requestedUserId: string | null;
  requestedUserEmail: string | null;
  requestedUserName: string | null;
  requestedByUserId: string | null;
  requestedByName: string | null;
  status: AdminAccessRequestStatus;
  notes: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessVerificationRecord {
  id: string;
  businessId: string;
  businessName: string;
  businessEmail: string | null;
  businessPhoneNumber: string | null;
  city: string;
  state: string;
  businessIsActive: boolean;
  businessIsVerified: boolean;
  verificationRequired: boolean;
  status: VerificationStatus;
  verifiedBy: string | null;
  verificationNotes: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessVerificationHistoryRecord {
  id: string;
  businessId: string;
  previousStatus: VerificationStatus | null;
  newStatus: VerificationStatus;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
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
  orderId?: string | null;
  deliveryId?: string | null;
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

export type AdminPermission =
  | 'CUSTOMER_VIEW'
  | 'CUSTOMER_SUSPEND'
  | 'BUSINESS_VIEW'
  | 'BUSINESS_VERIFY'
  | 'BUSINESS_REJECT'
  | 'BUSINESS_SUSPEND'
  | 'RIDER_VIEW'
  | 'RIDER_VERIFY'
  | 'RIDER_REJECT'
  | 'RIDER_SUSPEND'
  | 'ORDER_VIEW'
  | 'ORDER_INTERVENE'
  | 'ORDER_CANCEL'
  | 'DELIVERY_VIEW'
  | 'DELIVERY_INTERVENE'
  | 'WITHDRAWAL_VIEW'
  | 'WITHDRAWAL_APPROVE'
  | 'SUPPORT_VIEW'
  | 'SUPPORT_RESOLVE'
  | 'ANALYTICS_VIEW'
  | 'ADMIN_VIEW'
  | 'ADMIN_CREATE'
  | 'ADMIN_DISABLE'
  | 'ADMIN_PERMISSION_MANAGE'
  | 'PLATFORM_CONFIG_VIEW'
  | 'PLATFORM_CONFIG_UPDATE'
  | 'AUDIT_LOG_VIEW'
  | 'SECURITY_VIEW';

export interface PlatformSummaryData {
  timeFilter: 'today' | '7d' | '30d' | '90d' | 'all';
  population: {
    customers: { total: number; active: number };
    businesses: { total: number; active: number; pending: number };
    riders: { total: number; verified: number; activeAvailable: number; pending: number };
    admins: { total: number } | null;
  };
  orders: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    stages: Record<string, number>;
  };
  attentionNeeded: {
    pendingBusinesses: number;
    pendingRiders: number;
    unassignedOrders: number;
    delayedOrders: number;
    pendingWithdrawals: number;
  };
  financials: {
    gmv: number;
    platformRevenue: number;
    platformFeeRevenue: number;
    merchantCommission: number;
    deliveryFeeRevenue: number;
    riderPayouts: number;
    estimatedContribution: number;
  } | null;
  // Backward compatibility:
  customers?: number;
  businesses?: number;
  riders?: number;
  admins?: number;
  gross_completed_value?: number;
  recipient_earnings?: number;
  platform_earnings?: number;
  completed_transactions?: number;
  pending_transactions?: number;
  in_transit_transactions?: number;
  assigned_transactions?: number;
}

export interface LiveOperationItem {
  orderId: string;
  orderStatus: string;
  deliveryStatus: string | null;
  customerName: string;
  customerPhone: string | null;
  businessName: string;
  businessPhone: string | null;
  riderName: string;
  riderPhone: string | null;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  issueType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  suggestedAction: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  isActive: boolean;
  suspendedAt: string | null;
  suspensionReason: string | null;
  ordersCount: number;
  totalSpend: number;
  createdAt: string;
}

export interface CustomerDetail {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phoneNumber: string | null;
    isActive: boolean;
    suspendedAt: string | null;
    suspensionReason: string | null;
    createdAt: string;
  };
  orders: Array<{
    id: string;
    businessName: string;
    status: string;
    totalAmount: number;
    createdAt: string;
  }>;
}

export interface AdminUserItem {
  id: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  role: string;
  isActive: boolean;
  adminApproved: boolean;
  isSuperAdmin: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryMonitorItem {
  deliveryId: string;
  orderId: string;
  orderStatus: string;
  deliveryStatus: string;
  businessName: string;
  riderName: string;
  riderPhone: string | null;
  customerName: string;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  deliveryFee: number;
  totalAmount: number;
  createdAt: string;
}

export interface OperationalIssueItem {
  id: string;
  orderId: string | null;
  issueType: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string | null;
  assignedAdminId: string | null;
  assignedAdminName: string | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemHealthData {
  status: 'OPERATIONAL' | 'DEGRADED' | 'UNAVAILABLE';
  timestamp: string;
  components: {
    api: { status: string; description?: string };
    database: { status: string; latencyMs: number; description?: string };
    authentication: { status: string; description?: string };
    notifications: { status: string; description?: string };
    backgroundJobs: { status: string; description?: string };
  };
  metrics: {
    uptimeSeconds: number;
    activeOrdersInFlight: number;
    availableRiders: number;
    memoryRssMb: number;
    memoryHeapUsedMb: number;
  };
}
