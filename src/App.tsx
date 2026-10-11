import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { CartProvider } from "./cart/CartContext";
import { Header } from "./components/Header";
import { HomePage } from "./pages/Home";
import { ProductPage } from "./pages/Product";
import { CartPage } from "./pages/Cart";
import { CheckoutPage } from "./pages/Checkout";
import { LoginPage, RegisterPage } from "./pages/Auth";
import { OrderPage, OrdersPage } from "./pages/Orders";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <div className="min-h-screen bg-gray-50 text-gray-900">
            <Header />
            <main className="mx-auto max-w-6xl px-4 py-6">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/p/:slug" element={<ProductPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/:id" element={<OrderPage />} />
              </Routes>
            </main>
          </div>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
