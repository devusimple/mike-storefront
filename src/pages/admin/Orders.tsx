import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Order } from "../../lib/api";
import { taka } from "../../lib/format";
import { StatusBadge } from "../Orders";

const FILTERS = ["all", "pending", "paid", "shipped", "cancelled"] as const;

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const load = () =>
    api<{ orders: Order[] }>("/api/orders?all=1&limit=100", { auth: true }).then((r) => setOrders(r.orders));

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const setStatus = async (id: string, status: Order["status"]) => {
    await api(`/api/orders/${id}/status`, { method: "PATCH", auth: true, body: { status } });
    await load();
  };

  const shown = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold">Orders ({shown.length})</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="rounded-lg border px-2 py-1 text-sm">
          {FILTERS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 space-y-2">
        {shown.map((o) => (
          <div key={o.id} className="flex items-center gap-3 rounded-xl border bg-white p-3 text-sm">
            <div className="min-w-0 flex-1">
              <Link to={`/orders/${o.id}`} className="font-medium hover:underline">
                Order {o.id.slice(0, 8)}
              </Link>
              <div className="text-xs text-gray-500">
                {new Date(o.createdAt).toLocaleString()}
                {o.couponCode ? ` · ${o.couponCode}` : ""}
              </div>
            </div>
            <div className="text-right font-semibold">{taka(o.totalCents)}</div>
            <StatusBadge status={o.status} />
            <select
              value={o.status}
              onChange={(e) => setStatus(o.id, e.target.value as Order["status"])}
              className="rounded-lg border px-2 py-1"
            >
              <option value="pending">pending</option>
              <option value="paid">paid</option>
              <option value="shipped">shipped</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>
        ))}
        {shown.length === 0 && <p className="text-sm text-gray-500">No orders.</p>}
      </div>
    </div>
  );
}
