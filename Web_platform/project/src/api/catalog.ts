import { apiRequest } from './client';
import type { Product, ApiListResponse, ApiSingleResponse } from '@/types';

export interface ProductQueryParams {
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  availability?: 'in-stock' | 'all';
}

export interface CatalogCategory {
  id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const catalogApi = {
  listTemplates: () =>
    apiRequest<ApiListResponse<Product>>('/api/v1/catalog/templates'),

  listCategories: () =>
    apiRequest<ApiListResponse<CatalogCategory>>('/api/v1/catalog/categories'),

  list: (params?: ProductQueryParams) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category) query.set('category', params.category);
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.sort) query.set('sort', params.sort);
    const qs = query.toString();
    return apiRequest<ApiListResponse<Product>>(
      `/api/v1/catalog/products${qs ? `?${qs}` : ''}`
    );
  },

  getById: (id: string) =>
    apiRequest<ApiSingleResponse<Product>>(`/api/v1/catalog/products/${id}`),
};
