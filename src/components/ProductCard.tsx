import { Link } from "react-router-dom";
import { taka } from "../lib/format";
import type { Product } from "../lib/api";

export function ProductCard({ product }: { product: Product }) {
  const img = product.images?.[0]?.secureUrl;
  return (
    <Link
      to={`/p/${product.slug}`}
      className="group overflow-hidden rounded-xl border bg-white transition hover:shadow-md"
    >
      <div className="aspect-square bg-gray-100">
        {img ? (
          <img src={img} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
            No image
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="truncate text-sm font-medium group-hover:underline">{product.name}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-semibold">{taka(product.priceCents)}</span>
          {product.comparePriceCents && product.comparePriceCents > product.priceCents && (
            <span className="text-xs text-gray-400 line-through">{taka(product.comparePriceCents)}</span>
          )}
        </div>
        {product.stock <= 0 && <div className="mt-1 text-xs text-red-600">Out of stock</div>}
      </div>
    </Link>
  );
}
