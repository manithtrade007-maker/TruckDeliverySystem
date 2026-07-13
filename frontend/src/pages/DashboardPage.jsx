import { useApp } from "../AppContext.js";
import { Button, Input, Select, Field, Panel, KpiCard, MetricCard, PageHead } from "../components/ui.jsx";
import { localDate, today, currentMonth, money, roundMoney, unitMoney, parseMoney, locationMatchKey, locationBaseKey, priceEffectiveDate, routeKey, CRANE_LOCATION_ORDER, NO_CRANE_LOCATION_ORDER, makeLocationSort, craneLocationSort, noCraneLocationSort, deliverySort, truckTypeLabel, formatDate, formatDateTime, monthName, groupPriceHistory } from "../lib/format.js";
import { getToken, getRole, setToken, setRole, api, downloadFile } from "../lib/api.js";

export function DashboardPage() {
  const { activeTruckCount, activityPage, availableYears, dashOutstanding, data, flash, isAdmin, monthlyTotals, page, reportMonth, reportYear, setActivityPage, setPage, setReportMonth, setReportTruckNo, setReportYear, statementCounts, statementSummaries, telegramConfigured, truckPerformance, yearSummary } = useApp();
  return (
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
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Report Month">
                <Input type="month" value={reportMonth} onChange={(event) => { setReportMonth(event.target.value); setReportTruckNo(""); }} />
              </Field>
              {isAdmin && (
                <div className="flex gap-2 mb-0.5">
                  <button type="button"
                    onClick={() => downloadFile(`/api/export/monthly-bundle?month=${encodeURIComponent(reportMonth)}`).catch((err) => flash(err.message, "error"))}
                    className="flex items-center gap-2 rounded-xl border border-teal-300 bg-teal-600 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-teal-700 transition">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Monthly Bundle
                  </button>
                  {telegramConfigured && (
                    <button type="button"
                      onClick={() => api(`/api/export/monthly-bundle-telegram?month=${encodeURIComponent(reportMonth)}`, { method: "POST" }).then(() => flash("Monthly bundle sent to Telegram.")).catch((err) => flash(err.message, "error"))}
                      className="flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-500 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-sky-600 transition">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>
                      Send to Telegram
                    </button>
                  )}
                </div>
              )}
            </div>
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

          {/* Business snapshot — revenue split donut */}
          {(() => {
            const total = statementCounts.totalAmount;
            const cranePct = total > 0 ? (statementCounts.craneAmount / total) * 100 : 0;
            const noCranePct = total > 0 ? (statementCounts.noCraneAmount / total) * 100 : 0;
            const legend = [
              { label: "Crane", amount: statementCounts.craneAmount, count: statementCounts.withCrane, pct: cranePct, dot: "bg-teal-500", pctText: "text-teal-700" },
              { label: "No Crane", amount: statementCounts.noCraneAmount, count: statementCounts.withoutCrane, pct: noCranePct, dot: "bg-sky-500", pctText: "text-sky-700" },
            ];
            return (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Revenue Split · This Month</div>
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
                  <div className="relative h-40 w-40 shrink-0">
                    <svg viewBox="0 0 36 36" className="h-40 w-40 -rotate-90">
                      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="3.6" />
                      {total > 0 && (
                        <>
                          <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#14b8a6" strokeWidth="3.6" strokeDasharray={`${cranePct} ${100 - cranePct}`} />
                          <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#0ea5e9" strokeWidth="3.6" strokeDasharray={`${noCranePct} ${100 - noCranePct}`} strokeDashoffset={`${-cranePct}`} />
                        </>
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total</div>
                      <div className="text-lg font-black tabular-nums text-slate-900">${money(total)}</div>
                      <div className="text-[10px] font-bold text-slate-400">{statementCounts.total} stmt{statementCounts.total !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  <div className="grid w-full gap-3">
                    {legend.map((r) => (
                      <div key={r.label} className="flex items-center gap-3">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.dot}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-black text-slate-800">{r.label}</span>
                            <span className="text-sm font-black tabular-nums text-slate-900">${money(r.amount)}</span>
                          </div>
                          <div className="flex items-baseline justify-between gap-2 text-[11px] font-bold text-slate-400">
                            <span>{r.count} statement{r.count !== 1 ? "s" : ""}</span>
                            <span className={`tabular-nums ${r.pctText}`}>{total > 0 ? r.pct.toFixed(0) : 0}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Statement earnings list */}
          {statementSummaries.length > 0 && (
            <div>
              <div className="mb-3">
                <h3 className="text-lg font-black tracking-tight">Statement Earnings</h3>
                <p className="text-xs font-bold text-slate-500">{new Date(reportMonth + "-01").toLocaleString("default", { month: "long", year: "numeric" })} — per statement breakdown</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {statementSummaries.map((s) => {
                  const isCrane = s.truckType === "With Crane";
                  const profit = s.companyRevenue - s.driverPayment;
                  return (
                    <div key={s.statementNumber} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <div className={`px-4 py-2 flex items-center gap-2 ${isCrane ? "bg-teal-700" : "bg-sky-700"}`}>
                        <span className="font-black text-white text-sm">Statement {s.statementNumber}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isCrane ? "bg-teal-500/40 text-white" : "bg-sky-500/40 text-white"}`}>{isCrane ? "CRANE" : "NO CRANE"}</span>
                        <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-black ${s.status === "Finished" ? "bg-emerald-500/30 text-emerald-100" : "bg-amber-500/30 text-amber-100"}`}>{s.status}</span>
                      </div>
                      <div className="px-4 py-3 grid grid-cols-3 gap-2">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Revenue</div>
                          <div className="text-sm font-black text-teal-700">${money(s.companyRevenue)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Driver Pay</div>
                          <div className="text-sm font-black text-amber-600">${money(s.driverPayment)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Profit</div>
                          <div className={`text-sm font-black ${profit >= 0 ? "text-blue-600" : "text-red-600"}`}>${money(profit)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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

          {/* Year Summary */}
          <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-black tracking-tight">Year Summary</h3>
                <p className="text-xs font-bold text-slate-500">Net profit (revenue minus driver pay) — full year view</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Year</span>
                <select value={reportYear} onChange={(e) => setReportYear(Number(e.target.value))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none">
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 mb-4">
              <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4">
                <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-teal-600">
                  <span aria-hidden>💰</span> Total Net Profit {reportYear}
                </div>
                <div className="text-3xl font-black tabular-nums text-teal-900">${money(yearSummary.totalNet)}</div>
                <div className="text-xs font-medium text-slate-500 mt-1">Revenue ${money(yearSummary.totalRevenue)} · Driver ${money(yearSummary.totalDriverCost)}</div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  <span aria-hidden>🏆</span> Best Month
                </div>
                {yearSummary.bestMonth ? (
                  <>
                    <div className="text-3xl font-black text-slate-800">{yearSummary.bestMonth.label} <span className="text-lg font-bold text-slate-400">{reportYear}</span></div>
                    <div className="text-xs font-medium text-slate-500 mt-1">Net <span className="font-bold text-teal-700 tabular-nums">${money(yearSummary.bestMonth.net)}</span></div>
                  </>
                ) : <div className="text-sm font-semibold text-slate-400 mt-1">No data</div>}
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  <span aria-hidden>🚚</span> Best Truck
                </div>
                {yearSummary.trucks[0] ? (
                  <>
                    <div className="text-3xl font-black text-slate-800">{yearSummary.trucks[0].truckNo}</div>
                    <div className="text-xs font-medium text-slate-500 mt-1">Net <span className="font-bold text-teal-700 tabular-nums">${money(yearSummary.trucks[0].net)}</span> · {yearSummary.trucks[0].trips} trips</div>
                  </>
                ) : <div className="text-sm font-semibold text-slate-400 mt-1">No data</div>}
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Monthly Breakdown — net profit bars */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-2.5">
                  <span className="text-sm font-black">Monthly Breakdown</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net profit</span>
                </div>
                {yearSummary.activeMonths.length === 0 ? (
                  <div className="p-8 text-center text-sm font-semibold text-slate-400">No delivery data for {reportYear}</div>
                ) : (
                  <div className="p-4 space-y-2">
                    {yearSummary.activeMonths.map((m) => {
                      const isBest = yearSummary.bestMonth?.month === m.month;
                      const positive = m.net >= 0;
                      const pct = yearSummary.maxMonthAbs > 0 ? Math.max((Math.abs(m.net) / yearSummary.maxMonthAbs) * 100, 2) : 0;
                      return (
                        <div key={m.month} title={`Revenue $${money(m.revenue)} · Driver $${money(m.driverCost)}`} className="flex items-center gap-3">
                          <div className="w-9 shrink-0 text-xs font-bold text-slate-500">{m.label}</div>
                          <div className="relative h-6 flex-1 rounded-lg bg-slate-100">
                            <div className={`h-full rounded-lg ${positive ? (isBest ? "bg-teal-500" : "bg-teal-400") : "bg-red-400"}`} style={{ width: `${pct}%` }} />
                          </div>
                          <div className={`flex w-24 shrink-0 items-center justify-end gap-1 text-right text-xs font-black tabular-nums ${positive ? "text-teal-700" : "text-red-600"}`}>
                            {isBest && <span className="text-amber-500" aria-label="best month">★</span>}
                            ${money(m.net)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-sm">
                  <span className="font-black text-slate-700">Total {reportYear}</span>
                  <div className="flex items-center gap-3">
                    <span className="hidden text-[11px] font-medium text-slate-400 sm:inline">Rev ${money(yearSummary.totalRevenue)} · Drv ${money(yearSummary.totalDriverCost)}</span>
                    <span className="font-black tabular-nums text-teal-700">${money(yearSummary.totalNet)}</span>
                  </div>
                </div>
              </div>
              {/* Top Trucks — net profit bars */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-2.5">
                  <span className="text-sm font-black">Top Trucks by Net Profit</span>
                  {yearSummary.trucks.length > 0 && <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{yearSummary.trucks.length} trucks</span>}
                </div>
                {yearSummary.trucks.length === 0 ? (
                  <div className="p-8 text-center text-sm font-semibold text-slate-400">No data for {reportYear}</div>
                ) : (
                  <div className="p-4 space-y-2">
                    {yearSummary.trucks.map((truck, i) => {
                      const positive = truck.net >= 0;
                      const pct = yearSummary.maxTruckAbs > 0 ? Math.max((Math.abs(truck.net) / yearSummary.maxTruckAbs) * 100, 2) : 0;
                      const medal = ["🥇", "🥈", "🥉"][i];
                      return (
                        <div key={truck.truckNo} title={`Revenue $${money(truck.revenue)} · Driver $${money(truck.driverCost)}`} className="flex items-center gap-3">
                          <div className="w-6 shrink-0 text-center text-base leading-none">
                            {medal || <span className="text-xs font-black text-slate-300">{i + 1}</span>}
                          </div>
                          <div className="w-24 shrink-0 min-w-0">
                            <div className="truncate text-sm font-black text-slate-800">{truck.truckNo}</div>
                            <div className="text-[10px] font-medium text-slate-400">{truckTypeLabel(truck.truckType)} · {truck.trips} trips</div>
                          </div>
                          <div className="relative h-6 flex-1 rounded-lg bg-slate-100">
                            <div className={`h-full rounded-lg ${positive ? (i === 0 ? "bg-teal-500" : "bg-teal-400") : "bg-red-400"}`} style={{ width: `${pct}%` }} />
                          </div>
                          <div className={`w-20 shrink-0 text-right text-xs font-black tabular-nums ${positive ? "text-teal-700" : "text-red-600"}`}>${money(truck.net)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity timeline */}
          <Panel>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black tracking-tight">Recent Activity</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{(data.activity || []).length} events</span>
            </div>
            {(() => {
              const PER_PAGE = 5;
              const allActivity = data.activity || [];
              if (allActivity.length === 0) {
                return <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-400">No activity recorded yet.</div>;
              }
              const totalPages = Math.ceil(allActivity.length / PER_PAGE);
              const page = Math.min(activityPage, totalPages - 1);
              const start = page * PER_PAGE;
              const items = allActivity.slice(start, start + PER_PAGE);
              return (
                <>
                  <div className="relative pl-6">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-100" />
                    <div className="grid gap-3.5">
                      {items.map((item) => {
                        const msg = item.message || "";
                        const isPrice = msg.toLowerCase().includes("price");
                        const isTruck = msg.toLowerCase().includes("truck");
                        const isBackup = msg.toLowerCase().includes("backup");
                        const dotColor = isPrice ? "bg-amber-400" : isTruck ? "bg-sky-400" : isBackup ? "bg-purple-400" : "bg-teal-400";
                        return (
                          <div key={item.id} className="relative">
                            <span className={`absolute -left-[18px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white ${dotColor}`} />
                            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                              <div className="text-sm font-semibold text-slate-800">{item.message}</div>
                              <div className="shrink-0 text-[11px] font-medium text-slate-400 tabular-nums">{formatDateTime(item.createdAt)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <button type="button" disabled={page === 0} onClick={() => setActivityPage(page - 1)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-teal-600 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600">
                      ← Recent
                    </button>
                    <span className="text-[11px] font-medium text-slate-400 tabular-nums">{start + 1}–{start + items.length} of {allActivity.length}</span>
                    <button type="button" disabled={page >= totalPages - 1} onClick={() => setActivityPage(page + 1)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-teal-600 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600">
                      Previous →
                    </button>
                  </div>
                </>
              );
            })()}
          </Panel>
        </main>
  );
}
