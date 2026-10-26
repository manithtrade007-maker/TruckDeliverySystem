import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../AppContext.js";
import { Button, KpiCard, MonthPicker, PageHead, Panel } from "../components/ui.jsx";
import { formatDate, truckTypeLabel } from "../lib/format.js";
import { downloadFile } from "../lib/api.js";
import { locationReport } from "../../../backend/lib/location-report.js";

function ReportTable({ headings, children }) {
  return <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[600px] text-left text-sm">
    <thead className="bg-slate-900 text-white"><tr>{headings.map(h => <th key={h} scope="col" className="px-4 py-3">{h}</th>)}</tr></thead>
    <tbody className="divide-y divide-slate-100 [&_td]:px-4 [&_td]:py-3">{children}</tbody>
  </table></div>;
}
const tons = value => value.toLocaleString(undefined, { maximumFractionDigits: 5 });

export function LocationReportPage() {
  const { data, reportMonth, setReportMonth, isAdmin, flash } = useApp();
  const [truckType, setTruckType] = useState("");
  const [view, setView] = useState("locations");
  const [selected, setSelected] = useState(null);
  const detailHeading = useRef(null);
  const statementsById = useMemo(() => new Map((data.statements || []).map(statement => [statement.id, statement])), [data.statements]);
  const [exporting, setExporting] = useState(false);
  const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(reportMonth);
  const report = useMemo(() => validMonth ? locationReport(data.deliveries, reportMonth, truckType) : null, [data.deliveries, reportMonth, validMonth, truckType]);
  const groups = report?.[view] || [];
  const detail = groups.find(group => group.key === selected);
  const breakdown = useMemo(() => detail ? locationReport(detail.rows, reportMonth)[view === "locations" ? "trucks" : "locations"] : [], [detail, reportMonth, view]);
  useLayoutEffect(() => {
    if (selected) {
      window.scrollTo({ top: 0, behavior: "instant" });
      detailHeading.current?.focus({ preventScroll: true });
    }
  }, [selected]);
  function backToReport() {
    setSelected(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function exportExcel() {
    setExporting(true);
    try { await downloadFile(`/api/export/locations?month=${encodeURIComponent(reportMonth)}&truckType=${encodeURIComponent(truckType)}`); }
    catch (error) { flash(error.message, "error"); }
    finally { setExporting(false); }
  }
  if (detail) return <main className="mx-auto grid max-w-[1500px] gap-4 p-4 pb-24 lg:pb-4">
    <div><Button variant="secondary" onClick={backToReport}>← Back to Location Report</Button></div>
    <header>
      <h1 ref={detailHeading} tabIndex={-1} className="text-2xl font-black tracking-tight outline-none">{detail.name}</h1>
      <p className="mt-2 text-sm text-slate-500">{reportMonth} · {truckType ? truckTypeLabel(truckType) : "All Trucks"} · {view === "locations" ? "To Location details" : "Truck details"}</p>
    </header>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <KpiCard label={view === "locations" ? "Different trucks" : "Different To Locations"} value={view === "locations" ? detail.trucks : detail.locations} />
      <KpiCard label="Delivery trips" value={detail.trips} />
      <KpiCard label="Total tons" value={tons(detail.tons)} />
    </div>
      <Panel>
        <h2 className="mb-4 text-lg font-black">{view === "locations" ? "Trucks visiting this location" : "Locations visited"}</h2>
        <ReportTable headings={[view === "locations" ? "Truck" : "To Location", "Trips", "Tons"]}>
          {breakdown.map(group => <tr key={group.key}><td>{group.name}</td><td>{group.trips}</td><td>{tons(group.tons)}</td></tr>)}
        </ReportTable>
        <h3 className="mb-3 mt-6 font-bold">Delivery details</h3>
        <ReportTable headings={["Delivery date", "Statement", "Truck", "To Location", "Invoice", "Tons"]}>
          {[...detail.rows].sort((a,b) => a.deliveryDate.localeCompare(b.deliveryDate)).map((row, index) => <tr key={row.id || index} className="even:bg-slate-50"><td>{formatDate(row.deliveryDate)}</td><td>{(() => {
            const statement = statementsById.get(row.statementId);
            return statement ? <><div className="font-bold">Statement {statement.statementNumber}</div><div className="text-xs text-slate-500">{statement.month} · {truckTypeLabel(statement.truckType || row.truckType)}</div></> : "Statement unavailable";
          })()}</td><td>{row.truckNo || "Not recorded"}</td><td>{row.toLocation || "Not recorded"}</td><td>{row.invoiceNo}</td><td>{tons(Number(row.qtyTon) || 0)}</td></tr>)}
        </ReportTable>
      </Panel>
  </main>;
  return <main className="mx-auto grid max-w-[1500px] gap-4 p-4 pb-24 lg:pb-4">
    <PageHead title="Location Report" meta="To Locations visited by delivery month. Each delivery record counts as one trip." action={<MonthPicker value={reportMonth} onChange={event => { setReportMonth(event.target.value); setSelected(null); }} />} />
    <div className="flex flex-wrap gap-2" role="group" aria-label="Truck type">
      {[["", "All Trucks"], ["With Crane", "Crane"], ["Without Crane", "No Crane"]].map(([value, label]) => <Button key={value} variant={truckType === value ? "primary" : "secondary"} aria-pressed={truckType === value} onClick={() => { setTruckType(value); setSelected(null); }}>{label}</Button>)}
    </div>
    {!report ? <Panel>Choose a month to see destination activity.</Panel> : <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Different To Locations" value={report.locations.length} />
        <KpiCard label="Different trucks" value={report.trucks.length} />
        <KpiCard label="Delivery trips" value={report.trips} />
        <KpiCard label="Total tons" value={tons(report.tons)} />
      </div>
      {(report.missingLocations > 0 || report.missingTrucks > 0) && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{report.missingLocations} trips have no To Location; {report.missingTrucks} trips have no truck number. These trips remain in monthly totals but missing names are excluded from distinct counts.</p>}
      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2" aria-label="Location report views">
            <Button variant={view === "locations" ? "primary" : "secondary"} aria-pressed={view === "locations"} onClick={() => { setView("locations"); setSelected(null); }}>By Location</Button>
            <Button variant={view === "trucks" ? "primary" : "secondary"} aria-pressed={view === "trucks"} onClick={() => { setView("trucks"); setSelected(null); }}>By Truck</Button>
          </div>
          {isAdmin && <Button variant="secondary" disabled={exporting || !report.trips} onClick={exportExcel}>{exporting ? "Exporting…" : "Export Month to Excel"}</Button>}
        </div>
        {!report.trips ? <p className="py-10 text-center text-slate-500">No deliveries recorded for this month and truck type.</p> : <>
          <p className="mb-3 text-sm text-slate-500">Select a {view === "locations" ? "destination" : "truck"} to see its trips and delivery dates.</p>
          <ReportTable headings={[view === "locations" ? "To Location" : "Truck", view === "locations" ? "Different trucks" : "Different To Locations", "Trips", "Tons"]}>
            {groups.map(group => <tr key={group.key} className={selected === group.key ? "bg-teal-50" : "even:bg-slate-50"}>
              <td><button type="button" className="min-h-10 text-left font-bold text-teal-800 underline underline-offset-4" onClick={() => setSelected(group.key)}>{group.name}</button></td>
              <td>{view === "locations" ? group.trucks : group.locations}</td><td>{group.trips}</td><td>{tons(group.tons)}</td>
            </tr>)}
            {!groups.length && <tr><td colSpan={4}>No named {view === "locations" ? "destinations" : "trucks"} in this month’s records.</td></tr>}
          </ReportTable>
        </>}
      </Panel>

      <p className="text-xs text-slate-500">Based on all recorded deliveries, including draft statements and historical trucks. Destination names are matched ignoring capitalization and extra spaces.</p>
    </>}
  </main>;
}
