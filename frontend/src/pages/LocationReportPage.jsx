import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityOverview } from "../components/ActivityOverview.jsx";
import { useApp } from "../AppContext.js";
import { Button } from "../components/ui.jsx";
import { formatDate, truckTypeLabel } from "../lib/format.js";
import { downloadFile } from "../lib/api.js";
import { locationReport } from "../../../backend/lib/location-report.js";
import CambodiaMap, { CITIES } from "../components/CambodiaMap.jsx";
import { getProvince, getProvinceId, getWarehouseProvinceId } from "../../../shared/provinces.js";

const tons = value => value.toLocaleString(undefined, { maximumFractionDigits: 5 });
const field = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pr-10 text-sm";
const monthName = month => new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
function ReportTable({ headings, children }) {
  return <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[600px] text-left text-sm">
    <thead className="bg-slate-900 text-white"><tr>{headings.map(h => <th key={h} scope="col" className="px-4 py-3">{h}</th>)}</tr></thead>
    <tbody className="divide-y divide-slate-100 [&_td]:px-4 [&_td]:py-3">{children}</tbody>
  </table></div>;
}
function Summary({ report, detail = false }) {
  const items = [...(detail ? [] : [["Locations", report.locations.length]]), ["Trucks", report.trucks.length], ["Trips", report.trips], ["Tons", tons(report.tons)]];
  return <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 ${detail ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>
    {items.map(([label, value]) => <div key={label} className="bg-white px-4 py-3"><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="mt-1 text-xl font-black tabular-nums text-slate-900">{value}</dd></div>)}
  </dl>;
}
function MonthDetails({ month, view, statementsById, initiallyOpen }) {
  const { viewStatement, setPage } = useApp();
  const breakdown = useMemo(() => locationReport(month.rows, month.key)[view === "locations" ? "trucks" : "locations"], [month, view]);
  return <details open={initiallyOpen || undefined} className="rounded-xl border border-slate-200 bg-white">
    <summary className="cursor-pointer rounded-xl px-4 py-4 text-sm focus-visible:outline-teal-700">
      <span className="font-bold">{monthName(month.key)}</span>
      <span className="ml-3 text-slate-500">{month.trucks} trucks · {month.trips} trips · {tons(month.tons)} tons</span>
    </summary>
    <div className="grid gap-3 border-t border-slate-100 p-4">
      <h3 className="text-sm font-bold">{view === "locations" ? "Trucks visiting this location" : "Locations visited"}</h3>
      <ReportTable headings={[view === "locations" ? "Truck" : "Location", "Trips", "Tons"]}>
        {breakdown.map(group => <tr key={group.key}><td>{group.name}</td><td>{group.trips}</td><td>{tons(group.tons)}</td></tr>)}
        {!breakdown.length && <tr><td colSpan={3}>No names recorded.</td></tr>}
      </ReportTable>
      <h3 className="mt-2 text-sm font-bold">Delivery records</h3>
      <ReportTable headings={["Date", "Statement", "Truck", "Location", "Invoice", "Tons"]}>
        {[...month.rows].sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate)).map((row, index) => {
          const statement = statementsById.get(row.statementId);
          return <tr key={row.id || index} className="even:bg-slate-50"><td>{formatDate(row.deliveryDate)}</td><td>{statement ? <><button type="button" className="min-h-10 rounded px-1 text-left font-bold text-teal-800 underline underline-offset-4 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-teal-700" onClick={() => { viewStatement(statement); setPage("data-entry"); }}>Statement {statement.statementNumber}</button><div className="text-xs text-slate-500">{statement.month} · {truckTypeLabel(statement.truckType || row.truckType)}</div></> : "Statement unavailable"}</td><td>{row.truckNo || "Not recorded"}</td><td>{row.toLocation || "Not recorded"}</td><td>{row.invoiceNo}</td><td>{tons(Number(row.qtyTon) || 0)}</td></tr>;
        })}
      </ReportTable>
    </div>
  </details>;
}

export function LocationReportPage({ selected, setSelected }) {
  const { data, reportMonth, setReportMonth, isAdmin, flash } = useApp();
  const [truckType, setTruckType] = useState("");
  const [view, setView] = useState("locations");
  const [locationPresentation, setLocationPresentation] = useState("map");
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [period, setPeriod] = useState("month");
  const [reportYear, setReportYear] = useState(reportMonth.slice(0, 4));
  const [chartYear, setChartYear] = useState(reportMonth.slice(0, 4));
  const [chartScope, setChartScope] = useState("all");
  const [exporting, setExporting] = useState(false);
  const detailHeading = useRef(null);
  const previousSelection = useRef(null);
  const listButtons = useRef(new Map());
  const listScroll = useRef(0);
  const month = period !== "month" ? "all" : reportMonth;
  const validMonth = month === "all" || /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  const report = useMemo(() => validMonth ? locationReport(data.deliveries, month, truckType, { search: locationSearch, year: period === "year" ? reportYear : "" }) : null, [data.deliveries, month, truckType, locationSearch, validMonth, period, reportYear]);
  const history = useMemo(() => locationReport(data.deliveries, "all", truckType, { search: locationSearch, ...(selected ? { [view === "locations" ? "location" : "truck"]: selected } : {}) }), [data.deliveries, truckType, locationSearch, selected, view]);
  const periodLabel = period === "year" ? reportYear : month === "all" ? "All months" : validMonth ? monthName(month) : "Choose a month";
  const groups = report?.[view] || [];
  const selectedProvinceInfo = getProvince(selectedProvince);
  const unassignedDeliveries = (report?.rows || []).filter(row => !getProvinceId(row));
  const deliveredProvinceIds = new Set((report?.rows || []).map(getProvinceId).filter(Boolean));
  const unassignedLocationGroups = groups.filter(group => group.rows.some(row => !getProvinceId(row)));
  const missingDestinationRows = (report?.rows || []).filter(row => !String(row.toLocation || "").trim());
  const missingDestinationGroup = missingDestinationRows.length ? {
    key: "unassigned-location-not-recorded",
    name: "Location not recorded",
    rows: missingDestinationRows,
    trips: missingDestinationRows.length,
    trucks: new Set(missingDestinationRows.map(row => String(row.truckNo || "").trim()).filter(Boolean)).size,
    tons: missingDestinationRows.reduce((sum, row) => sum + (Number(row.qtyTon) || 0), 0),
  } : null;
  const locationGroups = view === "locations" ? showUnassigned
    ? [...unassignedLocationGroups, ...(missingDestinationGroup ? [missingDestinationGroup] : [])]
    : groups.filter(group => {
    const provinceIds = new Set(group.rows.map(getProvinceId).filter(Boolean));
    return !selectedProvince || provinceIds.has(selectedProvince);
  }).concat(!selectedProvince && missingDestinationGroup ? [missingDestinationGroup] : []) : groups;
  const detail = groups.find(group => group.key === selected) || (selected === missingDestinationGroup?.key ? missingDestinationGroup : null);
  const chartRows = chartScope === "report" ? (selected ? detail?.rows || [] : report?.rows || []) : history.rows;
  const overview = <ActivityOverview rows={chartRows} year={chartYear} setYear={setChartYear} scope={chartScope} setScope={setChartScope} reportPeriod={period} reportMonth={reportMonth} reportYear={reportYear} hideShare={Boolean(selected && view === "locations")} onPeriod={(mode, key) => { if (mode === "month") { setReportMonth(key); setPeriod("month"); } else { setReportYear(key); setPeriod("year"); } }} />;
  const detailReport = useMemo(() => detail ? locationReport(detail.rows, month) : null, [detail, month]);
  const routeDelivery = view === "locations" ? detail?.rows?.[0] : null;
  const routeFromProvince = getProvince(routeDelivery?.fromProvinceId)?.id || getWarehouseProvinceId(routeDelivery?.fromLocation);
  const routeToProvince = getProvinceId(routeDelivery);
  const statementsById = useMemo(() => new Map((data.statements || []).map(s => [s.id, s])), [data.statements]);
  useLayoutEffect(() => {
    if (selected) {
      window.scrollTo({ top: 0, behavior: "instant" });
      detailHeading.current?.focus({ preventScroll: true });
    } else if (previousSelection.current) {
      listButtons.current.get(previousSelection.current)?.focus({ preventScroll: true });
      window.scrollTo({ top: listScroll.current, behavior: "instant" });
    }
    previousSelection.current = selected;
  }, [selected]);
  async function exportExcel() {
    const query = new URLSearchParams({ month, truckType, search: locationSearch });
    if (period === "year") query.set("year", reportYear);
    if (selected) query.set(view === "locations" ? "location" : "truck", selected);
    setExporting(true);
    try { await downloadFile(`/api/export/locations?${query}`); }
    catch (error) { flash(error.message, "error"); }
    finally { setExporting(false); }
  }
  const exportButton = isAdmin && <Button type="button" variant="secondary" disabled={exporting || !report?.trips} onClick={exportExcel}>{exporting ? "Exporting…" : "Export Excel"}</Button>;
  const periodControls = <>
    <label className="grid gap-1 text-xs font-bold text-slate-600">Period<select className={field} value={period} onChange={event => setPeriod(event.target.value)}><option value="month">Specific month</option><option value="all">All months</option><option value="year">Specific year</option></select></label>
    {period === "year" && <label className="grid gap-1 text-xs font-bold text-slate-600">Year<select className={field} value={reportYear} onChange={event => setReportYear(event.target.value)}>{[...new Set([reportYear, ...data.deliveries.map(row => String(row.deliveryDate || "").slice(0, 4)).filter(y => /^\d{4}$/.test(y))])].sort().reverse().map(y => <option key={y}>{y}</option>)}</select></label>}
    {period === "month" && <label className="grid gap-1 text-xs font-bold text-slate-600">Month<input className={field} type="month" value={reportMonth} onChange={event => setReportMonth(event.target.value)} /></label>}
    <label className="grid gap-1 text-xs font-bold text-slate-600">Truck type<select className={field} value={truckType} onChange={event => setTruckType(event.target.value)}><option value="">All trucks</option><option value="With Crane">Crane</option><option value="Without Crane">No Crane</option></select></label>
  </>;
  return <main className="app-content mx-auto grid max-w-[1500px] gap-4 p-4 pb-24 lg:pb-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>{selected && <Button type="button" variant="secondary" className="mb-3" onClick={() => setSelected(null)}>← Back to {view}</Button>}
        <h1 ref={detailHeading} tabIndex={-1} className="text-2xl font-black tracking-tight outline-none">{selected ? detail?.name || selected : "Location Report"}</h1>
        {selected && <p className="mt-1 text-sm text-slate-500">{periodLabel} · {truckType ? truckTypeLabel(truckType) : "All trucks"}</p>}
      </div>
      {selected && exportButton}
    </header>
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3">
      {!selected && <label className="grid min-w-48 flex-1 gap-1 text-xs font-bold text-slate-600">Location<input type="search" className={field} placeholder="Search location…" value={locationSearch} onChange={event => setLocationSearch(event.target.value)} /></label>}
      {periodControls}
      {!selected && locationSearch && <Button type="button" variant="quiet" onClick={() => setLocationSearch("")}>Clear search</Button>}
    </div>
    {overview}
    {!report ? <p className="py-8 text-center text-slate-500">Choose a valid month to see deliveries.</p> : selected ? detailReport ? <>
      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(250px,420px)_1fr] sm:items-center">
        <CambodiaMap color="#0f766e" from={routeFromProvince || undefined} to={routeToProvince || undefined} />
        {routeFromProvince && routeToProvince ? <p className="text-sm text-slate-600">Animated route for a delivery to <strong>{getProvince(routeToProvince)?.name}</strong>.</p> : <p className="text-sm text-slate-600">Route animation needs a known pickup and destination province. Delivery records remain unchanged.</p>}
      </section>
      <Summary report={detailReport} detail={view === "locations"} />
      <div className="flex items-center justify-between"><h2 className="font-bold">Monthly activity</h2><span className="text-sm text-slate-500">{detailReport.months.length} {detailReport.months.length === 1 ? "month" : "months"} · Expand for details</span></div>
      {detailReport.months.map(item => <MonthDetails key={`${selected}-${item.key}`} month={item} view={view} statementsById={statementsById} initiallyOpen={period === "month"} />)}
    </> : <p className="py-8 text-center text-slate-500">No deliveries for this {view === "locations" ? "location" : "truck"} with these filters. Try All months or another truck type.</p> : <>
      <Summary report={report} />
      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1" role="group" aria-label="Report view">
            {[["locations", "By Location"], ["trucks", "By Truck"]].map(([value, label]) => <button key={value} type="button" aria-pressed={view === value} onClick={() => setView(value)} className={`min-h-10 rounded-md px-3 py-2 text-sm font-bold ${view === value ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-white"}`}>{label}</button>)}
          </div>
          {exportButton}
        </div>
        <p role="status" className="text-sm text-slate-500">{view === "locations" ? locationGroups.length : groups.length} {view} · {periodLabel}{locationSearch.trim() ? ` · Location matching “${locationSearch.trim()}”` : ""}</p>
        {view === "locations" && <div className="flex items-center justify-end gap-1 rounded-lg bg-slate-100 p-1 sm:ml-auto sm:w-fit" role="group" aria-label="Location display">
          {[['map','Map'],['table','Table']].map(([value,label]) => <button key={value} type="button" aria-pressed={locationPresentation === value} onClick={() => setLocationPresentation(value)} className={`min-h-9 rounded-md px-3 py-1.5 text-sm font-bold ${locationPresentation === value ? "bg-white text-teal-800 shadow-sm" : "text-slate-600 hover:bg-white/70"}`}>{label}</button>)}
        </div>}
        {view === "locations" && locationPresentation === "map" && <section className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Delivery locations by province">
          <div className="border-b border-slate-100 px-4 py-3"><h2 className="font-bold text-slate-900">Cambodia delivery map</h2></div>
          <div className="grid items-start lg:grid-cols-[minmax(400px,560px)_minmax(0,1fr)]">
            <div className="flex justify-center border-b border-slate-100 p-3 lg:border-b-0 lg:border-r"><CambodiaMap cities={CITIES} deliveredIds={deliveredProvinceIds} color="#0f766e" selected={selectedProvince || undefined} onSelect={city => { setSelectedProvince(current => current === city.id ? null : city.id); setShowUnassigned(false); }} /></div>
            <aside className="min-w-0" aria-label="Delivered locations list">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3"><div><h3 className="font-bold text-slate-900">Locations delivered</h3><p className="text-xs text-slate-500">{locationGroups.length} locations in this report</p></div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" aria-pressed={showUnassigned} onClick={() => { setShowUnassigned(current => !current); setSelectedProvince(null); }} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${showUnassigned ? "border-amber-300 bg-amber-100 text-amber-900" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>Unmapped · {unassignedDeliveries.length} deliveries</button>
                  {showUnassigned && <button type="button" onClick={() => setShowUnassigned(false)} className="text-xs font-bold text-teal-800 underline">Show all locations</button>}
                </div>
                {selectedProvinceInfo && <button type="button" onClick={() => { setSelectedProvince(null); setShowUnassigned(false); }} className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-left text-xs font-bold text-teal-900 hover:bg-teal-100">Clear filter · {selectedProvinceInfo.name} · {selectedProvinceInfo.km}</button>}
              </div>
              <div className="max-h-[min(65vh,680px)] divide-y divide-slate-100 overflow-y-auto">
                {locationGroups.map(group => <button key={group.key} ref={node => { if (node) listButtons.current.set(group.key, node); else listButtons.current.delete(group.key); }} type="button" onClick={() => { listScroll.current = window.scrollY; setSelected(group.key); }} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-teal-700">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-teal-700 ring-4 ring-teal-100" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-teal-900 underline underline-offset-2">{group.name}</span><span className="mt-0.5 block text-xs text-slate-500">{group.trips} trips · {group.trucks} trucks</span></span>
                  <span className="text-xs font-bold tabular-nums text-slate-600">{tons(group.tons)} t</span>
                </button>)}
                {!locationGroups.length && <p className="px-4 py-8 text-center text-sm text-slate-500">No delivered locations match this province filter.</p>}
              </div>
            </aside>
          </div>
        </section>}
        {(view !== "locations" || locationPresentation === "table") && <ReportTable headings={[view === "locations" ? "Location" : "Truck", view === "locations" ? "Trucks" : "Locations", "Trips", "Tons"]}>
          {(view === "locations" ? locationGroups : groups).map(group => <tr key={group.key} className="even:bg-slate-50"><td><button ref={node => { if (node) listButtons.current.set(group.key, node); else listButtons.current.delete(group.key); }} type="button" className="min-h-10 text-left font-bold text-teal-800 underline underline-offset-4" onClick={() => { listScroll.current = window.scrollY; setSelected(group.key); }}>{group.name}</button></td><td>{view === "locations" ? group.trucks : group.locations}</td><td>{group.trips}</td><td>{tons(group.tons)}</td></tr>)}
          {!(view === "locations" ? locationGroups : groups).length && <tr><td colSpan={4} className="text-center text-slate-500">No {view} match these filters. Try another name, All months, or a different truck type.</td></tr>}
        </ReportTable>}
      </section>
      {(report.missingLocations > 0 || report.missingTrucks > 0) && <p className="text-sm text-amber-800">{report.missingLocations} trips have no location; {report.missingTrucks} have no truck number. Trips and tons include these records; distinct counts exclude missing names.</p>}
    </>}
    <p className="text-xs text-slate-500">Includes draft statements and historical trucks. Each delivery is one trip; unique trucks are counted once across the selected period.</p>
  </main>;
}
