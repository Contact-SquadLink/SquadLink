import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { CartItem, Product } from '@/types';
import { cartApi } from '@/api/cart';
import { ApiRequestError } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';

const GUEST_CART_KEY = 'squadlink_guest_cart';

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (product: Product, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string) => number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function loadGuestCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CartItem[];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadGuestCart);
  const { user } = useAuth();
  const syncedUserIdRef = useRef<string | null>(null);
  const cartOperationRef = useRef(0);

  const mergeServerCart = useCallback((serverItems: Array<{
    id?: string;
    productId: string;
    productName?: string;
    name?: string;
    productPriceAmount?: number | null;
    productCurrency?: string | null;
    productImageUrl?: string | null;
    quantity: number;
  }>) => {
    if (!serverItems.length) {
      setItems([]);
      localStorage.removeItem(GUEST_CART_KEY);
      return;
    }

    setItems((currentItems) => {
      const currentById = new Map(currentItems.map((item) => [item.productId, item]));

      return serverItems.map((serverItem) => {
        const currentItem = currentById.get(serverItem.productId);
        return {
          productId: serverItem.productId,
          name: serverItem.productName ?? serverItem.name ?? currentItem?.name ?? 'Product',
          price: serverItem.productPriceAmount ?? currentItem?.price ?? 0,
          imageUrl: serverItem.productImageUrl ?? currentItem?.imageUrl,
          unit: currentItem?.unit,
          quantity: serverItem.quantity,
          serverItemId: serverItem.id ?? currentItem?.serverItemId,
        };
      });
    });
  }, []);

  useEffect(() => {
    if (!user || (user.role !== 'CUSTOMER' && user.role !== 'BUSINESS_USER')) {
      localStorage.removeItem(GUEST_CART_KEY);
      syncedUserIdRef.current = null;
      return;
    }

    if (syncedUserIdRef.current === user.id) {
      return;
    }

    let active = true;

    const syncCart = async () => {
      const syncOperation = cartOperationRef.current;
      const guestItems = loadGuestCart();

      try {
        let response = await cartApi.get();

        for (const item of guestItems) {
          try {
            response = await cartApi.addItem({
              productId: item.productId,
              quantity: item.quantity,
            });
          } catch {
            // Ignore stale local products and continue transferring valid items.
          }
        }

        if (active && syncOperation === cartOperationRef.current) {
          mergeServerCart(response.data.items);
          localStorage.removeItem(GUEST_CART_KEY);
          syncedUserIdRef.current = user.id;
        }
      } catch {
        syncedUserIdRef.current = user.id;
      }
    };

    void syncCart();

    return () => {
      active = false;
    };
  }, [mergeServerCart, user]);

  useEffect(() => {
    if (items.length === 0) {
      localStorage.removeItem(GUEST_CART_KEY);
      return;
    }

    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product: Product, quantity: number) => {
    cartOperationRef.current += 1;
    const operation = cartOperationRef.current;
    const previousItems = items;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          unit: product.unit,
          quantity,
        },
      ];
    });

    if (!user || (user.role !== 'CUSTOMER' && user.role !== 'BUSINESS_USER')) {
      return;
    }

    void cartApi.addItem({ productId: product.id, quantity }).then((response) => {
      if (operation === cartOperationRef.current) {
        mergeServerCart(response.data.items);
      }
    }).catch(() => {
      if (operation === cartOperationRef.current) {
        setItems(previousItems);
      }
    });
  }, [items, mergeServerCart, user]);

  const removeItem = useCallback((productId: string) => {
    cartOperationRef.current += 1;
    const operation = cartOperationRef.current;
    const previousItems = items;
    const item = items.find((currentItem) => currentItem.productId === productId);
    setItems((prev) => prev.filter((currentItem) => currentItem.productId !== productId));

    if (!user || !item?.serverItemId) {
      return;
    }

    void cartApi.removeItem(item.serverItemId).then((response) => {
      if (operation === cartOperationRef.current) {
        mergeServerCart(response.data.items);
      }
    }).catch((error: unknown) => {
      if (operation === cartOperationRef.current && !(error instanceof ApiRequestError && error.statusCode === 404)) {
        setItems(previousItems);
      }
    });
  }, [items, mergeServerCart, user]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    cartOperationRef.current += 1;
    const operation = cartOperationRef.current;
    const previousItems = items;
    const item = items.find((currentItem) => currentItem.productId === productId);
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      if (user && item?.serverItemId) {
        void cartApi.removeItem(item.serverItemId).then((response) => {
          if (operation === cartOperationRef.current) {
            mergeServerCart(response.data.items);
          }
        }).catch((error: unknown) => {
          if (operation === cartOperationRef.current && !(error instanceof ApiRequestError && error.statusCode === 404)) {
            setItems(previousItems);
          }
        });
      }
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
    if (!user || !item?.serverItemId) {
      return;
    }

    void cartApi.updateItem(item.serverItemId, { quantity }).then((response) => {
      if (operation === cartOperationRef.current) {
        mergeServerCart(response.data.items);
      }
    }).catch((error: unknown) => {
      if (operation === cartOperationRef.current && !(error instanceof ApiRequestError && error.statusCode === 404)) {
        setItems(previousItems);
      }
    });
  }, [items, mergeServerCart, user]);

  const clearCart = useCallback(() => {
    cartOperationRef.current += 1;
    const operation = cartOperationRef.current;
    const previousItems = items;
    setItems([]);
    localStorage.removeItem(GUEST_CART_KEY);

    if (!user) {
      return;
    }

    void cartApi.clear().catch(() => {
      if (operation !== cartOperationRef.current) {
        return;
      }
      setItems(previousItems);
      if (previousItems.length > 0) {
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(previousItems));
      }
    });
  }, [items, user]);

  const getItemQuantity = useCallback(
    (productId: string) =>
      items.find((i) => i.productId === productId)?.quantity ?? 0,
    [items]
  );

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
