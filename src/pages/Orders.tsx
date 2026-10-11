import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, type Order, type OrderItem } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { taka } from "../lib/format";

function RequireLogin() {
  return (
    <div className="text-center text-gray-500">
      Please <Link to="/login" className="text-emerald-700 underline">login</Link> to view orders.
    </div>
  );
}

export function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (user) {
      api<{ orders: Order[] }>("/api/orders", { auth: true }).then((r) => setOrders(r.orders)).catch(() => {});
    }
  }, [user]);

  if (!user) return <RequireLogin />;
  if (orders.length === 0) return <div className="text-center text-gray-500">No orders yet.</div>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold">My orders</h1>
      <div className="mt-4 space-y-2">
        {orders.map((o) => (
          <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center justify-between rounded-xl border bg-white p-3 hover:shadow-sm">
            <div>
              <div className="text-sm font-medium">Order {o.id.slice(0, 8)}</div>
              <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold">{taka(o.totalCents)}</div>
              <StatusBadge status={o.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: Order["status"] }) {
  const colors: Record<Order["status"], string> = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-blue-100 text-blue-800",
    shipped: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-gray-200 text-gray-600",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs ${colors[status]}`}>{status}</span>;
}

export function OrderPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation() as { state?: { fresh?: boolean } };
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    if (user && id) {
      api<{ order: Order; items: OrderItem[] }>(`/api/orders/${id}`, { auth: true })
        .then((r) => {
          setOrder(r.order);
          setItems(r.items);
        })
        .catch(() => {});
    }
  }, [user, id]);

  if (!user) return <RequireLogin />;
  if (!order) return <div className="text-gray-500">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl">
      {location.state?.fresh && (
        <div className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          Order placed! Cash on delivery — pay {taka(order.totalCents)} when it arrives.
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Order {order.id.slice(0, 8)}</h1>
        <StatusBadge status={order.status} />
      </div>
      <div className="mt-4 rounded-xl border bg-white p-4">
        {items.map((i) => (
          <div key={i.id} className="flex justify-between py-1 text-sm">
            <span>
              {i.productName}
              {i.variantName ? ` (${i.variantName})` : ""} × {i.qty}
            </span>
            <span>{taka(i.unitPriceCents * i.qty)}</span>
          </div>
        ))}
        <div className="mt-2 space-y-1 border-t pt-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{taka(order.subtotalCents)}</span>
          </div>
          {order.discountCents > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
              <span>−{taka(order.discountCents)}</span>
            </div>
          )}
          {order.shippingCents > 0 && (
            <div className="flex justify-between">
              <span>Shipping{order.shippingZone ? ` (${order.shippingZone})` : ""}</span>
              <span>{taka(order.shippingCents)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>{taka(order.totalCents)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
