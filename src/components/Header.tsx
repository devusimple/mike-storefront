import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../cart/CartContext";

export function Header() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/" className="text-xl font-bold tracking-tight">
          Mike<span className="text-emerald-600">.</span>
        </Link>
        <nav className="ml-4 flex gap-3 text-sm text-gray-600">
          <Link to="/" className="hover:text-black">
            Shop
          </Link>
          <Link to="/orders" className="hover:text-black">
            Orders
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <Link to="/cart" className="rounded-full border px-3 py-1 hover:bg-gray-50">
            Cart ({count})
          </Link>
          {user ? (
            <>
              <span className="hidden text-gray-500 sm:inline">{user.name}</span>
              <button
                className="rounded-full border px-3 py-1 hover:bg-gray-50"
                onClick={() => logout().then(() => navigate("/"))}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-black">
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-700"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
