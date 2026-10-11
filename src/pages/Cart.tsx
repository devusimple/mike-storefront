import { Link } from "react-router-dom";
import { useCart } from "../cart/CartContext";
import { taka } from "../lib/format";

export function CartPage() {
  const { items, subtotalCents, setQty, remove, clear, error } = useCart();

  if (items.length === 0) {
    return (
      <div className="text-center text-gray-500">
        Your cart is empty. <Link to="/" className="text-emerald-700 underline">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-bold">Cart</h1>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 rounded-xl border bg-white p-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {item.thumbnail ? (
                <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <Link to={`/p/${item.product.slug}`} className="truncate text-sm font-medium hover:underline">
                {item.product.name}
              </Link>
              {item.variant && <div className="text-xs text-gray-500">{item.variant.name}</div>}
              <div className="text-sm text-gray-500">{taka(item.unitPriceCents)} each</div>
            </div>
            <input
              type="number"
              min={0}
              value={item.qty}
              onChange={(e) => setQty(item.productId, Math.max(0, Number(e.target.value) || 0), item.variantId)}
              className="w-16 rounded-lg border px-2 py-1 text-sm"
            />
            <div className="w-24 text-right text-sm font-semibold">
              {taka(item.unitPriceCents * item.qty)}
            </div>
            <button onClick={() => remove(item.productId, item.variantId)} className="text-sm text-red-600 hover:underline">
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <button onClick={clear} className="text-sm text-gray-500 hover:underline">
          Clear cart
        </button>
        <div className="text-lg font-bold">Subtotal: {taka(subtotalCents)}</div>
      </div>
      <div className="mt-4 text-right">
        <Link
          to="/checkout"
          className="inline-block rounded-lg bg-emerald-600 px-6 py-2 text-white hover:bg-emerald-700"
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}
