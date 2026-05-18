import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const localDate = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const today = () => localDate();
const currentMonth = () => localDate().slice(0, 7);
const money = (value) => Number(value || 0).toFixed(2);
const parseMoney = (value) => {
  const number = Number(String(value || "").replace(/[$,\s]/g, ""));
  return Number.isFinite(number) ? number : "";
};
const locationMatchKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\bkh[\s.]*/g, "khan")
    .replace(/[^a-z0-9]+/g, "");
const locationBaseKey = (value) => locationMatchKey(String(value || "").replace(/\([^)]*\)/g, ""));
const priceEffectiveDate = (price) => price.effectiveDate || `${price.effectiveMonth || "2026-01"}-01`;
const routeKey = (price) => [price.fromLocation, locationBaseKey(price.toLocation), price.truckType].join("::");
const deliverySort = (a, b) =>
  String(a.deliveryDate || "").localeCompare(String(b.deliveryDate || "")) ||
  String(a.invoiceNo || "").localeCompare(String(b.invoiceNo || "")) ||
  String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
const truckTypeLabel = (truckType) => truckType === "With Crane" ? "Crane" : truckType === "Without Crane" ? "No Crane" : truckType;
const formatDate = (value) => {
  const text = String(value || "");
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return text;
  return `${match[3]}/${match[2]}/${match[1]}`;
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

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
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

function Input(props) {
  return (
    <input
      className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none"
      {...props}
    />
  );
}

function Select({ children, ...props }) {
  return (
    <select
      className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none"
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

function App() {
  const [page, setPage] = useState("dashboard");
  const [data, setData] = useState({ settings: {}, trucks: [], prices: [], statements: [], deliveries: [] });
  const [selectedStatementId, setSelectedStatementId] = useState("");
  const [viewStatementId, setViewStatementId] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [reportMonth, setReportMonth] = useState(currentMonth());
  const [reportTruckNo, setReportTruckNo] = useState("");
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
    toLocation: "",
    qtyTon: ""
  });
  const [filters, setFilters] = useState({ month: currentMonth(), statementNumber: "" });
  const [setupSection, setSetupSection] = useState("trucks");
  const [setupLocationSearch, setSetupLocationSearch] = useState("");
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
  const [backupFiles, setBackupFiles] = useState([]);

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
      .filter((statement) => !filters.month || statement.month === filters.month)
      .filter((statement) => !statementNumber || String(statement.statementNumber).includes(statementNumber))
      .sort((a, b) => b.month.localeCompare(a.month) || Number(b.statementNumber) - Number(a.statementNumber));
  }, [visibleStatements, filters]);

  const statementCounts = useMemo(() => {
    const month = filters.month || statementForm.month || currentMonth();
    const rows = visibleStatements.filter((statement) => statement.month === month);
    return {
      month,
      withCrane: rows.filter((statement) => statement.truckType === "With Crane").length,
      withoutCrane: rows.filter((statement) => statement.truckType === "Without Crane").length,
      total: rows.length
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
            .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate) || a.invoiceNo.localeCompare(b.invoiceNo))
        })),
    [truckPerformance, monthlyRows]
  );

  const activeTruckCount = truckPerformance.filter((truck) => truck.trips > 0).length;
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
  const bulkPriceRows = useMemo(() => {
    const priceType = bulkPriceForm.priceType;
    const fromLocation = bulkPriceForm.fromLocation || data.settings.defaultFromLocation;
    const routeMap = new Map();
    data.prices
      .filter((price) => price.fromLocation === fromLocation)
      .filter((price) => price.truckType === bulkPriceForm.truckType)
      .forEach((price) => {
        const key = locationBaseKey(price.toLocation);
        if (!routeMap.has(key)) routeMap.set(key, price.toLocation);
      });
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
        const matchedLocation = routeMap.get(locationBaseKey(locationText)) || "";
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
          valid: Boolean(matchedLocation && hasRequiredPrices)
        };
      });
  }, [bulkPriceForm, data.prices, data.settings.defaultFromLocation]);

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
    deliveryForm.invoiceNo &&
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
      defaultFromLocation: next.settings.defaultFromLocation || ""
    });
    setPriceForm((current) => ({ ...current, fromLocation: current.fromLocation || next.settings.defaultFromLocation || "" }));
    loadBackups().catch(() => {});
  }

  async function loadBackups() {
    const result = await api("/api/backup/list");
    setBackupFiles(result.files || []);
  }

  useEffect(() => {
    loadData().catch((err) => flash(err.message, "error"));
  }, []);

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
    const ok = window.confirm(
      statement.status === "Draft"
        ? `Delete draft Statement ${statement.statementNumber}? This will also delete all delivery rows inside it.`
        : `Statement ${statement.statementNumber} is ${statement.status}. Finished/exported statements are protected and cannot be deleted.`
    );
    if (!ok) return;
    try {
      await api(`/api/statements/${statement.id}`, { method: "DELETE" });
      if (selectedStatementId === statement.id) {
        setSelectedStatementId("");
        setStatementForm({ id: "", month: statement.month, truckType: "With Crane", statementNumber: "", statementDate: today() });
        resetDeliveryForm();
      }
      await loadData();
      flash("Statement deleted.");
    } catch (err) {
      flash(err.message, "error");
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
    } catch (err) {
      flash(err.message, "error");
    }
  }

  function editDelivery(row) {
    setDeliveryForm({
      id: row.id,
      deliveryDate: row.deliveryDate,
      invoiceNo: row.invoiceNo,
      truckNo: row.truckNo,
      toLocation: row.toLocation,
      qtyTon: row.qtyTon
    });
  }

  function resetDeliveryForm(deliveryDate = today()) {
    setDeliveryForm({ id: "", deliveryDate, invoiceNo: "", truckNo: "", toLocation: "", qtyTon: "" });
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
      flash(`Bulk price update saved: ${result.added} added, ${result.updated} updated.`);
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
    window.location.href = "/api/backup/download";
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

  function exportStatement() {
    if (!selectedStatement) return;
    window.location.href = `/api/export/accounting?statementId=${encodeURIComponent(selectedStatement.id)}&truckType=${encodeURIComponent(selectedStatement.truckType)}`;
  }

  function exportStatementFile(statement, format = "xls") {
    window.location.href = `/api/export/accounting?statementId=${encodeURIComponent(statement.id)}&truckType=${encodeURIComponent(statement.truckType)}&format=${encodeURIComponent(format)}`;
  }

  const navItems = [
    ["dashboard", "Dashboard"],
    ["data-entry", "Data Entry"],
    ["reports", "Reports"],
    ["setup", "Setup"]
  ];

  return (
    <div className="min-h-screen text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 shadow-sm shadow-slate-900/5 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white">NM</div>
            <div>
              <h1 className="text-lg font-black tracking-tight">Truck Delivery</h1>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">{data.settings.companyName || "N&M LOGISTIC"}</p>
            </div>
          </div>
          <nav className="flex w-full gap-1 overflow-auto rounded-2xl border border-slate-200 bg-slate-100 p-1 lg:w-auto">
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
          <Button className="lg:min-w-[190px]" onClick={exportStatement} disabled={!selectedStatement || statementRows.length < 1}>
            Export Statement
          </Button>
        </div>
      </header>

      {notice.text && (
        <div className={`mx-auto mt-4 max-w-[1500px] rounded-xl border px-4 py-3 text-sm font-bold shadow-sm ${notice.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-teal-200 bg-teal-50 text-teal-800"}`}>
          {notice.text}
        </div>
      )}

      {page === "dashboard" ? (
        <main className="mx-auto grid max-w-[1500px] gap-4 p-4">
          <PageHead
            title="Dashboard"
            meta="Monthly revenue, driver payment, margin, and activity."
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

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Company Price" value={`$${money(monthlyTotals.companyAmount)}`} tone="teal" />
            <KpiCard label="Driver Payment" value={`$${money(monthlyTotals.driverAmount)}`} tone="amber" />
            <KpiCard label="Profit" value={`$${money(monthlyTotals.margin)}`} tone="blue" />
            <KpiCard label="Trips / Active Trucks" value={`${monthlyTotals.trips} / ${activeTruckCount}`} tone="slate" />
          </div>

          <Panel>
            <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h3 className="text-lg font-black tracking-tight">Truck Performance</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    window.location.href = `/api/export/dashboard?month=${encodeURIComponent(reportMonth)}&format=xls`;
                  }}
                >
                  Export Excel
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    window.location.href = `/api/export/dashboard?month=${encodeURIComponent(reportMonth)}&format=pdf`;
                  }}
                >
                  Export PDF
                </Button>
              </div>
            </div>
            <div className="overflow-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1100px] border-collapse bg-white text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-3 py-3 text-left font-black">Truck No</th>
                    <th className="px-3 py-3 text-left font-black">Type</th>
                    <th className="px-3 py-3 text-left font-black">Driver</th>
                    <th className="px-3 py-3 text-center font-black">Working Days</th>
                    <th className="px-3 py-3 text-center font-black">Trips</th>
                    <th className="px-3 py-3 text-right font-black">QTY(T)</th>
                    <th className="px-3 py-3 text-right font-black">Company Price</th>
                    <th className="px-3 py-3 text-right font-black">Driver Payment</th>
                    <th className="px-3 py-3 text-right font-black">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {truckPerformance.map((truck) => (
                    <tr key={truck.truckNo} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                      <td className="px-3 py-3 font-black">{truck.truckNo}</td>
                      <td className="px-3 py-3">{truckTypeLabel(truck.truckType)}</td>
                      <td className="px-3 py-3">{truck.driverName || "-"}</td>
                      <td className="px-3 py-3 text-center">{truck.workingDays}</td>
                      <td className="px-3 py-3 text-center">{truck.trips}</td>
                      <td className="px-3 py-3 text-right font-bold">{truck.qty.toFixed(4)}T</td>
                      <td className="px-3 py-3 text-right">$ {money(truck.companyAmount)}</td>
                      <td className="px-3 py-3 text-right font-black">$ {money(truck.driverAmount)}</td>
                      <td className="px-3 py-3 text-right">$ {money(truck.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-black tracking-tight">News & Changes</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-500">Latest activity</span>
            </div>
            <div className="grid gap-2">
              {(data.activity || []).slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-black text-slate-900">{item.message}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">{formatDateTime(item.createdAt)}</div>
                </div>
              ))}
              {(data.activity || []).length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm font-bold text-slate-500">No setup changes recorded yet.</div>
              )}
            </div>
          </Panel>
        </main>
      ) : page === "data-entry" ? (
        <main className="mx-auto grid max-w-[1500px] gap-4 p-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
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
            <div className="fixed inset-0 z-30 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/20">
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
                      window.location.href = `/api/export/accounting?statementId=${encodeURIComponent(selectedViewStatement.id)}&truckType=${encodeURIComponent(selectedViewStatement.truckType)}`;
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
                        <td className="px-3 py-3 text-right">$ {money(row.companyUnitPrice)}</td>
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

          {!selectedViewStatement && !showStatementWorkspace && !selectedStatement && (
          <div className="grid gap-3 lg:col-span-2 md:grid-cols-3">
            <KpiCard label={`${statementCounts.month} Crane Statements`} value={statementCounts.withCrane} tone="teal" />
            <KpiCard label={`${statementCounts.month} No Crane Statements`} value={statementCounts.withoutCrane} tone="blue" />
            <KpiCard label={`${statementCounts.month} Total Statements`} value={statementCounts.total} tone="slate" />
          </div>
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
                        <span className={`rounded-full px-2 py-0.5 text-xs font-black ${statement.truckType === "With Crane" ? "bg-teal-100 text-teal-800" : "bg-sky-100 text-sky-800"}`}>
                          {truckTypeLabel(statement.truckType)}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">{statement.month} | {statement.status} | {statement.rowCount}/30 rows | ${money(statement.companyTotalAmount)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => viewStatement(statement)}>View</Button>
                      <Button type="button" variant="secondary" onClick={() => exportStatementFile(statement, "xls")} disabled={statement.rowCount < 1}>Excel</Button>
                      <Button type="button" variant="secondary" onClick={() => exportStatementFile(statement, "pdf")} disabled={statement.rowCount < 1}>PDF</Button>
                      <Button type="button" onClick={() => openStatement(statement)}>Edit</Button>
                      <Button type="button" variant="danger" onClick={() => deleteStatement(statement)}>Delete</Button>
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
                <form className="grid gap-3 md:grid-cols-4" onSubmit={saveDelivery}>
                  <Field label="Delivery Date"><Input type="date" required disabled={!canEditRows} value={deliveryForm.deliveryDate} onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryDate: e.target.value })} /></Field>
                  <Field label="Invoice No">
                    <Input
                      required
                      disabled={!canEditRows}
                      inputMode="numeric"
                      maxLength="10"
                      pattern="[0-9]{1,10}"
                      placeholder="Max 10 numbers"
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
                      value={deliveryForm.toLocation}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, toLocation: e.target.value })}
                    />
                    <datalist id="delivery-location-options">
                      {locations.map((location) => <option key={location} value={location} />)}
                    </datalist>
                  </Field>
                  <Field label="QTY(T)"><Input type="number" step="any" min="0" required disabled={!canEditRows} value={deliveryForm.qtyTon} onChange={(e) => setDeliveryForm({ ...deliveryForm, qtyTon: e.target.value })} /></Field>
                  <Field label="Unit Price"><Input disabled value={selectedPrice ? `$${money(selectedPrice.companyUnitPrice)}` : ""} readOnly /></Field>
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
              <div className="flex flex-wrap gap-3 text-sm font-black text-slate-600">
                <span>Rows: {statementRows.length} / 30</span>
                <span>QTY: {totals.qty.toFixed(4)}T</span>
                <span>Total: ${money(totals.amount)}</span>
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
                    <tr key={row.id} className={`border-b border-slate-100 transition ${deliveryForm.id === row.id ? "bg-teal-50" : "odd:bg-white even:bg-slate-50 hover:bg-sky-50"}`}>
                      <td className="px-3 py-3">{index + 1}</td>
                      <td className="px-3 py-3 text-center">{formatDate(row.deliveryDate)}</td>
                      <td className="px-3 py-3">{row.invoiceNo}</td>
                      <td className="px-3 py-3 font-bold">{row.truckNo}</td>
                      <td className="px-3 py-3">{truckTypeLabel(row.truckType)}</td>
                      <td className="px-3 py-3">{row.fromLocation}</td>
                      <td className="px-3 py-3">{row.toLocation}</td>
                      <td className="px-3 py-3 text-right font-bold">{Number(row.qtyTon).toFixed(5)}T</td>
                      <td className="px-3 py-3 text-right">$ {money(row.companyUnitPrice)}</td>
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
        <main className="mx-auto grid max-w-[1500px] gap-4 p-4">
          <PageHead
            title="Driver Payment"
            meta="Month-end salary, company revenue, and margin by truck."
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

          {selectedDriverPaymentSection ? (
            <Panel>
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-black tracking-tight">{selectedDriverPaymentSection.truckNo} Driver Verification</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {truckTypeLabel(selectedDriverPaymentSection.truckType)} | {selectedDriverPaymentSection.workingDays} working days | {selectedDriverPaymentSection.trips} trips | Driver payment $ {money(selectedDriverPaymentSection.driverAmount)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => setReportTruckNo("")}>Back to List</Button>
                  <Button
                    type="button"
                    onClick={() => {
                      window.location.href = `/api/export/salary?month=${encodeURIComponent(reportMonth)}&truckNo=${encodeURIComponent(selectedDriverPaymentSection.truckNo)}`;
                    }}
                  >
                    Export
                  </Button>
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
                        <td className="px-3 py-3 text-right font-bold tabular-nums">$ {money(row.truckSalaryUnitPrice)}</td>
                        <td className="px-3 py-3 text-right font-black tabular-nums">$ {money(row.truckSalaryAmount)}</td>
                      </tr>
                    ))}
                    <tr className="bg-amber-50 font-black">
                      <td className="px-3 py-3" colSpan="5">Total</td>
                      <td className="px-3 py-3 text-right tabular-nums">{selectedDriverPaymentSection.qty.toFixed(4)}T</td>
                      <td className="px-3 py-3"></td>
                      <td className="px-3 py-3 text-right tabular-nums">$ {money(selectedDriverPaymentSection.driverAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : (
            <Panel>
              <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-black tracking-tight">Driver Verification List</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">Select a truck to review driver-only price and payment details.</p>
                </div>
              </div>
              <div className="grid gap-3">
                {driverPaymentSections.map((truck) => (
                  <div key={truck.truckNo} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-black">{truck.truckNo}</h4>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-black ${truck.truckType === "With Crane" ? "bg-teal-100 text-teal-800" : "bg-sky-100 text-sky-800"}`}>
                          {truckTypeLabel(truck.truckType)}
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-bold text-slate-500">
                        {truck.workingDays} working days | {truck.trips} trips | {truck.qty.toFixed(4)}T | Driver payment $ {money(truck.driverAmount)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => setReportTruckNo(truck.truckNo)}>View</Button>
                      <Button
                        type="button"
                        onClick={() => {
                          window.location.href = `/api/export/salary?month=${encodeURIComponent(reportMonth)}&truckNo=${encodeURIComponent(truck.truckNo)}`;
                        }}
                      >
                        Export
                      </Button>
                    </div>
                  </div>
                ))}
                {driverPaymentSections.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-500">
                    No driver payment data for this month.
                  </div>
                )}
              </div>
            </Panel>
          )}
        </main>
      ) : (
        <main className="mx-auto grid max-w-[1500px] gap-4 p-4">
          <PageHead title="Setup" meta="Manage trucks, company price, and driver price separately." />

          <Panel>
            <div className="grid gap-1 rounded-2xl bg-slate-100 p-1 md:grid-cols-5">
              {[
                ["trucks", "Truck Master"],
                ["company", "Company Price"],
                ["driver", "Driver Price"],
                ["active-prices", "Active Prices"],
                ["bulk", "Bulk Price Update"]
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSetupSection(key)}
                  className={`rounded-xl px-4 py-3 text-left text-sm font-black transition ${setupSection === key ? "bg-teal-700 text-white shadow-sm" : "bg-white text-slate-700 hover:text-slate-950"}`}
                >
                  {label}
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
              <div className="mt-4 grid max-h-[620px] gap-2 overflow-auto pr-1">
                {["With Crane", "Without Crane"].map((truckType) => (
                  <div key={truckType} className="grid gap-2">
                    <h3 className="mt-2 text-sm font-black uppercase tracking-wide text-slate-500">{truckTypeLabel(truckType)}</h3>
                    {data.trucks.filter((truck) => truck.truckType === truckType).map((truck) => (
                      <div key={truck.truckNo} className="grid gap-3 rounded-2xl border border-slate-200 p-3 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="block text-sm">{truck.truckNo}</strong>
                            {truck.active === false && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-500">Inactive</span>}
                          </div>
                          <span className="text-xs text-slate-500">{truck.driverName || "No driver"} {truck.phone ? `| ${truck.phone}` : ""}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="secondary" onClick={() => setTruckForm(truck)}>Edit</Button>
                          <Button type="button" variant="danger" onClick={() => deleteTruck(truck)}>Delete</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {setupSection === "bulk" && (
            <Panel>
              <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold">Bulk Price Update</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    Paste rows from Excel to create new price versions. Old prices stay unchanged for old delivery dates.
                  </p>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-black text-teal-800">
                  {bulkPriceRows.filter((row) => row.valid).length} valid rows
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
                  <Select value={bulkPriceForm.truckType} onChange={(e) => setBulkPriceForm({ ...bulkPriceForm, truckType: e.target.value })}>
                    <option value="With Crane">Crane</option>
                    <option value="Without Crane">No Crane</option>
                  </Select>
                </Field>
                <Field label="Effective Date">
                  <Input type="date" required value={bulkPriceForm.effectiveDate} onChange={(e) => setBulkPriceForm({ ...bulkPriceForm, effectiveDate: e.target.value })} />
                </Field>
                <Field label="From Location">
                  <Input placeholder={data.settings.defaultFromLocation || "Warehouse-09"} value={bulkPriceForm.fromLocation} onChange={(e) => setBulkPriceForm({ ...bulkPriceForm, fromLocation: e.target.value })} />
                </Field>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.3fr]">
                <div>
                  <div className={`grid gap-3 ${bulkPriceForm.priceType === "both" ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                    <Field label="Location">
                      <textarea
                        className="min-h-[260px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                        placeholder={"Khan Dangkao (PP)\nKhan Mean Chey (PP)\nKhan Chbar Ampov (PP)"}
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" onClick={applyBulkPriceUpdate} disabled={bulkPriceRows.filter((row) => row.valid).length < 1}>
                      Apply Price Update
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setBulkPriceForm({ ...bulkPriceForm, locationsText: "", pricesText: "", driverPricesText: "", rowsText: "" })}>
                      Clear
                    </Button>
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-500">
                    Paste the same number of rows in Location and Price. The system will only approve rows that match an existing system location.
                  </p>
                </div>

                <div className="overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[760px] border-collapse bg-white text-sm">
                    <thead className="bg-slate-900 text-white">
                      <tr>
                        <th className="px-3 py-3 text-left font-black">New Location</th>
                        <th className="px-3 py-3 text-right font-black">New Price</th>
                        <th className="px-3 py-3 text-left font-black">Old Location</th>
                        <th className="px-3 py-3 text-right font-black">Old Price</th>
                        <th className="px-3 py-3 text-left font-black">Comparison</th>
                        <th className="px-3 py-3 text-center font-black">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPriceRows.map((row) => (
                        <tr key={row.line} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                          <td className="px-3 py-3 font-bold">{row.rawLocation || `Line ${row.line}`}</td>
                          <td className="px-3 py-3 text-right font-black">
                            {bulkPriceForm.priceType === "both"
                              ? `${row.companyUnitPrice === "" ? "Missing" : `$ ${money(row.companyUnitPrice)}`} / ${row.truckSalaryUnitPrice === "" ? "Missing" : `$ ${money(row.truckSalaryUnitPrice)}`}`
                              : row.newPrice === "" ? "Missing" : `$ ${money(row.newPrice)}`}
                          </td>
                          <td className="px-3 py-3 font-bold text-teal-800">{row.toLocation || "No match"}</td>
                          <td className="px-3 py-3 text-right">
                            {bulkPriceForm.priceType === "both"
                              ? `$ ${money(row.currentCompanyUnitPrice)} / $ ${money(row.currentTruckSalaryUnitPrice)}`
                              : `$ ${money(row.oldPrice)}`}
                          </td>
                          <td className="px-3 py-3 font-bold">{row.compareText}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-black ${row.valid ? "bg-teal-100 text-teal-800" : "bg-rose-100 text-rose-700"}`}>
                              {row.valid ? "Approve" : "Check"}
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
              <div className="mb-4 max-w-xl">
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
                                <td className="px-3 py-3 text-right font-black tabular-nums">$ {money(price.companyUnitPrice)}</td>
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
              <form className="grid gap-3 md:grid-cols-7" onSubmit={savePrice}>
                <Input placeholder="From Location" required value={priceForm.fromLocation} onChange={(e) => setPriceForm({ ...priceForm, fromLocation: e.target.value })} />
                <Input placeholder="To Location" required value={priceForm.toLocation} onChange={(e) => setPriceForm({ ...priceForm, toLocation: e.target.value })} />
                <Select value={priceForm.truckType} onChange={(e) => setPriceForm({ ...priceForm, truckType: e.target.value })}>
                  <option value="With Crane">Crane</option>
                  <option value="Without Crane">No Crane</option>
                </Select>
                <Input type="date" required value={priceForm.effectiveDate || today()} onChange={(e) => setPriceForm({ ...priceForm, effectiveDate: e.target.value })} />
                <Input type="number" step="0.1" placeholder="KM" value={priceForm.distanceKm} onChange={(e) => setPriceForm({ ...priceForm, distanceKm: e.target.value })} />
                <Input type="number" step="0.01" placeholder="Company Price" required value={priceForm.companyUnitPrice} onChange={(e) => setPriceForm({ ...priceForm, companyUnitPrice: e.target.value })} />
                <div className="flex gap-2">
                  <Button type="submit">{priceForm.id ? "Save Company Price" : "Add Company Price"}</Button>
                  {priceForm.id && (
                    <Button type="button" variant="secondary" onClick={() => setPriceForm({ id: "", fromLocation: data.settings.defaultFromLocation || "", toLocation: "", truckType: priceForm.truckType, distanceKm: "", companyUnitPrice: "", truckSalaryUnitPrice: "", effectiveDate: today() })}>Cancel</Button>
                  )}
                </div>
              </form>
              <div className="mt-4 max-w-xl">
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
                            <div className="text-lg font-black text-teal-950">{group.activePrice ? `$ ${money(group.activePrice.companyUnitPrice)}` : "No active price"}</div>
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
                                  {Number(price.distanceKm || 0).toFixed(1)} KM | Company $ {money(price.companyUnitPrice)}
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
              <form className="grid gap-3 md:grid-cols-7" onSubmit={saveDriverPrice}>
                <Input placeholder="From Location" required value={driverPriceForm.fromLocation} onChange={(e) => setDriverPriceForm({ ...driverPriceForm, fromLocation: e.target.value })} />
                <Input placeholder="To Location" required value={driverPriceForm.toLocation} onChange={(e) => setDriverPriceForm({ ...driverPriceForm, toLocation: e.target.value })} />
                <Select value={driverPriceForm.truckType} onChange={(e) => setDriverPriceForm({ ...driverPriceForm, truckType: e.target.value })}>
                  <option value="With Crane">Crane</option>
                  <option value="Without Crane">No Crane</option>
                </Select>
                <Input type="date" required value={driverPriceForm.effectiveDate || today()} onChange={(e) => setDriverPriceForm({ ...driverPriceForm, effectiveDate: e.target.value })} />
                <Input type="number" step="0.1" placeholder="KM" value={driverPriceForm.distanceKm} onChange={(e) => setDriverPriceForm({ ...driverPriceForm, distanceKm: e.target.value })} />
                <Input type="number" step="0.01" placeholder="Driver Price" required value={driverPriceForm.truckSalaryUnitPrice} onChange={(e) => setDriverPriceForm({ ...driverPriceForm, truckSalaryUnitPrice: e.target.value })} />
                <div className="flex gap-2">
                  <Button type="submit">{driverPriceForm.id ? "Save Driver Price" : "Add Driver Price"}</Button>
                  {driverPriceForm.id && (
                    <Button type="button" variant="secondary" onClick={() => setDriverPriceForm({ id: "", fromLocation: data.settings.defaultFromLocation || "", toLocation: "", truckType: driverPriceForm.truckType, distanceKm: "", truckSalaryUnitPrice: "", effectiveDate: today() })}>Cancel</Button>
                  )}
                </div>
              </form>
              <div className="mt-4 max-w-xl">
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
                            <div className="text-lg font-black text-amber-950">{group.activePrice ? `$ ${money(group.activePrice.truckSalaryUnitPrice)}` : "No active price"}</div>
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
                                  {Number(price.distanceKm || 0).toFixed(1)} KM | Driver $ {money(price.truckSalaryUnitPrice)}
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

          <Panel>
            <h2 className="mb-3 text-lg font-bold">Settings</h2>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={saveSettings}>
              <Field label="Company"><Input value={settingsForm.companyName} onChange={(e) => setSettingsForm({ ...settingsForm, companyName: e.target.value })} /></Field>
              <Field label="Default From"><Input value={settingsForm.defaultFromLocation} onChange={(e) => setSettingsForm({ ...settingsForm, defaultFromLocation: e.target.value })} /></Field>
              <div className="flex items-end"><Button type="submit">Save Settings</Button></div>
            </form>
          </Panel>

          <Panel>
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="text-lg font-bold">Data Backup</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Automatic backup runs before the first data change each day. Create or download a backup before major edits.
                </p>
                <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">
                  Latest backup: {backupFiles[0] || "No backup file yet"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={createManualBackup}>Create Backup</Button>
                <Button type="button" variant="secondary" onClick={downloadBackup}>Download Backup</Button>
                <Button type="button" variant="danger" onClick={restoreBackup}>Restore Backup</Button>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="text-lg font-bold">Location Price Reset</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Clear the current location price list before entering the new official location format. Existing statements and delivery rows stay unchanged.
                </p>
              </div>
              <Button type="button" variant="danger" onClick={clearLocationPriceList}>Clear Location Prices</Button>
            </div>
          </Panel>
        </main>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
