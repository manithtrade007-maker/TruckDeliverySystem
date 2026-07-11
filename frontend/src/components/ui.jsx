// Shared presentational components — pure (props only), no app state.
// Extracted from main.jsx as the first safe step of splitting the monolith.
import { forwardRef } from "react";

export function Button({ variant = "primary", className = "", ...props }) {
  const base =
    "inline-flex min-h-10 items-center justify-center rounded-xl border px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none";
  const variants = {
    primary: "border-teal-700 bg-teal-700 text-white shadow-sm shadow-teal-900/10 hover:bg-teal-800",
    secondary: "border-slate-200 bg-white text-slate-800 shadow-sm hover:border-teal-700 hover:text-teal-800",
    quiet: "border-transparent bg-transparent text-slate-600 shadow-none hover:bg-slate-100",
    danger: "border-rose-100 bg-rose-50 text-rose-700 hover:border-rose-500 hover:bg-rose-100"
  };
  const styles = variants[variant] || variants.primary;
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

export const Input = forwardRef(function Input({ type, className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={`min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none ${className}`}
      {...(type === "date" ? { lang: "en-GB" } : {})}
      {...props}
    />
  );
});

export function Select({ children, className = "", ...props }) {
  return (
    <select
      className={`min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({ label, children }) {
  return (
    <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide text-slate-500">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Panel({ children, className = "", ...props }) {
  return (
    <section className={`rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm shadow-slate-900/5 ${className}`} {...props}>
      {children}
    </section>
  );
}

export function KpiCard({ label, value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    teal: "border-teal-200 bg-teal-50 text-teal-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    blue: "border-sky-200 bg-sky-50 text-sky-950"
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-sm shadow-slate-900/5 ${tones[tone] || tones.slate}`}>
      <div className="text-[11px] font-black uppercase tracking-wide opacity-60">{label}</div>
      <div className="mt-1 text-2xl font-black tracking-tight">{value}</div>
    </div>
  );
}

export function MetricCard({ icon, label, value, sub, tone = "slate", onClick }) {
  const tones = {
    slate: { wrap: "border-slate-200 bg-white", icon: "bg-slate-100 text-slate-600", value: "text-slate-900", sub: "text-slate-500" },
    teal:  { wrap: "border-teal-200 bg-gradient-to-br from-teal-50 to-white", icon: "bg-teal-100 text-teal-700", value: "text-teal-950", sub: "text-teal-600" },
    amber: { wrap: "border-amber-200 bg-gradient-to-br from-amber-50 to-white", icon: "bg-amber-100 text-amber-700", value: "text-amber-950", sub: "text-amber-600" },
    blue:  { wrap: "border-sky-200 bg-gradient-to-br from-sky-50 to-white", icon: "bg-sky-100 text-sky-700", value: "text-sky-950", sub: "text-sky-600" },
    red:   { wrap: "border-red-200 bg-gradient-to-br from-red-50 to-white", icon: "bg-red-100 text-red-600", value: "text-red-900", sub: "text-red-500" },
    emerald: { wrap: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white", icon: "bg-emerald-100 text-emerald-700", value: "text-emerald-950", sub: "text-emerald-600" },
  };
  const t = tones[tone] || tones.slate;
  return (
    <div className={`rounded-2xl border p-4 shadow-sm shadow-slate-900/5 ${t.wrap} ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`} onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${t.icon}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1 text-right">
          <div className="text-[10px] font-black uppercase tracking-wider opacity-60">{label}</div>
          <div className={`mt-0.5 text-xl font-black tracking-tight ${t.value}`}>{value}</div>
          {sub && <div className={`mt-0.5 text-xs font-bold ${t.sub}`}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export function PageHead({ title, meta, action }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-2xl font-black tracking-tight">{title}</h2>
        {meta && <div className="mt-1 text-sm font-bold text-slate-500">{meta}</div>}
      </div>
      {action}
    </div>
  );
}
