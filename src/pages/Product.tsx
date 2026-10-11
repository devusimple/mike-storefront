import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type Product, type Review } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../cart/CartContext";
import { taka } from "../lib/format";

export function ProductPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { add, error: cartError } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    if (!slug) return;
    api<{ product: Product & { images: Product["images"] } }>(`/api/products/${slug}`).then((r) =>
      setProduct(r.product as Product),
    );
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    api<{ reviews: Review[] }>(`/api/products/${product.id}/reviews`)
      .then((r) => setReviews(r.reviews))
      .catch(() => {});
  }, [product]);

  if (!product) return <div className="text-gray-500">Loading…</div>;
  const images = product.images ?? [];

  const submitReview = async () => {
    if (!product) return;
    const r = await api<{ review: Review }>(`/api/products/${product.id}/reviews`, {
      method: "POST",
      auth: true,
      body: { rating, comment },
    });
    setReviews((prev) => {
      const rest = prev.filter((x) => x.id !== r.review.id);
      return [...rest, r.review];
    });
    setComment("");
  };

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
          {images[activeImg] ? (
            <img src={images[activeImg].secureUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">No image</div>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-2 flex gap-2">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setActiveImg(i)}
                className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${i === activeImg ? "border-emerald-600" : "border-transparent"}`}
              >
                <img src={img.secureUrl} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="text-xl font-semibold">{taka(product.priceCents)}</span>
          {product.comparePriceCents && product.comparePriceCents > product.priceCents && (
            <span className="text-gray-400 line-through">{taka(product.comparePriceCents)}</span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
        </p>
        {product.description && <p className="mt-4 whitespace-pre-line text-gray-700">{product.description}</p>}

        <div className="mt-6 flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={Math.max(1, product.stock)}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            className="w-20 rounded-lg border px-3 py-2"
          />
          <button
            disabled={product.stock <= 0}
            onClick={() => add(product.id, qty).then(() => setAdded(true))}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            Add to cart
          </button>
          {added && <span className="text-sm text-emerald-700">Added ✓</span>}
        </div>
        {cartError && <p className="mt-2 text-sm text-red-600">{cartError}</p>}

        <div className="mt-10">
          <h2 className="font-semibold">Reviews ({reviews.length})</h2>
          <div className="mt-3 space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                {r.comment && <p className="mt-1 text-gray-700">{r.comment}</p>}
              </div>
            ))}
            {reviews.length === 0 && <p className="text-sm text-gray-500">No reviews yet.</p>}
          </div>
          {user ? (
            <div className="mt-4 rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm">
                <label>Rating</label>
                <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="rounded border px-2 py-1">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a review…"
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
                rows={3}
              />
              <button onClick={submitReview} className="mt-2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white">
                Submit review
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">Login to write a review.</p>
          )}
        </div>
      </div>
    </div>
  );
}
