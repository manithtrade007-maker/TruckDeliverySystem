import { useState } from "react";
import { setToken, setRole } from "../lib/api.js";

export function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed."); return; }
      setToken(data.token);
      setRole(data.role);
      onLogin(data.role);
    } catch {
      setError("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-600 shadow-lg shadow-teal-900/40">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">N&M Logistic</h1>
          <p className="mt-1 text-sm font-bold text-slate-400">Truck Delivery System</p>
        </div>
        <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/10 p-6 shadow-2xl">
          <h2 className="mb-5 text-base font-black text-white">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <label className="text-xs font-black uppercase tracking-wide text-slate-300">Username</label>
              <input
                type="text" autoComplete="username" autoFocus required
                value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white placeholder-slate-400 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                placeholder="Enter username"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-black uppercase tracking-wide text-slate-300">Password</label>
              <input
                type="password" autoComplete="current-password" required
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white placeholder-slate-400 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                placeholder="Enter password"
              />
            </div>
            {error && <p className="rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-2 text-xs font-black text-red-300">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="mt-1 w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-teal-900/30 hover:bg-teal-500 disabled:opacity-60 transition"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
