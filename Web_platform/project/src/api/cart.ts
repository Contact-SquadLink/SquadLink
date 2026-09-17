import { apiRequest } from './client';
import type { Cart, ApiSingleResponse } from '@/types';

export interface AddCartItemPayload {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemPayload {
  quantity: number;
}

export const cartApi = {
  get: () => apiRequest<ApiSingleResponse<Cart>>('/api/v1/cart/'),

  addItem: (payload: AddCartItemPayload) =>
    apiRequest<ApiSingleResponse<Cart>>('/api/v1/cart/items', {
      method: 'POST',
      body: payload,
    }),

  updateItem: (itemId: string, payload: UpdateCartItemPayload) =>
    apiRequest<ApiSingleResponse<Cart>>(`/api/v1/cart/items/${itemId}`, {
      method: 'PUT',
      body: payload,
    }),

  removeItem: (itemId: string) =>
    apiRequest<ApiSingleResponse<Cart>>(`/api/v1/cart/items/${itemId}`, {
      method: 'DELETE',
    }),

  clear: () =>
    apiRequest<void>('/api/v1/cart/', {
      method: 'DELETE',
    }),
};
