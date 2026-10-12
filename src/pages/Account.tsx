import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, tokenStore, type Address, type MyReview, type Order, type User } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { taka } from "../lib/format";

type Tab = "profile" | "addresses" | "orders" | "reviews";

export function AccountPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");
  if (!user) return <div className="text-center text-gray-500">Please login.</div>;

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "addresses", label: "Addresses" },
    { id: "orders", label: "Orders" },
    { id: "reviews", label: "Reviews" },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold">My account</h1>
      <div className="mt-3 flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm ${tab === t.id ? "border-b-2 border-emerald-600 font-semibold" : "text-gray-500"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tab === "profile" && <ProfileTab />}
        {tab === "addresses" && <AddressesTab />}
        {tab === "orders" && <OrdersTab />}
        {tab === "reviews" && <ReviewsTab />}
      </div>
    </div>
  );
}

function ProfileTab() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const r = await api<{ user: User }>("/api/auth/profile", { method: "PATCH", auth: true, body: { name, phone } });
      setUser(r.user);
      setMsg("Saved ✓");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    }
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    try {
      const sig = await api<{ uploadUrl: string; apiKey: string; timestamp: number; folder: string; signature: string }>(
        "/api/uploads/avatar-signature",
        { method: "POST", auth: true, body: {} },
      );
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sig.apiKey);
      form.append("timestamp", String(sig.timestamp));
      form.append("folder", sig.folder);
      form.append("signature", sig.signature);
      const up = (await (await fetch(sig.uploadUrl, { method: "POST", body: form })).json()) as {
        public_id: string;
        secure_url: string;
      };
      if (!up.secure_url) throw new Error("Upload failed");
      const r = await api<{ user: User }>("/api/auth/avatar", {
        method: "PUT",
        auth: true,
        body: { publicId: up.public_id, secureUrl: up.secure_url },
      });
      setUser(r.user);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Avatar upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    const r = await api<{ user: User }>("/api/auth/avatar", { method: "DELETE", auth: true });
    setUser(r.user);
  };

  const change = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    try {
      const pair = await api<{ accessToken: string; refreshToken: string }>("/api/auth/change-password", {
        method: "POST",
        auth: true,
        body: { currentPassword: current, newPassword: next },
      });
      tokenStore.set(pair);
      setCurrent("");
      setNext("");
      setPwMsg("Password changed — other devices logged out.");
    } catch (err) {
      setPwMsg(err instanceof Error ? err.message : "Change failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-xl border bg-white p-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-xl font-bold text-gray-400">
          {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : (user?.name?.[0] ?? "?")}
        </div>
        <div className="text-sm">
          <label className="cursor-pointer text-emerald-700 underline">
            {uploading ? "Uploading…" : user?.avatarUrl ? "Change photo" : "Upload photo"}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAvatar(f);
                e.target.value = "";
              }}
            />
          </label>
          {user?.avatarUrl && (
            <button onClick={removeAvatar} className="ml-3 text-gray-500 underline">
              Remove
            </button>
          )}
          <div className="mt-1 text-gray-500">{user?.email}</div>
          <div className="mt-0.5 text-xs">
            {user?.emailVerified ? (
              <span className="text-emerald-700">Email verified ✓</span>
            ) : (
              <span>
                <span className="text-amber-700">Email not verified.</span>{" "}
                <button
                  className="underline"
                  onClick={() => {
                    api("/api/auth/request-verification", { method: "POST", auth: true, body: {} }).catch(() => {});
                    setResent(true);
                  }}
                >
                  {resent ? "Sent ✓" : "Resend link"}
                </button>
              </span>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={save} className="rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold">Personal info</h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded-lg border px-3 py-2 text-sm" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (for delivery)" className="rounded-lg border px-3 py-2 text-sm" />
        </div>
        {msg && <p className="mt-2 text-sm text-gray-700">{msg}</p>}
        <button className="mt-3 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white">Save</button>
      </form>

      <form onSubmit={change} className="rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold">Change password</h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <input type="password" required placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
          <input type="password" required minLength={8} placeholder="New password (min 8)" value={next} onChange={(e) => setNext(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
        </div>
        {pwMsg && <p className="mt-2 text-sm text-gray-700">{pwMsg}</p>}
        <button className="mt-3 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white">Change password</button>
      </form>
    </div>
  );
}

const EMPTY_ADDR = { label: "Home", name: "", phone: "", line1: "", line2: "", city: "", postalCode: "" };

function AddressesTab() {
  const [list, setList] = useState<Address[]>([]);
  const [form, setForm] = useState(EMPTY_ADDR);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => api<{ addresses: Address[] }>("/api/addresses", { auth: true }).then((r) => setList(r.addresses));
  useEffect(() => {
    load().catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editing) {
        await api(`/api/addresses/${editing}`, { method: "PUT", auth: true, body: form });
      } else {
        await api("/api/addresses", { method: "POST", auth: true, body: form });
      }
      setForm(EMPTY_ADDR);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const input = "rounded-lg border px-3 py-2 text-sm";
  return (
    <div>
      <div className="space-y-2">
        {list.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border bg-white p-3 text-sm">
            <div>
              <div className="font-medium">
                {a.label} {a.isDefault && <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">default</span>}
              </div>
              <div className="text-gray-600">{a.name} · {a.phone}</div>
              <div className="text-gray-600">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}{a.postalCode ? ` ${a.postalCode}` : ""}</div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => {
                  setEditing(a.id);
                  setForm({ label: a.label, name: a.name, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", city: a.city, postalCode: a.postalCode ?? "" });
                }}
                className="text-emerald-700 hover:underline"
              >
                Edit
              </button>
              <button
                onClick={async () => {
                  await api(`/api/addresses/${a.id}`, { method: "DELETE", auth: true });
                  await load();
                }}
                className="text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-gray-500">No addresses yet — add your delivery address below.</p>}
      </div>

      <form onSubmit={submit} className="mt-4 rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold">{editing ? "Edit address" : "New address"}</h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Label (Home, Office)" className={input} />
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Receiver name" required className={input} />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" required className={input} />
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" required className={input} />
          <input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} placeholder="House, road, area" required className={`${input} sm:col-span-2`} />
          <input value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} placeholder="Landmark (optional)" className={input} />
          <input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} placeholder="Postal code (optional)" className={input} />
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white">{editing ? "Save" : "Add address"}</button>
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setForm(EMPTY_ADDR); }} className="rounded-lg border px-4 py-2 text-sm">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    api<{ orders: Order[] }>("/api/orders", { auth: true }).then((r) => setOrders(r.orders)).catch(() => {});
  }, []);
  if (!orders.length) return <p className="text-sm text-gray-500">No orders yet.</p>;
  return (
    <div className="space-y-2">
      {orders.slice(0, 10).map((o) => (
        <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center justify-between rounded-xl border bg-white p-3 text-sm hover:shadow-sm">
          <div>
            <div className="font-medium">Order {o.id.slice(0, 8)}</div>
            <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString()} · {o.status}</div>
          </div>
          <div className="font-semibold">{taka(o.totalCents)}</div>
        </Link>
      ))}
      <Link to="/orders" className="block text-center text-sm text-emerald-700 underline">
        View all orders
      </Link>
    </div>
  );
}

function ReviewsTab() {
  const [reviews, setReviews] = useState<MyReview[]>([]);
  useEffect(() => {
    api<{ reviews: MyReview[] }>("/api/reviews/mine", { auth: true }).then((r) => setReviews(r.reviews)).catch(() => {});
  }, []);
  if (!reviews.length) return <p className="text-sm text-gray-500">No reviews yet — they appear here after you review a product.</p>;
  return (
    <div className="space-y-2">
      {reviews.map((r) => (
        <div key={r.id} className="flex items-start justify-between gap-3 rounded-xl border bg-white p-3 text-sm">
          <div>
            {r.product ? (
              <Link to={`/p/${r.product.slug}`} className="font-medium hover:underline">
                {r.product.name}
              </Link>
            ) : (
              <span className="text-gray-400">(removed product)</span>
            )}
            <div className="text-amber-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
            {r.comment && <p className="mt-1 text-gray-700">{r.comment}</p>}
          </div>
          <button
            onClick={async () => {
              await api(`/api/reviews/${r.id}`, { method: "DELETE", auth: true });
              setReviews((prev) => prev.filter((x) => x.id !== r.id));
            }}
            className="shrink-0 text-red-600 hover:underline"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

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
