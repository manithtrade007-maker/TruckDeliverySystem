import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const localDate = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const today = () => localDate();
const currentMonth = () => localDate().slice(0, 7);
const money = (value) => Number(value || 0).toFixed(2);
const unitMoney = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0.000";
  const [whole, decimal = ""] = String(number).split(".");
  return `${whole}.${decimal.slice(0, 3).padEnd(3, "0")}`;
};
const parseMoney = (value) => {
  const number = Number(String(value || "").replace(/[$,\s]/g, ""));
  return Number.isFinite(number) ? number : "";
};
const locationMatchKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\bkh[\s.]*/g, "khan")
    .replace(/[^a-z0-9]+/g, "");
const locationBaseKey = (value) => locationMatchKey(String(value || "").replace(/\([^)]*\)/g, "").replace(/^\s*d\s*\.\s*/i, ""));
const priceEffectiveDate = (price) => price.effectiveDate || `${price.effectiveMonth || "2026-01"}-01`;
const routeKey = (price) => [price.fromLocation, locationBaseKey(price.toLocation), price.truckType].join("::");
const CRANE_LOCATION_ORDER = [
  // PP (14)
  "KH.Kambol (PP)",
  "KH.Dangkao (PP)",
  "KH.Mean Chey (PP)",
  "KH.Chamkar Morn (PP)",
  "KH.Boeng Keng Kong (PP)",
  "KH.Doun Penh (PP)",
  "KH.7 Makara (PP)",
  "KH.Tuol Kouk (PP)",
  "KH.Sen Sok (PP)",
  "KH.Russei Keo (PP)",
  "KH.Chba Ampeou (PP)",
  "KH.Posenchey (PP)",
  "KH.Prek Phnov (PP)",
  "KH.Chroy Changvar (PP)",
  // Kandal (11)
  "D.Takhmao (Kandal)",
  "D.Kandal Stueng (Kandal)",
  "D.Saang (Kandal)",
  "D.Kien Svay (Kandal)",
  "D.Ang Snuol (Kandal)",
  "D.Muk Kampoul (Kandal)",
  "D.Khsach Kandal (Kandal)",
  "D.Ponhea Leu (Kandal)",
  "D.Koh Thom (Kandal)",
  "D.Leukdek (Kandal)",
  "D.Lvea Em (Kandal)",
  // Takeo (10)
  "D.Bati (Takeo)",
  "D.Samrong (Takeo)",
  "D.Prey Kabas (Takeo)",
  "D.Daun Keo (Takeo)",
  "D.Treang (Takeo)",
  "D.Angkor Borei (Takeo)",
  "D.Tram Kak (Takeo)",
  "D.Koh Andet (Takeo)",
  "D.Borei Chulsar (Takeo)",
  "D.Kirivong (Takeo)",
  // K.Speu (7)
  "D.Kong Pisei (K.Speu)",
  "D.Chbar Morn (K.Speu)",
  "D.Oudong (K.Speu)",
  "D.Samrong Torng (K.Speu)",
  "D.Baset (K.Speu)",
  "D.Phnom Srouch (K.Speu)",
  "D.Thpong (K.Speu)",
  // Prey Veng (13)
  "D.Peam Ro (Prey Veng)",
  "D.Pea Reang (Prey Veng)",
  "D.Baphnom (Prey Veng)",
  "D.Peam Chor (Prey Veng)",
  "D.Kampong Trabek (Prey Veng)",
  "D.Preah Sdach (Prey Veng)",
  "D.Prey Veng (Prey Veng)",
  "D.Po Rieng (Prey Veng)",
  "D.Sithor Kandal (Prey Veng)",
  "D.Mesang (Prey Veng)",
  "D.Svay Antor (Prey Veng)",
  "D.Kanh Chreach (Prey Veng)",
  "D.Kamchay Mea (Prey Veng)",
  // Svay Rieng (6)
  "D.Svay Chrum (Svay Rieng)",
  "D.Svay Rieng (Svay Rieng)",
  "D.Rum Duol (Svay Rieng)",
  "D.Romeas Hek (Svay Rieng)",
  "D.Svay Tiep (Svay Rieng)",
  "D.Kompong Ro (Svay Rieng)",
  // K.Chhnan (7)
  "D.Kampong Tralach (K.Chhnan)",
  "D.Rolear Phiear (K.Chhnan)",
  "D.Kampong Chhnang (K.Chhnan)",
  "D.Chulkiri (K.Chhnan)",
  "D.Tuek Phos (K.Chhnan)",
  "D.Boribo (K.Chhnan)",
  "D.Kampong Leng (K.Chhnan)",
  // K.Cham (4)
  "D.Srey Santhor (K.Cham)",
  "D.Batheay (K.Cham)",
  "D.Prey Chhor (K.Cham)",
  "D.Kampong Siem (K.Cham)",
];
const NO_CRANE_LOCATION_ORDER = [
  "KH.Kambol (PP)", "KH.Dangkao (PP)", "KH.Mean Chey (PP)", "KH.Chamkar Morn (PP)",
  "KH.Boeng Keng Kong (PP)", "KH.Doun Penh (PP)", "KH.7 Makara (PP)", "KH.Tuol Kouk (PP)",
  "KH.Sen Sok (PP)", "KH.Russei Keo (PP)", "KH.Chba Ampeou (PP)", "KH.Posenchey (PP)",
  "KH.Prek Phnov (PP)", "KH.Chroy Changvar (PP)",
  "D.Takhmao (Kandal)", "D.Kandal Stueng (Kandal)", "D.Saang (Kandal)", "D.Kien Svay (Kandal)",
  "D.Ang Snuol (Kandal)", "D.Muk Kampoul (Kandal)", "D.Khsach Kandal (Kandal)",
  "D.Ponhea Leu (Kandal)", "D.Koh Thom (Kandal)", "D.Leukdek (Kandal)", "D.Lvea Em (Kandal)",
  "D.Bati (Takeo)", "D.Samrong (Takeo)", "D.Prey Kabas (Takeo)", "D.Daun Keo (Takeo)",
  "D.Treang (Takeo)", "D.Angkor Borei (Takeo)", "D.Tram Kak (Takeo)", "D.Koh Andet (Takeo)",
  "D.Borei Chulsar (Takeo)", "D.Kirivong (Takeo)",
  "D.Kong Pisei (K.Speu)", "D.Chbar Morn (K.Speu)", "D.Oudong (K.Speu)",
  "D.Samrong Torng (K.Speu)", "D.Baset (K.Speu)", "D.Phnom Srouch (K.Speu)",
  "D.Thpong (K.Speu)", "D.Kirirom (K.Speu)", "D.Oral (K.Speu)",
  "D.Peam Ro (Prey Veng)", "D.Pea Reang (Prey Veng)", "D.Baphnom (Prey Veng)",
  "D.Peam Chor (Prey Veng)", "D.Kampong Trabek (Prey Veng)", "D.Preah Sdach (Prey Veng)",
  "D.Prey Veng (Prey Veng)", "D.Po Rieng (Prey Veng)", "D.Sithor Kandal (Prey Veng)",
  "D.Mesang (Prey Veng)", "D.Svay Antor (Prey Veng)", "D.Kanh Chreach (Prey Veng)",
  "D.Kamchay Mea (Prey Veng)",
  "D.Svay Chrum (Svay Rieng)", "D.Svay Rieng (Svay Rieng)", "D.Rum Duol (Svay Rieng)",
  "D.Romeas Hek (Svay Rieng)", "D.Svay Tiep (Svay Rieng)", "D.Kompong Ro (Svay Rieng)",
  "D.Bavet (Svay Rieng)", "D.Chantrea (Svay Rieng)",
  "D.Angkor Chey (Kampot)", "D.Chhouk (Kampot)", "D.Chumkiri (Kampot)",
  "D.Dong Tung (Kampot)", "D.Kampong Trach (Kampot)", "D.Kampot (Kampot)", "D.Tuek Chhu (Kampot)",
  "D.Damnak Changeor (Kep)", "D.Kep (Kep)",
  "D.Samaki Meanchey (K.Chhnan)", "D.Kampong Tralach (K.Chhnan)", "D.Rolear Phiear (K.Chhnan)",
  "D.Kampong Chhnang (K.Chhnan)", "D.Chulkiri (K.Chhnan)", "D.Tuek Phos (K.Chhnan)",
  "D.Boribo (K.Chhnan)", "D.Kampong Leng (K.Chhnan)",
  "D.Srey Santhor (K.Cham)", "D.Batheay (K.Cham)", "D.Prey Chhor (K.Cham)",
  "D.Kampong Siem (K.Cham)", "D.Chamkar Leu (K.Cham)", "D.Kang Meas (K.Cham)",
  "D.Santuk (K.Thom)", "D.Stueng Sen (K.Thom)", "D.Staung (K.Thom)",
];
const makeLocationSort = (order) => (a, b) => {
  const ai = order.indexOf(a);
  const bi = order.indexOf(b);
  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;
  return a.localeCompare(b);
};
const craneLocationSort = makeLocationSort(CRANE_LOCATION_ORDER);
const noCraneLocationSort = makeLocationSort(NO_CRANE_LOCATION_ORDER);
const deliverySort = (a, b) =>
  String(a.deliveryDate || "").localeCompare(String(b.deliveryDate || "")) ||
  String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
const truckTypeLabel = (truckType) => truckType === "With Crane" ? "Crane" : truckType === "Without Crane" ? "No Crane" : truckType;
const formatDate = (value) => {
  const text = String(value || "");
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return text;
  return `${match[3]}.${match[2]}.${match[1]}`;
};
const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  return `${formatDate(localDate(date))} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};
const monthName = (value) => {
  if (!value) return "";
  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

function groupPriceHistory(prices) {
  const groups = new Map();
  for (const price of prices) {
    const key = routeKey(price);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        fromLocation: price.fromLocation,
        toLocation: price.toLocation,
        truckType: price.truckType,
        versions: []
      });
    }
    groups.get(key).versions.push(price);
  }
  return [...groups.values()]
    .map((group) => {
      const versions = group.versions
        .slice()
        .sort((a, b) => priceEffectiveDate(b).localeCompare(priceEffectiveDate(a)));
      const activePrice =
        versions.find((price) => price.active !== false && priceEffectiveDate(price) <= today()) ||
        versions.find((price) => price.active !== false) ||
        null;
      return { ...group, toLocation: activePrice?.toLocation || versions[0]?.toLocation || group.toLocation, versions, activePrice };
    })
    .sort((a, b) => a.toLocation.localeCompare(b.toLocation));
}

function getToken() { return localStorage.getItem("auth_token") || ""; }
function getRole() { return localStorage.getItem("auth_role") || ""; }
function setToken(t) {
  if (t) localStorage.setItem("auth_token", t);
  else { localStorage.removeItem("auth_token"); localStorage.removeItem("auth_role"); }
}
function setRole(r) { if (r) localStorage.setItem("auth_role", r); else localStorage.removeItem("auth_role"); }

async function api(path, options = {}) {
  const token = getToken();
  const { headers: extraHeaders, ...rest } = options;
  const response = await fetch(path, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(extraHeaders || {}),
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    }
  });
  if (response.status === 401) {
    setToken("");
    window.dispatchEvent(new CustomEvent("auth-logout"));
    throw new Error("Session expired. Please sign in again.");
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

async function downloadFile(url) {
  const token = getToken();
  const response = await fetch(url, token ? { headers: { "Authorization": `Bearer ${token}` } } : {});
  if (response.status === 401) {
    setToken("");
    window.dispatchEvent(new CustomEvent("auth-logout"));
    throw new Error("Session expired. Please sign in again.");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Download failed.");
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  const filename = match ? match[1].replace(/['"]/g, "").trim() : "export";
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

function Button({ variant = "primary", className = "", ...props }) {
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

const Input = React.forwardRef(function Input({ type, className = "", ...props }, ref) {
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

function Select({ children, className = "", ...props }) {
  return (
    <select
      className={`min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide text-slate-500">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Panel({ children, className = "", ...props }) {
  return (
    <section className={`rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm shadow-slate-900/5 ${className}`} {...props}>
      {children}
    </section>
  );
}

function KpiCard({ label, value, tone = "slate" }) {
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

function MetricCard({ icon, label, value, sub, tone = "slate", onClick }) {
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

function PageHead({ title, meta, action }) {
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

function LoginPage({ onLogin }) {
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

function App() {
  const [loggedIn, setLoggedIn] = useState(Boolean(getToken()));
  const [userRole, setUserRole] = useState(getRole);
  const isAdmin = userRole === "admin";
  const [page, setPage] = useState("dashboard");
  const [data, setData] = useState({ settings: {}, trucks: [], prices: [], statements: [], deliveries: [] });
  const [selectedStatementId, setSelectedStatementId] = useState("");
  const [viewStatementId, setViewStatementId] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [reportMonth, setReportMonth] = useState(currentMonth());
  const [reportTruckNo, setReportTruckNo] = useState("");
  const [deductionEdits, setDeductionEdits] = useState({});
  const [assignModal, setAssignModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ statement: null, password: "", error: "" });
  const [assignMonth, setAssignMonth] = useState(currentMonth());
  const [paymentsViewMonth, setPaymentsViewMonth] = useState(currentMonth());
  const [quickForm, setQuickForm] = useState({ statementNumber: "", month: currentMonth(), manualAmount: "" });
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [entryTruckType, setEntryTruckType] = useState("With Crane");
  const [entryActionTruckType, setEntryActionTruckType] = useState("");
  const [showStatementWorkspace, setShowStatementWorkspace] = useState(false);
  const [statementForm, setStatementForm] = useState({
    id: "",
    month: currentMonth(),
    truckType: "With Crane",
    statementNumber: "",
    statementDate: today()
  });
  const [deliveryForm, setDeliveryForm] = useState({
    id: "",
    deliveryDate: today(),
    invoiceNo: "",
    truckNo: "",
    fromLocation: "",
    toLocation: "",
    qtyTon: ""
  });
  const invoiceInputRef = useRef(null);
  const deliveryFormRef = useRef(null);
  const [activeField, setActiveField] = useState("");
  const [filters, setFilters] = useState({ month: currentMonth(), statementNumber: "" });
  const [setupSection, setSetupSection] = useState("trucks");
  const [setupLocationSearch, setSetupLocationSearch] = useState("");
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [truckForm, setTruckForm] = useState({ truckNo: "", truckType: "With Crane", driverName: "", phone: "" });
  const [priceForm, setPriceForm] = useState({
    id: "",
    fromLocation: "",
    toLocation: "",
    truckType: "With Crane",
    distanceKm: "",
    companyUnitPrice: "",
    truckSalaryUnitPrice: "",
    effectiveDate: today()
  });
  const [driverPriceForm, setDriverPriceForm] = useState({
    id: "",
    fromLocation: "",
    toLocation: "",
    truckType: "With Crane",
    distanceKm: "",
    truckSalaryUnitPrice: "",
    effectiveDate: today()
  });
  const [bulkPriceForm, setBulkPriceForm] = useState({
    priceType: "company",
    truckType: "With Crane",
    fromLocation: "",
    effectiveDate: today(),
    locationsText: "",
    pricesText: "",
    driverPricesText: "",
    rowsText: ""
  });
  const [settingsForm, setSettingsForm] = useState({ companyName: "", defaultFromLocation: "" });
  const [staffUsers, setStaffUsers] = useState([]);
  const [newUserForm, setNewUserForm] = useState({ username: "", password: "", role: "staff" });
  const [editPasswordId, setEditPasswordId] = useState(null);
  const [editPasswordValue, setEditPasswordValue] = useState("");
  const [backupFiles, setBackupFiles] = useState([]);
  const [emptyPriceResult, setEmptyPriceResult] = useState(null);
  const [bulkLocationFilter, setBulkLocationFilter] = useState("");
  const [priceCompareDate, setPriceCompareDate] = useState(() => today());
  const [priceCompareProvince, setPriceCompareProvince] = useState("");
  const [pricePeriodsMonth, setPricePeriodsMonth] = useState(today().slice(0, 7));

  const selectedStatement = useMemo(
    () => data.statements.find((statement) => statement.id === selectedStatementId),
    [data.statements, selectedStatementId]
  );

  const selectedViewStatement = useMemo(
    () => data.statements.find((statement) => statement.id === viewStatementId),
    [data.statements, viewStatementId]
  );

  const statementRows = useMemo(
    () =>
      data.deliveries
        .filter((row) => row.statementId === selectedStatementId)
        .sort(deliverySort),
    [data.deliveries, selectedStatementId]
  );

  const viewStatementRows = useMemo(
    () =>
      data.deliveries
        .filter((row) => row.statementId === viewStatementId)
        .sort(deliverySort),
    [data.deliveries, viewStatementId]
  );

  const visibleStatements = useMemo(
    () => data.statements.filter((statement) => !(statement.status === "Draft" && Number(statement.rowCount || 0) === 0)),
    [data.statements]
  );

  const filteredStatements = useMemo(() => {
    const statementNumber = String(filters.statementNumber || "").trim();
    return visibleStatements
      .filter((statement) => statementNumber || !filters.month || statement.month === filters.month)
      .filter((statement) => !statementNumber || String(statement.statementNumber).includes(statementNumber))
      .sort((a, b) => b.month.localeCompare(a.month) || Number(b.statementNumber) - Number(a.statementNumber));
  }, [visibleStatements, filters]);

  const statementCounts = useMemo(() => {
    const month = filters.month || statementForm.month || currentMonth();
    const rows = visibleStatements.filter((statement) => statement.month === month);
    const craneRows = rows.filter((statement) => statement.truckType === "With Crane");
    const noCraneRows = rows.filter((statement) => statement.truckType === "Without Crane");
    return {
      month,
      withCrane: craneRows.length,
      withoutCrane: noCraneRows.length,
      total: rows.length,
      craneAmount: craneRows.reduce((sum, s) => sum + Number(s.companyTotalAmount || 0), 0),
      noCraneAmount: noCraneRows.reduce((sum, s) => sum + Number(s.companyTotalAmount || 0), 0),
      totalAmount: rows.reduce((sum, s) => sum + Number(s.companyTotalAmount || 0), 0),
    };
  }, [visibleStatements, filters.month, statementForm.month]);

  const truckOptions = useMemo(
    () => data.trucks.filter((truck) => selectedStatement && truck.active !== false && truck.truckType === selectedStatement.truckType),
    [data.trucks, selectedStatement]
  );

  const selectedTruck = data.trucks.find((truck) => truck.truckNo === deliveryForm.truckNo);
  const activeDeliveryTruckType = selectedTruck?.truckType || selectedStatement?.truckType || "";
  const locations = useMemo(
    () =>
      [
        ...new Set(
          data.prices
            .filter((price) => price.active !== false)
            .filter((price) => !activeDeliveryTruckType || price.truckType === activeDeliveryTruckType)
            .map((price) => price.toLocation)
            .filter(Boolean)
        )
      ].sort(),
    [data.prices, activeDeliveryTruckType]
  );

  const fromLocations = useMemo(
    () => [...new Set(data.prices.filter((p) => p.active !== false).map((p) => p.fromLocation).filter(Boolean))].sort(),
    [data.prices]
  );

  const selectedPrice = selectedTruck
    ? data.prices
        .filter((price) => price.active !== false)
        .filter((price) => price.fromLocation === data.settings.defaultFromLocation)
        .filter((price) => price.toLocation === deliveryForm.toLocation)
        .filter((price) => price.truckType === selectedTruck.truckType)
        .filter((price) => priceEffectiveDate(price) <= (deliveryForm.deliveryDate || today()))
        .sort((a, b) => priceEffectiveDate(b).localeCompare(priceEffectiveDate(a)))[0]
    : null;

  const totals = statementRows.reduce(
    (sum, row) => ({
      qty: sum.qty + Number(row.qtyTon || 0),
      amount: sum.amount + Number(row.companyTotalAmount || 0)
    }),
    { qty: 0, amount: 0 }
  );

  const viewTotals = viewStatementRows.reduce(
    (sum, row) => ({
      qty: sum.qty + Number(row.qtyTon || 0),
      amount: sum.amount + Number(row.companyTotalAmount || 0)
    }),
    { qty: 0, amount: 0 }
  );

  const monthlyRows = useMemo(
    () => {
      const activeTruckNos = new Set(data.trucks.map((truck) => truck.truckNo));
      return data.deliveries
        .filter((row) => !reportMonth || row.deliveryDate?.slice(0, 7) === reportMonth)
        .filter((row) => activeTruckNos.has(row.truckNo));
    },
    [data.deliveries, data.trucks, reportMonth]
  );

  const monthlyTotals = useMemo(
    () =>
      monthlyRows.reduce(
        (sum, row) => {
          const companyAmount = Number(row.companyTotalAmount || 0);
          const driverAmount = Number(row.truckSalaryAmount || 0);
          return {
            trips: sum.trips + 1,
            qty: sum.qty + Number(row.qtyTon || 0),
            companyAmount: sum.companyAmount + companyAmount,
            driverAmount: sum.driverAmount + driverAmount,
            margin: sum.margin + companyAmount - driverAmount
          };
        },
        { trips: 0, qty: 0, companyAmount: 0, driverAmount: 0, margin: 0 }
      ),
    [monthlyRows]
  );

  const truckPerformance = useMemo(() => {
    const byTruck = new Map();
    for (const truck of data.trucks) {
      byTruck.set(truck.truckNo, {
        truckNo: truck.truckNo,
        truckType: truck.truckType,
        driverName: truck.driverName,
        trips: 0,
        days: new Set(),
        qty: 0,
        companyAmount: 0,
        driverAmount: 0,
        margin: 0
      });
    }
    for (const row of monthlyRows) {
      if (!byTruck.has(row.truckNo)) continue;
      const item = byTruck.get(row.truckNo);
      const companyAmount = Number(row.companyTotalAmount || 0);
      const driverAmount = Number(row.truckSalaryAmount || 0);
      item.trips += 1;
      if (row.deliveryDate) item.days.add(row.deliveryDate);
      item.qty += Number(row.qtyTon || 0);
      item.companyAmount += companyAmount;
      item.driverAmount += driverAmount;
      item.margin += companyAmount - driverAmount;
    }
    return [...byTruck.values()]
      .map((item) => ({ ...item, workingDays: item.days.size }))
      .sort((a, b) => b.companyAmount - a.companyAmount || a.truckNo.localeCompare(b.truckNo));
  }, [data.trucks, monthlyRows]);

  const driverPaymentSections = useMemo(
    () =>
      truckPerformance
        .filter((truck) => truck.trips > 0)
        .map((truck) => ({
          ...truck,
          rows: monthlyRows
            .filter((row) => row.truckNo === truck.truckNo)
            .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
        })),
    [truckPerformance, monthlyRows]
  );

  const activeTruckCount = truckPerformance.filter((truck) => truck.trips > 0).length;

  const dashOutstanding = useMemo(() => {
    const allStatements = data.statements || [];
    const allPaymentMonths = data.paymentMonths || [];
    const thisMonth = currentMonth();
    const list = allStatements.filter((s) =>
      (s.paymentMonth && !allPaymentMonths.find((pm) => pm.month === s.paymentMonth && pm.received)) ||
      (!s.paymentMonth && s.month === thisMonth)
    );
    return { count: list.length, amount: list.reduce((sum, s) => sum + Number(s.companyTotalAmount || 0), 0) };
  }, [data.statements, data.paymentMonths]);

  const selectedDriverPaymentSection = driverPaymentSections.find((truck) => truck.truckNo === reportTruckNo);
  const isEditingTruck = data.trucks.some((truck) => truck.truckNo === truckForm.truckNo);
  const setupLocationSearchKey = locationMatchKey(setupLocationSearch);
  const matchesSetupLocationSearch = (value) => !setupLocationSearchKey || locationMatchKey(value).includes(setupLocationSearchKey);
  const filteredCompanyPrices = data.prices
    .filter((price) => price.truckType === priceForm.truckType)
    .filter((price) => matchesSetupLocationSearch(price.toLocation));
  const filteredDriverPrices = data.prices
    .filter((price) => price.truckType === driverPriceForm.truckType)
    .filter((price) => matchesSetupLocationSearch(price.toLocation));
  const companyPriceGroups = useMemo(() => groupPriceHistory(filteredCompanyPrices), [filteredCompanyPrices]);
  const driverPriceGroups = useMemo(() => groupPriceHistory(filteredDriverPrices), [filteredDriverPrices]);
  const activeCompanyPriceRows = useMemo(() => {
    const groups = new Map();
    data.prices
      .filter((price) => price.active !== false)
      .filter((price) => priceEffectiveDate(price) <= today())
      .forEach((price) => {
        const key = routeKey(price);
        const current = groups.get(key);
        if (!current || priceEffectiveDate(price) > priceEffectiveDate(current)) {
          groups.set(key, price);
        }
      });
    return [...groups.values()]
      .filter((price) => matchesSetupLocationSearch(price.toLocation))
      .sort((a, b) => a.truckType.localeCompare(b.truckType) || a.toLocation.localeCompare(b.toLocation));
  }, [data.prices, setupLocationSearchKey]);
  const activeCompanyPriceCounts = useMemo(() => ({
    withCrane: activeCompanyPriceRows.filter((price) => price.truckType === "With Crane").length,
    withoutCrane: activeCompanyPriceRows.filter((price) => price.truckType === "Without Crane").length,
    total: activeCompanyPriceRows.length
  }), [activeCompanyPriceRows]);
  const priceCompareRows = useMemo(() => {
    const craneMap = new Map();
    const noCraneMap = new Map();
    for (const price of data.prices) {
      if (priceEffectiveDate(price) > priceCompareDate) continue;
      const key = locationBaseKey(price.toLocation);
      if (price.truckType === "With Crane") {
        const ex = craneMap.get(key);
        if (!ex || priceEffectiveDate(price) > priceEffectiveDate(ex)) craneMap.set(key, price);
      } else if (price.truckType === "Without Crane") {
        const ex = noCraneMap.get(key);
        if (!ex || priceEffectiveDate(price) > priceEffectiveDate(ex)) noCraneMap.set(key, price);
      }
    }
    const allKeys = new Set([...craneMap.keys(), ...noCraneMap.keys()]);
    const combinedOrder = [
      ...NO_CRANE_LOCATION_ORDER,
      ...CRANE_LOCATION_ORDER.filter((loc) => !NO_CRANE_LOCATION_ORDER.includes(loc))
    ];
    const rows = [...allKeys].map((key) => {
      const crane = craneMap.get(key) || null;
      const noCrane = noCraneMap.get(key) || null;
      return { key, canonicalName: (crane || noCrane).toLocation, crane, noCrane };
    });
    rows.sort((a, b) => {
      const ai = combinedOrder.indexOf(a.canonicalName);
      const bi = combinedOrder.indexOf(b.canonicalName);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.canonicalName.localeCompare(b.canonicalName);
    });
    return rows;
  }, [data.prices, priceCompareDate]);

  const priceCompareDates = useMemo(() => {
    const seen = new Set();
    const todayStr = today();
    for (const p of data.prices) {
      const d = priceEffectiveDate(p);
      if (d <= todayStr) seen.add(d);
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [data.prices]);

  const priceCompareProvinces = useMemo(() => {
    const seen = [];
    const seenSet = new Set();
    for (const row of priceCompareRows) {
      const m = row.canonicalName.match(/\(([^)]+)\)$/);
      if (m && !seenSet.has(m[1])) { seenSet.add(m[1]); seen.push(m[1]); }
    }
    return seen;
  }, [priceCompareRows]);

  const pricePeriods = useMemo(() => {
    const monthStart = `${pricePeriodsMonth}-01`;
    const [y, m] = pricePeriodsMonth.split("-").map(Number);
    const monthEnd = `${pricePeriodsMonth}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
    const deliveriesInMonth = data.deliveries.filter(
      (d) => d.deliveryDate >= monthStart && d.deliveryDate <= monthEnd
    );
    if (deliveriesInMonth.length === 0) return [];
    // Group deliveries by the effective price date applied to them
    const periodMap = new Map();
    for (const d of deliveriesInMonth) {
      const price = data.prices
        .filter((p) => p.active !== false && p.fromLocation === (data.settings.defaultFromLocation || d.fromLocation) && locationBaseKey(p.toLocation) === locationBaseKey(d.toLocation) && p.truckType === d.truckType)
        .filter((p) => priceEffectiveDate(p) <= d.deliveryDate)
        .sort((a, b) => priceEffectiveDate(b).localeCompare(priceEffectiveDate(a)))[0];
      const effectiveKey = price ? priceEffectiveDate(price) : "unknown";
      if (!periodMap.has(effectiveKey)) periodMap.set(effectiveKey, { effectiveDate: effectiveKey, deliveries: [] });
      periodMap.get(effectiveKey).deliveries.push(d);
    }
    const knownPeriods = [...periodMap.values()]
      .filter((p) => p.effectiveDate !== "unknown" && /^\d{4}-\d{2}-\d{2}$/.test(p.effectiveDate))
      .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
    const unknownPeriod = periodMap.get("unknown");
    // Calculate date ranges: each period ends the day before the next period starts
    const result = knownPeriods.map((p, i) => {
      const next = knownPeriods[i + 1];
      let rangeEnd = monthEnd;
      if (next) {
        const d = new Date(next.effectiveDate);
        d.setDate(d.getDate() - 1);
        if (!isNaN(d.getTime())) rangeEnd = d.toISOString().slice(0, 10);
      }
      const stmtIds = [...new Set(p.deliveries.map((d) => d.statementId))];
      const stmts = stmtIds.map((id) => data.statements.find((s) => s.id === id)).filter(Boolean);
      return { effectiveDate: p.effectiveDate, rangeStart: p.effectiveDate, rangeEnd, deliveryCount: p.deliveries.length, statements: stmts };
    });
    if (unknownPeriod) {
      const stmtIds = [...new Set(unknownPeriod.deliveries.map((d) => d.statementId))];
      const stmts = stmtIds.map((id) => data.statements.find((s) => s.id === id)).filter(Boolean);
      result.push({ effectiveDate: "unknown", rangeStart: null, rangeEnd: null, deliveryCount: unknownPeriod.deliveries.length, statements: stmts });
    }
    return result;
  }, [data.deliveries, data.prices, data.statements, data.settings.defaultFromLocation, pricePeriodsMonth]);

  const bulkPriceRows = useMemo(() => {
    const priceType = bulkPriceForm.priceType;
    const fromLocation = bulkPriceForm.fromLocation || data.settings.defaultFromLocation;
    const routeMap = new Map();
    data.prices
      .filter((price) => price.fromLocation === fromLocation)
      .filter((price) => price.truckType === bulkPriceForm.truckType)
      .forEach((price) => {
        const key = locationBaseKey(price.toLocation);
        const existing = routeMap.get(key);
        if (!existing || priceEffectiveDate(price) > priceEffectiveDate(existing)) routeMap.set(key, price);
      });
    const seenPastedLocations = new Map();
    const locationLines = (bulkPriceForm.locationsText || bulkPriceForm.rowsText)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const priceLines = bulkPriceForm.pricesText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const driverPriceLines = bulkPriceForm.driverPricesText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    return locationLines.map((locationText, index) => {
        const locationKey = locationBaseKey(locationText);
        const matchedRoute = routeMap.get(locationKey);
        const isValidFormat = /^\s*(KH\.|D\.)/i.test(locationText.trim());
        const matchedLocation = matchedRoute?.toLocation || (isValidFormat ? locationText.trim() : "");
        const duplicateLine = seenPastedLocations.get(locationKey);
        if (!duplicateLine) seenPastedLocations.set(locationKey, index + 1);
        const companyPriceText = priceLines[index] || "";
        const driverPriceText = priceType === "both" ? driverPriceLines[index] || "" : companyPriceText;
        const companyUnitPrice = priceType === "driver" ? "" : parseMoney(companyPriceText);
        const truckSalaryUnitPrice = priceType === "company" ? "" : parseMoney(driverPriceText);
        const currentPrice = data.prices
          .filter((price) => price.active !== false)
          .filter((price) => price.fromLocation === fromLocation)
          .filter((price) => price.toLocation === matchedLocation)
          .filter((price) => price.truckType === bulkPriceForm.truckType)
          .filter((price) => priceEffectiveDate(price) <= bulkPriceForm.effectiveDate)
          .sort((a, b) => priceEffectiveDate(b).localeCompare(priceEffectiveDate(a)))[0];
        const distanceKm = currentPrice?.distanceKm || "";
        const hasRequiredPrices = (priceType === "driver" || companyUnitPrice !== "") && (priceType === "company" || truckSalaryUnitPrice !== "");
        const oldPrice = priceType === "driver" ? currentPrice?.truckSalaryUnitPrice : currentPrice?.companyUnitPrice;
        const newPrice = priceType === "driver" ? truckSalaryUnitPrice : companyUnitPrice;
        const samePrice =
          priceType === "both"
            ? Number(currentPrice?.companyUnitPrice || 0) === Number(companyUnitPrice || 0) &&
              Number(currentPrice?.truckSalaryUnitPrice || 0) === Number(truckSalaryUnitPrice || 0)
            : Number(oldPrice || 0) === Number(newPrice || 0);
        const oldComparePrice = priceType === "both" ? currentPrice?.companyUnitPrice : oldPrice;
        const newComparePrice = priceType === "both" ? companyUnitPrice : newPrice;
        const difference = Number(newComparePrice || 0) - Number(oldComparePrice || 0);
        const compareText = !matchedLocation
          ? "Location not found"
          : !hasRequiredPrices
            ? "Missing price"
            : samePrice
              ? "Same price"
              : difference > 0
            ? `Up $${money(difference)}`
            : `Down $${money(Math.abs(difference))}`;
        const statusText = duplicateLine
          ? `Duplicate of line ${duplicateLine}`
          : !matchedLocation
            ? "Check location"
            : !hasRequiredPrices
              ? "Check price"
              : "Approve";
        return {
          line: index + 1,
          rawLocation: locationText || "",
          toLocation: matchedLocation || "",
          distanceKm: distanceKm || currentPrice?.distanceKm || "",
          companyUnitPrice,
          truckSalaryUnitPrice,
          currentCompanyUnitPrice: currentPrice?.companyUnitPrice || 0,
          currentTruckSalaryUnitPrice: currentPrice?.truckSalaryUnitPrice || 0,
          oldPrice: oldPrice || 0,
          newPrice: newPrice === "" ? "" : newPrice,
          compareText,
          statusText,
          valid: Boolean(!duplicateLine && matchedLocation && hasRequiredPrices)
        };
      });
  }, [bulkPriceForm, data.prices, data.settings.defaultFromLocation]);

  const bulkExistingDates = useMemo(() => {
    const fromLocation = bulkPriceForm.fromLocation || data.settings.defaultFromLocation;
    const seen = new Set();
    data.prices
      .filter((p) => p.fromLocation === fromLocation && p.truckType === bulkPriceForm.truckType && p.active !== false)
      .forEach((p) => seen.add(priceEffectiveDate(p)));
    return [...seen].sort((a, b) => b.localeCompare(a));
  }, [bulkPriceForm.fromLocation, bulkPriceForm.truckType, data.prices, data.settings.defaultFromLocation]);

  const bulkLocationChoices = useMemo(() => {
    const fromLocation = bulkPriceForm.fromLocation || data.settings.defaultFromLocation;
    const seen = new Set();
    const result = [];
    data.prices
      .filter((p) => p.fromLocation === fromLocation && p.truckType === bulkPriceForm.truckType && p.active !== false)
      .forEach((p) => {
        const key = locationBaseKey(p.toLocation);
        if (!seen.has(key)) { seen.add(key); result.push(p.toLocation); }
      });
    result.sort(bulkPriceForm.truckType === "With Crane" ? craneLocationSort : noCraneLocationSort);
    if (!bulkLocationFilter.trim()) return result;
    const fk = locationMatchKey(bulkLocationFilter);
    return result.filter((loc) => locationMatchKey(loc).includes(fk));
  }, [bulkPriceForm.fromLocation, bulkPriceForm.truckType, data.prices, data.settings.defaultFromLocation, bulkLocationFilter]);

  const isDraft = selectedStatement?.status === "Draft";
  const isEditingDelivery = Boolean(deliveryForm.id);
  const canEditRows = Boolean(selectedStatement) && isDraft;
  const duplicateInvoice = Boolean(deliveryForm.invoiceNo) && data.deliveries.some(
    (row) => row.invoiceNo === deliveryForm.invoiceNo && row.id !== deliveryForm.id
  );
  const typedTruck = Boolean(deliveryForm.truckNo);
  const truckMissing = typedTruck && !selectedTruck;
  const truckTypeMismatch = Boolean(selectedTruck && selectedStatement && selectedTruck.truckType !== selectedStatement.truckType);
  const priceLookupReady = Boolean(deliveryForm.deliveryDate && selectedTruck && deliveryForm.toLocation);
  const missingPrice = priceLookupReady && !selectedPrice;
  const deliveryFormReady = Boolean(
    deliveryForm.deliveryDate &&
    deliveryForm.invoiceNo.length === 10 &&
    selectedTruck &&
    deliveryForm.toLocation &&
    Number(deliveryForm.qtyTon || 0) > 0
  );
  const canFinishStatement = Boolean(selectedStatement && isDraft && statementRows.length > 0);
  const canSaveDelivery =
    canEditRows &&
    deliveryFormReady &&
    (isEditingDelivery || statementRows.length < 30) &&
    !duplicateInvoice &&
    !truckMissing &&
    !truckTypeMismatch &&
    !missingPrice;

  function flash(text, type = "success") {
    setNotice({ text, type });
    setTimeout(() => setNotice({ text: "", type: "" }), 5000);
  }

  async function loadData() {
    const next = await api("/api/data");
    setData(next);
    setSettingsForm({
      companyName: next.settings.companyName || "",
      defaultFromLocation: next.settings.defaultFromLocation || "",
      deletePassword: next.settings.deletePassword || ""
    });
    setPriceForm((current) => ({ ...current, fromLocation: current.fromLocation || next.settings.defaultFromLocation || "" }));
    setDeliveryForm((current) => ({ ...current, fromLocation: current.fromLocation || next.settings.defaultFromLocation || "" }));
    loadBackups().catch(() => {});
  }

  async function loadBackups() {
    const result = await api("/api/backup/list");
    setBackupFiles(result.files || []);
  }

  useEffect(() => {
    const handleAuthLogout = () => setLoggedIn(false);
    window.addEventListener("auth-logout", handleAuthLogout);
    return () => window.removeEventListener("auth-logout", handleAuthLogout);
  }, []);

  useEffect(() => {
    if (loggedIn) loadData().catch((err) => flash(err.message, "error"));
  }, [loggedIn]);

  useEffect(() => {
    if (page === "setup") loadStaffUsers();
  }, [page]);

  useEffect(() => {
    if (setupSection === "users") loadStaffUsers();
  }, [setupSection]);

  useEffect(() => {
    const edits = {};
    for (const d of (data.truckDeductions || [])) {
      if (d.month === reportMonth) {
        edits[d.truckNo] = { loanDeduction: String(d.loanDeduction ?? 0), garageFee: String(d.garageFee ?? 0) };
      }
    }
    setDeductionEdits(edits);
  }, [data.truckDeductions, reportMonth]);

  function openStatement(statement) {
    setViewStatementId("");
    setEntryTruckType(statement.truckType);
    setShowStatementWorkspace(true);
    setSelectedStatementId(statement.id);
    setStatementForm({
      id: statement.id,
      month: statement.month,
      truckType: statement.truckType,
      statementNumber: statement.statementNumber,
      statementDate: statement.statementDate
    });
    resetDeliveryForm();
  }

  function viewStatement(statement) {
    setSelectedStatementId("");
    setViewStatementId(statement.id);
    setEntryTruckType(statement.truckType);
    setEntryActionTruckType("");
    setShowStatementWorkspace(false);
    setFilters((current) => ({ ...current, month: statement.month }));
    resetDeliveryForm();
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  async function saveStatement(event) {
    event.preventDefault();
    try {
      const wasNew = !statementForm.id;
      const statement = await api("/api/statements", { method: "POST", body: JSON.stringify({ ...statementForm, truckType: entryTruckType }) });
      setSelectedStatementId(statement.id);
      setStatementForm({ ...statement, id: statement.id });
      await loadData();
      resetDeliveryForm();
      if (wasNew) {
        flash(`Statement ${statement.statementNumber} created. Add delivery rows until you finish this statement.`);
      } else {
        flash("Statement updated.");
      }
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function cleanupEmptyDraftStatements() {
    try {
      const result = await api("/api/statements/empty-drafts", { method: "DELETE" });
      if (result.deleted > 0) await loadData();
      return result.deleted || 0;
    } catch (err) {
      flash(err.message, "error");
      return 0;
    }
  }

  async function newStatement() {
    await cleanupEmptyDraftStatements();
    const month = statementForm.month || currentMonth();
    const truckType = entryTruckType;
    setSelectedStatementId("");
    setViewStatementId("");
    setShowStatementWorkspace(false);
    resetDeliveryForm();
    setStatementForm({ id: "", month, truckType, statementNumber: "", statementDate: today() });
  }

  async function backToStatementList() {
    const deleted = await cleanupEmptyDraftStatements();
    const month = statementForm.month || filters.month || currentMonth();
    const truckType = entryTruckType;
    setSelectedStatementId("");
    setViewStatementId("");
    setShowStatementWorkspace(false);
    resetDeliveryForm();
    setStatementForm({ id: "", month, truckType, statementNumber: "", statementDate: today() });
    if (deleted > 0) flash("Empty draft statement removed.");
  }

  async function getNextStatementNumber(month) {
    const result = await api(`/api/next-statement-number?month=${encodeURIComponent(month)}`);
    return result.nextStatementNumber;
  }

  async function startEntryAction(truckType) {
    await switchEntryTruckType(truckType);
    setEntryActionTruckType(truckType);
  }

  async function createEntryStatement(truckType) {
    await cleanupEmptyDraftStatements();
    const month = statementForm.month || filters.month || currentMonth();
    const statementNumber = await getNextStatementNumber(month);
    setEntryTruckType(truckType);
    setSelectedStatementId("");
    setViewStatementId("");
    resetDeliveryForm();
    setStatementForm({ id: "", month, truckType, statementNumber, statementDate: today() });
    setShowStatementWorkspace(true);
    setEntryActionTruckType("");
    requestAnimationFrame(() => document.getElementById("statement-form-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function switchEntryTruckType(truckType) {
    await cleanupEmptyDraftStatements();
    setEntryTruckType(truckType);
    setSelectedStatementId("");
    setViewStatementId("");
    setShowStatementWorkspace(false);
    resetDeliveryForm();
    const month = statementForm.month || filters.month || currentMonth();
    setStatementForm({ id: "", month, truckType, statementNumber: "", statementDate: today() });
  }

  async function finishStatement() {
    if (!selectedStatement) return;
    if (statementRows.length < 1) {
      flash("Add at least one delivery row before finishing this statement.", "error");
      return;
    }
    const finishedStatementId = selectedStatement.id;
    const finishedMonth = selectedStatement.month;
    const finishedTruckType = selectedStatement.truckType;
    try {
      setPage("data-entry");
      setEntryTruckType(finishedTruckType);
      setEntryActionTruckType("");
      setSelectedStatementId("");
      setViewStatementId("");
      setShowStatementWorkspace(false);
      setFilters((current) => ({ ...current, month: finishedMonth }));
      resetDeliveryForm();
      setStatementForm({
        id: "",
        month: finishedMonth,
        truckType: finishedTruckType,
        statementNumber: "",
        statementDate: today()
      });
      await api(`/api/statements/${finishedStatementId}/finish`, { method: "POST" });
      await loadData();
      setSelectedStatementId("");
      setShowStatementWorkspace(false);
      setStatementForm({
        id: "",
        month: finishedMonth,
        truckType: finishedTruckType,
        statementNumber: "",
        statementDate: today()
      });
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      flash("Statement finished and saved.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function reopenStatement() {
    if (!selectedStatement) return;
    try {
      await api(`/api/statements/${selectedStatement.id}/reopen`, { method: "POST" });
      await loadData();
      flash("Statement reopened. You can edit delivery rows now.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function deleteStatement(statement) {
    setDeleteModal({ statement, password: "", error: "" });
  }

  async function confirmDeleteStatement() {
    const { statement, password } = deleteModal;
    try {
      await api(`/api/statements/${statement.id}`, {
        method: "DELETE",
        headers: { "x-delete-password": password }
      });
      setDeleteModal({ statement: null, password: "", error: "" });
      if (selectedStatementId === statement.id) {
        setSelectedStatementId("");
        setStatementForm({ id: "", month: statement.month, truckType: "With Crane", statementNumber: "", statementDate: today() });
        resetDeliveryForm();
      }
      await loadData();
      flash("Statement deleted.");
    } catch (err) {
      setDeleteModal((prev) => ({ ...prev, error: err.message }));
    }
  }

  async function saveDelivery(event) {
    event.preventDefault();
    try {
      if (duplicateInvoice) throw new Error("Invoice number already exists. Check the invoice before saving.");
      if (truckMissing) throw new Error("Truck number does not exist or is inactive.");
      if (truckTypeMismatch) throw new Error(`Truck ${deliveryForm.truckNo} is not allowed in this ${truckTypeLabel(selectedStatement.truckType)} statement.`);
      if (missingPrice) throw new Error(`No active price found for ${deliveryForm.toLocation} on ${formatDate(deliveryForm.deliveryDate)}.`);
      await api("/api/deliveries", {
        method: "POST",
        body: JSON.stringify({ ...deliveryForm, statementId: selectedStatementId })
      });
      const wasEditing = isEditingDelivery;
      resetDeliveryForm(deliveryForm.deliveryDate);
      await loadData();
      flash(wasEditing ? "Delivery row updated." : statementRows.length + 1 >= 30 ? "Statement reached 30 rows. Create the next statement." : "Delivery saved.");
      requestAnimationFrame(() => invoiceInputRef.current?.focus());
    } catch (err) {
      flash(err.message, "error");
    }
  }

  function editDelivery(row) {
    setDeliveryForm({
      id: row.id,
      createdAt: row.createdAt,
      deliveryDate: row.deliveryDate,
      invoiceNo: row.invoiceNo,
      truckNo: row.truckNo,
      fromLocation: row.fromLocation || data.settings.defaultFromLocation || "",
      toLocation: row.toLocation,
      qtyTon: row.qtyTon
    });
    requestAnimationFrame(() => {
      deliveryFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      invoiceInputRef.current?.focus();
    });
  }

  function resetDeliveryForm(deliveryDate = today()) {
    setDeliveryForm({ id: "", deliveryDate, invoiceNo: "", truckNo: "", fromLocation: data.settings.defaultFromLocation || "", toLocation: "", qtyTon: "" });
    setActiveField("");
  }

  async function deleteDelivery(row) {
    const ok = window.confirm(`Delete invoice ${row.invoiceNo}?`);
    if (!ok) return;
    try {
      await api(`/api/deliveries/${row.id}`, { method: "DELETE" });
      if (deliveryForm.id === row.id) resetDeliveryForm();
      await loadData();
      flash("Delivery row deleted.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function saveDeduction(truckNo) {
    const edits = deductionEdits[truckNo] || {};
    try {
      await api("/api/truck-deductions", {
        method: "POST",
        body: JSON.stringify({
          truckNo,
          month: reportMonth,
          loanDeduction: Number(edits.loanDeduction) || 0,
          garageFee: Number(edits.garageFee) || 0
        })
      });
      await loadData();
    } catch (err) {
      flash(err.message, "error");
    }
  }

  function getDeduction(truckNo) {
    const edits = deductionEdits[truckNo] || {};
    return {
      loanDeduction: edits.loanDeduction ?? "0",
      garageFee: edits.garageFee ?? "0"
    };
  }

  async function clearHighlights() {
    try {
      await api("/api/deliveries/clear-highlights", { method: "POST", body: JSON.stringify({ statementId: selectedStatementId }) });
      await loadData();
      flash("Highlights cleared.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function saveTruck(event) {
    event.preventDefault();
    try {
      await api("/api/trucks", { method: "POST", body: JSON.stringify(truckForm) });
      setTruckForm({ truckNo: "", truckType: "With Crane", driverName: "", phone: "" });
      await loadData();
      flash("Truck saved.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function deleteTruck(truck) {
    const ok = window.confirm(`Delete truck ${truck.truckNo}? If it has delivery history, it will be deactivated instead of permanently deleted.`);
    if (!ok) return;
    try {
      const result = await api(`/api/trucks/${encodeURIComponent(truck.truckNo)}`, { method: "DELETE" });
      if (truckForm.truckNo === truck.truckNo) setTruckForm({ truckNo: "", truckType: "With Crane", driverName: "", phone: "" });
      await loadData();
      flash(result.action === "deactivated" ? "Truck deactivated because it has delivery history." : "Truck deleted.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function savePrice(event) {
    event.preventDefault();
    try {
      const existingPrice = data.prices.find((price) => price.id === priceForm.id);
      await api("/api/prices", {
        method: "POST",
        body: JSON.stringify({
          ...priceForm,
          truckSalaryUnitPrice: priceForm.truckSalaryUnitPrice || existingPrice?.truckSalaryUnitPrice || 0
        })
      });
      setPriceForm({
        id: "",
        fromLocation: data.settings.defaultFromLocation || "",
        toLocation: "",
        truckType: "With Crane",
        distanceKm: "",
        companyUnitPrice: "",
        truckSalaryUnitPrice: "",
        effectiveDate: today()
      });
      await loadData();
      flash("Price saved.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function saveDriverPrice(event) {
    event.preventDefault();
    try {
      const existingPrice = data.prices.find((price) => price.id === driverPriceForm.id);
      await api("/api/prices", {
        method: "POST",
        body: JSON.stringify({
          id: driverPriceForm.id,
          fromLocation: driverPriceForm.fromLocation,
          toLocation: driverPriceForm.toLocation,
          truckType: driverPriceForm.truckType,
          distanceKm: driverPriceForm.distanceKm,
          effectiveDate: driverPriceForm.effectiveDate,
          companyUnitPrice: existingPrice?.companyUnitPrice || 0,
          truckSalaryUnitPrice: driverPriceForm.truckSalaryUnitPrice
        })
      });
      setDriverPriceForm({
        id: "",
        fromLocation: data.settings.defaultFromLocation || "",
        toLocation: "",
        truckType: "With Crane",
        distanceKm: "",
        truckSalaryUnitPrice: "",
        effectiveDate: today()
      });
      await loadData();
      flash("Driver price saved.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function applyBulkPriceUpdate() {
    try {
      const invalidRows = bulkPriceRows.filter((row) => !row.valid);
      if (invalidRows.length > 0) {
        throw new Error(`Please fix ${invalidRows.length} row${invalidRows.length > 1 ? "s" : ""} before applying bulk prices.`);
      }
      const rows = bulkPriceRows.filter((row) => row.valid);
      if (rows.length < 1) throw new Error("Paste at least one valid price row.");
      const ok = window.confirm(`Apply ${rows.length} price row${rows.length > 1 ? "s" : ""} effective ${formatDate(bulkPriceForm.effectiveDate)}?`);
      if (!ok) return;
      const result = await api("/api/prices/bulk", {
        method: "POST",
        body: JSON.stringify({
          priceType: bulkPriceForm.priceType,
          truckType: bulkPriceForm.truckType,
          fromLocation: bulkPriceForm.fromLocation || data.settings.defaultFromLocation,
          effectiveDate: bulkPriceForm.effectiveDate,
          rows
        })
      });
      await loadData();
      setBulkPriceForm((current) => ({ ...current, locationsText: "", pricesText: "", driverPricesText: "", rowsText: "" }));
      flash(`Bulk price update saved: ${result.added} added, ${result.updated} updated${result.recalculatedDeliveries ? `, ${result.recalculatedDeliveries} delivery rows recalculated` : ""}.`);
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function deleteNonstandardFormatPrices() {
    const ok = window.confirm('Delete ALL price entries where location does NOT start with "KH." or "D."? Only standard-format entries are kept. A backup is created automatically.');
    if (!ok) return;
    try {
      const result = await api("/api/prices/delete-nonstandard-format", { method: "POST" });
      await loadData();
      setBulkLocationFilter("");
      flash(`Deleted ${result.deleted} non-standard format price entries.`);
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function deletePricesByDate() {
    const truckLabel = bulkPriceForm.truckType === "With Crane" ? "Crane" : "No Crane";
    const dateLabel = formatDate(bulkPriceForm.effectiveDate);
    const ok = window.confirm(`Delete ALL ${truckLabel} price entries effective ${dateLabel}? This cannot be undone (a backup is created automatically).`);
    if (!ok) return;
    try {
      const result = await api("/api/prices/delete-by-date", {
        method: "POST",
        body: JSON.stringify({ truckType: bulkPriceForm.truckType, effectiveDate: bulkPriceForm.effectiveDate })
      });
      await loadData();
      flash(`Deleted ${result.deleted} ${truckLabel} price entries for ${dateLabel}.`);
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function deletePrice(price) {
    const ok = window.confirm(`Delete price for ${price.toLocation} (${truckTypeLabel(price.truckType)})? If it has delivery history, it will be deactivated instead of permanently deleted.`);
    if (!ok) return;
    try {
      const result = await api(`/api/prices/${encodeURIComponent(price.id)}`, { method: "DELETE" });
      if (priceForm.id === price.id) {
        setPriceForm({ id: "", fromLocation: data.settings.defaultFromLocation || "", toLocation: "", truckType: "With Crane", distanceKm: "", companyUnitPrice: "", truckSalaryUnitPrice: "", effectiveDate: today() });
      }
      if (driverPriceForm.id === price.id) {
        setDriverPriceForm({ id: "", fromLocation: data.settings.defaultFromLocation || "", toLocation: "", truckType: "With Crane", distanceKm: "", truckSalaryUnitPrice: "", effectiveDate: today() });
      }
      await loadData();
      flash(result.action === "deactivated" ? "Price deactivated and kept for history." : "Price deleted.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function loadStaffUsers() {
    if (!isAdmin) return;
    try { setStaffUsers(await api("/api/users")); } catch {}
  }

  async function createStaffUser(e) {
    e.preventDefault();
    try {
      await api("/api/users", { method: "POST", body: JSON.stringify(newUserForm) });
      setNewUserForm({ username: "", password: "", role: "staff" });
      await loadStaffUsers();
      flash("User created.");
    } catch (err) { flash(err.message, "error"); }
  }

  async function deleteStaffUser(id) {
    if (!window.confirm("Delete this user? They will be logged out immediately.")) return;
    try {
      await api(`/api/users/${id}`, { method: "DELETE" });
      await loadStaffUsers();
      flash("User deleted.");
    } catch (err) { flash(err.message, "error"); }
  }

  async function saveStaffPassword(id) {
    try {
      await api(`/api/users/${id}/password`, { method: "PUT", body: JSON.stringify({ password: editPasswordValue }) });
      setEditPasswordId(null);
      setEditPasswordValue("");
      flash("Password updated.");
    } catch (err) { flash(err.message, "error"); }
  }

  async function saveSettings(event) {
    event.preventDefault();
    try {
      await api("/api/settings", { method: "POST", body: JSON.stringify(settingsForm) });
      await loadData();
      flash("Settings saved.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function createManualBackup() {
    try {
      const result = await api("/api/backup/create", { method: "POST" });
      await loadBackups();
      flash(`Backup created: ${result.fileName}`);
    } catch (err) {
      flash(err.message, "error");
    }
  }

  function downloadBackup() {
    downloadFile("/api/backup/download").catch((err) => flash(err.message, "error"));
  }

  async function recalculateAllPrices() {
    const ok = window.confirm("Recalculate driver prices for all delivery rows? This updates driver payment amounts based on the current price list.");
    if (!ok) return;
    try {
      const result = await api("/api/recalculate", { method: "POST" });
      await loadData();
      flash(`Recalculated ${result.recalculatedDeliveries} delivery row${result.recalculatedDeliveries !== 1 ? "s" : ""}.`);
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function diagnoseEmptyPrices() {
    try {
      const result = await api("/api/diagnose-empty-prices");
      const dCrane = (result.missingDriver || {})["With Crane"] || [];
      const dNoCrane = (result.missingDriver || {})["Without Crane"] || [];
      const cCrane = (result.missingCompany || {})["With Crane"] || [];
      const cNoCrane = (result.missingCompany || {})["Without Crane"] || [];
      const total = dCrane.length + dNoCrane.length + cCrane.length + cNoCrane.length;
      if (total === 0) {
        flash("All locations have both company and driver prices set. Nothing missing.");
        return;
      }
      setEmptyPriceResult({ dCrane, dNoCrane, cCrane, cNoCrane });
    } catch (err) {
      flash(err.message, "error");
    }
  }

  function goToEmptyPrice(location, section) {
    setEmptyPriceResult(null);
    setPage("setup");
    setSetupSection(section);
    setSetupLocationSearch(location);
  }

  async function normalizeLocationSpacing() {
    const ok = window.confirm('Fix location names that have an extra space after "KH." or "D." prefix (e.g. "KH. Kambol" → "KH.Kambol")? This updates both the price list and delivery records.');
    if (!ok) return;
    try {
      const result = await api("/api/prices/normalize-location-spacing", { method: "POST" });
      await loadData();
      const total = result.fixedPrices + result.fixedDeliveries;
      if (total === 0) flash("All location names already have correct spacing. Nothing to fix.");
      else flash(`Fixed spacing in ${result.fixedPrices} price entr${result.fixedPrices !== 1 ? "ies" : "y"} and ${result.fixedDeliveries} deliver${result.fixedDeliveries !== 1 ? "ies" : "y"}.`);
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function fixLocationNames() {
    const ok = window.confirm("Fix delivery location names that don't match the price list, then recalculate driver prices? This corrects name mismatches (e.g. 'Khan Kambol' → 'KH.Kambol').");
    if (!ok) return;
    try {
      const result = await api("/api/fix-location-names", { method: "POST" });
      await loadData();
      flash(`Fixed ${result.fixed} location name${result.fixed !== 1 ? "s" : ""}, recalculated ${result.recalculated} driver price${result.recalculated !== 1 ? "s" : ""}.`);
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function diagnoseDriverPrices() {
    try {
      const result = await api("/api/diagnose-driver");
      if (result.zeroPriceDeliveries === 0) {
        alert("All delivery rows have a non-zero driver price. Nothing to fix.");
        return;
      }
      const lines = [`${result.zeroPriceDeliveries} delivery row(s) still have $0 driver price:\n`];
      for (const p of result.problems) {
        lines.push(`• ${p.toLocation} (${p.truckType}) on ${p.deliveryDate}`);
        if (p.effectivePriceFound !== null && p.effectivePriceFound > 0) {
          lines.push(`  → Price found: $${p.effectivePriceFound} (effective ${p.effectivePriceDate}) but not applied`);
        } else if (p.effectivePriceFound !== null) {
          lines.push(`  → Price found but is $0 (effective ${p.effectivePriceDate})`);
        } else {
          lines.push(`  → NO price found for this delivery date`);
          if (p.allPricesForRoute.length > 0) {
            lines.push(`  → Available prices: ${p.allPricesForRoute.map(x => `$${x.driver} from ${x.effectiveDate} (active:${x.active})`).join(", ")}`);
          } else {
            lines.push(`  → No prices exist for this route at all`);
          }
        }
      }
      alert(lines.join("\n"));
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function cleanupZeroDriverPrices() {
    const ok = window.confirm("Delete old Without Crane price entries that have $0 driver price and a newer entry exists? This cleans up duplicate entries.");
    if (!ok) return;
    try {
      const result = await api("/api/prices/cleanup-zero-driver", { method: "POST" });
      await loadData();
      const msg = result.stillMissing.length
        ? `Deleted ${result.deleted} old entr${result.deleted !== 1 ? "ies" : "y"}. ${result.stillMissing.length} location${result.stillMissing.length !== 1 ? "s" : ""} still missing driver price: ${result.stillMissing.join(", ")}`
        : `Deleted ${result.deleted} old entr${result.deleted !== 1 ? "ies" : "y"}. All locations have driver prices.`;
      flash(msg, result.stillMissing.length ? "error" : "success");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  function restoreBackup() {
    const ok = window.confirm("Restore from a backup file? This will replace the current system data. A safety backup will be created first.");
    if (!ok) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const restoredData = JSON.parse(text);
        await api("/api/backup/restore", { method: "POST", body: JSON.stringify(restoredData) });
        await loadData();
        flash("Backup restored.");
      } catch (err) {
        flash(err.message, "error");
      }
    };
    input.click();
  }

  async function clearLocationPriceList() {
    const ok = window.confirm("Clear all location price records? This will not delete trucks, statements, or delivery rows. A safety backup will be created first.");
    if (!ok) return;
    const typed = window.prompt('Type "CLEAR PRICES" to confirm.');
    if (typed !== "CLEAR PRICES") return;
    try {
      const result = await api("/api/prices", { method: "DELETE" });
      await loadData();
      await loadBackups();
      flash(`Cleared ${result.deletedCount} location price records.`);
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function saveQuickStatement(e) {
    e.preventDefault();
    try {
      await api("/api/statements/quick", {
        method: "POST",
        body: JSON.stringify(quickForm)
      });
      setQuickForm({ statementNumber: "", month: quickForm.month, manualAmount: "" });
      await loadData();
      flash(`Statement ${quickForm.statementNumber} added.`);
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function assignPayment(statementId, paymentMonth) {
    try {
      await api(`/api/statements/${encodeURIComponent(statementId)}/assign-payment`, {
        method: "POST",
        body: JSON.stringify({ paymentMonth })
      });
      await loadData();
      setAssignModal(null);
      flash(paymentMonth ? `Statement assigned to ${monthName(paymentMonth)} payment.` : "Statement removed from payment.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function togglePaymentReceived(month) {
    try {
      await api("/api/payment-months/toggle", { method: "POST", body: JSON.stringify({ month }) });
      await loadData();
    } catch (err) {
      flash(err.message, "error");
    }
  }

  function exportSalary(truck, format = "xls") {
    const d = getDeduction(truck.truckNo);
    const params = new URLSearchParams({
      month: reportMonth,
      truckNo: truck.truckNo,
      format,
      loanDeduction: d.loanDeduction,
      garageFee: d.garageFee
    });
    downloadFile(`/api/export/salary?${params}`).catch((err) => flash(err.message, "error"));
  }

  function exportStatement() {
    if (!selectedStatement) return;
    downloadFile(`/api/export/accounting?statementId=${encodeURIComponent(selectedStatement.id)}&truckType=${encodeURIComponent(selectedStatement.truckType)}`).catch((err) => flash(err.message, "error"));
  }

  function exportStatementFile(statement, format = "xls") {
    downloadFile(`/api/export/accounting?statementId=${encodeURIComponent(statement.id)}&truckType=${encodeURIComponent(statement.truckType)}&format=${encodeURIComponent(format)}`).catch((err) => flash(err.message, "error"));
  }

  const navItems = [
    ["dashboard", "Dashboard"],
    ["data-entry", "Data Entry"],
    ["reports", "Reports"],
    ...(isAdmin ? [["payments", "Payments"], ["prices", "Prices"], ["setup", "Setup"]] : []),
  ];

  async function logout() {
    try { await api("/api/auth/logout", { method: "POST" }); } catch {}
    setToken("");
    setLoggedIn(false);
  }

  if (!loggedIn) return <LoginPage onLogin={(role) => { setLoggedIn(true); setUserRole(role); }} />;

  return (
    <div className="min-h-screen text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 shadow-sm shadow-slate-900/5 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/api/logo" alt="N&M" className="h-11 w-11 rounded-2xl object-cover" onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "grid"; }} />
            <div className="hidden h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white">NM</div>
            <div>
              <h1 className="text-lg font-black tracking-tight">Truck Delivery</h1>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">{data.settings.companyName || "N&M LOGISTIC"}</p>
            </div>
          </div>
          <nav className="hidden lg:flex w-full gap-1 overflow-auto rounded-2xl border border-slate-200 bg-slate-100 p-1 lg:w-auto">
            {navItems.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPage(key)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-black transition ${
                  page === key
                    ? "bg-teal-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-slate-950"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-500 lg:inline">
              {isAdmin ? "Admin" : "Staff"}
            </span>
            <button
              type="button" onClick={logout} title="Sign out"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {notice.text && (
        <div className={`mx-auto mt-4 max-w-[1500px] rounded-xl border px-4 py-3 text-sm font-bold shadow-sm ${notice.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-teal-200 bg-teal-50 text-teal-800"}`}>
          {notice.text}
        </div>
      )}

      {page === "dashboard" ? (
        <main className="mx-auto grid max-w-[1500px] gap-5 p-4 pb-20 lg:pb-4">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-teal-600">N&M Logistic</p>
              <h2 className="text-3xl font-black tracking-tight text-slate-900">Dashboard</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {new Date(reportMonth + "-01").toLocaleString("default", { month: "long", year: "numeric" })} overview
              </p>
            </div>
            <Field label="Report Month">
              <Input type="month" value={reportMonth} onChange={(event) => { setReportMonth(event.target.value); setReportTruckNo(""); }} />
            </Field>
          </div>

          {/* KPI cards */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              tone="teal"
              label="Company Revenue"
              value={`$${money(monthlyTotals.companyAmount)}`}
              sub={`${monthlyTotals.trips} trips · ${monthlyTotals.qty.toFixed(2)}T`}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>}
            />
            <MetricCard
              tone="amber"
              label="Driver Payment"
              value={`$${money(monthlyTotals.driverAmount)}`}
              sub={`${activeTruckCount} active truck${activeTruckCount !== 1 ? "s" : ""}`}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
            />
            <MetricCard
              tone="blue"
              label="Profit"
              value={`$${money(monthlyTotals.margin)}`}
              sub={`${monthlyTotals.companyAmount > 0 ? ((monthlyTotals.margin / monthlyTotals.companyAmount) * 100).toFixed(1) : "0.0"}% margin`}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
            />
            <MetricCard
              tone={dashOutstanding.amount > 0 ? "red" : "emerald"}
              label="Outstanding"
              value={`$${money(dashOutstanding.amount)}`}
              sub={dashOutstanding.count > 0 ? `${dashOutstanding.count} statement${dashOutstanding.count !== 1 ? "s" : ""} unpaid` : "All payments received"}
              onClick={isAdmin ? () => setPage("payments") : undefined}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
            />
          </div>

          {/* Business snapshot */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-600">Crane — {statementCounts.withCrane} statements</span>
              </div>
              <div className="text-2xl font-black text-teal-950">${money(statementCounts.craneAmount)}</div>
              <div className="mt-1 text-xs font-bold text-teal-600">6 crane trucks</div>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-500"></span>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-600">No Crane — {statementCounts.withoutCrane} statements</span>
              </div>
              <div className="text-2xl font-black text-sky-950">${money(statementCounts.noCraneAmount)}</div>
              <div className="mt-1 text-xs font-bold text-sky-600">3 no-crane trucks</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total Revenue</span>
              </div>
              <div className="text-2xl font-black text-slate-900">${money(statementCounts.totalAmount)}</div>
              <div className="mt-1 text-xs font-bold text-slate-500">{statementCounts.total} statement{statementCounts.total !== 1 ? "s" : ""} this month</div>
            </div>
          </div>

          {/* Truck performance cards */}
          <div>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-black tracking-tight">Truck Performance</h3>
                <p className="text-xs font-bold text-slate-500">{new Date(reportMonth + "-01").toLocaleString("default", { month: "long", year: "numeric" })} — sorted by revenue</p>
              </div>
              {isAdmin && (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => downloadFile(`/api/export/dashboard?month=${encodeURIComponent(reportMonth)}&format=xls`).catch((err) => flash(err.message, "error"))}>Export Excel</Button>
                  <Button type="button" variant="secondary" onClick={() => downloadFile(`/api/export/dashboard?month=${encodeURIComponent(reportMonth)}&format=pdf`).catch((err) => flash(err.message, "error"))}>Export PDF</Button>
                </div>
              )}
            </div>
            {(() => {
              const maxCompany = Math.max(...truckPerformance.map((t) => t.companyAmount), 1);
              return (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {truckPerformance.map((truck) => {
                    const isCrane = truck.truckType === "With Crane";
                    const barPct = Math.round((truck.companyAmount / maxCompany) * 100);
                    const hasTrips = truck.trips > 0;
                    return (
                      <div key={truck.truckNo} className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${hasTrips ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
                        <div className={`px-4 py-3 flex items-center justify-between ${isCrane ? "bg-teal-700" : "bg-sky-700"}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-white tracking-tight">{truck.truckNo}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isCrane ? "bg-teal-500/40 text-white" : "bg-sky-500/40 text-white"}`}>
                              {isCrane ? "CRANE" : "NO CRANE"}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-white/70">{truck.driverName || "—"}</span>
                        </div>
                        <div className="px-4 pt-3 pb-2">
                          <div className="grid grid-cols-3 gap-1 mb-3">
                            {[["Days", truck.workingDays], ["Trips", truck.trips], ["QTY", `${truck.qty.toFixed(1)}T`]].map(([l, v]) => (
                              <div key={l} className="text-center">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">{l}</div>
                                <div className="text-base font-black text-slate-800">{v}</div>
                              </div>
                            ))}
                          </div>
                          <div className="mb-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${isCrane ? "bg-teal-500" : "bg-sky-500"}`} style={{ width: `${barPct}%` }} />
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-center">
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Revenue</div>
                              <div className="text-sm font-black text-slate-800">${money(truck.companyAmount)}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Driver</div>
                              <div className="text-sm font-black text-slate-600">${money(truck.driverAmount)}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Profit</div>
                              <div className={`text-sm font-black ${truck.margin >= 0 ? "text-emerald-700" : "text-red-600"}`}>${money(truck.margin)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {truckPerformance.length === 0 && (
                    <div className="col-span-3 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400">
                      No delivery data for this month.
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Activity timeline */}
          <Panel>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black tracking-tight">Recent Activity</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">Latest changes</span>
            </div>
            {(data.activity || []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-bold text-slate-400">No activity recorded yet.</div>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-100" />
                <div className="grid gap-4">
                  {(data.activity || []).slice(0, 8).map((item, i) => {
                    const msg = item.message || "";
                    const isPrice = msg.toLowerCase().includes("price");
                    const isTruck = msg.toLowerCase().includes("truck");
                    const isBackup = msg.toLowerCase().includes("backup");
                    const dotColor = isPrice ? "bg-amber-400" : isTruck ? "bg-sky-400" : isBackup ? "bg-purple-400" : "bg-teal-400";
                    const borderColor = isPrice ? "border-amber-100" : isTruck ? "border-sky-100" : isBackup ? "border-purple-100" : "border-teal-100";
                    const bgColor = isPrice ? "bg-amber-50" : isTruck ? "bg-sky-50" : isBackup ? "bg-purple-50" : "bg-teal-50";
                    return (
                      <div key={item.id} className="relative">
                        <span className={`absolute -left-[18px] top-2 h-3 w-3 rounded-full border-2 border-white ${dotColor}`} />
                        <div className={`rounded-xl border px-4 py-3 ${borderColor} ${bgColor}`}>
                          <div className="text-sm font-black text-slate-900">{item.message}</div>
                          <div className="mt-0.5 text-xs font-bold text-slate-500">{formatDateTime(item.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Panel>
        </main>
      ) : page === "data-entry" ? (
        <main className="mx-auto grid max-w-[1500px] gap-4 p-4 pb-20 lg:pb-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          {!selectedViewStatement && !selectedStatement && !showStatementWorkspace && (
          <Panel className="lg:col-span-2">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Data Entry</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">Choose one entry option, then create or edit a statement.</p>
              </div>
              <div className="grid gap-1 rounded-2xl bg-slate-100 p-1 md:grid-cols-2">
                {["With Crane", "Without Crane"].map((truckType) => (
                  <button
                    key={truckType}
                    type="button"
                    onClick={() => startEntryAction(truckType).catch((err) => flash(err.message, "error"))}
                    className={`min-w-[220px] rounded-xl px-4 py-3 text-left transition ${
                      entryTruckType === truckType
                        ? "bg-teal-700 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:text-slate-950"
                    }`}
                  >
                    <div className="text-base font-black">{truckType === "With Crane" ? "Crane Entry" : "No Crane Entry"}</div>
                    <div className="mt-0.5 text-xs font-bold opacity-75">
                      {truckType === "With Crane"
                        ? `6 trucks | ${statementCounts.withCrane} statements`
                        : `3 trucks | ${statementCounts.withoutCrane} statements`}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Panel>
          )}

          {!selectedViewStatement && entryActionTruckType && (
            <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-slate-950/40 sm:p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/20">
                <div className="mb-4">
                  <h3 className="text-xl font-black tracking-tight">
                    {entryActionTruckType === "With Crane" ? "Crane Entry" : "No Crane Entry"}
                  </h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">Choose what you want to do next.</p>
                </div>
                <div className="grid gap-3">
                  <Button type="button" onClick={() => createEntryStatement(entryActionTruckType).catch((err) => flash(err.message, "error"))}>
                    Create Statement
                  </Button>
                  <Button type="button" variant="quiet" onClick={() => setEntryActionTruckType("")}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {selectedViewStatement && (
            <Panel className="lg:col-span-2">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-black tracking-tight">Statement {selectedViewStatement.statementNumber} - {monthName(selectedViewStatement.month)}</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {truckTypeLabel(selectedViewStatement.truckType)} | {selectedViewStatement.status} | {viewStatementRows.length}/30 rows
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={backToStatementList}>Back to Statements</Button>
                  <Button type="button" variant="secondary" onClick={() => openStatement(selectedViewStatement)}>Edit</Button>
                  <Button
                    type="button"
                    onClick={() => {
                      downloadFile(`/api/export/accounting?statementId=${encodeURIComponent(selectedViewStatement.id)}&truckType=${encodeURIComponent(selectedViewStatement.truckType)}`).catch((err) => flash(err.message, "error"));
                    }}
                    disabled={viewStatementRows.length < 1}
                  >
                    Export Statement
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <KpiCard label="Rows" value={`${viewStatementRows.length}/30`} tone="blue" />
                <KpiCard label="Total QTY" value={`${viewTotals.qty.toFixed(4)}T`} tone="slate" />
                <KpiCard label="Total Amount" value={`$${money(viewTotals.amount)}`} tone="amber" />
              </div>
              <div className="mt-4 overflow-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[1100px] border-collapse bg-white text-sm">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="px-3 py-3 text-left font-black">No</th>
                      <th className="px-3 py-3 text-left font-black">Delivery Date</th>
                      <th className="px-3 py-3 text-left font-black">Invoice Number</th>
                      <th className="px-3 py-3 text-left font-black">Truck Number</th>
                      <th className="px-3 py-3 text-left font-black">Type of Truck</th>
                      <th className="px-3 py-3 text-left font-black">From Location</th>
                      <th className="px-3 py-3 text-left font-black">To Location</th>
                      <th className="px-3 py-3 text-right font-black">QTY(T)</th>
                      <th className="px-3 py-3 text-right font-black">Unit Price</th>
                      <th className="px-3 py-3 text-right font-black">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewStatementRows.map((row, index) => (
                      <tr key={row.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                        <td className="px-3 py-3 font-bold">{index + 1}</td>
                        <td className="px-3 py-3">{formatDate(row.deliveryDate)}</td>
                        <td className="px-3 py-3">{row.invoiceNo}</td>
                        <td className="px-3 py-3 font-bold">{row.truckNo}</td>
                        <td className="px-3 py-3">{truckTypeLabel(row.truckType)}</td>
                        <td className="px-3 py-3">{row.fromLocation}</td>
                        <td className="px-3 py-3">{row.toLocation}</td>
                        <td className="px-3 py-3 text-right font-bold">{Number(row.qtyTon || 0).toFixed(5)}T</td>
                        <td className="px-3 py-3 text-right">$ {unitMoney(row.companyUnitPrice)}</td>
                        <td className="px-3 py-3 text-right font-black">$ {money(row.companyTotalAmount)}</td>
                      </tr>
                    ))}
                    {viewStatementRows.length === 0 && (
                      <tr>
                        <td className="px-3 py-6 text-center text-sm font-bold text-slate-500" colSpan="10">No delivery rows in this statement.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {!selectedViewStatement && !showStatementWorkspace && !selectedStatement && (() => {
            const svgR = 54;
            const svgCirc = 2 * Math.PI * svgR;
            const total = statementCounts.total;
            const craneFrac = total > 0 ? statementCounts.withCrane / total : 0;
            const nocrFrac = total > 0 ? statementCounts.withoutCrane / total : 0;
            const monthLabel = statementCounts.month
              ? new Date(statementCounts.month + "-01").toLocaleString("default", { month: "long", year: "numeric" })
              : "";
            return (
              <Panel className="lg:col-span-2">
                <p className="mb-4 text-xs font-black uppercase tracking-wide text-slate-500">{monthLabel} — Statement Overview</p>
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                  <div className="relative flex-shrink-0">
                    <svg width="160" height="160" viewBox="0 0 160 160">
                      <circle cx="80" cy="80" r={svgR} fill="none" stroke="#e2e8f0" strokeWidth="26" />
                      {craneFrac > 0 && (
                        <circle cx="80" cy="80" r={svgR} fill="none" stroke="#0d9488" strokeWidth="26"
                          strokeDasharray={`${craneFrac * svgCirc} ${svgCirc}`}
                          transform="rotate(-90 80 80)" strokeLinecap="butt" />
                      )}
                      {nocrFrac > 0 && (
                        <circle cx="80" cy="80" r={svgR} fill="none" stroke="#3b82f6" strokeWidth="26"
                          strokeDasharray={`${nocrFrac * svgCirc} ${svgCirc}`}
                          transform={`rotate(${-90 + craneFrac * 360} 80 80)`} strokeLinecap="butt" />
                      )}
                      <text x="80" y="73" textAnchor="middle" fontSize="28" fontWeight="900" fill="#0f172a">{total}</text>
                      <text x="80" y="92" textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b" letterSpacing="1">TOTAL</text>
                    </svg>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 w-full">
                    <div className="flex items-center gap-4 rounded-xl bg-teal-50 border border-teal-100 px-4 py-3">
                      <div className="h-4 w-4 rounded-sm bg-teal-600 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-xs font-black uppercase tracking-wide text-teal-700">Crane Statements</div>
                        <div className="text-2xl font-black text-teal-950">{statementCounts.withCrane}</div>
                        <div className="text-xs font-bold text-teal-600 mt-0.5">${statementCounts.craneAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-teal-700">{total > 0 ? Math.round(craneFrac * 100) : 0}%</div>
                        <div className="text-xs font-bold text-teal-500">of count</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 rounded-xl bg-sky-50 border border-sky-100 px-4 py-3">
                      <div className="h-4 w-4 rounded-sm bg-blue-500 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-xs font-black uppercase tracking-wide text-blue-700">No Crane Statements</div>
                        <div className="text-2xl font-black text-blue-950">{statementCounts.withoutCrane}</div>
                        <div className="text-xs font-bold text-blue-600 mt-0.5">${statementCounts.noCraneAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-blue-600">{total > 0 ? Math.round(nocrFrac * 100) : 0}%</div>
                        <div className="text-xs font-bold text-blue-400">of count</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5">
                      <div className="text-xs font-black uppercase tracking-wide text-slate-600">Total Revenue</div>
                      <div className="text-xl font-black text-slate-900">${statementCounts.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                </div>
              </Panel>
            );
          })()}

          {!selectedViewStatement && !showStatementWorkspace && !selectedStatement && (
            <Panel className="lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black tracking-tight">Historical Quick Entry</h3>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">For past statements before this system — enter statement number, month, and amount directly.</p>
                </div>
                <Button type="button" variant="secondary" onClick={() => setShowQuickEntry((v) => !v)}>
                  {showQuickEntry ? "Hide" : "Add Past Statement"}
                </Button>
              </div>
              {showQuickEntry && (
                <form onSubmit={saveQuickStatement} className="mt-4 grid gap-3 md:grid-cols-4 border-t border-slate-100 pt-4">
                  <Field label="Statement Number">
                    <Input
                      type="number"
                      placeholder="e.g. 1531"
                      required
                      value={quickForm.statementNumber}
                      onChange={(e) => setQuickForm({ ...quickForm, statementNumber: e.target.value })}
                    />
                  </Field>
                  <Field label="Month">
                    <Input
                      type="month"
                      required
                      value={quickForm.month}
                      onChange={(e) => setQuickForm({ ...quickForm, month: e.target.value })}
                    />
                  </Field>
                  <Field label="Amount ($)">
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="e.g. 2914.60"
                      required
                      value={quickForm.manualAmount}
                      onChange={(e) => setQuickForm({ ...quickForm, manualAmount: e.target.value })}
                    />
                  </Field>
                  <Field label=" ">
                    <Button type="submit">Save Statement</Button>
                  </Field>
                </form>
              )}
            </Panel>
          )}

          {!selectedViewStatement && !showStatementWorkspace && !selectedStatement && (
            <Panel id="all-statements-panel" className="lg:col-span-2">
              <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-black tracking-tight">All Statements</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-600">
                  Crane {statementCounts.withCrane} | No Crane {statementCounts.withoutCrane} | Total {statementCounts.total}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Month"><Input type="month" value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })} /></Field>
                <Field label="Statement No">
                  <Input
                    placeholder="Search statement number"
                    value={filters.statementNumber}
                    onChange={(e) => setFilters({ ...filters, statementNumber: e.target.value })}
                  />
                </Field>
              </div>
              <div className="mt-4 grid max-h-[520px] gap-2 overflow-auto pr-1">
                {filteredStatements.map((statement) => (
                  <div key={statement.id} className={`grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border p-3 transition ${statement.id === selectedStatementId ? "border-teal-700 bg-teal-50 shadow-sm" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="block text-sm font-black">Statement {statement.statementNumber} - {monthName(statement.month)}</strong>
                        {statement.isManual ? (
                          <span className="rounded-full px-2 py-0.5 text-xs font-black bg-orange-100 text-orange-700">Manual</span>
                        ) : (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-black ${statement.truckType === "With Crane" ? "bg-teal-100 text-teal-800" : "bg-sky-100 text-sky-800"}`}>
                            {truckTypeLabel(statement.truckType)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">{statement.month} | {statement.status} | {statement.isManual ? "Manual entry" : `${statement.rowCount}/30 rows`} | ${money(statement.companyTotalAmount)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => viewStatement(statement)}>View</Button>
                      {isAdmin && <Button type="button" variant="secondary" onClick={() => exportStatementFile(statement, "xls")} disabled={statement.rowCount < 1}>Excel</Button>}
                      {isAdmin && <Button type="button" variant="secondary" onClick={() => exportStatementFile(statement, "pdf")} disabled={statement.rowCount < 1}>PDF</Button>}
                      {isAdmin && (
                        <Button type="button" variant="secondary" onClick={() => { setAssignModal(statement); setAssignMonth(statement.paymentMonth || currentMonth()); }}>
                          {statement.paymentMonth ? `Payment: ${monthName(statement.paymentMonth)}` : "Assign Payment"}
                        </Button>
                      )}
                      <Button type="button" onClick={() => openStatement(statement)}>Edit</Button>
                      {isAdmin && <Button type="button" variant="danger" onClick={() => deleteStatement(statement)}>Delete</Button>}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {selectedStatement && (
            <div className="grid gap-3 lg:col-span-2 lg:grid-cols-4">
              <KpiCard label="Selected" value={`Statement ${selectedStatement.statementNumber}`} tone="teal" />
              <KpiCard label="Rows" value={`${statementRows.length}/30`} tone="blue" />
              <KpiCard label="Total QTY" value={`${totals.qty.toFixed(4)}T`} tone="slate" />
              <KpiCard label="Total Amount" value={`$${money(totals.amount)}`} tone="amber" />
            </div>
          )}

          {(showStatementWorkspace || selectedStatement) && (
          <Panel id="statement-form-panel" className="lg:col-span-2">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-lg font-black tracking-tight">
                {selectedStatement ? `${truckTypeLabel(entryTruckType)} Statement Details` : `Create ${truckTypeLabel(entryTruckType)} Statement`}
              </h2>
              <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm font-black text-teal-800">
                {selectedStatement ? `Statement ${selectedStatement.statementNumber} | ${truckTypeLabel(selectedStatement.truckType)} | ${selectedStatement.status} | ${statementRows.length}/30 rows` : `${truckTypeLabel(entryTruckType)} mode`}
              </span>
            </div>
            <form className="grid gap-3 md:grid-cols-4" onSubmit={saveStatement}>
              <Field label="Month">
                <Input
                  type="month"
                  required
                  value={statementForm.month}
                  onChange={async (event) => {
                    const month = event.target.value;
                    setStatementForm((current) => ({ ...current, month }));
                    if (!statementForm.id && month) {
                      try {
                        const statementNumber = await getNextStatementNumber(month);
                        setStatementForm((current) => ({ ...current, month, statementNumber }));
                      } catch (err) {
                        flash(err.message, "error");
                      }
                    }
                  }}
                />
              </Field>
              <Field label="Truck Type"><Input value={truckTypeLabel(entryTruckType)} disabled readOnly /></Field>
              <Field label="Statement No">
                <Input type="number" min="1" required placeholder="Enter your statement number" value={statementForm.statementNumber} onChange={(event) => setStatementForm({ ...statementForm, statementNumber: event.target.value })} />
              </Field>
              <Field label="Statement Date">
                <Input type="date" required value={statementForm.statementDate} onChange={(event) => setStatementForm({ ...statementForm, statementDate: event.target.value })} />
              </Field>
              <div className="flex flex-wrap items-end gap-2 md:col-span-4">
                <Button type="submit">{statementForm.id ? "Save Changes" : "Create Statement"}</Button>
                <Button type="button" variant="secondary" onClick={backToStatementList}>
                  Back to Statements
                </Button>
                {selectedStatement && !isDraft && (
                  <Button type="button" variant="secondary" onClick={reopenStatement}>Reopen to Edit Rows</Button>
                )}
              </div>
            </form>
          </Panel>
          )}

          {selectedStatement && (
            <>
              <Panel className="lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-black tracking-tight">{isEditingDelivery ? "Edit Delivery Row" : "Delivery Entry"}</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600">
                    Statement {selectedStatement.statementNumber} - {truckTypeLabel(selectedStatement.truckType)} - {statementRows.length}/30 rows
                  </span>
                </div>
                <form ref={deliveryFormRef} className="grid gap-3 md:grid-cols-4" onSubmit={saveDelivery}>
                  <Field label="Delivery Date"><Input type="date" required disabled={!canEditRows} style={activeField === "deliveryDate" ? { backgroundColor: "#fef08a" } : {}} onFocus={() => setActiveField("deliveryDate")} onBlur={() => setActiveField("")} value={deliveryForm.deliveryDate} onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryDate: e.target.value })} /></Field>
                  <Field label="Invoice No">
                    <Input
                      ref={invoiceInputRef}
                      required
                      disabled={!canEditRows}
                      inputMode="numeric"
                      maxLength="10"
                      pattern="[0-9]{10}"
                      placeholder="10 digit number"
                      style={activeField === "invoiceNo" ? { backgroundColor: "#fef08a" } : {}}
                      onFocus={() => setActiveField("invoiceNo")}
                      onBlur={() => setActiveField("")}
                      value={deliveryForm.invoiceNo}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, invoiceNo: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                    />
                  </Field>
                  <Field label="Truck No">
                    <Input
                      list="delivery-truck-options"
                      required
                      disabled={!canEditRows}
                      placeholder="Type truck"
                      style={activeField === "truckNo" ? { backgroundColor: "#fef08a" } : {}}
                      onFocus={() => setActiveField("truckNo")}
                      onBlur={() => setActiveField("")}
                      value={deliveryForm.truckNo}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, truckNo: e.target.value.toUpperCase(), toLocation: "" })}
                    />
                    <datalist id="delivery-truck-options">
                      {truckOptions.map((truck) => <option key={truck.truckNo} value={truck.truckNo} />)}
                    </datalist>
                  </Field>
                  <Field label="To Location">
                    <Input
                      list="delivery-location-options"
                      required
                      disabled={!canEditRows}
                      placeholder="Type location"
                      style={activeField === "toLocation" ? { backgroundColor: "#fef08a" } : {}}
                      onFocus={() => setActiveField("toLocation")}
                      onBlur={() => setActiveField("")}
                      value={deliveryForm.toLocation}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, toLocation: e.target.value })}
                    />
                    <datalist id="delivery-location-options">
                      {locations.map((location) => <option key={location} value={location} />)}
                    </datalist>
                  </Field>
                  {isEditingDelivery && (
                    <Field label="From Location">
                      <Select
                        required
                        disabled={!canEditRows}
                        style={activeField === "fromLocation" ? { backgroundColor: "#fef08a" } : {}}
                        onFocus={() => setActiveField("fromLocation")}
                        onBlur={() => setActiveField("")}
                        value={deliveryForm.fromLocation}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, fromLocation: e.target.value })}
                      >
                        <option value="Warehouse-09">Warehouse-09</option>
                        <option value="GS01">GS01</option>
                      </Select>
                    </Field>
                  )}
                  <Field label="QTY(T)"><Input type="number" step="any" min="0" required disabled={!canEditRows} style={activeField === "qtyTon" ? { backgroundColor: "#fef08a" } : {}} onFocus={() => setActiveField("qtyTon")} onBlur={() => setActiveField("")} value={deliveryForm.qtyTon} onChange={(e) => setDeliveryForm({ ...deliveryForm, qtyTon: e.target.value })} /></Field>
                  <Field label="Unit Price"><Input disabled value={selectedPrice ? `$${unitMoney(selectedPrice.companyUnitPrice)}` : ""} readOnly /></Field>
                  {(duplicateInvoice || truckMissing || truckTypeMismatch || missingPrice) && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 md:col-span-4">
                      {duplicateInvoice && <div>Invoice number already exists. Use a different invoice number or edit the existing row.</div>}
                      {truckMissing && <div>Truck number does not exist or is inactive.</div>}
                      {truckTypeMismatch && <div>This truck belongs to {truckTypeLabel(selectedTruck.truckType)}, so it cannot be saved inside a {truckTypeLabel(selectedStatement.truckType)} statement.</div>}
                      {missingPrice && <div>No active price found for this location and delivery date. Add the price in Setup before saving.</div>}
                    </div>
                  )}
                  <div className="flex items-end gap-2 md:col-span-2">
                    <Button type="submit" disabled={!canSaveDelivery}>{isEditingDelivery ? "Update Row" : "Save Delivery"}</Button>
                    <Button type="button" variant="secondary" onClick={() => resetDeliveryForm()}>Cancel</Button>
                    {isDraft && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={finishStatement}
                        disabled={!canFinishStatement}
                        title={canFinishStatement ? "Finish this statement" : "Add at least one delivery row before finishing"}
                      >
                        Finish Statement
                      </Button>
                    )}
                  </div>
                </form>
              </Panel>

          <Panel className="lg:col-span-2">
            <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-lg font-black tracking-tight">Current Statement Rows</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm font-black text-slate-600">
                <span>Rows: {statementRows.length} / 30</span>
                <span>QTY: {totals.qty.toFixed(4)}T</span>
                <span>Total: ${money(totals.amount)}</span>
                {statementRows.some((r) => r.highlighted) && (
                  <Button type="button" variant="secondary" onClick={clearHighlights}>Clear Highlights</Button>
                )}
              </div>
            </div>
            <div className="overflow-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1100px] border-collapse bg-white text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    {["No", "Delivery Date", "Invoice Number", "Truck Number", "Type of Truck", "From Location", "To Location", "QTY(T)", "Unit Price", "Total Amount"].map((heading) => (
                      <th key={heading} className="border-b border-slate-800 px-3 py-3 text-left font-black">{heading}</th>
                    ))}
                    <th className="border-b border-slate-800 px-3 py-3 text-left font-black">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {statementRows.map((row, index) => (
                    <tr key={row.id} className={`border-b border-slate-100 transition ${deliveryForm.id === row.id ? "bg-teal-50" : row.highlighted ? "bg-yellow-100" : "odd:bg-white even:bg-slate-50 hover:bg-sky-50"}`}>
                      <td className="px-3 py-3">{index + 1}</td>
                      <td className="px-3 py-3 text-center">{formatDate(row.deliveryDate)}</td>
                      <td className="px-3 py-3">{row.invoiceNo}</td>
                      <td className="px-3 py-3 font-bold">{row.truckNo}</td>
                      <td className="px-3 py-3">{truckTypeLabel(row.truckType)}</td>
                      <td className="px-3 py-3">{row.fromLocation}</td>
                      <td className="px-3 py-3">{row.toLocation}</td>
                      <td className="px-3 py-3 text-right font-bold">{Number(row.qtyTon).toFixed(5)}T</td>
                      <td className="px-3 py-3 text-right">$ {unitMoney(row.companyUnitPrice)}</td>
                      <td className="px-3 py-3 text-right font-bold">$ {money(row.companyTotalAmount)}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <Button type="button" variant="secondary" onClick={() => editDelivery(row)} disabled={!isDraft}>Edit</Button>
                          <Button type="button" variant="danger" onClick={() => deleteDelivery(row)} disabled={!isDraft}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
            </>
          )}
        </main>
      ) : page === "reports" ? (
        <main className="mx-auto grid max-w-[1500px] gap-4 p-4 pb-20 lg:pb-4">
          <PageHead
            title="Driver Payment"
            meta="Month-end salary, deductions, and net pay by truck."
            action={(
              <Field label="Report Month">
                <Input
                  type="month"
                  value={reportMonth}
                  onChange={(event) => {
                    setReportMonth(event.target.value);
                    setReportTruckNo("");
                  }}
                />
              </Field>
            )}
          />

          {selectedDriverPaymentSection ? (() => {
            const d = getDeduction(selectedDriverPaymentSection.truckNo);
            const loanAmt = Number(d.loanDeduction) || 0;
            const garageAmt = Number(d.garageFee) || 0;
            const netPay = selectedDriverPaymentSection.driverAmount - loanAmt - garageAmt;
            return (
              <Panel>
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black tracking-tight">{selectedDriverPaymentSection.truckNo}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-black ${selectedDriverPaymentSection.truckType === "With Crane" ? "bg-teal-100 text-teal-800" : "bg-sky-100 text-sky-800"}`}>
                        {truckTypeLabel(selectedDriverPaymentSection.truckType)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {selectedDriverPaymentSection.driverName} | {selectedDriverPaymentSection.workingDays} days · {selectedDriverPaymentSection.trips} trips · {selectedDriverPaymentSection.qty.toFixed(4)}T
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => setReportTruckNo("")}>Back</Button>
                    {isAdmin && <Button type="button" variant="secondary" onClick={() => exportSalary(selectedDriverPaymentSection, "pdf")}>PDF</Button>}
                    {isAdmin && <Button type="button" onClick={() => exportSalary(selectedDriverPaymentSection, "xls")}>Excel</Button>}
                  </div>
                </div>
                <div className="overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[1050px] table-fixed border-collapse bg-white text-sm">
                    <thead className="bg-slate-900 text-white">
                      <tr>
                        <th className="w-14 px-3 py-3 text-center font-black">No</th>
                        <th className="w-32 px-3 py-3 text-center font-black">Delivery Date</th>
                        <th className="w-36 px-3 py-3 text-left font-black">Invoice No</th>
                        <th className="w-40 px-3 py-3 text-left font-black">From</th>
                        <th className="px-3 py-3 text-left font-black">To</th>
                        <th className="w-32 px-3 py-3 text-right font-black">QTY(T)</th>
                        <th className="w-36 px-3 py-3 text-right font-black">Driver Price</th>
                        <th className="w-40 px-3 py-3 text-right font-black">Driver Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDriverPaymentSection.rows.map((row, index) => (
                        <tr key={row.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                          <td className="px-3 py-3 text-center">{index + 1}</td>
                          <td className="px-3 py-3 text-center whitespace-nowrap">{formatDate(row.deliveryDate)}</td>
                          <td className="px-3 py-3 tabular-nums">{row.invoiceNo}</td>
                          <td className="px-3 py-3">{row.fromLocation}</td>
                          <td className="px-3 py-3">{row.toLocation}</td>
                          <td className="px-3 py-3 text-right font-bold tabular-nums">{Number(row.qtyTon || 0).toFixed(4)}T</td>
                          <td className="px-3 py-3 text-right font-bold tabular-nums">$ {unitMoney(row.truckSalaryUnitPrice)}</td>
                          <td className="px-3 py-3 text-right font-black tabular-nums">$ {money(row.truckSalaryAmount)}</td>
                        </tr>
                      ))}
                      <tr className="bg-amber-50 font-black border-t-2 border-amber-200">
                        <td className="px-3 py-3" colSpan="5">Total</td>
                        <td className="px-3 py-3 text-right tabular-nums">{selectedDriverPaymentSection.qty.toFixed(4)}T</td>
                        <td className="px-3 py-3"></td>
                        <td className="px-3 py-3 text-right tabular-nums">$ {money(selectedDriverPaymentSection.driverAmount)}</td>
                      </tr>
                      {loanAmt > 0 && (
                        <tr className="bg-red-50 text-red-700 font-bold">
                          <td className="px-3 py-3 text-sm" colSpan="7">Loan Deduction</td>
                          <td className="px-3 py-3 text-right tabular-nums text-sm">- $ {money(loanAmt)}</td>
                        </tr>
                      )}
                      {garageAmt > 0 && (
                        <tr className="bg-red-50 text-red-700 font-bold">
                          <td className="px-3 py-3 text-sm" colSpan="7">Garage Fee</td>
                          <td className="px-3 py-3 text-right tabular-nums text-sm">- $ {money(garageAmt)}</td>
                        </tr>
                      )}
                      {(loanAmt > 0 || garageAmt > 0) && (
                        <tr className="bg-emerald-50 font-black border-t-2 border-emerald-200">
                          <td className="px-3 py-3 text-emerald-800" colSpan="7">Net Pay</td>
                          <td className="px-3 py-3 text-right tabular-nums text-emerald-800">$ {money(netPay)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>
            );
          })() : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {driverPaymentSections.map((truck) => {
                const d = getDeduction(truck.truckNo);
                const loanAmt = Number(d.loanDeduction) || 0;
                const garageAmt = Number(d.garageFee) || 0;
                const netPay = truck.driverAmount - loanAmt - garageAmt;
                const isCrane = truck.truckType === "With Crane";
                return (
                  <div key={truck.truckNo} className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h4 className="text-lg font-black text-white tracking-tight">{truck.truckNo}</h4>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${isCrane ? "bg-teal-400 text-teal-950" : "bg-sky-400 text-sky-950"}`}>
                          {truckTypeLabel(truck.truckType)}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-400">{truck.driverName || "—"}</span>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                      {[["Days", truck.workingDays], ["Trips", truck.trips], ["QTY", `${truck.qty.toFixed(2)}T`]].map(([label, value]) => (
                        <div key={label} className="px-3 py-3 text-center">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</div>
                          <div className="mt-0.5 text-base font-black text-slate-800">{value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="px-5 py-4 flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-500">Gross Pay</span>
                        <span className="text-sm font-black tabular-nums text-slate-800">$ {money(truck.driverAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-slate-500 shrink-0">Loan Deduction</span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-slate-400 font-bold">-$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-sm font-black tabular-nums text-slate-800 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                            value={d.loanDeduction}
                            onChange={(e) => setDeductionEdits((prev) => ({ ...prev, [truck.truckNo]: { ...prev[truck.truckNo], loanDeduction: e.target.value } }))}
                            onBlur={() => saveDeduction(truck.truckNo)}
                          />
                        </div>
                      </div>
                      {isCrane && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-bold text-slate-500 shrink-0">Garage Fee</span>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-slate-400 font-bold">-$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-sm font-black tabular-nums text-slate-800 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                              value={d.garageFee}
                              onChange={(e) => setDeductionEdits((prev) => ({ ...prev, [truck.truckNo]: { ...prev[truck.truckNo], garageFee: e.target.value } }))}
                              onBlur={() => saveDeduction(truck.truckNo)}
                            />
                          </div>
                        </div>
                      )}
                      <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                        <span className="text-sm font-black text-slate-700">Net Pay</span>
                        <span className={`text-base font-black tabular-nums ${netPay >= 0 ? "text-emerald-700" : "text-red-600"}`}>$ {money(netPay)}</span>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 px-5 py-3 flex justify-end gap-2">
                      <Button type="button" variant="secondary" onClick={() => setReportTruckNo(truck.truckNo)}>View</Button>
                      {isAdmin && <Button type="button" variant="secondary" onClick={() => exportSalary(truck, "pdf")}>PDF</Button>}
                      {isAdmin && <Button type="button" onClick={() => exportSalary(truck, "xls")}>Excel</Button>}
                    </div>
                  </div>
                );
              })}
              {driverPaymentSections.length === 0 && (
                <div className="col-span-3 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-bold text-slate-500">
                  No driver payment data for this month.
                </div>
              )}
            </div>
          )}
        </main>
      ) : page === "payments" ? (() => {
        const allStatements = data.statements || [];
        const allPaymentMonths = data.paymentMonths || [];

        // Section 1: all statements created in the selected calendar month
        const createdThisMonth = allStatements
          .filter((s) => s.month === paymentsViewMonth)
          .sort((a, b) => Number(a.statementNumber) - Number(b.statementNumber));

        // Section 2: statements assigned to selected payment month
        const assignedToMonth = allStatements
          .filter((s) => s.paymentMonth === paymentsViewMonth)
          .sort((a, b) => Number(a.statementNumber) - Number(b.statementNumber));
        const paymentMonthRecord = allPaymentMonths.find((pm) => pm.month === paymentsViewMonth);
        const isReceived = paymentMonthRecord?.received || false;

        // Section 3: everything the company owes
        // Includes: statements assigned to an unpaid payment month (submitted but not received)
        //           unassigned statements from the current calendar month only (pending next submission)
        // Excludes: statements whose paymentMonth has been marked as received
        //           old unassigned statements from past months (historical entries never submitted)
        const thisMonth = currentMonth();
        const outstanding = allStatements
          .filter((s) =>
            (s.paymentMonth && !allPaymentMonths.find((pm) => pm.month === s.paymentMonth && pm.received)) ||
            (!s.paymentMonth && s.month === thisMonth)
          )
          .sort((a, b) => (a.month || "").localeCompare(b.month || "") || Number(a.statementNumber) - Number(b.statementNumber));

        const sumAmount = (list) => list.reduce((sum, s) => sum + Number(s.companyTotalAmount || 0), 0);

        const StatementRow = ({ s, index, showPaymentMonth }) => (
          <tr key={s.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50 text-sm">
            <td className="px-3 py-2 text-center text-slate-500">{index + 1}</td>
            {showPaymentMonth && <td className="px-3 py-2 font-bold text-slate-600">{monthName(s.paymentMonth)}</td>}
            <td className="px-3 py-2 font-bold text-slate-600">{monthName(s.month)}</td>
            <td className="px-3 py-2 font-black tabular-nums">{s.statementNumber}</td>
            <td className="px-3 py-2 text-right font-black tabular-nums">$ {money(s.companyTotalAmount)}</td>
          </tr>
        );

        // Received history: payment months marked as received, sorted newest first
        const receivedHistory = allPaymentMonths
          .filter((pm) => pm.received)
          .map((pm) => {
            const pmStatements = allStatements.filter((s) => s.paymentMonth === pm.month);
            return { month: pm.month, total: sumAmount(pmStatements), count: pmStatements.length };
          })
          .sort((a, b) => b.month.localeCompare(a.month));

        return (
          <main className="mx-auto grid max-w-[1500px] gap-4 p-4 pb-20 lg:pb-4">
            <PageHead
              title="Payments"
              meta="Track which statements are sent to the company and what has been received."
              action={(
                <Field label="Payment Month">
                  <Input type="month" value={paymentsViewMonth} onChange={(e) => setPaymentsViewMonth(e.target.value)} />
                </Field>
              )}
            />

            {/* Received payments history */}
            {receivedHistory.length > 0 && (
              <Panel>
                <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Money Received from Company</p>
                <div className="flex flex-wrap gap-3">
                  {receivedHistory.map((rec) => {
                    const [yr, mo] = rec.month.split("-");
                    return (
                      <div key={rec.month} className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 min-w-[200px]">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-black">✓</div>
                        <div className="flex-1">
                          <div className="text-xs font-black uppercase tracking-wide text-emerald-700">Paid on 05/{mo}/{yr.slice(2)}</div>
                          <div className="text-lg font-black text-emerald-900">$ {money(rec.total)}</div>
                          <div className="text-xs font-bold text-emerald-600">{rec.count} statement{rec.count !== 1 ? "s" : ""}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
              {/* File 1 — Statements created this month */}
              <Panel>
                <h3 className="mb-3 text-base font-black tracking-tight">Statements Created — {monthName(paymentsViewMonth)}</h3>
                <p className="mb-3 text-xs font-bold text-slate-500">All statements you created in this calendar month.</p>
                {createdThisMonth.length === 0 ? (
                  <p className="text-sm font-bold text-slate-400 text-center py-6">No statements for this month.</p>
                ) : (
                  <div className="overflow-auto rounded-xl border border-slate-200">
                    <table className="w-full border-collapse bg-white text-sm">
                      <thead className="bg-slate-900 text-white text-xs">
                        <tr>
                          <th className="px-3 py-2 text-center">N</th>
                          <th className="px-3 py-2 text-left">Month</th>
                          <th className="px-3 py-2 text-left">Statement</th>
                          <th className="px-3 py-2 text-right">Income</th>
                        </tr>
                      </thead>
                      <tbody>
                        {createdThisMonth.map((s, i) => <StatementRow key={s.id} s={s} index={i} />)}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-black text-sm border-t-2 border-slate-300">
                          <td className="px-3 py-2" colSpan="3">$ Total</td>
                          <td className="px-3 py-2 text-right tabular-nums">$ {money(sumAmount(createdThisMonth))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Panel>

              {/* File 2 — Company pays this month */}
              <Panel>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-base font-black tracking-tight">
                    {(() => {
                      if (!paymentsViewMonth) return "Company Have to Pay";
                      const [yr, mo] = paymentsViewMonth.split("-");
                      return `Company Have to Pay on 05/${mo}/${yr.slice(2)}`;
                    })()}
                  </h3>
                  {assignedToMonth.length > 0 && (
                    <button
                      onClick={() => togglePaymentReceived(paymentsViewMonth)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black transition ${isReceived ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                    >
                      {isReceived ? "✓ Received" : "Mark Received"}
                    </button>
                  )}
                </div>
                <p className="mb-3 text-xs font-bold text-slate-500">Statements assigned to this payment month.</p>
                {assignedToMonth.length === 0 ? (
                  <p className="text-sm font-bold text-slate-400 text-center py-6">No statements assigned to this payment month yet.</p>
                ) : (
                  <div className="overflow-auto rounded-xl border border-slate-200">
                    <table className="w-full border-collapse bg-white text-sm">
                      <thead className="bg-slate-900 text-white text-xs">
                        <tr>
                          <th className="px-3 py-2 text-center">N</th>
                          <th className="px-3 py-2 text-left">Month</th>
                          <th className="px-3 py-2 text-left">Statement</th>
                          <th className="px-3 py-2 text-right">Income</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignedToMonth.map((s, i) => (
                          <tr key={s.id} className={`border-b border-slate-100 text-sm ${i === assignedToMonth.length - 1 ? "bg-yellow-100" : i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                            <td className="px-3 py-2 text-center text-slate-500">{i + 1}</td>
                            <td className="px-3 py-2 font-bold text-slate-600">{monthName(s.month)}</td>
                            <td className="px-3 py-2 font-black tabular-nums">{s.statementNumber}</td>
                            <td className="px-3 py-2 text-right font-black tabular-nums">$ {money(s.companyTotalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-black text-sm border-t-2 border-slate-300">
                          <td className="px-3 py-2" colSpan="3">$ Total</td>
                          <td className="px-3 py-2 text-right tabular-nums">$ {money(sumAmount(assignedToMonth))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Panel>

              {/* File 3 — Outstanding */}
              <Panel>
                <h3 className="mb-3 text-base font-black tracking-tight">Outstanding — Not Received Yet</h3>
                <p className="mb-3 text-xs font-bold text-slate-500">All assigned statements the company has not paid yet.</p>
                {outstanding.length === 0 ? (
                  <p className="text-sm font-bold text-emerald-600 text-center py-6">All clear — no outstanding payments.</p>
                ) : (
                  <div className="overflow-auto rounded-xl border border-slate-200">
                    <table className="w-full border-collapse bg-white text-sm">
                      <thead className="bg-slate-900 text-white text-xs">
                        <tr>
                          <th className="px-3 py-2 text-center">N</th>
                          <th className="px-3 py-2 text-left">Statement Month</th>
                          <th className="px-3 py-2 text-left">Statement</th>
                          <th className="px-3 py-2 text-right">Income</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outstanding.map((s, i) => <StatementRow key={s.id} s={s} index={i} />)}
                      </tbody>
                      <tfoot>
                        <tr className="bg-red-50 font-black text-sm border-t-2 border-red-200">
                          <td className="px-3 py-2 text-red-700" colSpan="3">$ Total Outstanding</td>
                          <td className="px-3 py-2 text-right tabular-nums text-red-700">$ {money(sumAmount(outstanding))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Panel>
            </div>
          </main>
        );
      })() : page === "prices" ? (
        <main className="mx-auto grid max-w-[1500px] gap-4 p-4 pb-20 lg:pb-4">
          <PageHead title="Price Comparison" meta="Compare company price vs driver price side by side for all locations." />

          <Panel>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">Price Periods Used</h2>
              <input type="month" value={pricePeriodsMonth} onChange={(e) => setPricePeriodsMonth(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
            </div>
            {pricePeriods.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">No deliveries found for this month.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {pricePeriods.map((period, i) => (
                  <div key={period.effectiveDate} className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex items-center gap-2 min-w-fit">
                      {period.effectiveDate === "unknown"
                        ? <span className="rounded-full bg-red-500 text-white text-xs font-bold px-2.5 py-0.5">No Price Found</span>
                        : <><span className="rounded-full bg-teal-600 text-white text-xs font-bold px-2.5 py-0.5">Period {i + 1}</span>
                          <span className="font-bold text-sm">{formatDate(period.rangeStart)}</span>
                          <span className="text-slate-400 text-xs">→</span>
                          <span className="font-bold text-sm">{formatDate(period.rangeEnd)}</span></>
                      }
                      <span className="text-xs text-slate-400">({period.deliveryCount} deliveries)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {period.statements.map((s) => (
                        <button key={s.id} type="button"
                          onClick={() => { setPage("reports"); }}
                          className="rounded-lg border border-teal-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 transition">
                          {s.statementNumber || s.id.slice(0, 8)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold">Price Comparison</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Active prices as of <span className="text-slate-700">{formatDate(priceCompareDate)}</span>. Red margin = driver cost exceeds company income.
                </p>
              </div>
              <div className="flex gap-3 flex-wrap items-center text-sm font-black">
                <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-800">Crane {priceCompareRows.filter((r) => r.crane).length}</span>
                <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-800">No Crane {priceCompareRows.filter((r) => r.noCrane).length}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Total {priceCompareRows.length}</span>
                <button type="button" onClick={diagnoseEmptyPrices}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-amber-800 hover:bg-amber-100 transition">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Check Coverage
                </button>
              </div>
            </div>

            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">View price list as of date</p>
              <div className="flex flex-wrap gap-2">
                {priceCompareDates.map((d, i) => {
                  const isLatest = i === priceCompareDates.length - 1;
                  const isSelected = d === priceCompareDate;
                  return (
                    <button key={d} type="button"
                      onClick={() => setPriceCompareDate(d)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold border transition ${isSelected ? "bg-teal-600 text-white border-teal-600" : "bg-white text-slate-600 border-slate-300 hover:border-teal-400 hover:text-teal-700"}`}>
                      {formatDate(d)}
                      {isLatest && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${isSelected ? "bg-white/30 text-white" : "bg-emerald-100 text-emerald-800"}`}>
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Filter by province</p>
              <div className="flex flex-wrap gap-2">
                <button type="button"
                  onClick={() => setPriceCompareProvince("")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold border transition ${priceCompareProvince === "" ? "bg-teal-600 text-white border-teal-600" : "bg-white text-slate-600 border-slate-300 hover:border-teal-400 hover:text-teal-700"}`}>
                  All <span className="text-xs font-normal opacity-70">({priceCompareRows.length})</span>
                </button>
                {priceCompareProvinces.map((prov) => {
                  const count = priceCompareRows.filter((r) => r.canonicalName.endsWith(`(${prov})`)).length;
                  return (
                    <button key={prov} type="button"
                      onClick={() => setPriceCompareProvince(prov)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold border transition ${priceCompareProvince === prov ? "bg-teal-600 text-white border-teal-600" : "bg-white text-slate-600 border-slate-300 hover:border-teal-400 hover:text-teal-700"}`}>
                      {prov} <span className="text-xs font-normal opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="overflow-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-900 text-white">
                    <th className="w-10 px-3 py-2 text-center font-black" rowSpan="2">No</th>
                    <th className="px-3 py-2 text-left font-black" rowSpan="2">Location</th>
                    <th className="px-3 py-2 text-center font-black border-l border-slate-600" colSpan="3">CRANE</th>
                    <th className="px-3 py-2 text-center font-black border-l border-slate-600" colSpan="3">NO CRANE</th>
                  </tr>
                  <tr className="bg-slate-800 text-white text-xs">
                    <th className="px-3 py-2 text-right font-black border-l border-slate-600">Company</th>
                    <th className="px-3 py-2 text-right font-black">Driver</th>
                    <th className="px-3 py-2 text-right font-black">Margin</th>
                    <th className="px-3 py-2 text-right font-black border-l border-slate-600">Company</th>
                    <th className="px-3 py-2 text-right font-black">Driver</th>
                    <th className="px-3 py-2 text-right font-black">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = priceCompareRows.filter((r) =>
                      !priceCompareProvince || r.canonicalName.endsWith(`(${priceCompareProvince})`)
                    );
                    if (filtered.length === 0) return (
                      <tr><td colSpan="8" className="px-3 py-6 text-center text-sm font-bold text-slate-400">No locations match.</td></tr>
                    );
                    return filtered.map((row, i) => {
                      const cComp = row.crane ? Number(row.crane.companyUnitPrice || 0) : null;
                      const cDriv = row.crane ? Number(row.crane.truckSalaryUnitPrice || 0) : null;
                      const cMargin = cComp !== null ? cComp - cDriv : null;
                      const nComp = row.noCrane ? Number(row.noCrane.companyUnitPrice || 0) : null;
                      const nDriv = row.noCrane ? Number(row.noCrane.truckSalaryUnitPrice || 0) : null;
                      const nMargin = nComp !== null ? nComp - nDriv : null;
                      const hasIssue = (cMargin !== null && cMargin < 0) || (nMargin !== null && nMargin < 0);
                      return (
                        <tr key={row.key} className={`border-b border-slate-100 ${hasIssue ? "bg-red-50" : i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                          <td className="px-3 py-2 text-center text-xs font-bold text-slate-400">{i + 1}</td>
                          <td className="px-3 py-2 font-black text-slate-800">{row.canonicalName}</td>
                          {row.crane ? (
                            <>
                              <td className="px-3 py-2 text-right tabular-nums border-l border-slate-100">$ {unitMoney(cComp)}</td>
                              <td className="px-3 py-2 text-right tabular-nums">$ {unitMoney(cDriv)}</td>
                              <td className={`px-3 py-2 text-right tabular-nums font-black ${cMargin < 0 ? "text-red-600" : "text-teal-700"}`}>$ {unitMoney(cMargin)}</td>
                            </>
                          ) : (
                            <td colSpan="3" className="px-3 py-2 text-center text-slate-300 border-l border-slate-100">—</td>
                          )}
                          {row.noCrane ? (
                            <>
                              <td className="px-3 py-2 text-right tabular-nums border-l border-slate-100">$ {unitMoney(nComp)}</td>
                              <td className="px-3 py-2 text-right tabular-nums">$ {unitMoney(nDriv)}</td>
                              <td className={`px-3 py-2 text-right tabular-nums font-black ${nMargin < 0 ? "text-red-600" : "text-teal-700"}`}>$ {unitMoney(nMargin)}</td>
                            </>
                          ) : (
                            <td colSpan="3" className="px-3 py-2 text-center text-slate-300 border-l border-slate-100">—</td>
                          )}
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </Panel>
        </main>
      ) : (
        <main className="mx-auto grid max-w-[1500px] gap-4 p-4 pb-20 lg:pb-4">
          <PageHead title="Setup" meta="Manage trucks, company price, and driver price separately." />

          {/* System overview */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Trucks", value: data.trucks.length, sub: `${data.trucks.filter((t) => t.active !== false).length} active`, tone: "border-teal-200 bg-teal-50 text-teal-950 text-teal-700" },
              { label: "Crane Locations", value: activeCompanyPriceCounts.withCrane, sub: "active prices", tone: "border-sky-200 bg-sky-50 text-sky-950 text-sky-600" },
              { label: "No-Crane Locations", value: activeCompanyPriceCounts.withoutCrane, sub: "active prices", tone: "border-amber-200 bg-amber-50 text-amber-950 text-amber-600" },
              { label: "Staff Users", value: staffUsers.length, sub: "can do data entry", tone: "border-slate-200 bg-white text-slate-900 text-slate-500" },
            ].map(({ label, value, sub, tone }) => {
              const [border, bg, textVal, textSub] = tone.split(" ");
              return (
                <div key={label} className={`rounded-2xl border p-4 shadow-sm ${border} ${bg}`}>
                  <div className="text-[10px] font-black uppercase tracking-wider opacity-50">{label}</div>
                  <div className={`mt-1 text-2xl font-black ${textVal}`}>{value}</div>
                  <div className={`mt-0.5 text-xs font-bold ${textSub}`}>{sub}</div>
                </div>
              );
            })}
          </div>

          {/* Tab strip with icons */}
          <Panel>
            <div className="grid gap-1 rounded-2xl bg-slate-100 p-1 sm:grid-cols-5">
              {[
                ["trucks", "Truck Master", <><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>],
                ["company", "Company Price", <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>],
                ["driver", "Driver Price", <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="16" y1="11" x2="22" y2="11"/><line x1="19" y1="8" x2="19" y2="14"/></>],
                ["bulk", "Bulk Update", <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>],
                ["users", "Users", <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>],
              ].map(([key, label, iconPaths]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSetupSection(key)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-black transition ${setupSection === key ? "bg-teal-700 text-white shadow-sm" : "bg-white text-slate-600 hover:text-slate-950"}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    {iconPaths}
                  </svg>
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </Panel>

          {setupSection === "trucks" && (
            <Panel>
              <h2 className="mb-3 text-lg font-bold">Truck Master</h2>
              <form className="grid gap-3 md:grid-cols-5" onSubmit={saveTruck}>
                <Input placeholder="Truck No" required value={truckForm.truckNo} onChange={(e) => setTruckForm({ ...truckForm, truckNo: e.target.value.toUpperCase() })} />
                <Select value={truckForm.truckType} onChange={(e) => setTruckForm({ ...truckForm, truckType: e.target.value })}>
                  <option value="With Crane">Crane</option>
                  <option value="Without Crane">No Crane</option>
                </Select>
                <Input placeholder="Driver Name" value={truckForm.driverName} onChange={(e) => setTruckForm({ ...truckForm, driverName: e.target.value })} />
                <Input placeholder="Phone" value={truckForm.phone} onChange={(e) => setTruckForm({ ...truckForm, phone: e.target.value })} />
                <div className="flex gap-2">
                  <Button type="submit">{isEditingTruck ? "Save Truck" : "Add Truck"}</Button>
                  {isEditingTruck && (
                    <Button type="button" variant="secondary" onClick={() => setTruckForm({ truckNo: "", truckType: "With Crane", driverName: "", phone: "" })}>Cancel</Button>
                  )}
                </div>
              </form>
              <div className="mt-4 grid gap-5 max-h-[640px] overflow-auto pr-1">
                {["With Crane", "Without Crane"].map((truckType) => {
                  const isCrane = truckType === "With Crane";
                  const trucks = data.trucks.filter((t) => t.truckType === truckType);
                  return (
                    <div key={truckType}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${isCrane ? "bg-teal-500" : "bg-sky-500"}`} />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
                          {truckTypeLabel(truckType)} — {trucks.length} trucks
                        </h3>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {trucks.map((truck) => {
                          const isActive = truck.active !== false;
                          return (
                            <div key={truck.truckNo} className={`overflow-hidden rounded-2xl border shadow-sm ${isActive ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
                              <div className={`flex items-center justify-between px-4 py-3 ${isCrane ? "bg-teal-700" : "bg-sky-700"}`}>
                                <div className="flex items-center gap-2">
                                  <span className="text-base font-black tracking-tight text-white">{truck.truckNo}</span>
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isCrane ? "bg-teal-500/40 text-white" : "bg-sky-500/40 text-white"}`}>
                                    {isCrane ? "CRANE" : "NO CRANE"}
                                  </span>
                                </div>
                                {!isActive && (
                                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black text-white">Inactive</span>
                                )}
                              </div>
                              <div className="bg-white px-4 py-3">
                                <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                  {truck.driverName || <span className="font-bold text-slate-400">No driver assigned</span>}
                                </div>
                                {truck.phone && (
                                  <div className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                    {truck.phone}
                                  </div>
                                )}
                                <div className="mt-3 flex gap-2">
                                  <Button type="button" variant="secondary" onClick={() => setTruckForm(truck)}>Edit</Button>
                                  <Button type="button" variant="danger" onClick={() => deleteTruck(truck)}>Delete</Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {trucks.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-bold text-slate-400">
                            No {truckTypeLabel(truckType).toLowerCase()} trucks yet.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {setupSection === "bulk" && (
            <Panel>
              <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold">Bulk Price Update</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    Paste fixed system locations and new prices. The system will block unknown or duplicated locations before updating.
                  </p>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-black text-teal-800">
                  {bulkPriceRows.filter((row) => row.valid).length} ready / {bulkPriceRows.length} rows
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <Field label="Price Update Type">
                  <Select value={bulkPriceForm.priceType} onChange={(e) => setBulkPriceForm({ ...bulkPriceForm, priceType: e.target.value })}>
                    <option value="both">Company + Driver</option>
                    <option value="company">Company Price Only</option>
                    <option value="driver">Driver Price Only</option>
                  </Select>
                </Field>
                <Field label="Truck Type">
                  <Select value={bulkPriceForm.truckType} onChange={(e) => { setBulkPriceForm({ ...bulkPriceForm, truckType: e.target.value }); setBulkLocationFilter(""); }}>
                    <option value="With Crane">Crane</option>
                    <option value="Without Crane">No Crane</option>
                  </Select>
                </Field>
                <Field label="Effective Date">
                  <Input type="date" required value={bulkPriceForm.effectiveDate} onChange={(e) => setBulkPriceForm({ ...bulkPriceForm, effectiveDate: e.target.value })} />
                  {bulkExistingDates.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {bulkExistingDates.map((d) => (
                        <button key={d} type="button"
                          onClick={() => setBulkPriceForm((f) => ({ ...f, effectiveDate: d }))}
                          className={`rounded px-2 py-0.5 text-xs font-medium border transition-colors ${d === bulkPriceForm.effectiveDate ? "bg-teal-600 text-white border-teal-600" : "bg-white text-slate-600 border-slate-300 hover:border-teal-400 hover:text-teal-700"}`}>
                          {formatDate(d)}
                        </button>
                      ))}
                    </div>
                  )}
                </Field>
                <Field label="From Location">
                  <Input placeholder={data.settings.defaultFromLocation || "Warehouse-09"} value={bulkPriceForm.fromLocation} onChange={(e) => setBulkPriceForm({ ...bulkPriceForm, fromLocation: e.target.value })} />
                </Field>
              </div>

              {(() => {
                const order = bulkPriceForm.truckType === "With Crane" ? CRANE_LOCATION_ORDER : NO_CRANE_LOCATION_ORDER;
                const provinceGroups = [];
                const seen = new Map();
                for (const loc of order) {
                  const m = loc.match(/\(([^)]+)\)$/);
                  const prov = m ? m[1] : "Other";
                  if (!seen.has(prov)) { seen.set(prov, []); provinceGroups.push(prov); }
                  seen.get(prov).push(loc);
                }
                return (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500 font-medium mb-2">Click a province to fill the Location box, then paste your prices:</p>
                    <div className="flex flex-wrap gap-2">
                      {provinceGroups.map((prov) => {
                        const locs = seen.get(prov);
                        return (
                          <button key={prov} type="button"
                            onClick={() => setBulkPriceForm((f) => ({ ...f, locationsText: locs.join("\n"), pricesText: "", driverPricesText: "", rowsText: "" }))}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-teal-50 hover:border-teal-500 hover:text-teal-700 transition">
                            {prov} <span className="text-xs font-normal text-slate-400">({locs.length})</span>
                          </button>
                        );
                      })}
                      <button type="button"
                        onClick={() => setBulkPriceForm((f) => ({ ...f, locationsText: order.join("\n"), pricesText: "", driverPricesText: "", rowsText: "" }))}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition">
                        All <span className="text-xs font-normal opacity-80">({order.length})</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.3fr]">
                <div>
                  <div className={`grid gap-3 ${bulkPriceForm.priceType === "both" ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                    <Field label="Location">
                      <textarea
                        className="min-h-[260px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                        placeholder={"KH.Dangkao (PP)\nKH.Mean Chey (PP)\nD.Ang Snuol (Kandal)"}
                        value={bulkPriceForm.locationsText}
                        onChange={(e) => setBulkPriceForm({ ...bulkPriceForm, locationsText: e.target.value, rowsText: "" })}
                      />
                    </Field>
                    <Field label={bulkPriceForm.priceType === "driver" ? "Driver Price" : "Company Price"}>
                      <textarea
                        className="min-h-[260px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                        placeholder={"7.51\n7.89\n9.12"}
                        value={bulkPriceForm.pricesText}
                        onChange={(e) => setBulkPriceForm({ ...bulkPriceForm, pricesText: e.target.value })}
                      />
                    </Field>
                    {bulkPriceForm.priceType === "both" && (
                      <Field label="Driver Price">
                        <textarea
                          className="min-h-[260px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                          placeholder={"7.00\n7.20\n8.40"}
                          value={bulkPriceForm.driverPricesText}
                          onChange={(e) => setBulkPriceForm({ ...bulkPriceForm, driverPricesText: e.target.value })}
                        />
                      </Field>
                    )}
                  </div>
                  {(() => {
                    const locCount = (bulkPriceForm.locationsText || bulkPriceForm.rowsText).split(/\r?\n/).map(l => l.trim()).filter(Boolean).length;
                    const priceCount = bulkPriceForm.pricesText.split(/\r?\n/).map(l => l.trim()).filter(Boolean).length;
                    const driverCount = bulkPriceForm.priceType === "both" ? bulkPriceForm.driverPricesText.split(/\r?\n/).map(l => l.trim()).filter(Boolean).length : priceCount;
                    if (locCount === 0 && priceCount === 0) return null;
                    const mismatch = locCount !== priceCount || (bulkPriceForm.priceType === "both" && locCount !== driverCount);
                    return mismatch ? (
                      <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                        {locCount} location{locCount !== 1 ? "s" : ""} but {priceCount} price{priceCount !== 1 ? "s" : ""}
                        {bulkPriceForm.priceType === "both" && locCount !== driverCount ? ` and ${driverCount} driver price${driverCount !== 1 ? "s" : ""}` : ""}
                        {" "}— counts must match exactly.
                      </div>
                    ) : (
                      <div className="mt-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-bold text-teal-700">
                        {locCount} location{locCount !== 1 ? "s" : ""} and {priceCount} price{priceCount !== 1 ? "s" : ""} — counts match ✓
                      </div>
                    );
                  })()}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(() => {
                      const locCount = (bulkPriceForm.locationsText || bulkPriceForm.rowsText).split(/\r?\n/).map(l => l.trim()).filter(Boolean).length;
                      const priceCount = bulkPriceForm.pricesText.split(/\r?\n/).map(l => l.trim()).filter(Boolean).length;
                      const driverCount = bulkPriceForm.priceType === "both" ? bulkPriceForm.driverPricesText.split(/\r?\n/).map(l => l.trim()).filter(Boolean).length : priceCount;
                      const countMismatch = locCount > 0 && (locCount !== priceCount || (bulkPriceForm.priceType === "both" && locCount !== driverCount));
                      return (
                        <Button type="button" onClick={applyBulkPriceUpdate} disabled={bulkPriceRows.length < 1 || bulkPriceRows.some((row) => !row.valid) || countMismatch}>
                          Apply Price Update
                        </Button>
                      );
                    })()}
                    <Button type="button" variant="secondary" onClick={() => setBulkPriceForm({ ...bulkPriceForm, locationsText: "", pricesText: "", driverPricesText: "", rowsText: "" })}>
                      Clear
                    </Button>
                    <Button type="button" variant="danger" onClick={deletePricesByDate}>
                      Delete All Prices for This Date
                    </Button>
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-500">
                    Paste the same number of rows in Location and Price. All rows must match an existing system location before Apply is enabled.
                  </p>
                </div>

                <div className="overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[760px] border-collapse bg-white text-sm">
                    <thead className="bg-slate-900 text-white">
                      <tr>
                        <th className="px-3 py-3 text-left font-black">Pasted Location</th>
                        <th className="px-3 py-3 text-left font-black">System Location</th>
                        <th className="px-3 py-3 text-right font-black">Old Price</th>
                        <th className="px-3 py-3 text-right font-black">New Price</th>
                        <th className="px-3 py-3 text-left font-black">Comparison</th>
                        <th className="px-3 py-3 text-center font-black">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPriceRows.map((row) => (
                        <tr key={row.line} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                          <td className="px-3 py-3 font-bold">{row.rawLocation || `Line ${row.line}`}</td>
                          <td className="px-3 py-3 font-bold text-teal-800">{row.toLocation || "No match"}</td>
                          <td className="px-3 py-3 text-right">
                            {bulkPriceForm.priceType === "both"
                              ? `$ ${unitMoney(row.currentCompanyUnitPrice)} / $ ${unitMoney(row.currentTruckSalaryUnitPrice)}`
                              : `$ ${unitMoney(row.oldPrice)}`}
                          </td>
                          <td className="px-3 py-3 text-right font-black">
                            {bulkPriceForm.priceType === "both"
                              ? `${row.companyUnitPrice === "" ? "Missing" : `$ ${unitMoney(row.companyUnitPrice)}`} / ${row.truckSalaryUnitPrice === "" ? "Missing" : `$ ${unitMoney(row.truckSalaryUnitPrice)}`}`
                              : row.newPrice === "" ? "Missing" : `$ ${unitMoney(row.newPrice)}`}
                          </td>
                          <td className="px-3 py-3 font-bold">{row.compareText}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-black ${row.valid ? "bg-teal-100 text-teal-800" : "bg-rose-100 text-rose-700"}`}>
                              {row.statusText || (row.valid ? "Approve" : "Check")}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {bulkPriceRows.length === 0 && (
                        <tr>
                          <td className="px-3 py-6 text-center text-sm font-bold text-slate-500" colSpan="6">
                            Paste locations and prices to verify before applying.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Panel>
          )}

          {setupSection === "active-prices" && (
            <Panel>
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold">Active Company Prices</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    Latest active company price per location as of {formatDate(today())}.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">
                  Crane {activeCompanyPriceCounts.withCrane} | No Crane {activeCompanyPriceCounts.withoutCrane} | Total {activeCompanyPriceCounts.total}
                </span>
              </div>
              <div className="mb-4 max-w-2xl">
                <Field label="Search To Location">
                  <Input
                    placeholder="Type location name"
                    value={setupLocationSearch}
                    onChange={(event) => setSetupLocationSearch(event.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <KpiCard label="Crane Locations" value={activeCompanyPriceCounts.withCrane} tone="teal" />
                <KpiCard label="No Crane Locations" value={activeCompanyPriceCounts.withoutCrane} tone="sky" />
                <KpiCard label="Total Active Locations" value={activeCompanyPriceCounts.total} />
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {["With Crane", "Without Crane"].map((truckType) => {
                  const rows = activeCompanyPriceRows.filter((price) => price.truckType === truckType);
                  return (
                    <div key={truckType} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className={`flex items-center justify-between px-4 py-3 ${truckType === "With Crane" ? "bg-teal-50" : "bg-sky-50"}`}>
                        <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">{truckTypeLabel(truckType)}</h3>
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-slate-600">{rows.length} locations</span>
                      </div>
                      <div className="max-h-[620px] overflow-auto">
                        <table className="w-full min-w-[620px] border-collapse text-sm">
                          <thead className="sticky top-0 bg-slate-900 text-white">
                            <tr>
                              <th className="w-14 px-3 py-3 text-center font-black">No</th>
                              <th className="px-3 py-3 text-left font-black">To Location</th>
                              <th className="w-24 px-3 py-3 text-right font-black">KM</th>
                              <th className="w-32 px-3 py-3 text-right font-black">Company Price</th>
                              <th className="w-32 px-3 py-3 text-center font-black">Effective</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((price, index) => (
                              <tr key={price.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                                <td className="px-3 py-3 text-center font-bold">{index + 1}</td>
                                <td className="px-3 py-3 font-black">{price.toLocation}</td>
                                <td className="px-3 py-3 text-right tabular-nums">{price.distanceKm || ""}</td>
                                <td className="px-3 py-3 text-right font-black tabular-nums">$ {unitMoney(price.companyUnitPrice)}</td>
                                <td className="px-3 py-3 text-center text-xs font-bold text-slate-500">{formatDate(priceEffectiveDate(price))}</td>
                              </tr>
                            ))}
                            {rows.length === 0 && (
                              <tr>
                                <td className="px-3 py-6 text-center text-sm font-bold text-slate-500" colSpan="5">
                                  No active company prices for {truckTypeLabel(truckType)}.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {setupSection === "company" && (
            <Panel>
              <h2 className="mb-3 text-lg font-bold">Company Price</h2>
              <form className="grid gap-3" onSubmit={savePrice}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="From Location"><Input placeholder="From Location" required value={priceForm.fromLocation} onChange={(e) => setPriceForm({ ...priceForm, fromLocation: e.target.value })} /></Field>
                  <Field label="To Location"><Input placeholder="To Location" required value={priceForm.toLocation} onChange={(e) => setPriceForm({ ...priceForm, toLocation: e.target.value })} /></Field>
                  <Field label="Truck Type">
                    <Select value={priceForm.truckType} onChange={(e) => setPriceForm({ ...priceForm, truckType: e.target.value })}>
                      <option value="With Crane">Crane</option>
                      <option value="Without Crane">No Crane</option>
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Effective Date"><Input type="date" required value={priceForm.effectiveDate || today()} onChange={(e) => setPriceForm({ ...priceForm, effectiveDate: e.target.value })} /></Field>
                  <Field label="Distance (KM)"><Input type="number" step="0.1" placeholder="e.g. 25.5" value={priceForm.distanceKm} onChange={(e) => setPriceForm({ ...priceForm, distanceKm: e.target.value })} /></Field>
                  <Field label="Company Price ($)"><Input type="number" step="0.001" placeholder="e.g. 7.500" required value={priceForm.companyUnitPrice} onChange={(e) => setPriceForm({ ...priceForm, companyUnitPrice: e.target.value })} /></Field>
                  <Field label=" ">
                    <div className="flex gap-2">
                      <Button type="submit">{priceForm.id ? "Save" : "Add Price"}</Button>
                      {priceForm.id && (
                        <Button type="button" variant="secondary" onClick={() => setPriceForm({ id: "", fromLocation: data.settings.defaultFromLocation || "", toLocation: "", truckType: priceForm.truckType, distanceKm: "", companyUnitPrice: "", truckSalaryUnitPrice: "", effectiveDate: today() })}>Cancel</Button>
                      )}
                    </div>
                  </Field>
                </div>
              </form>
              <div className="mt-4 max-w-2xl">
                <Field label="Search To Location">
                  <Input
                    placeholder="Type location name"
                    value={setupLocationSearch}
                    onChange={(event) => setSetupLocationSearch(event.target.value)}
                  />
                </Field>
              </div>
              <div className="mt-4 grid max-h-[620px] gap-2 overflow-auto pr-1">
                  <div className="grid gap-2">
                    <h3 className="mt-2 text-sm font-black uppercase tracking-wide text-slate-500">{truckTypeLabel(priceForm.truckType)}</h3>
                    {companyPriceGroups.map((group) => (
                      <div key={group.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
                          <div>
                            <strong className="block text-base">{group.fromLocation} to {group.toLocation}</strong>
                            <span className="text-xs font-bold text-slate-500">
                              {truckTypeLabel(group.truckType)} | {group.versions.length} price version{group.versions.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="rounded-xl bg-teal-50 px-3 py-2 text-right">
                            <div className="text-[11px] font-black uppercase tracking-wide text-teal-700">Active Today</div>
                            <div className="text-lg font-black text-teal-950">{group.activePrice ? `$ ${unitMoney(group.activePrice.companyUnitPrice)}` : "No active price"}</div>
                            {group.activePrice && <div className="text-xs font-bold text-teal-700">from {formatDate(priceEffectiveDate(group.activePrice))}</div>}
                          </div>
                        </div>
                        <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
                          {group.versions.map((price) => {
                            const isActive = price.id === group.activePrice?.id;
                            return (
                              <div key={price.id} className={`grid gap-3 border-b border-slate-100 p-3 last:border-b-0 md:grid-cols-[130px_1fr_auto] md:items-center ${isActive ? "bg-teal-50/70" : "bg-white"}`}>
                                <div className="font-black text-slate-900">{formatDate(priceEffectiveDate(price))}</div>
                                <div className="text-sm font-bold text-slate-600">
                                  {Number(price.distanceKm || 0).toFixed(1)} KM | Company $ {unitMoney(price.companyUnitPrice)}
                                  {isActive && <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-black text-teal-800">Active</span>}
                                  {price.active === false && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-500">Inactive</span>}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button type="button" variant="secondary" onClick={() => setPriceForm({ ...price, effectiveDate: priceEffectiveDate(price) })}>Edit</Button>
                                  <Button type="button" variant="danger" onClick={() => deletePrice(price)}>Delete</Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
            </Panel>
          )}

          {setupSection === "driver" && (
            <Panel>
              <h2 className="mb-3 text-lg font-bold">Driver Price</h2>
              <form className="grid gap-3" onSubmit={saveDriverPrice}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="From Location"><Input placeholder="From Location" required value={driverPriceForm.fromLocation} onChange={(e) => setDriverPriceForm({ ...driverPriceForm, fromLocation: e.target.value })} /></Field>
                  <Field label="To Location"><Input placeholder="To Location" required value={driverPriceForm.toLocation} onChange={(e) => setDriverPriceForm({ ...driverPriceForm, toLocation: e.target.value })} /></Field>
                  <Field label="Truck Type">
                    <Select value={driverPriceForm.truckType} onChange={(e) => setDriverPriceForm({ ...driverPriceForm, truckType: e.target.value })}>
                      <option value="With Crane">Crane</option>
                      <option value="Without Crane">No Crane</option>
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Effective Date"><Input type="date" required value={driverPriceForm.effectiveDate || today()} onChange={(e) => setDriverPriceForm({ ...driverPriceForm, effectiveDate: e.target.value })} /></Field>
                  <Field label="Distance (KM)"><Input type="number" step="0.1" placeholder="e.g. 25.5" value={driverPriceForm.distanceKm} onChange={(e) => setDriverPriceForm({ ...driverPriceForm, distanceKm: e.target.value })} /></Field>
                  <Field label="Driver Price ($)"><Input type="number" step="0.001" placeholder="e.g. 6.500" required value={driverPriceForm.truckSalaryUnitPrice} onChange={(e) => setDriverPriceForm({ ...driverPriceForm, truckSalaryUnitPrice: e.target.value })} /></Field>
                  <Field label=" ">
                    <div className="flex gap-2">
                      <Button type="submit">{driverPriceForm.id ? "Save" : "Add Price"}</Button>
                      {driverPriceForm.id && (
                        <Button type="button" variant="secondary" onClick={() => setDriverPriceForm({ id: "", fromLocation: data.settings.defaultFromLocation || "", toLocation: "", truckType: driverPriceForm.truckType, distanceKm: "", truckSalaryUnitPrice: "", effectiveDate: today() })}>Cancel</Button>
                      )}
                    </div>
                  </Field>
                </div>
              </form>
              <div className="mt-4 max-w-2xl">
                <Field label="Search To Location">
                  <Input
                    placeholder="Type location name"
                    value={setupLocationSearch}
                    onChange={(event) => setSetupLocationSearch(event.target.value)}
                  />
                </Field>
              </div>
              <div className="mt-4 grid max-h-[620px] gap-2 overflow-auto pr-1">
                  <div className="grid gap-2">
                    <h3 className="mt-2 text-sm font-black uppercase tracking-wide text-slate-500">{truckTypeLabel(driverPriceForm.truckType)}</h3>
                    {driverPriceGroups.map((group) => (
                      <div key={group.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
                          <div>
                            <strong className="block text-base">{group.fromLocation} to {group.toLocation}</strong>
                            <span className="text-xs font-bold text-slate-500">
                              {truckTypeLabel(group.truckType)} | {group.versions.length} driver price version{group.versions.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="rounded-xl bg-amber-50 px-3 py-2 text-right">
                            <div className="text-[11px] font-black uppercase tracking-wide text-amber-700">Active Today</div>
                            <div className="text-lg font-black text-amber-950">{group.activePrice ? `$ ${unitMoney(group.activePrice.truckSalaryUnitPrice)}` : "No active price"}</div>
                            {group.activePrice && <div className="text-xs font-bold text-amber-700">from {formatDate(priceEffectiveDate(group.activePrice))}</div>}
                          </div>
                        </div>
                        <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
                          {group.versions.map((price) => {
                            const isActive = price.id === group.activePrice?.id;
                            return (
                              <div key={price.id} className={`grid gap-3 border-b border-slate-100 p-3 last:border-b-0 md:grid-cols-[130px_1fr_auto] md:items-center ${isActive ? "bg-amber-50/70" : "bg-white"}`}>
                                <div className="font-black text-slate-900">{formatDate(priceEffectiveDate(price))}</div>
                                <div className="text-sm font-bold text-slate-600">
                                  {Number(price.distanceKm || 0).toFixed(1)} KM | Driver $ {unitMoney(price.truckSalaryUnitPrice)}
                                  {isActive && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800">Active</span>}
                                  {price.active === false && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-500">Inactive</span>}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button type="button" variant="secondary" onClick={() => setDriverPriceForm({
                                    id: price.id,
                                    fromLocation: price.fromLocation,
                                    toLocation: price.toLocation,
                                    truckType: price.truckType,
                                    distanceKm: price.distanceKm,
                                    truckSalaryUnitPrice: price.truckSalaryUnitPrice,
                                    effectiveDate: priceEffectiveDate(price)
                                  })}>Edit</Button>
                                  <Button type="button" variant="danger" onClick={() => deletePrice(price)}>Delete</Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
            </Panel>
          )}

          {setupSection === "users" && (
            <>
              <Panel>
                <h2 className="mb-4 text-lg font-bold">User Management</h2>
                <p className="mb-4 text-sm font-bold text-slate-500">Staff users can do data entry but cannot access Payments, Prices, Setup, or export reports.</p>
                <form onSubmit={createStaffUser} className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Add New User</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Username"><Input value={newUserForm.username} onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })} required placeholder="e.g. sokheng" /></Field>
                    <Field label="Password"><Input type="password" value={newUserForm.password} onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} required placeholder="Min 6 characters" /></Field>
                    <Field label="Role">
                      <select value={newUserForm.role} onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    </Field>
                  </div>
                  <div><Button type="submit">Create User</Button></div>
                </form>
                {staffUsers.length === 0 ? (
                  <p className="text-sm font-bold text-slate-400 text-center py-4">No staff users yet.</p>
                ) : (
                  <div className="overflow-auto rounded-xl border border-slate-200">
                    <table className="w-full border-collapse bg-white text-sm">
                      <thead className="bg-slate-900 text-white text-xs">
                        <tr>
                          <th className="px-4 py-3 text-left">Username</th>
                          <th className="px-4 py-3 text-left">Role</th>
                          <th className="px-4 py-3 text-left">Created</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffUsers.map((u) => (
                          <tr key={u.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                            <td className="px-4 py-3 font-black">{u.username}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-black ${u.role === "admin" ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-600"}`}>{u.role}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-xs">{u.createdAt?.slice(0, 10)}</td>
                            <td className="px-4 py-3 text-right">
                              {editPasswordId === u.id ? (
                                <div className="flex items-center gap-2 justify-end">
                                  <input type="password" value={editPasswordValue} onChange={(e) => setEditPasswordValue(e.target.value)} placeholder="New password" className="h-8 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-teal-500 w-36" />
                                  <Button type="button" onClick={() => saveStaffPassword(u.id)}>Save</Button>
                                  <Button type="button" variant="secondary" onClick={() => { setEditPasswordId(null); setEditPasswordValue(""); }}>Cancel</Button>
                                </div>
                              ) : (
                                <div className="flex gap-2 justify-end">
                                  <Button type="button" variant="secondary" onClick={() => { setEditPasswordId(u.id); setEditPasswordValue(""); }}>Change Password</Button>
                                  <Button type="button" variant="danger" onClick={() => deleteStaffUser(u.id)}>Delete</Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

              {isAdmin && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Panel>
                    <h2 className="mb-3 text-lg font-bold">Settings</h2>
                    <form className="grid gap-3" onSubmit={saveSettings}>
                      <Field label="Company"><Input value={settingsForm.companyName} onChange={(e) => setSettingsForm({ ...settingsForm, companyName: e.target.value })} /></Field>
                      <Field label="Default From Location"><Input value={settingsForm.defaultFromLocation} onChange={(e) => setSettingsForm({ ...settingsForm, defaultFromLocation: e.target.value })} /></Field>
                      <Field label="VIP Delete Password" hint="Required to delete any statement. Leave blank to allow deletion without a password.">
                        <Input type="password" value={settingsForm.deletePassword} onChange={(e) => setSettingsForm({ ...settingsForm, deletePassword: e.target.value })} placeholder="Set a password…" />
                      </Field>
                      <div><Button type="submit">Save Settings</Button></div>
                    </form>
                  </Panel>

                  <Panel>
                    <h2 className="mb-3 text-lg font-bold">Data Backup</h2>
                    <p className="text-sm font-bold text-slate-500">
                      Automatic backup runs before the first data change each day.
                    </p>
                    <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">
                      Latest: {backupFiles[0] || "No backup yet"}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" onClick={createManualBackup}>Create Backup</Button>
                      <Button type="button" variant="secondary" onClick={downloadBackup}>Download Backup</Button>
                    </div>
                  </Panel>
                </div>
              )}
            </>
          )}

        </main>
      )}

      {emptyPriceResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEmptyPriceResult(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-lg font-bold">Missing Prices</h2>
              <button className="text-slate-400 hover:text-slate-700 text-2xl leading-none" onClick={() => setEmptyPriceResult(null)}>×</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
              {(emptyPriceResult.dCrane.length > 0 || emptyPriceResult.dNoCrane.length > 0) && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-sm text-red-600">Missing Driver Price</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{emptyPriceResult.dCrane.length + emptyPriceResult.dNoCrane.length} location{emptyPriceResult.dCrane.length + emptyPriceResult.dNoCrane.length !== 1 ? "s" : ""}</span>
                    <span className="text-xs text-slate-400">→ Driver Price tab</span>
                  </div>
                  {emptyPriceResult.dCrane.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-slate-500 mb-1">Crane ({emptyPriceResult.dCrane.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {emptyPriceResult.dCrane.map((loc) => (
                          <button key={loc} onClick={() => goToEmptyPrice(loc, "driver")} className="text-sm px-3 py-1 rounded-full bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1.5">
                            {loc}
                            <span className="text-xs bg-red-200 text-red-800 px-1.5 py-0.5 rounded-full font-medium">Driver</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {emptyPriceResult.dNoCrane.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">No Crane ({emptyPriceResult.dNoCrane.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {emptyPriceResult.dNoCrane.map((loc) => (
                          <button key={loc} onClick={() => goToEmptyPrice(loc, "driver")} className="text-sm px-3 py-1 rounded-full bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1.5">
                            {loc}
                            <span className="text-xs bg-red-200 text-red-800 px-1.5 py-0.5 rounded-full font-medium">Driver</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {(emptyPriceResult.cCrane.length > 0 || emptyPriceResult.cNoCrane.length > 0) && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-sm text-amber-600">Missing Company Price</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{emptyPriceResult.cCrane.length + emptyPriceResult.cNoCrane.length} location{emptyPriceResult.cCrane.length + emptyPriceResult.cNoCrane.length !== 1 ? "s" : ""}</span>
                    <span className="text-xs text-slate-400">→ Company Price tab</span>
                  </div>
                  {emptyPriceResult.cCrane.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-slate-500 mb-1">Crane ({emptyPriceResult.cCrane.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {emptyPriceResult.cCrane.map((loc) => (
                          <button key={loc} onClick={() => goToEmptyPrice(loc, "company")} className="text-sm px-3 py-1 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1.5">
                            {loc}
                            <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-medium">Company</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {emptyPriceResult.cNoCrane.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">No Crane ({emptyPriceResult.cNoCrane.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {emptyPriceResult.cNoCrane.map((loc) => (
                          <button key={loc} onClick={() => goToEmptyPrice(loc, "company")} className="text-sm px-3 py-1 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1.5">
                            {loc}
                            <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-medium">Company</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t text-right">
              <button className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium" onClick={() => setEmptyPriceResult(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {deleteModal.statement && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4">
          <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
            <div className="px-6 py-5 border-b border-red-100 bg-red-50 rounded-t-2xl">
              <h3 className="text-base font-black text-red-700">Delete Statement</h3>
              <p className="mt-1 text-sm text-slate-600">
                Statement <strong>{deleteModal.statement.statementNumber}</strong> — {monthName(deleteModal.statement.month)}
                <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">{deleteModal.statement.status}</span>
              </p>
              <p className="mt-2 text-xs font-bold text-red-600">This will permanently delete the statement and all its delivery rows.</p>
            </div>
            <div className="px-6 py-5 grid gap-3">
              {data.settings?.deletePassword ? (
                <Field label="VIP Password">
                  <Input
                    type="password"
                    placeholder="Enter password…"
                    value={deleteModal.password}
                    autoFocus
                    onChange={(e) => setDeleteModal((prev) => ({ ...prev, password: e.target.value, error: "" }))}
                    onKeyDown={(e) => e.key === "Enter" && confirmDeleteStatement()}
                  />
                </Field>
              ) : (
                <p className="text-sm font-bold text-slate-500">No delete password is set. Confirm to proceed.</p>
              )}
              {deleteModal.error && <p className="text-xs font-black text-red-600">{deleteModal.error}</p>}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setDeleteModal({ statement: null, password: "", error: "" })}>Cancel</Button>
              <Button type="button" variant="danger" onClick={confirmDeleteStatement}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4">
          <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-base font-black">Assign Statement to Payment Month</h3>
              <p className="mt-1 text-sm text-slate-500">Statement <strong>{assignModal.statementNumber}</strong> — {monthName(assignModal.month)}</p>
            </div>
            <div className="px-6 py-5 grid gap-4">
              <Field label="Payment Month">
                <Input type="month" value={assignMonth} onChange={(e) => setAssignMonth(e.target.value)} />
              </Field>
              <p className="text-xs text-slate-500">The statement will be listed under this payment month in the Payments page.</p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-between gap-2">
              {assignModal.paymentMonth && (
                <Button type="button" variant="danger" onClick={() => assignPayment(assignModal.id, null)}>Remove Assignment</Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="secondary" onClick={() => setAssignModal(null)}>Cancel</Button>
                <Button type="button" onClick={() => assignPayment(assignModal.id, assignMonth)}>Assign</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation — mobile only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm pb-safe">
        <div className="flex items-center justify-around mx-auto px-1 h-16">
          {navItems.map(([key, label]) => {
            const isActive = page === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPage(key)}
                className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 px-1 rounded-xl transition min-w-0 ${
                  isActive ? "text-teal-700" : "text-slate-400 active:text-slate-700"
                }`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
                  {key === "dashboard" && <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>}
                  {key === "data-entry" && <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>}
                  {key === "reports" && <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>}
                  {key === "payments" && <><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>}
                  {key === "prices" && <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>}
                  {key === "setup" && <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>}
                </svg>
                <span className="text-[10px] font-black leading-none truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
