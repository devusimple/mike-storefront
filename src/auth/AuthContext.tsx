import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, tokenStore, type User } from "../lib/api";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.access) {
      setLoading(false);
      return;
    }
    api<{ user: User }>("/api/auth/me", { auth: true })
      .then((r) => setUser(r.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const afterAuth = useCallback(async (pair: { accessToken: string; refreshToken: string }) => {
    tokenStore.set(pair);
    const me = await api<{ user: User }>("/api/auth/me", { auth: true });
    setUser(me.user);
    // Merge any anonymous cart into the account (best-effort).
    const guestToken = localStorage.getItem("mike.guestToken");
    if (guestToken) {
      try {
        await api("/api/cart/merge", { method: "POST", auth: true, body: { guestToken } });
      } catch {
        /* empty or already merged — ignore */
      }
      localStorage.removeItem("mike.guestToken");
    }
    window.dispatchEvent(new Event("mike:cart-changed"));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const r = await api<{ user: User; accessToken: string; refreshToken: string }>(
        "/api/auth/login",
        { method: "POST", body: { email, password } },
      );
      await afterAuth(r);
    },
    [afterAuth],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const r = await api<{ user: User; accessToken: string; refreshToken: string }>(
        "/api/auth/register",
        { method: "POST", body: { name, email, password } },
      );
      await afterAuth(r);
    },
    [afterAuth],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.refresh;
    if (refreshToken) {
      try {
        await api("/api/auth/logout", { method: "POST", body: { refreshToken } });
      } catch {
        /* ignore */
      }
    }
    tokenStore.clear();
    setUser(null);
    window.dispatchEvent(new Event("mike:cart-changed"));
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, setUser }),
    [user, loading, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
