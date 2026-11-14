import { useMemo, useState } from "react";
import { useApp } from "../AppContext.js";
import { Button, Field, Input, PageHead, Panel, Select } from "../components/ui.jsx";
import { formatDate, monthName } from "../lib/format.js";

export function InvoiceSearchPage() {
  const { data } = useApp();
  const [query, setQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState("");
  const search = query.trim().toLowerCase();
  const statementsById = useMemo(() => new Map(data.statements.map(statement => [statement.id, statement])), [data.statements]);
  const years = useMemo(() => {
    const recordedYears = data.deliveries.map(row => String(row.deliveryDate || "").slice(0, 4)).filter(year => /^\d{4}$/.test(year));
    return [...new Set([...recordedYears, String(new Date().getFullYear())])].sort((a, b) => Number(b) - Number(a));
  }, [data.deliveries]);
  const monthlyCounts = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const month = `${selectedYear}-${String(index + 1).padStart(2, "0")}`;
    return { month, count: data.deliveries.filter(row => String(row.deliveryDate || "").slice(0, 7) === month).length };
  }), [data.deliveries, selectedYear]);
  const yearTotal = monthlyCounts.reduce((total, item) => total + item.count, 0);
  const matches = useMemo(() => data.deliveries
    .filter(row => !search || String(row.invoiceNo ?? "").toLowerCase().includes(search))
    .filter(row => String(row.deliveryDate || "").startsWith(selectedYear) && (!selectedMonth || String(row.deliveryDate || "").slice(0, 7) === selectedMonth))
    .sort((a, b) => String(b.deliveryDate).localeCompare(String(a.deliveryDate)) || String(a.invoiceNo).localeCompare(String(b.invoiceNo))), [data.deliveries, search, selectedYear, selectedMonth]);

  return <main className="app-content mx-auto grid max-w-[1500px] gap-4 p-4 pb-20 lg:pb-4">
    <PageHead title="Invoice Search" meta="Find deliveries and their statements across all months." />
    <Panel>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-900">Invoices by month</h2>
          <p className="mt-1 text-sm text-slate-500">Counts use each delivery’s date. Select a month to filter invoice search.</p>
        </div>
        <Field label="Year">
          <Select value={selectedYear} onChange={event => { setSelectedYear(event.target.value); setSelectedMonth(""); }} aria-label="Invoice year">
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </Select>
        </Field>
      </div>
      <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-4">
        <div className="text-xs font-black uppercase tracking-wide text-teal-800">Total invoices in {selectedYear}</div>
        <div className="mt-1 text-3xl font-black tabular-nums text-teal-950">{yearTotal.toLocaleString()}</div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {monthlyCounts.map(({ month, count }) => {
          const active = selectedMonth === month;
          return <button key={month} type="button" aria-pressed={active} onClick={() => setSelectedMonth(active ? "" : month)} className={`rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-4 focus:ring-teal-100 ${active ? "border-teal-700 bg-teal-700 text-white shadow-sm" : "border-slate-200 bg-white text-slate-900 hover:border-teal-500"}`}>
            <div className={`text-xs font-black uppercase tracking-wide ${active ? "text-teal-100" : "text-slate-500"}`}>{monthName(month)}</div>
            <div className="mt-1 text-2xl font-black tabular-nums">{count.toLocaleString()}</div>
            <div className={`mt-1 text-xs font-semibold ${active ? "text-teal-100" : "text-slate-500"}`}>invoices</div>
          </button>;
        })}
      </div>
    </Panel>
    <Panel>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:max-w-md">
          <Field label="Invoice number">
            <Input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="e.g. 8001074244" aria-describedby="invoice-search-help" />
          </Field>
        </div>
        <Button variant="secondary" onClick={() => setQuery("")} disabled={!query}>Clear</Button>
      </div>
      <p id="invoice-search-help" className="mt-3 text-sm text-slate-500">Enter a full or partial invoice number. Searches all months, regardless of the report month.</p>
      <p role="status" className="my-4 text-sm font-bold text-slate-600">
        {!search && !selectedMonth ? "Enter an invoice number or select a month to view invoices." : matches.length ? `${matches.length} ${search ? "matching " : ""}${matches.length === 1 ? "invoice" : "invoices"} in ${selectedMonth ? monthName(selectedMonth) : selectedYear}.` : `No invoices found${search ? ` for “${query.trim()}”` : ""} in ${selectedMonth || selectedYear}.`}
      </p>
      {matches.length > 0 && <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-slate-900 text-white"><tr>
            {["Invoice number", "Delivery date", "Car number", "Quantity (T)", "Statement", "Statement month"].map(heading => <th key={heading} scope="col" className={`px-4 py-3 ${heading === "Quantity (T)" ? "text-right" : ""}`}>{heading}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {matches.map(row => {
              const statement = statementsById.get(row.statementId);
              return <tr key={row.id} className="even:bg-slate-50">
                <td className="px-4 py-3 font-bold tabular-nums">{row.invoiceNo}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.deliveryDate)}</td>
                <td className="px-4 py-3 font-bold">{row.truckNo}</td>
                <td className="px-4 py-3 text-right tabular-nums">{Number(row.qtyTon || 0).toLocaleString(undefined, { maximumFractionDigits: 5 })}</td>
                <td className="px-4 py-3">{statement ? `Statement ${statement.statementNumber}` : "Statement unavailable"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{statement ? monthName(statement.month) : "—"}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>}
    </Panel>
  </main>;
}
