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
    "inline-flex min-h-10 items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500";
  const styles =
    variant === "secondary"
      ? "border-teal-700 bg-white text-teal-800 hover:bg-teal-50"
      : "border-teal-700 bg-teal-700 text-white hover:bg-teal-800";
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

function Input(props) {
  return (
    <input
      className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
      {...props}
    />
  );
}

function Select({ children, ...props }) {
  return (
    <select
      className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
      {...props}
    >
      {children}
    </select>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-600">
      <span>{label}</span>
      {children}
    </label>
  );
}

function App() {
  const [page, setPage] = useState("statements");
  const [data, setData] = useState({ settings: {}, trucks: [], prices: [], statements: [], deliveries: [] });
  const [selectedStatementId, setSelectedStatementId] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [statementForm, setStatementForm] = useState({
    id: "",
    month: currentMonth(),
    truckType: "With Crane",
    statementNumber: "",
    statementDate: today()
  });
  const [deliveryForm, setDeliveryForm] = useState({
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

  const truckOptions = useMemo(
    () => data.trucks.filter((truck) => !selectedStatement || truck.truckType === selectedStatement.truckType),
    [data.trucks, selectedStatement]
  );

  const locations = useMemo(
    () => [...new Set(data.prices.map((price) => price.toLocation).filter(Boolean))].sort(),
    [data.prices]
  );

  const selectedTruck = data.trucks.find((truck) => truck.truckNo === deliveryForm.truckNo);
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

  const isDraft = selectedStatement?.status === "Draft";
  const canEditRows = Boolean(selectedStatement) && isDraft && statementRows.length < 30;

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

  async function suggestStatementNumber(month = statementForm.month) {
    if (!month) return;
    const result = await api(`/api/next-statement-number?month=${encodeURIComponent(month)}`);
    setStatementForm((current) => ({ ...current, statementNumber: result.nextStatementNumber }));
  }

  useEffect(() => {
    suggestStatementNumber().then(loadData).catch((err) => flash(err.message, "error"));
  }, []);

  function openStatement(statement) {
    setSelectedStatementId(statement.id);
    setStatementForm({
      id: statement.id,
      month: statement.month,
      truckType: statement.truckType,
      statementNumber: statement.statementNumber,
      statementDate: statement.statementDate
    });
    setDeliveryForm({ deliveryDate: today(), invoiceNo: "", truckNo: "", toLocation: "", qtyTon: "" });
  }

  async function saveStatement(event) {
    event.preventDefault();
    try {
      const statement = await api("/api/statements", { method: "POST", body: JSON.stringify(statementForm) });
      setSelectedStatementId(statement.id);
      setStatementForm({ ...statement, id: statement.id });
      await loadData();
      flash("Statement saved.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function newStatement() {
    const month = statementForm.month || currentMonth();
    setSelectedStatementId("");
    setStatementForm({ id: "", month, truckType: "With Crane", statementNumber: "", statementDate: today() });
    await suggestStatementNumber(month);
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

  async function deleteStatement(statement) {
    const ok = window.confirm(`Delete Statement ${statement.statementNumber}? This will also delete all delivery rows inside it.`);
    if (!ok) return;
    try {
      await api(`/api/statements/${statement.id}`, { method: "DELETE" });
      if (selectedStatementId === statement.id) {
        setSelectedStatementId("");
        setStatementForm({ id: "", month: statement.month, truckType: "With Crane", statementNumber: "", statementDate: today() });
        setDeliveryForm({ deliveryDate: today(), invoiceNo: "", truckNo: "", toLocation: "", qtyTon: "" });
        await suggestStatementNumber(statement.month);
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
      setDeliveryForm({ deliveryDate: today(), invoiceNo: "", truckNo: "", toLocation: "", qtyTon: "" });
      await loadData();
      flash(statementRows.length + 1 >= 30 ? "Statement reached 30 rows. Create the next statement." : "Delivery saved.");
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
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Truck Delivery System</h1>
          <p className="mt-1 text-sm text-slate-500">Monthly statements, steel delivery records, and accounting exports.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={page === "statements" ? "primary" : "secondary"} onClick={() => setPage("statements")}>Statements</Button>
          <Button variant={page === "setup" ? "primary" : "secondary"} onClick={() => setPage("setup")}>Setup</Button>
          <Button onClick={exportStatement} disabled={!selectedStatement || statementRows.length < 1}>Export Current Statement</Button>
        </div>
      </header>

      {notice.text && (
        <div className={`mx-4 mt-4 rounded-md border px-4 py-3 text-sm font-medium ${notice.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-teal-200 bg-teal-50 text-teal-800"}`}>
          {notice.text}
        </div>
      )}

      {page === "statements" ? (
        <main className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <section className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-lg font-bold">Monthly Delivery Statement</h2>
              <span className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-sm font-bold text-teal-800">
                {selectedStatement ? `Statement ${selectedStatement.statementNumber} | ${selectedStatement.truckType} | ${selectedStatement.status} | ${statementRows.length}/30 rows` : "No statement selected"}
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
                    if (!statementForm.id) suggestStatementNumber(month).catch((err) => flash(err.message, "error"));
                  }}
                />
              </Field>
              <Field label="Truck Type">
                <Select value={statementForm.truckType} onChange={(event) => setStatementForm({ ...statementForm, truckType: event.target.value })}>
                  <option>With Crane</option>
                  <option>Without Crane</option>
                </Select>
              </Field>
              <Field label="Statement No">
                <Input type="number" min="1" required value={statementForm.statementNumber} onChange={(event) => setStatementForm({ ...statementForm, statementNumber: event.target.value })} />
              </Field>
              <Field label="Statement Date">
                <Input type="date" required value={statementForm.statementDate} onChange={(event) => setStatementForm({ ...statementForm, statementDate: event.target.value })} />
              </Field>
              <div className="flex flex-wrap items-end gap-2 md:col-span-4">
                <Button type="submit">Save Statement</Button>
                <Button type="button" variant="secondary" onClick={() => newStatement().catch((err) => flash(err.message, "error"))}>New Statement</Button>
                <Button type="button" variant="secondary" onClick={finishStatement} disabled={!selectedStatement || !isDraft || statementRows.length < 1}>Finish Statement</Button>
              </div>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Delivery Entry</h2>
              <span className="text-sm font-medium text-slate-500">{statementRows.length}/30 rows</span>
            </div>
            <form className="grid gap-3 md:grid-cols-4" onSubmit={saveDelivery}>
              <Field label="Delivery Date"><Input type="date" required disabled={!canEditRows} value={deliveryForm.deliveryDate} onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryDate: e.target.value })} /></Field>
              <Field label="Invoice No"><Input required disabled={!canEditRows} value={deliveryForm.invoiceNo} onChange={(e) => setDeliveryForm({ ...deliveryForm, invoiceNo: e.target.value })} /></Field>
              <Field label="Truck No">
                <Select required disabled={!canEditRows} value={deliveryForm.truckNo} onChange={(e) => setDeliveryForm({ ...deliveryForm, truckNo: e.target.value })}>
                  <option value="">Select truck</option>
                  {truckOptions.map((truck) => <option key={truck.truckNo}>{truck.truckNo}</option>)}
                </Select>
              </Field>
              <Field label="To Location">
                <Select required disabled={!canEditRows} value={deliveryForm.toLocation} onChange={(e) => setDeliveryForm({ ...deliveryForm, toLocation: e.target.value })}>
                  <option value="">Select location</option>
                  {locations.map((location) => <option key={location}>{location}</option>)}
                </Select>
              </Field>
              <Field label="QTY(T)"><Input type="number" step="0.0001" min="0" required disabled={!canEditRows} value={deliveryForm.qtyTon} onChange={(e) => setDeliveryForm({ ...deliveryForm, qtyTon: e.target.value })} /></Field>
              <Field label="Truck Type"><Input disabled value={selectedTruck?.truckType || ""} readOnly /></Field>
              <Field label="Unit Price"><Input disabled value={selectedPrice ? `$${money(selectedPrice.companyUnitPrice)}` : ""} readOnly /></Field>
              <div className="flex items-end gap-2"><Button type="submit" disabled={!canEditRows}>Save Delivery</Button></div>
            </form>
          </section>

          <aside className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-lg font-bold">Statement Search</h2>
            <div className="grid gap-3">
              <Field label="Month"><Input type="month" value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })} /></Field>
              <Field label="Truck No">
                <Select value={filters.truckNo} onChange={(e) => setFilters({ ...filters, truckNo: e.target.value })}>
                  <option value="">All trucks</option>
                  {data.trucks.map((truck) => <option key={truck.truckNo}>{truck.truckNo}</option>)}
                </Select>
              </Field>
            </div>
            <div className="mt-4 grid max-h-80 gap-2 overflow-auto pr-1">
              {filteredStatements.map((statement) => (
                <div key={statement.id} className={`grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border p-3 ${statement.id === selectedStatementId ? "border-teal-700 bg-teal-50" : "border-slate-200"}`}>
                  <div>
                    <strong className="block text-sm">Statement {statement.statementNumber} - {statement.truckType}</strong>
                    <span className="text-xs text-slate-500">{statement.month} | {statement.status} | {statement.rowCount}/30 rows | ${money(statement.companyTotalAmount)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => openStatement(statement)}>Edit</Button>
                    <Button type="button" variant="secondary" onClick={() => deleteStatement(statement)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
            <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-lg font-bold">Current Statement Rows</h2>
              <div className="flex flex-wrap gap-3 text-sm font-bold text-slate-600">
                <span>Rows: {statementRows.length} / 30</span>
                <span>QTY: {totals.qty.toFixed(4)}T</span>
                <span>Total: ${money(totals.amount)}</span>
              </div>
            </div>
            <div className="overflow-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[980px] border-collapse bg-white text-sm">
                <thead className="bg-yellow-300 text-slate-900">
                  <tr>
                    {["No", "Delivery Date", "Invoice Number", "Truck Number", "Type of Truck", "From Location", "To Location", "QTY(T)", "Unit Price", "Total Amount"].map((heading) => (
                      <th key={heading} className="border-b border-slate-300 px-3 py-2 text-left font-bold">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statementRows.map((row, index) => (
                    <tr key={row.id} className="border-b border-slate-200">
                      <td className="px-3 py-2">{index + 1}</td>
                      <td className="px-3 py-2 text-center">{row.deliveryDate}</td>
                      <td className="px-3 py-2">{row.invoiceNo}</td>
                      <td className="px-3 py-2">{row.truckNo}</td>
                      <td className="px-3 py-2">{row.truckType}</td>
                      <td className="px-3 py-2">{row.fromLocation}</td>
                      <td className="px-3 py-2">{row.toLocation}</td>
                      <td className="px-3 py-2 text-right">{Number(row.qtyTon).toFixed(5)}T</td>
                      <td className="px-3 py-2 text-right">$ {money(row.companyUnitPrice)}</td>
                      <td className="px-3 py-2 text-right">$ {money(row.companyTotalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
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
