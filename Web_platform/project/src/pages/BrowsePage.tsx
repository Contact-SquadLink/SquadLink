import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  SlidersHorizontal,
  X,
  Package,
  Check,
} from 'lucide-react';
import { catalogService } from '@/services/catalogService';
import { ProductCard } from '@/components/catalog/ProductCard';
import { EmptyState } from '@/components/ui/States';
import { cn } from '@/utils/format';
import { getCategoryIcon } from '@/utils/icons';

const sortOptions = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'popular', label: 'Popular' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
];

export function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category') || 'all';
  const searchFromUrl = searchParams.get('search') || '';

  const [search, setSearch] = useState(searchFromUrl);
  const [debouncedSearch, setDebouncedSearch] = useState(searchFromUrl);
  const [category, setCategory] = useState(categoryFromUrl);
  const [sort, setSort] = useState('recommended');
  const [availability, setAvailability] = useState<'all' | 'in-stock'>('all');
  const [showSort, setShowSort] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    setCategory(categoryFromUrl);
  }, [categoryFromUrl]);

  useEffect(() => {
    setSearch(searchFromUrl);
    setDebouncedSearch(searchFromUrl);
  }, [searchFromUrl]);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const handleCategoryChange = (slug: string) => {
    setCategory(slug);
    const params = new URLSearchParams(searchParams);
    if (slug === 'all') {
      params.delete('category');
    } else {
      params.set('category', slug);
    }
    setSearchParams(params);
    setShowMobileFilters(false);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['catalog', debouncedSearch, category, sort, availability],
    queryFn: () =>
      catalogService.list({
        search: debouncedSearch || undefined,
        category,
        sort,
        availability,
      }),
  });

  const products = data?.products ?? [];
  const categories = useQuery({
    queryKey: ['catalog-categories'],
    queryFn: () => catalogService.getCategories(),
  }).data ?? [];

  const activeCategory = useMemo(
    () => categories.find((c) => c.slug === category),
    [categories, category]
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <h1 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">
            {activeCategory ? activeCategory.name : 'Browse Products'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {activeCategory
              ? activeCategory.description
              : 'Search the unified catalogue across local businesses. No account needed to browse.'}
          </p>

          {/* Search bar */}
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search for rice, chicken, charger, bread, soap…"
                className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    setDebouncedSearch('');
                    const params = new URLSearchParams(searchParams);
                    params.delete('search');
                    setSearchParams(params);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowSort(!showSort)}
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Sort</span>
              </button>
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors lg:hidden"
              >
                Categories
              </button>
            </div>
          </div>

          {/* Sort dropdown */}
          {showSort && (
            <div className="mt-3 flex flex-wrap gap-2 animate-slide-down">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSort(opt.value);
                    setShowSort(false);
                  }}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    sort === opt.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex gap-6">
          {/* Sidebar — desktop */}
          <aside className="hidden lg:flex flex-col w-56 shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* Categories */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => handleCategoryChange('all')}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      category === 'all'
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    All Products
                  </button>
                  {categories.map((cat) => {
                    const IconComp = getCategoryIcon(cat.icon);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryChange(cat.slug)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          category === cat.slug
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        )}
                      >
                        <IconComp className="h-4 w-4 shrink-0" />
                        <span className="truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Availability */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Availability</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setAvailability('all')}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      availability === 'all'
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setAvailability('in-stock')}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      availability === 'in-stock'
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <Check className="h-4 w-4 text-success-500" /> In Stock
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Mobile category drawer */}
          {showMobileFilters && (
            <div className="lg:hidden fixed inset-0 z-50">
              <div
                className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
                onClick={() => setShowMobileFilters(false)}
              />
              <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl flex flex-col animate-slide-down overflow-y-auto">
                <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100 shrink-0">
                  <span className="font-semibold text-gray-900">Categories</span>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-3 space-y-1">
                  <button
                    onClick={() => handleCategoryChange('all')}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      category === 'all'
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    All Products
                  </button>
                  {categories.map((cat) => {
                    const IconComp = getCategoryIcon(cat.icon);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryChange(cat.slug)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          category === cat.slug
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        )}
                      >
                        <IconComp className="h-4 w-4 shrink-0" />
                        <span className="truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </aside>
            </div>
          )}

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                We could not load the catalogue right now. Please try again.
              </div>
            )}
            {/* Result count */}
            {!isLoading && products.length > 0 && (
              <p className="mb-4 text-sm text-gray-500">
                {products.length} {products.length === 1 ? 'product' : 'products'}
                {activeCategory && ` in ${activeCategory.name}`}
              </p>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="aspect-square bg-gray-100 animate-pulse" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 w-3/4 rounded bg-gray-100 animate-pulse" />
                      <div className="h-3 w-full rounded bg-gray-100 animate-pulse" />
                      <div className="h-6 w-20 rounded bg-gray-100 animate-pulse" />
                      <div className="h-9 w-full rounded bg-gray-100 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Products */}
            {!isLoading && products.length > 0 && (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* Empty with search */}
            {!isLoading && products.length === 0 && debouncedSearch && (
              <EmptyState
                icon={<Package className="h-7 w-7" />}
                title="No products found"
                description={`No products match "${debouncedSearch}" in the current backend catalogue.`}
              />
            )}

            {/* Empty category */}
            {!isLoading && products.length === 0 && !debouncedSearch && (
              <EmptyState
                icon={<Package className="h-7 w-7" />}
                title="Catalogue not available yet"
                description="The current backend catalogue does not expose customer-ready product data for browsing."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
