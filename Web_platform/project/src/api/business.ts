import { apiRequest } from './client';
import type {
  Order,
  Business,
  BusinessOrderSummary,
  BusinessVerificationRecord,
  ApiListResponse,
  ApiSingleResponse,
  ApiResponseEnvelope,
} from '@/types';

export interface CreateBusinessPayload {
  name: string;
  description?: string;
  phoneNumber?: string;
  email?: string;
  addressLine: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  minimumOrderAmount?: number;
}

export interface BusinessCatalogItem {
  id: string;
  businessId: string;
  productId: string;
  productName: string;
  productDescription: string | null;
  categoryId: string;
  categoryName: string;
  priceAmount: number;
  currency: string;
  isAvailable: boolean;
  productIsActive: boolean;
}

export interface InventoryItem {
  id: string;
  businessProductId: string;
  productId: string;
  productName: string;
  priceAmount: string;
  currency: string;
  isAvailable: boolean;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  lowStockThreshold: number;
}

export const businessApi = {
  getApplication: () =>
    apiRequest<ApiResponseEnvelope<{
      status: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
      business: Business | null;
      verification: BusinessVerificationRecord | null;
    }>>('/api/v1/businesses/application'),

  listOrders: () =>
    apiRequest<ApiListResponse<BusinessOrderSummary>>('/api/v1/business/orders'),

  getOrder: (orderId: string) =>
    apiRequest<ApiSingleResponse<Order>>(`/api/v1/orders/${orderId}`),

  acceptOrder: (orderId: string) =>
    apiRequest<ApiSingleResponse<Order>>(
      `/api/v1/business/orders/${orderId}/accept`,
      { method: 'POST' }
    ),

  markOrderReady: (orderId: string) =>
    apiRequest<ApiSingleResponse<Order>>(
      `/api/v1/business/orders/${orderId}/ready`,
      { method: 'POST' }
    ),

  createBusiness: (payload: CreateBusinessPayload) =>
    apiRequest<ApiResponseEnvelope<Business>>('/api/v1/businesses/', {
      method: 'POST',
      body: {
        name: payload.name.trim(),
        description: payload.description?.trim() || undefined,
        phoneNumber: payload.phoneNumber?.trim() || undefined,
        email: payload.email?.trim() || undefined,
        addressLine: payload.addressLine.trim(),
        city: payload.city.trim(),
        state: payload.state.trim(),
        latitude: payload.latitude,
        longitude: payload.longitude,
        minimumOrderAmount: payload.minimumOrderAmount ?? 0,
      },
    }),

  getMyBusiness: () =>
    apiRequest<ApiResponseEnvelope<Business>>('/api/v1/businesses/me'),

  listCatalog: () =>
    apiRequest<ApiResponseEnvelope<BusinessCatalogItem[]>>('/api/v1/businesses/me/catalog'),

  addCatalogItem: (payload: { productId: string; priceAmount: number; currency?: string; isAvailable?: boolean }) =>
    apiRequest<ApiResponseEnvelope<BusinessCatalogItem>>('/api/v1/businesses/me/catalog', { method: 'POST', body: payload }),

  listInventory: () =>
    apiRequest<ApiResponseEnvelope<InventoryItem[]>>('/api/v1/inventory/me'),

  createInventory: (payload: { businessProductId: string; quantityOnHand: number; lowStockThreshold: number }) =>
    apiRequest<ApiResponseEnvelope<InventoryItem>>('/api/v1/inventory/me', { method: 'POST', body: payload }),

  updateInventory: (inventoryId: string, payload: { quantityOnHand?: number; lowStockThreshold?: number }) =>
    apiRequest<ApiResponseEnvelope<InventoryItem>>(`/api/v1/inventory/me/${inventoryId}`, { method: 'PUT', body: payload }),
};

