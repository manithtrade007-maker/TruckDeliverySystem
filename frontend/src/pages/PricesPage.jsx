import { useApp } from "../AppContext.js";
import { Button, Input, Select, Field, Panel, KpiCard, MetricCard, PageHead } from "../components/ui.jsx";
import { localDate, today, currentMonth, money, roundMoney, unitMoney, parseMoney, locationMatchKey, locationBaseKey, priceEffectiveDate, routeKey, CRANE_LOCATION_ORDER, NO_CRANE_LOCATION_ORDER, makeLocationSort, craneLocationSort, noCraneLocationSort, deliverySort, truckTypeLabel, formatDate, formatDateTime, monthName, groupPriceHistory } from "../lib/format.js";
import { getToken, getRole, setToken, setRole, api, downloadFile } from "../lib/api.js";

export function PricesPage() {
  const { diagnoseEmptyPrices, flash, locations, priceCompareDate, priceCompareDates, priceCompareProvince, priceCompareProvinces, priceCompareRows, pricePeriods, pricePeriodsMonth, setPage, setPriceCompareDate, setPriceCompareProvince, setPricePeriodsMonth } = useApp();
  return (
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
  );
}
