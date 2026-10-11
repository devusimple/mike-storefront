import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Category } from "../../lib/api";

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () => api<{ categories: Category[] }>("/api/categories").then((r) => setCategories(r.categories));

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/categories", { method: "POST", auth: true, body: { name } });
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  };

  const remove = async (id: string, n: string) => {
    if (!confirm(`Delete category "${n}"?`)) return;
    setError(null);
    try {
      await api(`/api/categories/${id}`, { method: "DELETE", auth: true });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed (does it still have products?)");
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-bold">Categories ({categories.length})</h1>
      <form onSubmit={create} className="mt-3 flex gap-2">
        <input
          required
          placeholder="New category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">Add</button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 space-y-2">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border bg-white p-3 text-sm">
            <span>
              {c.name} <span className="text-gray-400">/{c.slug}</span>
            </span>
            <button onClick={() => remove(c.id, c.name)} className="rounded border px-2 py-1 text-red-600 hover:bg-red-50">
              Delete
            </button>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Manage products <Link to="/admin/products" className="underline">here</Link>.
      </p>
    </div>
  );
}
