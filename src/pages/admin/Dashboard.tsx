import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Order, type Product } from "../../lib/api";
import { taka } from "../../lib/format";

export function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    api<{ products: Product[] }>("/api/products?all=1&limit=100", { auth: true })
      .then((r) => setProducts(r.products))
      .catch(() => {});
    api<{ orders: Order[] }>("/api/orders?all=1&limit=100", { auth: true })
      .then((r) => setOrders(r.orders))
      .catch(() => {});
  }, []);

  const pending = orders.filter((o) => o.status === "pending");
  const lowStock = products.filter((p) => p.stock < 5);

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Products" value={products.length} to="/admin/products" />
        <Stat label="Pending orders" value={pending.length} to="/admin/orders" />
        <Stat label="Total orders" value={orders.length} to="/admin/orders" />
        <Stat label="Low stock (<5)" value={lowStock.length} to="/admin/products" />
      </div>
      {lowStock.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold">Low stock</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {lowStock.map((p) => (
              <li key={p.id}>
                <Link to="/admin/products" className="hover:underline">
                  {p.name}
                </Link>{" "}
                — {p.stock} left · {taka(p.priceCents)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link to={to} className="rounded-xl border bg-white p-4 hover:shadow-sm">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </Link>
  );
}
