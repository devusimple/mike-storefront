import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface Coupon {
  code: string;
  percentOff: number;
  active: boolean;
  expiresAt: string | null;
}

export function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");
  const [error, setError] = useState<string | null>(null);

  const load = () => api<{ coupons: Coupon[] }>("/api/coupons", { auth: true }).then((r) => setCoupons(r.coupons));

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/coupons", {
        method: "POST",
        auth: true,
        body: { code, percentOff: Number(percent) },
      });
      setCode("");
      setPercent("10");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  };

  const remove = async (c: string) => {
    if (!confirm(`Delete coupon ${c}?`)) return;
    await api(`/api/coupons/${c}`, { method: "DELETE", auth: true });
    await load();
  };

  const input = "rounded-lg border px-3 py-2 text-sm";

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-bold">Coupons ({coupons.length})</h1>
      <form onSubmit={create} className="mt-3 flex gap-2">
        <input required placeholder="CODE" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={`${input} w-full uppercase`} />
        <input required type="number" min={1} max={90} placeholder="% off" value={percent} onChange={(e) => setPercent(e.target.value)} className={`${input} w-24`} />
        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">Add</button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 space-y-2">
        {coupons.map((c) => (
          <div key={c.code} className="flex items-center justify-between rounded-xl border bg-white p-3 text-sm">
            <span className="font-mono font-semibold">{c.code}</span>
            <span className="text-gray-500">{c.percentOff}% off</span>
            <button onClick={() => remove(c.code)} className="rounded border px-2 py-1 text-red-600 hover:bg-red-50">
              Delete
            </button>
          </div>
        ))}
        {coupons.length === 0 && <p className="text-sm text-gray-500">No coupons. Try WELCOME10.</p>}
      </div>
    </div>
  );
}
