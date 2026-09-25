import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image, Package, Plus, RefreshCw, Save, Search, Store, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { businessApi, type BusinessCatalogItem, type InventoryItem, type OperatingHour } from '@/api/business';
import { catalogApi } from '@/api/catalog';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { formatPrice } from '@/utils/format';

interface CatalogDraft {
  price: string;
  description: string;
  imageUrl: string;
}

const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const defaultHours: OperatingHour[] = days.map((dayOfWeek) => ({ dayOfWeek, opensAt: '08:00', closesAt: '22:00', isClosed: false }));

export function BusinessCatalogPage({ mode = 'manage' }: { mode?: 'setup' | 'manage' }) {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [search, setSearch] = useState('');
  const [quantity, setQuantity] = useState('');
  const [threshold, setThreshold] = useState('0');
  const [drafts, setDrafts] = useState<Record<string, CatalogDraft>>({});
  const [hours, setHours] = useState<OperatingHour[]>(defaultHours);
  const [error, setError] = useState<string | null>(null);
  const [catalogFilter, setCatalogFilter] = useState<'active' | 'paused'>('active');

  const catalogQuery = useQuery({ queryKey: ['business-catalog'], queryFn: businessApi.listCatalog });
  const inventoryQuery = useQuery({ queryKey: ['business-inventory'], queryFn: businessApi.listInventory });
  const hoursQuery = useQuery({ queryKey: ['business-operating-hours'], queryFn: businessApi.getOperatingHours });
  const productsQuery = useQuery({
    queryKey: ['platform-product-templates', search],
    queryFn: () => catalogApi.listTemplates(search),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['business-catalog'] });
    void queryClient.invalidateQueries({ queryKey: ['business-inventory'] });
    void queryClient.invalidateQueries({ queryKey: ['platform-product-templates'] });
  };

  const catalog = catalogQuery.data?.data ?? [];
  const inventory = inventoryQuery.data?.data ?? [];
  const templates = productsQuery.data?.data ?? [];
  useEffect(() => {
    if (hoursQuery.data?.data?.length === 7) setHours(hoursQuery.data.data);
  }, [hoursQuery.data]);
  const availableProducts = templates.filter((product) => !catalog.some((item) => item.productId === product.id));
  const selectedProduct = templates.find((product) => product.id === selectedProductId);
  const visibleCatalog = catalog.filter((item) => catalogFilter === 'active'
    ? item.isAvailable && item.productIsActive
    : !item.isAvailable || !item.productIsActive);

  const addMutation = useMutation({
    mutationFn: () => businessApi.addCatalogItem({
      productId: selectedProductId,
      priceAmount: Math.trunc(Number(price)),
      description: description.trim() || null,
      imageUrl: imageUrl.trim() || null,
      currency: 'NGN',
      isAvailable: true,
    }),
    onSuccess: () => {
      setSelectedProductId('');
      setPrice('');
      setDescription('');
      setImageUrl('');
      setError(null);
      refresh();
    },
    onError: (caughtError) => setError(caughtError instanceof Error ? caughtError.message : 'Unable to add product.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ item, draft }: { item: BusinessCatalogItem; draft: CatalogDraft }) => businessApi.updateCatalogItem(item.id, {
      priceAmount: Math.trunc(Number(draft.price)),
      description: draft.description.trim() || null,
      imageUrl: draft.imageUrl.trim() || null,
    }),
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: (caughtError) => setError(caughtError instanceof Error ? caughtError.message : 'Unable to update product.'),
  });

  const availabilityMutation = useMutation({
    mutationFn: ({ item, isAvailable }: { item: BusinessCatalogItem; isAvailable: boolean }) =>
      businessApi.updateCatalogItem(item.id, { isAvailable }),
    onSuccess: refresh,
    onError: (caughtError) => setError(caughtError instanceof Error ? caughtError.message : 'Unable to update catalog availability.'),
  });

  const deleteMutation = useMutation({
    mutationFn: businessApi.deleteCatalogItem,
    onSuccess: refresh,
    onError: (caughtError) => setError(caughtError instanceof Error ? caughtError.message : 'Unable to remove catalog item.'),
  });

  const saveInventory = async (item: BusinessCatalogItem, stock?: InventoryItem) => {
    setError(null);
    try {
      const payload = {
        businessProductId: item.id,
        quantityOnHand: Math.max(0, Math.trunc(Number(quantity))),
        lowStockThreshold: Math.max(0, Math.trunc(Number(threshold))),
      };
      if (stock) await businessApi.updateInventory(stock.id, payload);
      else await businessApi.createInventory(payload);
      setQuantity('');
      setThreshold('0');
      refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save inventory.');
    }
  };

  const saveHours = async () => {
    setError(null);
    try {
      await businessApi.updateOperatingHours(hours);
      refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save operating hours.');
    }
  };

  const getDraft = (item: BusinessCatalogItem): CatalogDraft => drafts[item.id] ?? {
    price: String(item.priceAmount),
    description: item.productDescription ?? '',
    imageUrl: item.imageUrl ?? '',
  };

  const setDraft = (item: BusinessCatalogItem, changes: Partial<CatalogDraft>) => {
    setDrafts((current) => ({ ...current, [item.id]: { ...getDraft(item), ...changes } }));
  };

  const loading = catalogQuery.isLoading || inventoryQuery.isLoading;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">{mode === 'setup' ? 'Business setup' : 'Active catalogue'}</h1>
          <p className="mt-1 text-sm text-gray-500">{mode === 'setup' ? 'Set your weekly business hours and enroll products from the platform templates.' : 'Manage the products currently offered by your business.'}</p>
        </div>
        {mode === 'setup' ? <Link to="/business/catalog" className="inline-flex h-10 items-center rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">Manage catalogue</Link> : <Link to="/business/catalog/setup" className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"><Plus className="h-4 w-4" /> Enroll products</Link>}
        <button type="button" onClick={refresh} title="Refresh" aria-label="Refresh" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {mode === 'setup' && <><section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-gray-900">Weekly operating hours</h2>
            <p className="mt-1 text-sm text-gray-600">Save your hours before products can appear in the customer catalogue.</p>
          </div>
          <button type="button" onClick={() => void saveHours()} disabled={hoursQuery.isLoading} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" /> Save hours</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {hours.map((hour, index) => (
            <div key={hour.dayOfWeek} className="rounded-xl border border-amber-200 bg-white p-3">
              <p className="text-xs font-semibold text-gray-700">{hour.dayOfWeek}</p>
              <div className="mt-2 flex items-center gap-2">
                <input type="time" value={hour.opensAt ?? ''} disabled={hour.isClosed} onChange={(event) => setHours((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, opensAt: event.target.value } : entry))} className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-xs" />
                <input type="time" value={hour.closesAt ?? ''} disabled={hour.isClosed} onChange={(event) => setHours((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, closesAt: event.target.value } : entry))} className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-xs" />
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={hour.isClosed} onChange={(event) => setHours((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, isClosed: event.target.checked, opensAt: event.target.checked ? null : entry.opensAt ?? '08:00', closesAt: event.target.checked ? null : entry.closesAt ?? '22:00' } : entry))} /> Closed</label>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-bold text-gray-900">Add platform template</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search food, drinks, or category" className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm" />
          </label>
          <input type="number" min="0" step="1" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Price (NGN)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <button type="button" disabled={!selectedProductId || !price || !Number.isFinite(Number(price)) || addMutation.isPending} onClick={() => addMutation.mutate()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <Plus className="h-4 w-4" /> Save to catalogue
          </button>
        </div>
        <select value={selectedProductId} onChange={(event) => {
          const product = templates.find((entry) => entry.id === event.target.value);
          setSelectedProductId(event.target.value);
          setPrice(product?.suggestedPriceAmount ? String(product.suggestedPriceAmount) : '');
          setDescription(product?.description ?? '');
          setImageUrl(product?.imageUrl ?? '');
        }} className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">Select a platform template</option>
          {availableProducts.map((product) => <option key={product.id} value={product.id}>{product.category} - {product.name}</option>)}
        </select>
        {selectedProduct && <div className="mt-3 grid gap-3 rounded-xl bg-gray-50 p-3 sm:grid-cols-[80px_1fr]">
          {imageUrl ? <img src={imageUrl} alt={`${selectedProduct.name} preview`} className="h-20 w-20 rounded-lg object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-200"><Image className="h-5 w-5 text-gray-500" /></div>}
          <div><p className="font-semibold text-gray-900">{selectedProduct.name}</p><p className="mt-1 text-sm text-gray-600">{selectedProduct.description}</p><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Business description override" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /><input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Image URL override" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
        </div>}
        {availableProducts.length === 0 && <p className="mt-3 text-xs text-gray-500">No matching platform templates are available.</p>}
      </section></>}

      {mode === 'manage' && <>
      <div className="mb-4 flex gap-2 border-b border-gray-200" role="tablist" aria-label="Catalog status">
        <button type="button" role="tab" aria-selected={catalogFilter === 'active'} onClick={() => setCatalogFilter('active')} className={`border-b-2 px-3 py-2 text-sm font-semibold ${catalogFilter === 'active' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500'}`}>Active ({catalog.filter((item) => item.isAvailable && item.productIsActive).length})</button>
        <button type="button" role="tab" aria-selected={catalogFilter === 'paused'} onClick={() => setCatalogFilter('paused')} className={`border-b-2 px-3 py-2 text-sm font-semibold ${catalogFilter === 'paused' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500'}`}>Paused ({catalog.filter((item) => !item.isAvailable || !item.productIsActive).length})</button>
      </div>
      {loading ? <p className="text-sm text-gray-600">Loading catalogue and inventory...</p> : catalog.length === 0 ? <EmptyState icon={<Store className="h-7 w-7" />} title="No products enrolled" description="Enroll a platform template to begin configuring your business catalogue." /> : visibleCatalog.length === 0 ? <EmptyState icon={<Store className="h-7 w-7" />} title={`No ${catalogFilter} products`} description={catalogFilter === 'active' ? 'Activate an enrolled product to show it in your customer catalogue.' : 'Products you pause will appear here.'} /> : <div className="space-y-3">
        {visibleCatalog.map((item) => {
          const stock = inventory.find((entry) => entry.businessProductId === item.id);
          const draft = getDraft(item);
          return <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><Package className="mt-1 h-5 w-5 text-primary-600" /><div><p className="font-semibold text-gray-900">{item.productName}</p><p className="text-xs text-gray-500">{item.categoryName}</p></div></div><Badge variant={item.isAvailable ? 'success' : 'error'}>{item.isAvailable ? 'Available' : 'Unavailable'}</Badge></div>
            <div className="mt-4 flex items-start gap-3">{draft.imageUrl ? <img src={draft.imageUrl} alt={`${item.productName} preview`} className="h-16 w-16 rounded object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded bg-gray-100"><Image className="h-5 w-5 text-gray-500" /></div>}<div className="grid flex-1 gap-3 sm:grid-cols-2"><input type="number" min="0" step="1" value={draft.price} onChange={(event) => setDraft(item, { price: event.target.value })} placeholder="Price (NGN)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" /><input value={draft.imageUrl} onChange={(event) => setDraft(item, { imageUrl: event.target.value })} placeholder="Image URL" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" /><textarea value={draft.description} onChange={(event) => setDraft(item, { description: event.target.value })} placeholder="Product description" rows={3} className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2" /><div className="flex flex-wrap gap-2 sm:col-span-2"><button type="button" disabled={updateMutation.isPending || !Number.isFinite(Number(draft.price))} onClick={() => updateMutation.mutate({ item, draft })} className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-200 px-4 py-2 text-sm font-semibold text-primary-700 disabled:opacity-50"><Save className="h-4 w-4" /> Save product</button><button type="button" disabled={availabilityMutation.isPending} onClick={() => availabilityMutation.mutate({ item, isAvailable: !item.isAvailable })} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">{item.isAvailable ? 'Pause listing' : 'Activate listing'}</button><button type="button" disabled={deleteMutation.isPending} onClick={() => { if (window.confirm(`Remove ${item.productName} from your catalog?`)) deleteMutation.mutate(item.id); }} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Remove</button></div></div></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input type="number" min="0" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder={stock ? `Stock: ${stock.quantityOnHand}` : 'Quantity on hand'} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" /><input type="number" min="0" step="1" value={threshold} onChange={(event) => setThreshold(event.target.value)} placeholder={stock ? `Low stock: ${stock.lowStockThreshold}` : 'Low-stock threshold'} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" /><button type="button" disabled={!quantity} onClick={() => void saveInventory(item, stock)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-200 px-4 py-2 text-sm font-semibold text-primary-700 disabled:opacity-50"><Save className="h-4 w-4" /> Save stock</button></div>
            <p className="mt-2 text-xs text-gray-500">Current price: {formatPrice(item.priceAmount)}{stock ? ` · Available stock: ${stock.quantityAvailable} · Reserved: ${stock.quantityReserved}` : ''}</p>
          </div>;
        })}
      </div>}
        </>}
    </div>
  );
}
