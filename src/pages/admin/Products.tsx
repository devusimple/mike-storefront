import { useEffect, useState } from "react";
import { api, type Category, type Product } from "../../lib/api";
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
};

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
    });
    window.scrollTo({ top: 0 });
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
      await load();
      // Keep editing the same product with refreshed images.
      const fresh = await api<{ product: Product }>(`/api/products/${productId}`, { auth: true });
      edit(fresh.product);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (productId: string, imageId: string) => {
    await api(`/api/products/${productId}/images/${imageId}`, { method: "DELETE", auth: true });
    await load();
    const fresh = await api<{ product: Product }>(`/api/products/${productId}`, { auth: true });
    edit(fresh.product);
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
          <h2 className="text-sm font-semibold">Images ({editing.images?.length ?? 0})</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {(editing.images ?? []).map((img) => (
              <div key={img.id} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                <img src={img.secureUrl} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => deleteImage(editing.id, img.id)}
                  className="absolute right-0 top-0 bg-black/60 px-1 text-xs text-white"
                  title="Remove (DB record only — see backend docs for Cloudinary cleanup)"
                >
                  ✕
                </button>
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

      <h1 className="mt-8 text-lg font-bold">All products ({products.length})</h1>
      <div className="mt-3 space-y-2">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border bg-white p-3 text-sm">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {p.images?.[0] && <img src={p.images[0].secureUrl} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">
                {p.name} {!p.isActive && <span className="text-xs text-gray-400">(hidden)</span>}
              </div>
              <div className="text-gray-500">
                {taka(p.priceCents)} · stock {p.stock}
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
