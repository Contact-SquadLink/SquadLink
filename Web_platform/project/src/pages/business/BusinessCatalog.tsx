import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Image, Package, Plus, RefreshCw, Save, Search, Sparkles, Store, Trash2, Upload } from 'lucide-react';
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

interface StockDraft {
  quantity: string;
  threshold: string;
}

const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const defaultHours: OperatingHour[] = days.map((dayOfWeek) => ({
  dayOfWeek,
  opensAt: '08:00',
  closesAt: '22:00',
  isClosed: false,
}));

export function BusinessCatalogPage({ mode = 'manage' }: { mode?: 'setup' | 'manage' }) {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [search, setSearch] = useState('');

  // Catalog creation mode: platform template vs custom product
  const [catalogCreationMode, setCatalogCreationMode] = useState<'template' | 'custom'>('template');

  // Custom product creation state
  const [customName, setCustomName] = useState('');
  const [customCategoryId, setCustomCategoryId] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQuantity, setCustomQuantity] = useState('10');
  const [customDescription, setCustomDescription] = useState('');
  const [customImage, setCustomImage] = useState('');
  const [isUploadingCustomImage, setIsUploadingCustomImage] = useState(false);

  // Per-item inventory draft states (fixing the shared quantity bug)
  const [stockDrafts, setStockDrafts] = useState<Record<string, StockDraft>>({});
  const [savingInventoryId, setSavingInventoryId] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<Record<string, CatalogDraft>>({});
  const [hours, setHours] = useState<OperatingHour[]>(defaultHours);
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [hoursSuccessNotice, setHoursSuccessNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [catalogFilter, setCatalogFilter] = useState<'active' | 'paused'>('active');

  const catalogQuery = useQuery({ queryKey: ['business-catalog'], queryFn: businessApi.listCatalog });
  const inventoryQuery = useQuery({ queryKey: ['business-inventory'], queryFn: businessApi.listInventory });
  const hoursQuery = useQuery({ queryKey: ['business-operating-hours'], queryFn: businessApi.getOperatingHours });
  const productsQuery = useQuery({
    queryKey: ['platform-product-templates', search],
    queryFn: () => catalogApi.listTemplates(search),
  });
  const categoriesQuery = useQuery({
    queryKey: ['catalog-categories'],
    queryFn: catalogApi.listCategories,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['business-catalog'] });
    void queryClient.invalidateQueries({ queryKey: ['business-inventory'] });
    void queryClient.invalidateQueries({ queryKey: ['platform-product-templates'] });
    void queryClient.invalidateQueries({ queryKey: ['catalog-categories'] });
  };

  const catalog = catalogQuery.data?.data ?? [];
  const inventory = inventoryQuery.data?.data ?? [];
  const templates = productsQuery.data?.data ?? [];
  const categories = categoriesQuery.data?.data ?? [];

  useEffect(() => {
    if (hoursQuery.data?.data?.length === 7) {
      setHours(
        hoursQuery.data.data.map((h) => ({
          ...h,
          opensAt: h.opensAt ? h.opensAt.slice(0, 5) : '08:00',
          closesAt: h.closesAt ? h.closesAt.slice(0, 5) : '22:00',
          isClosed: Boolean(h.isClosed),
        }))
      );
    }
  }, [hoursQuery.data]);

  const availableProducts = templates.filter(
    (product) => !catalog.some((item) => item.productId === product.id)
  );
  const selectedProduct = templates.find((product) => product.id === selectedProductId);
  const visibleCatalog = catalog.filter((item) =>
    catalogFilter === 'active'
      ? item.isAvailable && item.productIsActive
      : !item.isAvailable || !item.productIsActive
  );

  const addMutation = useMutation({
    mutationFn: () => {
      let img = imageUrl.trim() || null;
      if (img && !img.startsWith('http://') && !img.startsWith('https://') && !img.startsWith('/') && !img.startsWith('data:')) {
        img = `https://${img}`;
      }
      return businessApi.addCatalogItem({
        productId: selectedProductId,
        priceAmount: Math.trunc(Number(price)),
        description: description.trim() || null,
        imageUrl: img,
        currency: 'NGN',
        isAvailable: true,
      });
    },
    onSuccess: () => {
      setSelectedProductId('');
      setPrice('');
      setDescription('');
      setImageUrl('');
      setError(null);
      setSuccessNotice('Product added to catalogue with default stock.');
      refresh();
    },
    onError: (caughtError) =>
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to add product.'),
  });

  const createCustomMutation = useMutation({
    mutationFn: () => {
      let img = customImage.trim() || null;
      if (img && !img.startsWith('http://') && !img.startsWith('https://') && !img.startsWith('/') && !img.startsWith('data:')) {
        img = `https://${img}`;
      }
      return businessApi.createCustomProduct({
        name: customName.trim(),
        categoryId: customCategoryId,
        priceAmount: Math.trunc(Number(customPrice)),
        quantityOnHand: Math.max(0, Math.trunc(Number(customQuantity || 0))),
        description: customDescription.trim() || null,
        imageUrl: img,
        currency: 'NGN',
        isAvailable: true,
      });
    },
    onSuccess: (res) => {
      setCustomName('');
      setCustomPrice('');
      setCustomQuantity('10');
      setCustomDescription('');
      setCustomImage('');
      setError(null);
      setSuccessNotice(`Custom product "${res.data?.productName || 'New product'}" created and added to your catalogue!`);
      refresh();
    },
    onError: (caughtError) =>
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to create custom product.'),
  });

  const handleCustomImageUpload = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file must be under 5MB.');
      return;
    }
    setIsUploadingCustomImage(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      setCustomImage(e.target?.result as string);
      setIsUploadingCustomImage(false);
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
      setIsUploadingCustomImage(false);
    };
    reader.readAsDataURL(file);
  };

  const updateMutation = useMutation({
    mutationFn: ({ item, draft }: { item: BusinessCatalogItem; draft: CatalogDraft }) => {
      let img = draft.imageUrl.trim() || null;
      if (img && !img.startsWith('http://') && !img.startsWith('https://') && !img.startsWith('/') && !img.startsWith('data:')) {
        img = `https://${img}`;
      }
      return businessApi.updateCatalogItem(item.id, {
        priceAmount: Math.trunc(Number(draft.price)),
        description: draft.description.trim() || null,
        imageUrl: img,
      });
    },
    onSuccess: () => {
      setError(null);
      setSuccessNotice('Product details updated successfully.');
      refresh();
    },
    onError: (caughtError) =>
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update product.'),
  });

  const availabilityMutation = useMutation({
    mutationFn: ({ item, isAvailable }: { item: BusinessCatalogItem; isAvailable: boolean }) =>
      businessApi.updateCatalogItem(item.id, { isAvailable }),
    onSuccess: () => {
      setSuccessNotice('Product availability updated.');
      refresh();
    },
    onError: (caughtError) =>
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update catalog availability.'),
  });

  const deleteMutation = useMutation({
    mutationFn: businessApi.deleteCatalogItem,
    onSuccess: () => {
      setSuccessNotice('Product removed from catalogue.');
      refresh();
    },
    onError: (caughtError) =>
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to remove catalog item.'),
  });

  // Per-item inventory draft getters and setters
  const getStockDraft = (itemId: string, stock?: InventoryItem): StockDraft => {
    if (stockDrafts[itemId]) {
      return stockDrafts[itemId];
    }
    return {
      quantity: stock ? String(stock.quantityOnHand) : '',
      threshold: stock ? String(stock.lowStockThreshold) : '5',
    };
  };

  const setStockDraft = (
    itemId: string,
    changes: Partial<StockDraft>,
    stock?: InventoryItem
  ) => {
    const current = getStockDraft(itemId, stock);
    setStockDrafts((prev) => ({
      ...prev,
      [itemId]: { ...current, ...changes },
    }));
  };

  const saveInventory = async (item: BusinessCatalogItem, stock?: InventoryItem) => {
    setError(null);
    setSuccessNotice(null);
    setSavingInventoryId(item.id);
    const draft = getStockDraft(item.id, stock);
    try {
      const payload = {
        businessProductId: item.id,
        quantityOnHand: Math.max(0, Math.trunc(Number(draft.quantity || 0))),
        lowStockThreshold: Math.max(0, Math.trunc(Number(draft.threshold || 0))),
      };
      if (stock) {
        await businessApi.updateInventory(stock.id, payload);
      } else {
        await businessApi.createInventory(payload);
      }
      setSuccessNotice(`Inventory for "${item.productName}" updated to ${payload.quantityOnHand} units.`);
      refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save inventory.');
    } finally {
      setSavingInventoryId(null);
    }
  };

  const saveHours = async () => {
    setError(null);
    setHoursSuccessNotice(null);
    setIsSavingHours(true);
    try {
      await businessApi.updateOperatingHours(hours);
      setHoursSuccessNotice('Operating hours saved successfully! Your store schedule is active.');
      refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save operating hours.');
    } finally {
      setIsSavingHours(false);
    }
  };

  const getDraft = (item: BusinessCatalogItem): CatalogDraft =>
    drafts[item.id] ?? {
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
          <h1 className="font-display text-2xl font-bold text-gray-900">
            {mode === 'setup' ? 'Business setup' : 'Active catalogue'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {mode === 'setup'
              ? 'Set your weekly business hours, enroll platform templates, or create custom products.'
              : 'Manage the products currently offered by your business.'}
          </p>
        </div>
        {mode === 'setup' ? (
          <Link
            to="/business/catalog"
            className="inline-flex h-10 items-center rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Manage catalogue
          </Link>
        ) : (
          <Link
            to="/business/catalog/setup"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-600 px-3 text-sm font-semibold text-white shadow-xs hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add / Build Products
          </Link>
        )}
        <button
          type="button"
          onClick={refresh}
          title="Refresh"
          aria-label="Refresh"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {successNotice && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          {successNotice}
        </div>
      )}

      {mode === 'setup' && (
        <>
          <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-gray-900">Weekly operating hours</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Save your hours before products can appear in the customer catalogue.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void saveHours()}
                disabled={isSavingHours || hoursQuery.isLoading}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Save className="h-4 w-4" />
                {isSavingHours ? 'Saving hours...' : 'Save hours'}
              </button>
            </div>

            {hoursSuccessNotice && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                {hoursSuccessNotice}
              </div>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {hours.map((hour, index) => (
                <div key={hour.dayOfWeek} className="rounded-xl border border-amber-200 bg-white p-3 shadow-xs">
                  <p className="text-xs font-bold text-gray-800">{hour.dayOfWeek}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="time"
                      value={hour.opensAt ?? '08:00'}
                      disabled={hour.isClosed}
                      onChange={(event) =>
                        setHours((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, opensAt: event.target.value } : entry
                          )
                        )
                      }
                      className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-xs disabled:bg-gray-100 disabled:text-gray-400"
                    />
                    <span className="text-xs text-gray-400">to</span>
                    <input
                      type="time"
                      value={hour.closesAt ?? '22:00'}
                      disabled={hour.isClosed}
                      onChange={(event) =>
                        setHours((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, closesAt: event.target.value } : entry
                          )
                        )
                      }
                      className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-xs disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                  <label className="mt-2.5 flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hour.isClosed}
                      onChange={(event) =>
                        setHours((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index
                              ? {
                                  ...entry,
                                  isClosed: event.target.checked,
                                  opensAt: event.target.checked ? null : entry.opensAt ?? '08:00',
                                  closesAt: event.target.checked ? null : entry.closesAt ?? '22:00',
                                }
                              : entry
                          )
                        )
                      }
                      className="rounded text-primary-600 focus:ring-primary-500"
                    />
                    Closed all day
                  </label>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-gray-900">Add products to your catalogue</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Choose from prebuilt platform templates or build your own custom products from scratch.
                </p>
              </div>
              <div className="flex rounded-xl bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setCatalogCreationMode('template')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    catalogCreationMode === 'template'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Package className="h-3.5 w-3.5" />
                  Platform Templates
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogCreationMode('custom')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    catalogCreationMode === 'custom'
                      ? 'bg-white text-primary-600 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary-600" />
                  Create Custom Product
                </button>
              </div>
            </div>

            {catalogCreationMode === 'template' ? (
              <div className="mt-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search food, drinks, or category"
                      className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    placeholder="Price (NGN)"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                  <button
                    type="button"
                    disabled={
                      !selectedProductId ||
                      !price ||
                      !Number.isFinite(Number(price)) ||
                      addMutation.isPending
                    }
                    onClick={() => addMutation.mutate()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    {addMutation.isPending ? 'Adding...' : 'Save to catalogue'}
                  </button>
                </div>
                <select
                  value={selectedProductId}
                  onChange={(event) => {
                    const product = templates.find((entry) => entry.id === event.target.value);
                    setSelectedProductId(event.target.value);
                    setPrice(product?.suggestedPriceAmount ? String(product.suggestedPriceAmount) : '');
                    setDescription(product?.description ?? '');
                    setImageUrl(product?.imageUrl ?? '');
                  }}
                  className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Select a platform template</option>
                  {availableProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.category} - {product.name}
                    </option>
                  ))}
                </select>
                {selectedProduct && (
                  <div className="mt-3 grid gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-[100px_1fr]">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={`${selectedProduct.name} preview`}
                        className="h-24 w-24 rounded-lg object-cover border border-gray-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=300';
                        }}
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-gray-200 text-gray-500">
                        <Image className="h-6 w-6" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="font-bold text-gray-900">{selectedProduct.name}</p>
                      <p className="text-xs text-gray-600">{selectedProduct.description}</p>
                      <input
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Custom business description override"
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-primary-500 outline-none"
                      />
                      <input
                        value={imageUrl}
                        onChange={(event) => setImageUrl(event.target.value)}
                        placeholder="Image URL override (e.g. https://...)"
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-primary-500 outline-none"
                      />
                    </div>
                  </div>
                )}
                {availableProducts.length === 0 && (
                  <p className="mt-3 text-xs text-gray-500">No matching platform templates are available.</p>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Special Grilled Fish"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={customCategoryId}
                      onChange={(e) => setCustomCategoryId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      <option value="">Select a Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Unit Price (NGN) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      placeholder="e.g. 3500"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Initial Quantity on Hand <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={customQuantity}
                      onChange={(e) => setCustomQuantity(e.target.value)}
                      placeholder="e.g. 20"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Product Description</label>
                  <textarea
                    rows={2}
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Provide delicious details, ingredients, or sizing..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                  <label className="block text-xs font-bold text-gray-800 mb-2">Product Image</label>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white">
                      {customImage ? (
                        <img
                          src={customImage}
                          alt="Custom preview"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=300';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <Image className="h-6 w-6 mb-1" />
                          <span className="text-[10px]">No image</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 w-full space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-xs">
                          <Upload className="h-3.5 w-3.5" />
                          {isUploadingCustomImage ? 'Reading...' : 'Upload Image File'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleCustomImageUpload(file);
                            }}
                          />
                        </label>
                        <span className="text-xs text-gray-400">or paste URL below</span>
                      </div>
                      <input
                        type="url"
                        value={customImage}
                        onChange={(e) => setCustomImage(e.target.value)}
                        placeholder="Image URL (e.g. https://...)"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs focus:border-primary-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={
                      !customName.trim() ||
                      !customCategoryId ||
                      !customPrice ||
                      Number(customPrice) <= 0 ||
                      createCustomMutation.isPending
                    }
                    onClick={() => createCustomMutation.mutate()}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4" />
                    {createCustomMutation.isPending ? 'Creating Product...' : 'Create & Add to Catalogue'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {mode === 'manage' && (
        <>
          <div className="mb-4 flex gap-2 border-b border-gray-200" role="tablist" aria-label="Catalog status">
            <button
              type="button"
              role="tab"
              aria-selected={catalogFilter === 'active'}
              onClick={() => setCatalogFilter('active')}
              className={`border-b-2 px-3 py-2 text-sm font-semibold transition-all ${
                catalogFilter === 'active'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Active ({catalog.filter((item) => item.isAvailable && item.productIsActive).length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={catalogFilter === 'paused'}
              onClick={() => setCatalogFilter('paused')}
              className={`border-b-2 px-3 py-2 text-sm font-semibold transition-all ${
                catalogFilter === 'paused'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Paused ({catalog.filter((item) => !item.isAvailable || !item.productIsActive).length})
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-600">Loading catalogue and inventory...</p>
          ) : catalog.length === 0 ? (
            <EmptyState
              icon={<Store className="h-7 w-7" />}
              title="No products enrolled"
              description="Enroll a platform template to begin configuring your business catalogue."
            />
          ) : visibleCatalog.length === 0 ? (
            <EmptyState
              icon={<Store className="h-7 w-7" />}
              title={`No ${catalogFilter} products`}
              description={
                catalogFilter === 'active'
                  ? 'Activate an enrolled product to show it in your customer catalogue.'
                  : 'Products you pause will appear here.'
              }
            />
          ) : (
            <div className="space-y-4">
              {visibleCatalog.map((item) => {
                const stock = inventory.find((entry) => entry.businessProductId === item.id);
                const draft = getDraft(item);
                const itemStockDraft = getStockDraft(item.id, stock);

                return (
                  <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Package className="mt-1 h-5 w-5 text-primary-600 shrink-0" />
                        <div>
                          <p className="font-bold text-gray-900">{item.productName}</p>
                          <p className="text-xs text-gray-500">{item.categoryName}</p>
                        </div>
                      </div>
                      <Badge variant={item.isAvailable ? 'success' : 'error'}>
                        {item.isAvailable ? 'Available' : 'Unavailable'}
                      </Badge>
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row items-start gap-4">
                      {draft.imageUrl ? (
                        <img
                          src={draft.imageUrl}
                          alt={`${item.productName} preview`}
                          className="h-20 w-20 rounded-xl object-cover border border-gray-200 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=300';
                          }}
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-100 text-gray-400 shrink-0">
                          <Image className="h-6 w-6" />
                        </div>
                      )}

                      <div className="grid flex-1 gap-3 sm:grid-cols-2 w-full">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Price (NGN)</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={draft.price}
                            onChange={(event) => setDraft(item, { price: event.target.value })}
                            placeholder="Price (NGN)"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Image URL</label>
                          <input
                            value={draft.imageUrl}
                            onChange={(event) => setDraft(item, { imageUrl: event.target.value })}
                            placeholder="Image URL (e.g. https://...)"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 outline-none"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                          <textarea
                            value={draft.description}
                            onChange={(event) => setDraft(item, { description: event.target.value })}
                            placeholder="Product description override"
                            rows={2}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 outline-none"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2 sm:col-span-2 pt-1">
                          <button
                            type="button"
                            disabled={updateMutation.isPending || !Number.isFinite(Number(draft.price))}
                            onClick={() => updateMutation.mutate({ item, draft })}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-700 disabled:opacity-50 transition-all cursor-pointer"
                          >
                            <Save className="h-3.5 w-3.5" /> Save product
                          </button>
                          <button
                            type="button"
                            disabled={availabilityMutation.isPending}
                            onClick={() => availabilityMutation.mutate({ item, isAvailable: !item.isAvailable })}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            {item.isAvailable ? 'Pause listing' : 'Activate listing'}
                          </button>
                          <button
                            type="button"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Remove ${item.productName} from your catalog?`)) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Stock Management Box - Isolated per item */}
                    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
                      <p className="text-xs font-bold text-gray-700 mb-2">Stock Inventory Management</p>
                      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Quantity on Hand</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={itemStockDraft.quantity}
                            onChange={(event) =>
                              setStockDraft(item.id, { quantity: event.target.value }, stock)
                            }
                            placeholder={stock ? `Current: ${stock.quantityOnHand}` : 'Quantity on hand'}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs focus:border-primary-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Low-stock Alert Threshold</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={itemStockDraft.threshold}
                            onChange={(event) =>
                              setStockDraft(item.id, { threshold: event.target.value }, stock)
                            }
                            placeholder={stock ? `Low: ${stock.lowStockThreshold}` : 'Low-stock threshold'}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs focus:border-primary-500 outline-none"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            disabled={savingInventoryId === item.id || !itemStockDraft.quantity}
                            onClick={() => void saveInventory(item, stock)}
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-primary-300 bg-white px-3.5 text-xs font-bold text-primary-700 hover:bg-primary-50 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                          >
                            <Save className="h-3.5 w-3.5" />
                            {savingInventoryId === item.id ? 'Saving...' : 'Update stock'}
                          </button>
                        </div>
                      </div>

                      <p className="mt-2 text-[11px] text-gray-500">
                        Current price: <strong className="text-gray-800">{formatPrice(item.priceAmount)}</strong>
                        {stock
                          ? ` · Available in stock: ${stock.quantityAvailable} · Reserved: ${stock.quantityReserved}`
                          : ' · No inventory configured yet'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
