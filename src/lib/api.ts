/**
 * Typed client for the mike e-commerce API.
 * - Access token in localStorage, refresh token in localStorage.
 * - On 401 with a refresh token available, rotates once and retries.
 * - Guest carts: pass `guest` (X-Guest-Token) for anonymous cart calls.
 */

export const API_BASE =
  import.meta.env.VITE_API_BASE ?? "https://mike.meeet-signaling-server.workers.dev";

const ACCESS_KEY = "mike.accessToken";
const REFRESH_KEY = "mike.refreshToken";
export const GUEST_KEY = "mike.guestToken";

export const tokenStore = {
  get access(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(pair: { accessToken: string; refreshToken: string }) {
    localStorage.setItem(ACCESS_KEY, pair.accessToken);
    localStorage.setItem(REFRESH_KEY, pair.refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface CallOptions {
  auth?: boolean;
  guest?: string | null;
  idempotencyKey?: string;
}

async function raw(path: string, init: RequestInit, guest?: string | null): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (guest) headers["X-Guest-Token"] = guest;
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

export async function api<T>(
  path: string,
  { method = "GET", body, auth = false, guest = null, idempotencyKey }: CallOptions & {
    method?: string;
    body?: unknown;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (auth && tokenStore.access) headers.Authorization = `Bearer ${tokenStore.access}`;
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  let res = await raw(path, { method, headers, body: body ? JSON.stringify(body) : undefined }, guest);

  // Rotate once on expired access token.
  if (res.status === 401 && auth && tokenStore.refresh) {
    const rotated = await raw("/api/auth/refresh", {
      method: "POST",
      headers: {},
      body: JSON.stringify({ refreshToken: tokenStore.refresh }),
    });
    if (rotated.ok) {
      const pair = (await rotated.json()) as { accessToken: string; refreshToken: string };
      tokenStore.set(pair);
      headers.Authorization = `Bearer ${pair.accessToken}`;
      res = await raw(path, { method, headers, body: body ? JSON.stringify(body) : undefined }, guest);
    } else {
      tokenStore.clear();
    }
  }

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new ApiError(res.status, err.error ?? err.message ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

/* ---------- domain types (mirror backend schema) ---------- */

export interface User {
  id: string;
  email: string;
  name: string;
  role: "customer" | "admin";
  emailVerified: boolean;
}
export interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}
export interface ProductImage {
  id: string;
  secureUrl: string;
  cloudinaryPublicId: string;
  width: number | null;
  height: number | null;
  position: number;
}
export interface ProductVariant {
  id: string;
  name: string;
  sku: string | null;
  priceCents: number | null;
  stock: number;
  isActive: boolean;
  position: number;
}
export interface Tag {
  name: string;
  slug: string;
}
export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  comparePriceCents: number | null;
  sku: string | null;
  stock: number;
  categoryId: string | null;
  isActive: boolean;
  brand: string | null;
  featured: boolean;
  ratingAvg: number;
  ratingCount: number;
  images?: ProductImage[];
  variants?: ProductVariant[];
  tags?: Tag[];
}
export interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  qty: number;
  product: Product;
  variant: { id: string; name: string; priceCents: number | null } | null;
  unitPriceCents: number;
  thumbnail: string | null;
}
export interface Order {
  id: string;
  status: "pending" | "paid" | "shipped" | "cancelled";
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  couponCode: string | null;
  createdAt: string;
}
export interface OrderItem {
  id: string;
  productId: string | null;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  qty: number;
  unitPriceCents: number;
}
export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  comment: string;
}
