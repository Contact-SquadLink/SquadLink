import { Store, Plus, Package } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { formatPrice } from '@/utils/format';
import { demoProducts } from '@/utils/demo-data';

export function BusinessCatalogPage() {
  const products = demoProducts;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Catalogue & Inventory</h1>
          <p className="text-sm text-gray-500">Manage your products and stock levels.</p>
        </div>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={<Store className="h-7 w-7" />}
          title="No products yet"
          description="Add your first product to start selling on SQUADLINK."
        />
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-gray-50">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-6 w-6 text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{product.name}</p>
                <p className="text-xs text-gray-500 truncate">{product.description}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{formatPrice(product.price)}</span>
                  {product.unit && <span className="text-xs text-gray-400">/ {product.unit}</span>}
                </div>
              </div>
              <Badge variant={product.available ? 'success' : 'error'}>
                {product.available ? 'In Stock' : 'Out of Stock'}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
