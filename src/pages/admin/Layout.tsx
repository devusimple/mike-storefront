import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { cn } from "../../lib/format";

const TABS = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/coupons", label: "Coupons" },
];

export function AdminGate() {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-gray-500">Loading…</div>;
  if (!user)
    return (
      <div className="text-center text-gray-500">
        Please <Link to="/login" className="text-emerald-700 underline">login</Link> as an admin.
      </div>
    );
  if (user.role !== "admin") return <div className="text-center text-red-600">Admin only.</div>;
  return (
    <div>
      <div className="mb-4 flex gap-1 border-b">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn("px-3 py-2 text-sm", isActive ? "border-b-2 border-emerald-600 font-semibold" : "text-gray-500")
            }
          >
            {t.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
