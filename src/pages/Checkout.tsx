import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type Order } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../cart/CartContext";
import { taka } from "../lib/format";

export function CheckoutPage() {
  const { user } = useAuth();
  const { items, subtotalCents } = useCart();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-xl font-bold">Checkout</h1>
        <p className="mt-2 text-gray-600">Please login or create an account to place your order.</p>
        <div className="mt-4 flex justify-center gap-3">
          <Link to="/login" className="rounded-lg border px-4 py-2">
            Login
          </Link>
          <Link to="/register" className="rounded-lg bg-emerald-600 px-4 py-2 text-white">
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return <div className="text-center text-gray-500">Your cart is empty.</div>;
  }

  const placeOrder = async () => {
    setPlacing(true);
    setError(null);
    try {
      const r = await api<{ order: Order }>(
        "/api/orders/checkout",
        {
          method: "POST",
          auth: true,
          body: coupon.trim() ? { couponCode: coupon.trim() } : {},
          idempotencyKey: crypto.randomUUID(),
        },
      );
      window.dispatchEvent(new Event("mike:cart-changed"));
      navigate(`/orders/${r.order.id}`, { state: { fresh: true } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold">Checkout</h1>
      <div className="mt-4 space-y-2 rounded-xl border bg-white p-4">
        {items.map((i) => (
          <div key={i.id} className="flex justify-between text-sm">
            <span>
              {i.product.name} × {i.qty}
            </span>
            <span>{taka(i.product.priceCents * i.qty)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t pt-2 font-semibold">
          <span>Subtotal</span>
          <span>{taka(subtotalCents)}</span>
        </div>
      </div>
      <div className="mt-4 rounded-xl border bg-white p-4">
        <label className="text-sm text-gray-600">Coupon code (optional)</label>
        <input
          value={coupon}
          onChange={(e) => setCoupon(e.target.value.toUpperCase())}
          placeholder="WELCOME10"
          className="mt-1 w-full rounded-lg border px-3 py-2 uppercase"
        />
        <p className="mt-3 text-sm text-gray-500">Cash on delivery. Pay when your order arrives.</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          onClick={placeOrder}
          disabled={placing}
          className="mt-3 w-full rounded-lg bg-emerald-600 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {placing ? "Placing order…" : `Place order · ${taka(subtotalCents)}`}
        </button>
      </div>
    </div>
  );
}
