import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, RefreshCw, Save, Store } from 'lucide-react';
import { businessApi, type BusinessCatalogItem, type InventoryItem } from '@/api/business';
import { catalogApi } from '@/api/catalog';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { formatPrice } from '@/utils/format';

export function BusinessCatalogPage() {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [threshold, setThreshold] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const catalogQuery = useQuery({ queryKey: ['business-catalog'], queryFn: businessApi.listCatalog });
  const inventoryQuery = useQuery({ queryKey: ['business-inventory'], queryFn: businessApi.listInventory });
  const productsQuery = useQuery({ queryKey: ['platform-product-templates'], queryFn: catalogApi.listTemplates });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['business-catalog'] });
    void queryClient.invalidateQueries({ queryKey: ['business-inventory'] });
  };
  const addMutation = useMutation({
    mutationFn: () => businessApi.addCatalogItem({ productId: selectedProductId, priceAmount: Math.trunc(Number(price)), currency: 'NGN', isAvailable: true }),
    onSuccess: () => { setSelectedProductId(''); setPrice(''); setError(null); refresh(); },
    onError: (caughtError) => setError(caughtError instanceof Error ? caughtError.message : 'Unable to add product.'),
  });
  const saveInventory = async (item: BusinessCatalogItem, stock?: InventoryItem) => {
    setError(null);
    try {
      const payload = { businessProductId: item.id, quantityOnHand: Math.max(0, Math.trunc(Number(quantity))), lowStockThreshold: Math.max(0, Math.trunc(Number(threshold))) };
      if (stock) await businessApi.updateInventory(stock.id, payload);
      else await businessApi.createInventory(payload);
      setQuantity(''); setThreshold('0'); refresh();
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : 'Unable to save inventory.'); }
  };
  const catalog = catalogQuery.data?.data ?? [];
  const inventory = inventoryQuery.data?.data ?? [];
  const availableProducts = (productsQuery.data?.data ?? []).filter((product) => !catalog.some((item) => item.productId === product.id));
  const loading = catalogQuery.isLoading || inventoryQuery.isLoading;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-start justify-between gap-4"><div><h1 className="font-display text-2xl font-bold text-gray-900">Catalogue & Inventory</h1><p className="mt-1 text-sm text-gray-500">Manage your enrolled platform products and stock levels.</p></div><button type="button" onClick={refresh} className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"><RefreshCw className="h-4 w-4" /> Refresh</button></div>
      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><h2 className="font-display text-lg font-bold text-gray-900">Add platform product</h2><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]"><select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="">Select a platform product</option>{availableProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><input type="number" min="0" step="1" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Price (NGN)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" /><button type="button" disabled={!selectedProductId || !price || addMutation.isPending} onClick={() => addMutation.mutate()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" /> Add</button></div>{availableProducts.length === 0 && <p className="mt-3 text-xs text-gray-500">All currently available platform products are already enrolled.</p>}</section>
      {loading ? <p className="text-sm text-gray-600">Loading catalogue and inventory...</p> : catalog.length === 0 ? <EmptyState icon={<Store className="h-7 w-7" />} title="No products enrolled" description="Add a platform product above to begin configuring your business catalogue." /> : <div className="space-y-3">{catalog.map((item) => { const stock = inventory.find((entry) => entry.businessProductId === item.id); return <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><Package className="mt-1 h-5 w-5 text-primary-600" /><div><p className="font-semibold text-gray-900">{item.productName}</p><p className="text-xs text-gray-500">{item.categoryName} · {formatPrice(item.priceAmount)}</p></div></div><Badge variant={item.isAvailable ? 'success' : 'error'}>{item.isAvailable ? 'Available' : 'Unavailable'}</Badge></div><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input type="number" min="0" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder={stock ? `Stock: ${stock.quantityOnHand}` : 'Quantity on hand'} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" /><input type="number" min="0" step="1" value={threshold} onChange={(event) => setThreshold(event.target.value)} placeholder={stock ? `Low stock: ${stock.lowStockThreshold}` : 'Low-stock threshold'} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" /><button type="button" disabled={!quantity} onClick={() => void saveInventory(item, stock)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-200 px-4 py-2 text-sm font-semibold text-primary-700 disabled:opacity-50"><Save className="h-4 w-4" /> Save stock</button></div>{stock && <p className="mt-2 text-xs text-gray-500">Available stock: {stock.quantityAvailable} · Reserved: {stock.quantityReserved}</p>}</div>; })}</div>}
    </div>
  );
}
