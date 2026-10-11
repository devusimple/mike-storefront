import { useEffect, useState } from "react";
import { api, type ShippingZone } from "../../lib/api";
import { taka } from "../../lib/format";

export function AdminShipping() {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [name, setName] = useState("");
  const [chargeTaka, setChargeTaka] = useState("");
  const [freeTaka, setFreeTaka] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api<{ zones: ShippingZone[] }>("/api/shipping-zones/all", { auth: true }).then((r) =>
      setZones(r.zones.sort((a, b) => a.position - b.position)),
    );

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/shipping-zones", {
        method: "POST",
        auth: true,
        body: {
          name,
          chargeCents: Math.round(Number(chargeTaka) * 100),
          freeAboveCents: freeTaka ? Math.round(Number(freeTaka) * 100) : null,
        },
      });
      setName("");
      setChargeTaka("");
      setFreeTaka("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  };

  const toggle = async (z: ShippingZone) => {
    await api(`/api/shipping-zones/${z.id}`, { method: "PUT", auth: true, body: { active: !z.active } });
    await load();
  };

  const remove = async (z: ShippingZone) => {
    if (!confirm(`Delete zone "${z.name}"? Future checkouts won't offer it; past orders keep their snapshot.`)) return;
    await api(`/api/shipping-zones/${z.id}`, { method: "DELETE", auth: true });
    await load();
  };

  const input = "rounded-lg border px-3 py-2 text-sm";

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-bold">Shipping zones ({zones.length})</h1>
      <p className="mt-1 text-xs text-gray-500">
        Shown at checkout. Orders snapshot the charge, so edits never rewrite history.
      </p>
      <form onSubmit={create} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className={`${input} col-span-2 sm:col-span-1`} />
        <input required type="number" min={0} step="0.01" placeholder="Charge ৳" value={chargeTaka} onChange={(e) => setChargeTaka(e.target.value)} className={input} />
        <input type="number" min={0} step="0.01" placeholder="Free over ৳ (blank = never)" value={freeTaka} onChange={(e) => setFreeTaka(e.target.value)} className={input} />
        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">Add</button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 space-y-2">
        {zones.map((z) => (
          <div key={z.id} className="flex items-center gap-3 rounded-xl border bg-white p-3 text-sm">
            <div className="flex-1">
              <div className="font-medium">
                {z.name} {!z.active && <span className="text-xs text-gray-400">(disabled)</span>}
              </div>
              <div className="text-gray-500">
                {taka(z.chargeCents)}
                {z.freeAboveCents != null ? ` · free over ${taka(z.freeAboveCents)}` : ""}
              </div>
            </div>
            <button onClick={() => toggle(z)} className="rounded border px-2 py-1 hover:bg-gray-50">
              {z.active ? "Disable" : "Enable"}
            </button>
            <button onClick={() => remove(z)} className="rounded border px-2 py-1 text-red-600 hover:bg-red-50">
              Delete
            </button>
          </div>
        ))}
        {zones.length === 0 && <p className="text-sm text-gray-500">No zones — checkout will have no shipping charge.</p>}
      </div>
    </div>
  );
}
