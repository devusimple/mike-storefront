import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, type Category, type Product, type Tag } from "../lib/api";
import { ProductCard } from "../components/ProductCard";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
];

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const search = params.get("search") ?? "";
  const category = params.get("category") ?? "";
  const brand = params.get("brand") ?? "";
  const tag = params.get("tag") ?? "";
  const sort = params.get("sort") ?? "newest";
  const page = Number(params.get("page") ?? "1") || 1;
  const filtering = !!(search || category || brand || tag);

  useEffect(() => {
    api<{ categories: Category[] }>("/api/categories").then((r) => setCategories(r.categories)).catch(() => {});
    api<{ brands: string[]; tags: Tag[] }>("/api/meta")
      .then((r) => {
        setBrands(r.brands);
        setTags(r.tags);
      })
      .catch(() => {});
    api<{ products: Product[] }>("/api/products?featured=1&limit=8").then((r) => setFeatured(r.products)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ limit: "24", page: String(page), sort });
    if (search) q.set("search", search);
    if (category) q.set("category", category);
    if (brand) q.set("brand", brand);
    if (tag) q.set("tag", tag);
    api<{ products: Product[]; total: number }>(`/api/products?${q}`)
      .then((r) => {
        setProducts(r.products);
        setTotal(r.total);
      })
      .finally(() => setLoading(false));
  }, [search, category, brand, tag, sort, page]);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    setParams(next);
  };

  return (
    <div>
      {!filtering && featured.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold">Featured</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:flex">
        <input
          className="col-span-2 w-full rounded-lg border px-3 py-2 sm:w-auto sm:flex-1"
          placeholder="Search products…"
          defaultValue={search}
          onChange={(e) => set({ search: e.target.value })}
        />
        <select className="rounded-lg border px-3 py-2" value={category} onChange={(e) => set({ category: e.target.value })}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        {brands.length > 0 && (
          <select className="rounded-lg border px-3 py-2" value={brand} onChange={(e) => set({ brand: e.target.value })}>
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        )}
        {tags.length > 0 && (
          <select className="rounded-lg border px-3 py-2" value={tag} onChange={(e) => set({ tag: e.target.value })}>
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        <select className="rounded-lg border px-3 py-2" value={sort} onChange={(e) => set({ sort: e.target.value })}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : products.length === 0 ? (
        <div className="text-gray-500">No products found.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
            <span>
              {products.length} of {total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                className="rounded border px-3 py-1 disabled:opacity-40"
                onClick={() => setParams({ ...Object.fromEntries(params), page: String(page - 1) })}
              >
                Prev
              </button>
              <button
                disabled={products.length + (page - 1) * 24 >= total}
                className="rounded border px-3 py-1 disabled:opacity-40"
                onClick={() => setParams({ ...Object.fromEntries(params), page: String(page + 1) })}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
