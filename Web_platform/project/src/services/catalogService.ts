import { catalogApi, type ProductQueryParams } from '@/api/catalog';
import { mockProducts, getRelatedProducts, type MockProduct } from '@/data/mock/mockProducts';
import { mockCategories, type MockCategory } from '@/data/mock/mockCategories';
import type { Product } from '@/types';

const FORCE_DEMO = import.meta.env.VITE_USE_DEMO_CATALOG === 'true';

export type CatalogSource = 'demo' | 'backend';

export interface CatalogResult {
  products: Product[];
  source: CatalogSource;
}

function mockToProduct(mock: MockProduct): Product {
  return {
    id: mock.id,
    name: mock.name,
    description: mock.description,
    price: mock.price,
    currency: 'NGN',
    imageUrl: mock.imageUrl,
    category: mock.categorySlug,
    unit: mock.unit,
    inStock: mock.available,
    available: mock.available,
    rating: mock.rating,
    reviewCount: mock.reviewCount,
    featured: mock.featured,
    popular: mock.popular,
    tags: mock.tags,
  };
}

function sortProducts(products: Product[], sort?: string): Product[] {
  const sorted = [...products];
  switch (sort) {
    case 'price-low':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price-high':
      return sorted.sort((a, b) => b.price - a.price);
    case 'rating':
      return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case 'popular':
      return sorted.sort((a, b) => Number(b.popular) - Number(a.popular));
    case 'recommended':
    default:
      return sorted.sort((a, b) => {
        const aScore = Number(a.featured) * 2 + Number(a.popular) + (a.rating ?? 0) / 5;
        const bScore = Number(b.featured) * 2 + Number(b.popular) + (b.rating ?? 0) / 5;
        return bScore - aScore;
      });
  }
}

function filterDemo(params?: ProductQueryParams): Product[] {
  let products = mockProducts.map(mockToProduct);
  if (params?.search) {
    const q = params.search.toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.includes(q))
    );
  }
  if (params?.category && params.category !== 'all') {
    products = products.filter((p) => p.category === params.category);
  }
  if (params?.availability === 'in-stock') {
    products = products.filter((p) => p.available !== false);
  }
  return sortProducts(products, params?.sort);
}

export const catalogService = {
  async list(params?: ProductQueryParams): Promise<CatalogResult> {
    if (FORCE_DEMO) {
      return { products: filterDemo(params), source: 'demo' };
    }
    try {
      const res = await catalogApi.list(params);
      return { products: res.data, source: 'backend' };
    } catch {
      return { products: filterDemo(params), source: 'demo' };
    }
  },

  async getById(id: string): Promise<{ product: Product | null; source: CatalogSource; related: Product[] }> {
    if (FORCE_DEMO) {
      const mock = mockProducts.find((p) => p.id === id);
      if (!mock) return { product: null, source: 'demo', related: [] };
      return {
        product: mockToProduct(mock),
        source: 'demo',
        related: getRelatedProducts(id).map(mockToProduct),
      };
    }
    try {
      const res = await catalogApi.getById(id);
      return { product: res.data, source: 'backend', related: [] };
    } catch {
      const mock = mockProducts.find((p) => p.id === id);
      if (!mock) return { product: null, source: 'demo', related: [] };
      return {
        product: mockToProduct(mock),
        source: 'demo',
        related: getRelatedProducts(id).map(mockToProduct),
      };
    }
  },

  getCategories(): MockCategory[] {
    return mockCategories;
  },

  getDemoProducts(): Product[] {
    return mockProducts.map(mockToProduct);
  },

  isDemoMode(): boolean {
    return FORCE_DEMO;
  },
};
