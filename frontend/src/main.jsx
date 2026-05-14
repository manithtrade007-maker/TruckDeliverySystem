import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);
const money = (value) => Number(value || 0).toFixed(2);

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
    "inline-flex min-h-10 items-center justify-center rounded-lg border px-4 py-2 text-sm font-bold shadow-sm transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none";
  const variants = {
    primary: "border-teal-700 bg-teal-700 text-white hover:bg-teal-800",
    secondary: "border-slate-300 bg-white text-slate-800 hover:border-teal-700 hover:text-teal-800",
    quiet: "border-transparent bg-transparent text-slate-600 shadow-none hover:bg-slate-100",
    danger: "border-rose-200 bg-white text-rose-700 hover:border-rose-500 hover:bg-rose-50"
  };
  const styles = variants[variant] || variants.primary;
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

function Input(props) {
  return (
    <input
      className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none"
      {...props}
    />
  );
}

function Select({ children, ...props }) {
  return (
    <select
      className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none"
      {...props}
    >
      {children}
    </select>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-slate-600">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Panel({ children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

function KpiCard({ label, value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    teal: "border-teal-200 bg-teal-50 text-teal-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    blue: "border-sky-200 bg-sky-50 text-sky-900"
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone] || tones.slate}`}>
      <div className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-xl font-black">{value}</div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState("dashboard");
  const [data, setData] = useState({ settings: {}, trucks: [], prices: [], statements: [], deliveries: [] });
  const [selectedStatementId, setSelectedStatementId] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [reportMonth, setReportMonth] = useState(currentMonth());
  const [entryTruckType, setEntryTruckType] = useState("With Crane");
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
  const [filters, setFilters] = useState({ month: currentMonth(), truckNo: "" });
  const [truckForm, setTruckForm] = useState({ truckNo: "", truckType: "With Crane", driverName: "", phone: "" });
  const [priceForm, setPriceForm] = useState({
    id: "",
    fromLocation: "",
    toLocation: "",
    truckType: "With Crane",
    distanceKm: "",
    companyUnitPrice: "",
    truckSalaryUnitPrice: ""
  });
  const [settingsForm, setSettingsForm] = useState({ companyName: "", defaultFromLocation: "" });

  const selectedStatement = useMemo(
    () => data.statements.find((statement) => statement.id === selectedStatementId),
    [data.statements, selectedStatementId]
  );

  const statementRows = useMemo(
    () =>
      data.deliveries
        .filter((row) => row.statementId === selectedStatementId)
        .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || ""))),
    [data.deliveries, selectedStatementId]
  );

  const filteredStatements = useMemo(() => {
    const truckType = filters.truckNo
      ? data.trucks.find((truck) => truck.truckNo === filters.truckNo)?.truckType
      : "";
    return data.statements
      .filter((statement) => !filters.month || statement.month === filters.month)
      .filter((statement) => !truckType || statement.truckType === truckType)
      .sort((a, b) => b.month.localeCompare(a.month) || Number(a.statementNumber) - Number(b.statementNumber));
  }, [data.statements, data.trucks, filters]);

  const statementCounts = useMemo(() => {
    const month = filters.month || statementForm.month || currentMonth();
    const rows = data.statements.filter((statement) => statement.month === month);
    return {
      month,
      withCrane: rows.filter((statement) => statement.truckType === "With Crane").length,
      withoutCrane: rows.filter((statement) => statement.truckType === "Without Crane").length,
      total: rows.length
    };
  }, [data.statements, filters.month, statementForm.month]);

  const truckOptions = useMemo(
    () => data.trucks.filter((truck) => selectedStatement && truck.truckType === selectedStatement.truckType),
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
    ? data.prices.find(
        (price) =>
          price.active !== false &&
          price.fromLocation === data.settings.defaultFromLocation &&
          price.toLocation === deliveryForm.toLocation &&
          price.truckType === selectedTruck.truckType
      )
    : null;

  const totals = statementRows.reduce(
    (sum, row) => ({
      qty: sum.qty + Number(row.qtyTon || 0),
      amount: sum.amount + Number(row.companyTotalAmount || 0)
    }),
    { qty: 0, amount: 0 }
  );

  const monthlyRows = useMemo(
    () => data.deliveries.filter((row) => !reportMonth || row.deliveryDate?.slice(0, 7) === reportMonth),
    [data.deliveries, reportMonth]
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
      if (!byTruck.has(row.truckNo)) {
        byTruck.set(row.truckNo, {
          truckNo: row.truckNo,
          truckType: row.truckType,
          driverName: row.driverName,
          trips: 0,
          days: new Set(),
          qty: 0,
          companyAmount: 0,
          driverAmount: 0,
          margin: 0
        });
      }
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

  const isDraft = selectedStatement?.status === "Draft";
  const isEditingDelivery = Boolean(deliveryForm.id);
  const canEditRows = Boolean(selectedStatement) && isDraft;
  const canSaveDelivery = canEditRows && (isEditingDelivery || statementRows.length < 30);

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
  }

  useEffect(() => {
    loadData().catch((err) => flash(err.message, "error"));
  }, []);

  function openStatement(statement) {
    setEntryTruckType(statement.truckType);
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

  async function newStatement() {
    const month = statementForm.month || currentMonth();
    const truckType = entryTruckType;
    setSelectedStatementId("");
    resetDeliveryForm();
    setStatementForm({ id: "", month, truckType, statementNumber: "", statementDate: today() });
  }

  async function switchEntryTruckType(truckType) {
    setEntryTruckType(truckType);
    setSelectedStatementId("");
    resetDeliveryForm();
    const month = statementForm.month || filters.month || currentMonth();
    setStatementForm({ id: "", month, truckType, statementNumber: "", statementDate: today() });
  }

  async function finishStatement() {
    if (!selectedStatement) return;
    try {
      await api(`/api/statements/${selectedStatement.id}/finish`, { method: "POST" });
      await loadData();
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
    const ok = window.confirm(`Delete Statement ${statement.statementNumber}? This will also delete all delivery rows inside it.`);
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

  async function savePrice(event) {
    event.preventDefault();
    try {
      await api("/api/prices", { method: "POST", body: JSON.stringify(priceForm) });
      setPriceForm({
        id: "",
        fromLocation: data.settings.defaultFromLocation || "",
        toLocation: "",
        truckType: "With Crane",
        distanceKm: "",
        companyUnitPrice: "",
        truckSalaryUnitPrice: ""
      });
      await loadData();
      flash("Price saved.");
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

  function exportStatement() {
    if (!selectedStatement) return;
    window.location.href = `/api/export/accounting?statementId=${encodeURIComponent(selectedStatement.id)}&truckType=${encodeURIComponent(selectedStatement.truckType)}`;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 flex flex-col gap-4 border-b border-slate-200 bg-white/95 px-6 py-4 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Truck Delivery System</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Monthly statements, steel delivery records, and accounting exports.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={page === "dashboard" ? "primary" : "secondary"} onClick={() => setPage("dashboard")}>Dashboard</Button>
          <Button variant={page === "data-entry" ? "primary" : "secondary"} onClick={() => setPage("data-entry")}>Data Entry</Button>
          <Button variant={page === "reports" ? "primary" : "secondary"} onClick={() => setPage("reports")}>Reports</Button>
          <Button variant={page === "setup" ? "primary" : "secondary"} onClick={() => setPage("setup")}>Setup</Button>
          <Button onClick={exportStatement} disabled={!selectedStatement || statementRows.length < 1}>Export Current Statement</Button>
        </div>
      </header>

      {notice.text && (
        <div className={`mx-4 mt-4 rounded-xl border px-4 py-3 text-sm font-bold shadow-sm ${notice.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-teal-200 bg-teal-50 text-teal-800"}`}>
          {notice.text}
        </div>
      )}

      {page === "dashboard" ? (
        <main className="grid gap-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Monthly Dashboard</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">A simple monthly summary. Use Reports for detailed truck and driver lists.</p>
            </div>
            <Field label="Report Month">
              <Input type="month" value={reportMonth} onChange={(event) => setReportMonth(event.target.value)} />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Company Revenue" value={`$${money(monthlyTotals.companyAmount)}`} tone="teal" />
            <KpiCard label="Driver Payment" value={`$${money(monthlyTotals.driverAmount)}`} tone="amber" />
            <KpiCard label="Gross Margin" value={`$${money(monthlyTotals.margin)}`} tone="blue" />
            <KpiCard label="Trips / Active Trucks" value={`${monthlyTotals.trips} / ${activeTruckCount}`} tone="slate" />
          </div>

          <Panel>
            <div className="grid gap-4 md:grid-cols-3">
              <button type="button" onClick={() => setPage("data-entry")} className="rounded-2xl border border-teal-200 bg-teal-50 p-5 text-left transition hover:border-teal-700">
                <div className="text-sm font-black uppercase tracking-wide text-teal-700">Daily work</div>
                <div className="mt-1 text-xl font-black">Go to Data Entry</div>
                <div className="mt-2 text-sm font-semibold text-slate-600">Input invoice rows for crane or no-crane trucks.</div>
              </button>
              <button type="button" onClick={() => setPage("reports")} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left transition hover:border-amber-500">
                <div className="text-sm font-black uppercase tracking-wide text-amber-700">Month end</div>
                <div className="mt-1 text-xl font-black">Open Driver Payment</div>
                <div className="mt-2 text-sm font-semibold text-slate-600">Review each truck list before paying drivers.</div>
              </button>
              <button type="button" onClick={() => setPage("setup")} className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-slate-400">
                <div className="text-sm font-black uppercase tracking-wide text-slate-500">Master data</div>
                <div className="mt-1 text-xl font-black">Setup Trucks & Prices</div>
                <div className="mt-2 text-sm font-semibold text-slate-600">Manage truck master and location price lists.</div>
              </button>
            </div>
          </Panel>
        </main>
      ) : page === "data-entry" ? (
        <main className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div className="lg:col-span-2">
            <div className="grid gap-3 md:grid-cols-2">
              {["With Crane", "Without Crane"].map((truckType) => (
                <button
                  key={truckType}
                  type="button"
                  onClick={() => switchEntryTruckType(truckType).catch((err) => flash(err.message, "error"))}
                  className={`rounded-2xl border p-5 text-left shadow-sm transition ${
                    entryTruckType === truckType
                      ? "border-teal-700 bg-teal-700 text-white"
                      : "border-slate-200 bg-white text-slate-900 hover:border-teal-300 hover:bg-teal-50"
                  }`}
                >
                  <div className="text-sm font-black uppercase tracking-wide opacity-75">Data Entry</div>
                  <div className="mt-1 text-2xl font-black">{truckType === "With Crane" ? "Truck With Crane" : "Truck No Crane"}</div>
                  <div className="mt-2 text-sm font-semibold opacity-80">
                    {truckType === "With Crane"
                      ? `6 crane trucks | ${statementCounts.withCrane} statements this month`
                      : `3 no-crane trucks | ${statementCounts.withoutCrane} statements this month`}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 lg:col-span-2 md:grid-cols-3">
            <KpiCard label={`${statementCounts.month} With Crane Statements`} value={statementCounts.withCrane} tone="teal" />
            <KpiCard label={`${statementCounts.month} No Crane Statements`} value={statementCounts.withoutCrane} tone="blue" />
            <KpiCard label={`${statementCounts.month} Total Statements`} value={statementCounts.total} tone="slate" />
          </div>

          {selectedStatement && (
            <div className="grid gap-3 lg:col-span-2 lg:grid-cols-4">
              <KpiCard label="Selected" value={`Statement ${selectedStatement.statementNumber}`} tone="teal" />
              <KpiCard label="Rows" value={`${statementRows.length}/30`} tone="blue" />
              <KpiCard label="Total QTY" value={`${totals.qty.toFixed(4)}T`} tone="slate" />
              <KpiCard label="Total Amount" value={`$${money(totals.amount)}`} tone="amber" />
            </div>
          )}

          <Panel className="lg:col-span-2">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-lg font-black tracking-tight">
                {selectedStatement ? `${entryTruckType} Statement Details` : `Create ${entryTruckType} Statement`}
              </h2>
              <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm font-black text-teal-800">
                {selectedStatement ? `Statement ${selectedStatement.statementNumber} | ${selectedStatement.truckType} | ${selectedStatement.status} | ${statementRows.length}/30 rows` : `${entryTruckType} mode`}
              </span>
            </div>
            <form className="grid gap-3 md:grid-cols-4" onSubmit={saveStatement}>
              <Field label="Month">
                <Input
                  type="month"
                  required
                  value={statementForm.month}
                  onChange={(event) => {
                    const month = event.target.value;
                    setStatementForm((current) => ({ ...current, month }));
                  }}
                />
              </Field>
              <Field label="Truck Type"><Input value={entryTruckType} disabled readOnly /></Field>
              <Field label="Statement No">
                <Input type="number" min="1" required placeholder="Enter your statement number" value={statementForm.statementNumber} onChange={(event) => setStatementForm({ ...statementForm, statementNumber: event.target.value })} />
              </Field>
              <Field label="Statement Date">
                <Input type="date" required value={statementForm.statementDate} onChange={(event) => setStatementForm({ ...statementForm, statementDate: event.target.value })} />
              </Field>
              <div className="flex flex-wrap items-end gap-2 md:col-span-4">
                <Button type="submit">{statementForm.id ? "Save Changes" : "Create Statement"}</Button>
                <Button type="button" variant="secondary" onClick={() => newStatement().catch((err) => flash(err.message, "error"))}>
                  {selectedStatement ? "Back to Statements" : "Clear Form"}
                </Button>
                {selectedStatement && !isDraft && (
                  <Button type="button" variant="secondary" onClick={reopenStatement}>Reopen to Edit Rows</Button>
                )}
              </div>
            </form>
          </Panel>

          {!selectedStatement && (
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-black tracking-tight">All Statements</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-600">
                With Crane {statementCounts.withCrane} | No Crane {statementCounts.withoutCrane} | Total {statementCounts.total}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Month"><Input type="month" value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })} /></Field>
              <Field label="Truck No">
                <Select value={filters.truckNo} onChange={(e) => setFilters({ ...filters, truckNo: e.target.value })}>
                  <option value="">All trucks</option>
                  {data.trucks.map((truck) => <option key={truck.truckNo}>{truck.truckNo}</option>)}
                </Select>
              </Field>
            </div>
            <div className="mt-4 grid max-h-[520px] gap-2 overflow-auto pr-1 lg:grid-cols-2">
              {filteredStatements.map((statement) => (
                <div key={statement.id} className={`grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border p-3 transition ${statement.id === selectedStatementId ? "border-teal-700 bg-teal-50 shadow-sm" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="block text-sm font-black">Statement {statement.statementNumber}</strong>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-black ${statement.truckType === "With Crane" ? "bg-teal-100 text-teal-800" : "bg-sky-100 text-sky-800"}`}>
                        {statement.truckType}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">{statement.month} | {statement.status} | {statement.rowCount}/30 rows | ${money(statement.companyTotalAmount)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => openStatement(statement)}>Edit</Button>
                    <Button type="button" variant="danger" onClick={() => deleteStatement(statement)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
          )}

          {selectedStatement && (
            <>
              <Panel className="lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-black tracking-tight">{isEditingDelivery ? "Edit Delivery Row" : "Delivery Entry"}</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600">
                    Statement {selectedStatement.statementNumber} - {selectedStatement.truckType} - {statementRows.length}/30 rows
                  </span>
                </div>
                <form className="grid gap-3 md:grid-cols-4" onSubmit={saveDelivery}>
                  <Field label="Delivery Date"><Input type="date" required disabled={!canEditRows} value={deliveryForm.deliveryDate} onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryDate: e.target.value })} /></Field>
                  <Field label="Invoice No"><Input required disabled={!canEditRows} value={deliveryForm.invoiceNo} onChange={(e) => setDeliveryForm({ ...deliveryForm, invoiceNo: e.target.value })} /></Field>
                  <Field label="Truck No">
                    <Select required disabled={!canEditRows} value={deliveryForm.truckNo} onChange={(e) => setDeliveryForm({ ...deliveryForm, truckNo: e.target.value, toLocation: "" })}>
                      <option value="">Select truck</option>
                      {truckOptions.map((truck) => <option key={truck.truckNo}>{truck.truckNo}</option>)}
                    </Select>
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
                  <div className="flex items-end gap-2 md:col-span-2">
                    <Button type="submit" disabled={!canSaveDelivery}>{isEditingDelivery ? "Update Row" : "Save Delivery"}</Button>
                    <Button type="button" variant="secondary" onClick={() => resetDeliveryForm()}>Cancel</Button>
                    {isDraft && statementRows.length > 0 && (
                      <Button type="button" variant="secondary" onClick={finishStatement}>Finish Statement</Button>
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
                      <td className="px-3 py-3 text-center">{row.deliveryDate}</td>
                      <td className="px-3 py-3">{row.invoiceNo}</td>
                      <td className="px-3 py-3 font-bold">{row.truckNo}</td>
                      <td className="px-3 py-3">{row.truckType}</td>
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
        <main className="grid gap-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Month-End Driver Payment</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Use the same delivery entries to calculate driver payment, revenue, and margin by truck.</p>
            </div>
            <Field label="Report Month">
              <Input type="month" value={reportMonth} onChange={(event) => setReportMonth(event.target.value)} />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Total Driver Payment" value={`$${money(monthlyTotals.driverAmount)}`} tone="amber" />
            <KpiCard label="Company Revenue" value={`$${money(monthlyTotals.companyAmount)}`} tone="teal" />
            <KpiCard label="Gross Margin" value={`$${money(monthlyTotals.margin)}`} tone="blue" />
            <KpiCard label="Total Tons" value={`${monthlyTotals.qty.toFixed(4)}T`} tone="slate" />
          </div>

          <Panel>
            <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-black tracking-tight">Salary Summary</h3>
                <p className="mt-1 text-sm font-medium text-slate-500">Each truck can be exported separately for driver verification.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    window.location.href = `/api/export/salary?month=${encodeURIComponent(reportMonth)}&truckType=${encodeURIComponent("With Crane")}`;
                  }}
                >
                  Export With Crane Salary
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    window.location.href = `/api/export/salary?month=${encodeURIComponent(reportMonth)}&truckType=${encodeURIComponent("Without Crane")}`;
                  }}
                >
                  Export No Crane Salary
                </Button>
              </div>
            </div>
            <div className="overflow-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1100px] border-collapse bg-white text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    {["Truck No", "Type", "Driver", "Working Days", "Trips", "QTY(T)", "Company Revenue", "Driver Payment", "Margin", "Export"].map((heading) => (
                      <th key={heading} className="px-3 py-3 text-left font-black">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {truckPerformance.map((truck) => (
                    <tr key={truck.truckNo} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                      <td className="px-3 py-3 font-black">{truck.truckNo}</td>
                      <td className="px-3 py-3">{truck.truckType}</td>
                      <td className="px-3 py-3">{truck.driverName || "-"}</td>
                      <td className="px-3 py-3">{truck.workingDays}</td>
                      <td className="px-3 py-3">{truck.trips}</td>
                      <td className="px-3 py-3 text-right font-bold">{truck.qty.toFixed(4)}T</td>
                      <td className="px-3 py-3 text-right">$ {money(truck.companyAmount)}</td>
                      <td className="px-3 py-3 text-right font-black">$ {money(truck.driverAmount)}</td>
                      <td className="px-3 py-3 text-right">$ {money(truck.margin)}</td>
                      <td className="px-3 py-3">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={truck.trips < 1}
                          onClick={() => {
                            window.location.href = `/api/export/salary?month=${encodeURIComponent(reportMonth)}&truckNo=${encodeURIComponent(truck.truckNo)}`;
                          }}
                        >
                          Export
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="grid gap-4">
            {driverPaymentSections.map((truck) => (
              <Panel key={truck.truckNo}>
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-black tracking-tight">{truck.truckNo} Driver Verification List</h3>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {truck.truckType} | {truck.workingDays} working days | {truck.trips} trips | Driver payment $ {money(truck.driverAmount)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      window.location.href = `/api/export/salary?month=${encodeURIComponent(reportMonth)}&truckNo=${encodeURIComponent(truck.truckNo)}`;
                    }}
                  >
                    Export {truck.truckNo}
                  </Button>
                </div>
                <div className="overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[1150px] border-collapse bg-white text-sm">
                    <thead className="bg-slate-900 text-white">
                      <tr>
                        {["No", "Delivery Date", "Invoice No", "From", "To", "QTY(T)", "Company Price", "Company Amount", "Driver Price", "Driver Amount"].map((heading) => (
                          <th key={heading} className="px-3 py-3 text-left font-black">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {truck.rows.map((row, index) => (
                        <tr key={row.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                          <td className="px-3 py-3">{index + 1}</td>
                          <td className="px-3 py-3">{row.deliveryDate}</td>
                          <td className="px-3 py-3">{row.invoiceNo}</td>
                          <td className="px-3 py-3">{row.fromLocation}</td>
                          <td className="px-3 py-3">{row.toLocation}</td>
                          <td className="px-3 py-3 text-right font-bold">{Number(row.qtyTon || 0).toFixed(4)}T</td>
                          <td className="px-3 py-3 text-right">$ {money(row.companyUnitPrice)}</td>
                          <td className="px-3 py-3 text-right">$ {money(row.companyTotalAmount)}</td>
                          <td className="px-3 py-3 text-right font-bold">$ {money(row.truckSalaryUnitPrice)}</td>
                          <td className="px-3 py-3 text-right font-black">$ {money(row.truckSalaryAmount)}</td>
                        </tr>
                      ))}
                      <tr className="bg-amber-50 font-black">
                        <td className="px-3 py-3" colSpan="5">Total</td>
                        <td className="px-3 py-3 text-right">{truck.qty.toFixed(4)}T</td>
                        <td className="px-3 py-3"></td>
                        <td className="px-3 py-3 text-right">$ {money(truck.companyAmount)}</td>
                        <td className="px-3 py-3"></td>
                        <td className="px-3 py-3 text-right">$ {money(truck.driverAmount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Panel>
            ))}
          </div>
        </main>
      ) : (
        <main className="grid gap-4 p-4 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-lg font-bold">Truck Master</h2>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={saveTruck}>
              <Input placeholder="Truck No" required value={truckForm.truckNo} onChange={(e) => setTruckForm({ ...truckForm, truckNo: e.target.value })} />
              <Select value={truckForm.truckType} onChange={(e) => setTruckForm({ ...truckForm, truckType: e.target.value })}><option>With Crane</option><option>Without Crane</option></Select>
              <Input placeholder="Driver Name" value={truckForm.driverName} onChange={(e) => setTruckForm({ ...truckForm, driverName: e.target.value })} />
              <Input placeholder="Phone" value={truckForm.phone} onChange={(e) => setTruckForm({ ...truckForm, phone: e.target.value })} />
              <Button type="submit">Save Truck</Button>
            </form>
            <div className="mt-4 grid gap-2">
              {data.trucks.map((truck) => (
                <div key={truck.truckNo} className="rounded-md border border-slate-200 p-3">
                  <strong className="block text-sm">{truck.truckNo} - {truck.truckType}</strong>
                  <span className="text-xs text-slate-500">{truck.driverName || "No driver"} {truck.phone ? `| ${truck.phone}` : ""}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-lg font-bold">Steel Location Price List</h2>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={savePrice}>
              <Input placeholder="From Location" required value={priceForm.fromLocation} onChange={(e) => setPriceForm({ ...priceForm, fromLocation: e.target.value })} />
              <Input placeholder="To Location" required value={priceForm.toLocation} onChange={(e) => setPriceForm({ ...priceForm, toLocation: e.target.value })} />
              <Select value={priceForm.truckType} onChange={(e) => setPriceForm({ ...priceForm, truckType: e.target.value })}><option>With Crane</option><option>Without Crane</option></Select>
              <Input type="number" step="0.1" placeholder="KM" value={priceForm.distanceKm} onChange={(e) => setPriceForm({ ...priceForm, distanceKm: e.target.value })} />
              <Input type="number" step="0.01" placeholder="Company Price" required value={priceForm.companyUnitPrice} onChange={(e) => setPriceForm({ ...priceForm, companyUnitPrice: e.target.value })} />
              <Input type="number" step="0.01" placeholder="Salary Price" required value={priceForm.truckSalaryUnitPrice} onChange={(e) => setPriceForm({ ...priceForm, truckSalaryUnitPrice: e.target.value })} />
              <Button type="submit">Save Price</Button>
            </form>
            <div className="mt-4 grid max-h-[520px] gap-2 overflow-auto pr-1">
              {data.prices.map((price) => (
                <div key={price.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-slate-200 p-3">
                  <div>
                    <strong className="block text-sm">{price.fromLocation} to {price.toLocation}</strong>
                    <span className="text-xs text-slate-500">{price.truckType} | {Number(price.distanceKm || 0).toFixed(1)} KM | Company ${money(price.companyUnitPrice)} | Salary ${money(price.truckSalaryUnitPrice)}</span>
                  </div>
                  <Button type="button" onClick={() => setPriceForm(price)}>Edit</Button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
            <h2 className="mb-3 text-lg font-bold">Settings</h2>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={saveSettings}>
              <Field label="Company"><Input value={settingsForm.companyName} onChange={(e) => setSettingsForm({ ...settingsForm, companyName: e.target.value })} /></Field>
              <Field label="Default From"><Input value={settingsForm.defaultFromLocation} onChange={(e) => setSettingsForm({ ...settingsForm, defaultFromLocation: e.target.value })} /></Field>
              <div className="flex items-end"><Button type="submit">Save Settings</Button></div>
            </form>
          </section>
        </main>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
