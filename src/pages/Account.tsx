import { useEffect, useState } from "react";
import { api, tokenStore } from "../lib/api";
import { useAuth } from "../auth/AuthContext";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/api/auth/forgot-password", { method: "POST", body: { email } });
    setDone(true);
  };

  if (done) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <h1 className="text-xl font-bold">Check your email</h1>
        <p className="mt-2 text-sm text-gray-600">If an account exists for {email}, a reset link is on its way.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-xl font-bold">Forgot password</h1>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />
        <button className="w-full rounded-lg bg-emerald-600 py-2 text-white">Send reset link</button>
      </form>
    </div>
  );
}

export function ResetPasswordPage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/auth/reset-password", { method: "POST", body: { token, password } });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    }
  };

  if (!token) return <div className="text-center text-red-600">Missing reset token.</div>;
  if (done) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <h1 className="text-xl font-bold">Password reset</h1>
        <p className="mt-2 text-sm text-gray-600">
          Done — all other sessions were logged out. <a href="/login" className="text-emerald-700 underline">Login</a>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-xl font-bold">Set new password</h1>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input
          type="password"
          required
          minLength={8}
          placeholder="New password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded-lg bg-emerald-600 py-2 text-white">Reset password</button>
      </form>
    </div>
  );
}

export function VerifyEmailPage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"idle" | "ok" | "error">("idle");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    api("/api/auth/verify-email", { method: "POST", body: { token } })
      .then(() => setState("ok"))
      .catch(() => setState("error"));
  }, [token]);

  return (
    <div className="mx-auto max-w-sm text-center">
      <h1 className="text-xl font-bold">Email verification</h1>
      {state === "idle" && <p className="mt-2 text-sm text-gray-500">Verifying…</p>}
      {state === "ok" && <p className="mt-2 text-sm text-emerald-700">Verified ✓ — <a href="/" className="underline">start shopping</a></p>}
      {state === "error" && <p className="mt-2 text-sm text-red-600">Invalid or expired link.</p>}
    </div>
  );
}

export function AccountPage() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  if (!user) return <div className="text-center text-gray-500">Please login.</div>;

  const resend = async () => {
    await api("/api/auth/request-verification", { method: "POST", auth: true, body: {} }).catch(() => {});
    setResent(true);
  };

  const change = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const pair = await api<{ accessToken: string; refreshToken: string }>("/api/auth/change-password", {
        method: "POST",
        auth: true,
        body: { currentPassword: current, newPassword: next },
      });
      tokenStore.set(pair);
      setCurrent("");
      setNext("");
      setMsg("Password changed — other devices logged out.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Change failed");
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-bold">Account</h1>
      <div className="mt-3 rounded-xl border bg-white p-4 text-sm">
        <div>{user.name}</div>
        <div className="text-gray-500">{user.email}</div>
        <div className="mt-1">
          {user.emailVerified ? (
            <span className="text-emerald-700">Email verified ✓</span>
          ) : (
            <span>
              <span className="text-amber-700">Email not verified.</span>{" "}
              <button onClick={resend} className="underline">
                {resent ? "Sent ✓" : "Resend link"}
              </button>
            </span>
          )}
        </div>
      </div>
      <form onSubmit={change} className="mt-4 rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold">Change password</h2>
        <input
          type="password"
          required
          placeholder="Current password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="New password (min 8)"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
        />
        {msg && <p className="mt-2 text-sm text-gray-700">{msg}</p>}
        <button className="mt-2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white">Change password</button>
      </form>
    </div>
  );
}
