import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, type Order, type OrderEvent, type OrderItem } from "../lib/api";
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
    shipped: "bg-indigo-100 text-indigo-800",
    delivered: "bg-emerald-600 text-white",
    cancelled: "bg-gray-200 text-gray-600",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs ${colors[status]}`}>{status}</span>;
}

const TRACK_STEPS = ["pending", "paid", "shipped", "delivered"] as const;

export function TrackingTimeline({ status, events }: { status: Order["status"]; events: OrderEvent[] }) {
  if (status === "cancelled") {
    return (
      <div className="mt-4 rounded-xl border bg-white p-4 text-sm">
        <div className="font-semibold text-gray-600">Order cancelled</div>
        <TimelineEvents events={events} />
      </div>
    );
  }
  const current = TRACK_STEPS.indexOf(status as (typeof TRACK_STEPS)[number]);
  return (
    <div className="mt-4 rounded-xl border bg-white p-4">
      <div className="flex items-center">
        {TRACK_STEPS.map((s, i) => (
          <div key={s} className={`flex items-center ${i < TRACK_STEPS.length - 1 ? "flex-1" : ""}`}>
            <div className="flex flex-col items-center">
              <span
                className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                  i <= current ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {i <= current ? "✓" : i + 1}
              </span>
              <span className={`mt-1 text-[11px] capitalize ${i <= current ? "font-semibold" : "text-gray-400"}`}>{s}</span>
            </div>
            {i < TRACK_STEPS.length - 1 && (
              <div className={`mx-1 mb-5 h-0.5 flex-1 ${i < current ? "bg-emerald-600" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>
      <TimelineEvents events={events} />
    </div>
  );
}

function TimelineEvents({ events }: { events: OrderEvent[] }) {
  if (!events.length) return null;
  return (
    <ul className="mt-3 space-y-1 border-t pt-2 text-xs text-gray-500">
      {events.map((e) => (
        <li key={e.id}>
          {new Date(e.createdAt).toLocaleString()} — {e.fromStatus ? `${e.fromStatus} → ` : ""}{e.toStatus}
          {e.note ? ` · ${e.note}` : ""}
        </li>
      ))}
    </ul>
  );
}

export function OrderPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation() as { state?: { fresh?: boolean } };
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [events, setEvents] = useState<OrderEvent[]>([]);

  useEffect(() => {
    if (user && id) {
      api<{ order: Order; items: OrderItem[]; events: OrderEvent[] }>(`/api/orders/${id}`, { auth: true })
        .then((r) => {
          setOrder(r.order);
          setItems(r.items);
          setEvents(r.events ?? []);
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

      <TrackingTimeline status={order.status} events={events} />

      {(order.carrier || order.trackingNumber) && (
        <div className="mt-4 rounded-xl border bg-white p-4 text-sm">
          <div className="font-semibold">Shipment</div>
          {order.carrier && <div className="text-gray-600">Courier: {order.carrier}</div>}
          {order.trackingNumber && <div className="text-gray-600">Tracking: <span className="font-mono">{order.trackingNumber}</span></div>}
        </div>
      )}
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
