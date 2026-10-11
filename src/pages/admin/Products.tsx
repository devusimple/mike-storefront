import { useEffect, useState } from "react";
import { api, type Category, type Product, type ProductVariant } from "../../lib/api";
import { thumb } from "../../lib/cloudinary";
import { taka } from "../../lib/format";

interface Form {
  name: string;
  description: string;
  priceTaka: string;
  compareTaka: string;
  sku: string;
  stock: string;
  categoryId: string;
  isActive: boolean;
  brand: string;
  featured: boolean;
  tagsText: string;
}

const EMPTY: Form = {
  name: "",
  description: "",
  priceTaka: "",
  compareTaka: "",
  sku: "",
  stock: "0",
  categoryId: "",
  isActive: true,
  brand: "",
  featured: false,
  tagsText: "",
};

interface VariantForm {
  name: string;
  sku: string;
  priceTaka: string;
  stock: string;
}

const EMPTY_VARIANT: VariantForm = { name: "", sku: "", priceTaka: "", stock: "0" };

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = () =>
    api<{ products: Product[] }>("/api/products?all=1&limit=100", { auth: true }).then((r) =>
      setProducts(r.products),
    );

  useEffect(() => {
    load().catch(() => {});
    api<{ categories: Category[] }>("/api/categories").then((r) => setCategories(r.categories)).catch(() => {});
  }, []);

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const body = {
      name: form.name,
      description: form.description,
      priceCents: Math.round(Number(form.priceTaka) * 100),
      comparePriceCents: form.compareTaka ? Math.round(Number(form.compareTaka) * 100) : undefined,
      sku: form.sku || undefined,
      stock: Number(form.stock) || 0,
      categoryId: form.categoryId || undefined,
      isActive: form.isActive,
      brand: form.brand || undefined,
      featured: form.featured,
      tags: form.tagsText.split(",").map((t) => t.trim()).filter(Boolean),
    };
    try {
      if (editingId) {
        await api(`/api/products/${editingId}`, { method: "PUT", auth: true, body });
      } else {
        await api("/api/products", { method: "POST", auth: true, body });
      }
      setForm(EMPTY);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const edit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      priceTaka: String(p.priceCents / 100),
      compareTaka: p.comparePriceCents ? String(p.comparePriceCents / 100) : "",
      sku: p.sku ?? "",
      stock: String(p.stock),
      categoryId: p.categoryId ?? "",
      isActive: p.isActive,
      brand: p.brand ?? "",
      featured: p.featured,
      tagsText: (p.tags ?? []).map((t) => t.name).join(", "),
    });
    window.scrollTo({ top: 0 });
  };

  const refreshEditing = async (productId: string) => {
    await load();
    const fresh = await api<{ product: Product }>(`/api/products/${productId}`, { auth: true });
    edit(fresh.product);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product and its image records?")) return;
    await api(`/api/products/${id}`, { method: "DELETE", auth: true });
    await load();
  };

  const uploadImage = async (productId: string, file: File) => {
    setUploading(true);
    setError(null);
    try {
      const sig = await api<{
        uploadUrl: string;
        apiKey: string;
        timestamp: number;
        folder: string;
        signature: string;
      }>("/api/uploads/signature", { method: "POST", auth: true, body: {} });
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sig.apiKey);
      form.append("timestamp", String(sig.timestamp));
      form.append("folder", sig.folder);
      form.append("signature", sig.signature);
      const up = (await (await fetch(sig.uploadUrl, { method: "POST", body: form })).json()) as {
        public_id: string;
        secure_url: string;
        width: number;
        height: number;
      };
      await api(`/api/products/${productId}/images`, {
        method: "POST",
        auth: true,
        body: { publicId: up.public_id, secureUrl: up.secure_url, width: up.width, height: up.height },
      });
      await refreshEditing(productId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (productId: string, imageId: string) => {
    await api(`/api/products/${productId}/images/${imageId}`, { method: "DELETE", auth: true });
    await refreshEditing(productId);
  };

  const setImagePosition = async (productId: string, imageId: string, position: number) => {
    await api(`/api/products/${productId}/images/${imageId}`, {
      method: "PATCH",
      auth: true,
      body: { position },
    });
  };

  /** Move image within the ordered list (two PATCHes, then refresh once). */
  const moveImage = async (productId: string, imgs: { id: string }[], from: number, to: number) => {
    if (to < 0 || to >= imgs.length) return;
    const ordered = [...imgs];
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    await Promise.all(ordered.map((img, i) => setImagePosition(productId, img.id, i)));
    await refreshEditing(productId);
  };

  /** Star = make cover (position 0), keep the rest in order. */
  const setCover = async (productId: string, imgs: { id: string }[], idx: number) => {
    const ordered = [imgs[idx], ...imgs.filter((_, i) => i !== idx)];
    await Promise.all(ordered.map((img, i) => setImagePosition(productId, img.id, i)));
    await refreshEditing(productId);
  };

  const [vform, setVform] = useState<VariantForm>(EMPTY_VARIANT);

  const addVariant = async (productId: string) => {
    setError(null);
    try {
      await api(`/api/products/${productId}/variants`, {
        method: "POST",
        auth: true,
        body: {
          name: vform.name,
          sku: vform.sku || undefined,
          priceCents: vform.priceTaka ? Math.round(Number(vform.priceTaka) * 100) : null,
          stock: Number(vform.stock) || 0,
        },
      });
      setVform(EMPTY_VARIANT);
      await refreshEditing(productId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Variant create failed");
    }
  };

  const saveVariant = async (productId: string, vid: string, patch: Record<string, unknown>) => {
    setError(null);
    try {
      await api(`/api/products/${productId}/variants/${vid}`, { method: "PUT", auth: true, body: patch });
      await refreshEditing(productId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Variant save failed");
    }
  };

  const deleteVariant = async (productId: string, vid: string, name: string) => {
    if (!confirm(`Delete variant "${name}"? Its cart lines will be removed; order history is kept.`)) return;
    await api(`/api/products/${productId}/variants/${vid}`, { method: "DELETE", auth: true });
    await refreshEditing(productId);
  };

  const editing = editingId ? products.find((p) => p.id === editingId) : null;

  const input = "w-full rounded-lg border px-3 py-2 text-sm";

  return (
    <div>
      <h1 className="text-lg font-bold">{editingId ? "Edit product" : "New product"}</h1>
      <form onSubmit={submit} className="mt-3 grid max-w-2xl gap-3 rounded-xl border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <input required placeholder="Name" value={form.name} onChange={(e) => set({ name: e.target.value })} className={input} />
          <input placeholder="SKU (optional)" value={form.sku} onChange={(e) => set({ sku: e.target.value })} className={input} />
          <input required type="number" min={0} step="0.01" placeholder="Price (৳)" value={form.priceTaka} onChange={(e) => set({ priceTaka: e.target.value })} className={input} />
          <input type="number" min={0} step="0.01" placeholder="Compare price ৳ (optional)" value={form.compareTaka} onChange={(e) => set({ compareTaka: e.target.value })} className={input} />
          <input type="number" min={0} placeholder="Stock" value={form.stock} onChange={(e) => set({ stock: e.target.value })} className={input} />
          <input placeholder="Brand (optional)" value={form.brand} onChange={(e) => set({ brand: e.target.value })} className={input} />
          <input placeholder="Tags, comma separated (optional)" value={form.tagsText} onChange={(e) => set({ tagsText: e.target.value })} className={`${input} sm:col-span-2`} />
          <select value={form.categoryId} onChange={(e) => set({ categoryId: e.target.value })} className={input}>
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <textarea placeholder="Description" value={form.description} onChange={(e) => set({ description: e.target.value })} rows={2} className={input} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} />
          Visible in shop
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.featured} onChange={(e) => set({ featured: e.target.checked })} />
          Featured (homepage shelf)
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
            {editingId ? "Save changes" : "Create product"}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); }} className="rounded-lg border px-4 py-2 text-sm">
              Cancel
            </button>
          )}
        </div>
      </form>

      {editing && (
        <div className="mt-4 max-w-2xl rounded-xl border bg-white p-4">
          <h2 className="text-sm font-semibold">Images ({editing.images?.length ?? 0}) — ★ = cover</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {(editing.images ?? []).map((img, idx, arr) => (
              <div key={img.id} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                <img src={thumb(img.secureUrl, 200)} alt="" className="h-full w-full object-cover" />
                {idx === 0 && (
                  <span className="absolute left-0 top-0 bg-emerald-600 px-1 text-xs text-white">★</span>
                )}
                <button
                  onClick={() => deleteImage(editing.id, img.id)}
                  className="absolute right-0 top-0 bg-black/60 px-1 text-xs text-white"
                  title="Remove (DB record only — see backend docs for Cloudinary cleanup)"
                >
                  ✕
                </button>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between bg-black/60 px-1 text-xs text-white">
                  <button onClick={() => moveImage(editing.id, arr, idx, idx - 1)} title="Move left">‹</button>
                  <button onClick={() => setCover(editing.id, arr, idx)} title="Set as cover">★</button>
                  <button onClick={() => moveImage(editing.id, arr, idx, idx + 1)} title="Move right">›</button>
                </div>
              </div>
            ))}
          </div>
          <label className="mt-3 block text-sm">
            <span className="text-gray-600">{uploading ? "Uploading…" : "Add image"}</span>
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              className="mt-1 block"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(editing.id, f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}

      {editing && (
        <div className="mt-4 max-w-2xl rounded-xl border bg-white p-4">
          <h2 className="text-sm font-semibold">Variants ({editing.variants?.length ?? 0})</h2>
          <p className="text-xs text-gray-500">Empty price = inherits product price. Cart requires a variant when any exist.</p>
          <div className="mt-2 space-y-2">
            {(editing.variants ?? []).map((v) => (
              <VariantRow key={v.id} productId={editing.id} variant={v} onSave={saveVariant} onDelete={deleteVariant} />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <input placeholder="Name (e.g. Black / L)" value={vform.name} onChange={(e) => setVform({ ...vform, name: e.target.value })} className={input} />
            <input placeholder="SKU" value={vform.sku} onChange={(e) => setVform({ ...vform, sku: e.target.value })} className={input} />
            <input type="number" min={0} step="0.01" placeholder="Price ৳ (empty = base)" value={vform.priceTaka} onChange={(e) => setVform({ ...vform, priceTaka: e.target.value })} className={input} />
            <input type="number" min={0} placeholder="Stock" value={vform.stock} onChange={(e) => setVform({ ...vform, stock: e.target.value })} className={input} />
            <button onClick={() => vform.name && addVariant(editing.id)} className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white">
              Add
            </button>
          </div>
        </div>
      )}

      <h1 className="mt-8 text-lg font-bold">All products ({products.length})</h1>
      <div className="mt-3 space-y-2">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border bg-white p-3 text-sm">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {p.images?.[0] && <img src={thumb(p.images[0].secureUrl, 200)} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">
                {p.name} {!p.isActive && <span className="text-xs text-gray-400">(hidden)</span>}
              </div>
              <div className="text-gray-500">
                {taka(p.priceCents)} · stock {p.stock}
                {p.brand ? ` · ${p.brand}` : ""}
                {(p.variants?.length ?? 0) > 0 ? ` · ${p.variants?.length} variants` : ""}
                {p.featured ? " · ★" : ""}
              </div>
            </div>
            <button onClick={() => edit(p)} className="rounded border px-2 py-1 hover:bg-gray-50">
              Edit
            </button>
            <button onClick={() => remove(p.id)} className="rounded border px-2 py-1 text-red-600 hover:bg-red-50">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function VariantRow({
  productId,
  variant,
  onSave,
  onDelete,
}: {
  productId: string;
  variant: ProductVariant;
  onSave: (productId: string, vid: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (productId: string, vid: string, name: string) => Promise<void>;
}) {
  const [name, setName] = useState(variant.name);
  const [priceTaka, setPriceTaka] = useState(variant.priceCents != null ? String(variant.priceCents / 100) : "");
  const [stock, setStock] = useState(String(variant.stock));
  const dirty =
    name !== variant.name ||
    (priceTaka === "" ? null : Math.round(Number(priceTaka) * 100)) !== variant.priceCents ||
    Number(stock) !== variant.stock;

  const input = "rounded border px-2 py-1 text-sm";
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-2 text-sm">
      <input value={name} onChange={(e) => setName(e.target.value)} className={`${input} w-32`} title="Name" />
      <input
        value={priceTaka}
        onChange={(e) => setPriceTaka(e.target.value)}
        placeholder="৳ (empty = base)"
        type="number"
        min={0}
        step="0.01"
        className={`${input} w-28`}
        title="Price override"
      />
      <input
        value={stock}
        onChange={(e) => setStock(e.target.value)}
        type="number"
        min={0}
        className={`${input} w-20`}
        title="Stock"
      />
      <span className="text-gray-400">{variant.sku ?? "no sku"}</span>
      <button
        onClick={() => onSave(productId, variant.id, { isActive: !variant.isActive })}
        className={variant.isActive ? "text-gray-500 hover:underline" : "text-amber-700 hover:underline"}
        title="Toggle active"
      >
        {variant.isActive ? "active" : "hidden"}
      </button>
      {dirty && (
        <button
          onClick={() =>
            onSave(productId, variant.id, {
              name,
              priceCents: priceTaka === "" ? null : Math.round(Number(priceTaka) * 100),
              stock: Number(stock) || 0,
            })
          }
          className="rounded bg-emerald-600 px-2 py-1 text-white"
        >
          Save
        </button>
      )}
      <button onClick={() => onDelete(productId, variant.id, variant.name)} className="text-red-600 hover:underline">
        Delete
      </button>
    </div>
  );
}
