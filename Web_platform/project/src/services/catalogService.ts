import { catalogApi, type CatalogCategory, type ProductQueryParams } from '@/api/catalog';
import type { Product } from '@/types';

export type CatalogSource = 'backend';

export interface CatalogResult {
  products: Product[];
  source: CatalogSource;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'category';
}

function mapBackendProduct(raw: Record<string, unknown>): Product | null {
  const id = typeof raw.id === 'string' ? raw.id : null;
  const name = typeof raw.name === 'string' ? raw.name : null;
  if (!id || !name) return null;

  const categoryName = typeof raw.categoryName === 'string'
    ? raw.categoryName
    : typeof raw.category === 'string'
      ? raw.category
      : 'General';

  const isActive = raw.isActive === true || raw.is_active === true;

  return {
    id,
    name,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    price: typeof raw.priceAmount === 'number' ? raw.priceAmount : 0,
    currency: typeof raw.currency === 'string' ? raw.currency : 'NGN',
    businessId: typeof raw.businessId === 'string' ? raw.businessId : undefined,
    imageUrl: undefined,
    category: categoryName,
    unit: undefined,
    inStock: isActive,
    available: isActive,
    rating: undefined,
    reviewCount: undefined,
    featured: false,
    popular: false,
    tags: [],
  };
}

function mapCategory(raw: CatalogCategory): { id: string; name: string; slug: string; icon: string; description: string } {
  return {
    id: raw.id,
    name: raw.name,
    slug: slugify(raw.name),
    icon: 'ShoppingBag',
    description: raw.description ?? 'Catalog category',
  };
}

export const catalogService = {
  async list(params?: ProductQueryParams): Promise<CatalogResult> {
    const res = await catalogApi.list(params);
    const rows = Array.isArray(res.data) ? res.data : [];
    const products = rows
      .map((row) => mapBackendProduct(row as unknown as Record<string, unknown>))
      .filter((product): product is Product => product !== null);

    return { products, source: 'backend' };
  },

  async getById(id: string): Promise<{ product: Product | null; source: CatalogSource; related: Product[] }> {
    const res = await catalogApi.getById(id);
    const product = mapBackendProduct(res.data as unknown as Record<string, unknown>);
    return { product, source: 'backend', related: [] };
  },

  async getCategories(): Promise<Array<{ id: string; name: string; slug: string; icon: string; description: string }>> {
    const res = await catalogApi.listCategories();
    const rows = Array.isArray(res.data) ? res.data : [];
    return rows.map((row) => mapCategory(row));
  },
};
