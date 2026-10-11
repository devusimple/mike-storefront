# Mike storefront (Vite + React + Tailwind)

Customer shop for the [mike e-commerce API](../mike) (Hono + D1 + Cloudinary).

## Quickstart

```bash
bun install
cp .env.example .env   # optional; defaults to the deployed Worker
bun run dev            # http://localhost:5173
```

`VITE_API_BASE` points at the backend (`http://localhost:8787` for local
backend dev, or the deployed `https://mike.meeet-signaling-server.workers.dev`).

## Deploy (Vercel)

Push this folder's repo — Vercel auto-builds (`bun run build`, output `dist/`).
`vercel.json` contains the SPA fallback rewrite so direct visits to
`/admin`, `/cart`, `/p/:slug`, … don't 404. After first deploy, add the
Vercel domain to the backend's `ALLOWED_ORIGINS` and redeploy the Worker.

## Pages

| Route | Purpose |
|---|---|
| `/` | Product grid: search, category filter, sort, pagination |
| `/p/:slug` | Gallery, stock, add-to-cart, reviews (read + write) |
| `/cart` | Guest or account cart, quantity editing |
| `/checkout` | Login gate, coupon, idempotent COD order placement |
| `/login`, `/register` | Auth (merges guest cart on success) |
| `/orders`, `/orders/:id` | Order history + detail with totals |
| `/admin`, `/admin/products`, `/admin/categories`, `/admin/orders`, `/admin/coupons` | Admin-only: overview, product CRUD + image upload, order statuses, coupons |

## Notes

- Guests shop with an `X-Guest-Token` cart (localStorage); login/register auto-merges it.
- Products support variants (required selection), brands, tags, featured shelf, and ratings.
- Prices render from integer cents as ৳ (BDT).
- Token refresh is automatic on 401 (single retry).
- No admin UI here — catalog management stays in backend API calls for now.
