import { useState } from "react";
import { useApp } from "../AppContext.js";
import { Button, Input, Select, Field, Panel, KpiCard, MetricCard, MonthPicker, PageHead } from "../components/ui.jsx";
import { localDate, today, currentMonth, money, roundMoney, unitMoney, parseMoney, locationMatchKey, locationBaseKey, priceEffectiveDate, routeKey, CRANE_LOCATION_ORDER, NO_CRANE_LOCATION_ORDER, makeLocationSort, craneLocationSort, noCraneLocationSort, deliverySort, truckTypeLabel, formatDate, formatDateTime, monthName, groupPriceHistory } from "../lib/format.js";
import { getToken, getRole, setToken, setRole, api, downloadFile } from "../lib/api.js";

export function PricesPage() {
  const { diagnoseEmptyPrices, flash, locations, priceCompareDate, priceCompareDates, priceCompareProvince, priceCompareProvinces, priceCompareRows, pricePeriods, pricePeriodsMonth, setPage, setPriceCompareDate, setPriceCompareProvince, setPricePeriodsMonth } = useApp();
  const [provinceSearch, setProvinceSearch] = useState("");
  const visibleProvinces = priceCompareProvinces.filter((province) => province.toLowerCase().includes(provinceSearch.trim().toLowerCase()));
  const periodDeliveryCount = pricePeriods.reduce((sum, period) => sum + period.deliveryCount, 0);
  return (
        <main className="app-content mx-auto grid max-w-[1500px] gap-4 p-4 pb-20 lg:pb-4">
          <PageHead title="Price Comparison" meta="Compare company price vs driver price side by side for all locations." />

          <Panel>
            <div className="mb-4 flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-bold">Price Comparison</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Active prices as of <span className="text-slate-700">{formatDate(priceCompareDate)}</span>. Red margin = driver cost exceeds company income.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2 text-sm font-black">
                  <span className="rounded-full bg-teal-50 px-3 py-1.5 text-teal-800">Crane {priceCompareRows.filter((r) => r.crane).length}</span>
                  <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sky-800">No Crane {priceCompareRows.filter((r) => r.noCrane).length}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">Total {priceCompareRows.length}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={diagnoseEmptyPrices}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-amber-800 hover:bg-amber-100 transition">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Check Coverage
                </button>
                <button type="button"
                  onClick={() => downloadFile(`/api/export/price-comparison?date=${encodeURIComponent(priceCompareDate)}`).catch((err) => flash(err.message, "error"))}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-800 hover:bg-emerald-100 transition">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
                  Excel
                </button>
                <button type="button"
                  onClick={() => downloadFile(`/api/export/price-comparison?date=${encodeURIComponent(priceCompareDate)}&format=pdf`).catch((err) => flash(err.message, "error"))}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1 text-rose-800 hover:bg-rose-100 transition">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
                  PDF
                </button>
                </div>
              </div>
            </div>

            <div className="mb-4 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Price list as of</p>
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
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-bold text-slate-500">Search province
                  <Input type="search" value={provinceSearch} onChange={(event) => setProvinceSearch(event.target.value)} placeholder="Type a province name…" />
                </label>
                <label className="grid gap-1 text-xs font-bold text-slate-500">Province
                  <Select value={priceCompareProvince} onChange={(event) => { setPriceCompareProvince(event.target.value); setProvinceSearch(""); }}>
                    <option value="">All provinces ({priceCompareRows.length})</option>
                    {visibleProvinces.map((province) => <option key={province} value={province}>{province} ({priceCompareRows.filter((row) => row.canonicalName.endsWith(`(${province})`)).length})</option>)}
                  </Select>
                </label>
                {provinceSearch && visibleProvinces.length === 0 && <p className="text-xs text-slate-500 sm:col-span-2">No provinces match “{provinceSearch}”.</p>}
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

          <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4 focus-visible:outline-2 focus-visible:outline-teal-700">
              <span><span className="block font-black text-slate-900">Price history used by deliveries</span><span className="mt-1 block text-sm text-slate-500">{pricePeriods.length} price periods · {periodDeliveryCount} deliveries · {monthName(pricePeriodsMonth)}</span></span>
              <span className="text-sm font-bold text-teal-800">Open history</span>
            </summary>
            <div className="grid gap-3 border-t border-slate-100 p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <p className="max-w-2xl text-sm text-slate-500">See which effective price periods were applied to deliveries, then expand a period to open its statements.</p>
                <MonthPicker label="Delivery month" value={pricePeriodsMonth} onChange={(event) => setPricePeriodsMonth(event.target.value)} />
              </div>
              {!pricePeriods.length ? <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">No deliveries found for this month.</p> : <div className="grid gap-2">
                {pricePeriods.map((period, index) => <details key={period.effectiveDate} className="rounded-xl border border-slate-200 bg-slate-50">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 focus-visible:outline-2 focus-visible:outline-teal-700">
                    {period.effectiveDate === "unknown" ? <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800">No price found</span> : <><span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-800">Period {index + 1}</span><span className="text-sm font-bold text-slate-800">{formatDate(period.rangeStart)} <span className="mx-1 text-slate-400">→</span> {formatDate(period.rangeEnd)}</span></>}
                    <span className="text-xs font-semibold text-slate-500">{period.deliveryCount} deliveries</span><span className="ml-auto text-xs font-bold text-teal-800">{period.statements.length} statements</span>
                  </summary>
                  <div className="flex flex-wrap gap-2 border-t border-slate-200 p-3">
                    {period.statements.map((statement) => <button key={statement.id} type="button" onClick={() => setPage("reports")} className="rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50">Statement {statement.statementNumber || statement.id.slice(0, 8)}</button>)}
                    {!period.statements.length && <span className="text-sm text-slate-500">No statements are linked to this period.</span>}
                  </div>
                </details>)}
              </div>}
            </div>
          </details>
        </main>
  );
}
