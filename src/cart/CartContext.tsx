import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, GUEST_KEY, tokenStore, type CartItem } from "../lib/api";

interface CartState {
  items: CartItem[];
  subtotalCents: number;
  count: number;
  guest: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  add: (productId: string, qty?: number, variantId?: string) => Promise<void>;
  setQty: (productId: string, qty: number, variantId?: string | null) => Promise<void>;
  remove: (productId: string, variantId?: string | null) => Promise<void>;
  clear: () => Promise<void>;
  error: string | null;
}

const CartContext = createContext<CartState | null>(null);

function getGuest(): string | null {
  return localStorage.getItem(GUEST_KEY);
}

async function ensureGuest(): Promise<string> {
  const existing = getGuest();
  if (existing) return existing;
  const r = await api<{ guestToken: string }>("/api/cart/guest", { method: "POST" });
  localStorage.setItem(GUEST_KEY, r.guestToken);
  return r.guestToken;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotalCents, setSubtotalCents] = useState(0);
  const [guest, setGuest] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const authed = !!tokenStore.access;
      const r = await api<{ items: CartItem[]; subtotalCents: number; guest: boolean }>(
        "/api/cart",
        authed ? { auth: true } : { guest: getGuest() },
      );
      setItems(r.items);
      setSubtotalCents(r.subtotalCents);
      setGuest(r.guest);
      setError(null);
    } catch (e) {
      // No cart yet (e.g. no guest token) — show empty, not an error.
      if (e instanceof Error && (e as { status?: number }).status === 401) {
        setItems([]);
        setSubtotalCents(0);
        setError(null);
      } else {
        setError(e instanceof Error ? e.message : "Failed to load cart");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("mike:cart-changed", onChange);
    return () => window.removeEventListener("mike:cart-changed", onChange);
  }, [refresh]);

  const mutate = useCallback(
    async (fn: (opts: { auth: boolean; guest: string | null }) => Promise<unknown>) => {
      try {
        if (tokenStore.access) {
          await fn({ auth: true, guest: null });
        } else {
          await fn({ auth: false, guest: await ensureGuest() });
        }
        setError(null);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Cart update failed");
        throw e;
      }
    },
    [refresh],
  );

  const add = useCallback(
    (productId: string, qty = 1, variantId?: string) =>
      mutate((opts) =>
        api("/api/cart/items", { method: "POST", body: { productId, variantId, qty }, ...opts }),
      ),
    [mutate],
  );
  const setQty = useCallback(
    (productId: string, qty: number, variantId?: string | null) => {
      const path = variantId
        ? `/api/cart/items/${productId}?variantId=${encodeURIComponent(variantId)}`
        : `/api/cart/items/${productId}`;
      return mutate((opts) => api(path, { method: "PUT", body: { qty }, ...opts }));
    },
    [mutate],
  );
  const remove = useCallback(
    (productId: string, variantId?: string | null) => {
      const path = variantId
        ? `/api/cart/items/${productId}?variantId=${encodeURIComponent(variantId)}`
        : `/api/cart/items/${productId}`;
      return mutate((opts) => api(path, { method: "DELETE", ...opts }));
    },
    [mutate],
  );
  const clear = useCallback(
    () => mutate((opts) => api("/api/cart", { method: "DELETE", ...opts })),
    [mutate],
  );

  const value = useMemo(
    () => ({
      items,
      subtotalCents,
      count: items.reduce((n, i) => n + i.qty, 0),
      guest,
      loading,
      refresh,
      add,
      setQty,
      remove,
      clear,
      error,
    }),
    [items, subtotalCents, guest, loading, refresh, add, setQty, remove, clear, error],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
