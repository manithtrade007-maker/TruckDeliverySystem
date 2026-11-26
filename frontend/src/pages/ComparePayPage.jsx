import { Fragment, useState } from "react";
import { useApp } from "../AppContext.js";
import { PageHead, MonthPicker, Panel } from "../components/ui.jsx";
import { money, roundMoney, monthName, truckTypeLabel, currentMonth } from "../lib/format.js";

export function ComparePayPage() {
  const { reconMonth, setReconMonth, reconEdits, setReconEdits, reconciliation, earningsHistory, saveReported } = useApp();
  const [rowFilter, setRowFilter] = useState("all");
  const thisMonth = currentMonth();
  const thisMonthHistory = earningsHistory.find((month) => month.month === thisMonth);
  const bestMonth = earningsHistory.reduce((best, month) => !best || month.net > best.net ? month : best, null);
  const overall = earningsHistory.reduce((summary, month) => ({ kept: summary.kept + month.kept, overpaid: summary.overpaid + month.overpaid, net: summary.net + month.net }), { kept: 0, overpaid: 0, net: 0 });
  const chartMonths = [...earningsHistory].sort((a, b) => a.month.localeCompare(b.month));
  const maxChartValue = Math.max(1, ...chartMonths.map((month) => Math.abs(month.net)));
  return (
        <main className="app-content mx-auto grid max-w-[1500px] gap-4 p-4 pb-20 lg:pb-4">
          <PageHead
            title="Compare Pay"
            meta="Enter each driver's reported total and review any differences."
            action={(
              <MonthPicker label="Compare Month" value={reconMonth} onChange={(event) => setReconMonth(event.target.value)} />
            )}
          />
          <section aria-label="Earnings highlights" className="grid gap-3 md:grid-cols-3">
            <article className="relative overflow-hidden rounded-2xl border border-teal-200 bg-white p-5 shadow-sm">
              <div className="absolute inset-x-0 top-0 h-1 bg-teal-600" />
              <div className="text-xs font-black uppercase tracking-wider text-teal-800">Overall summary</div>
              <div className="mt-3 text-3xl font-black tabular-nums tracking-tight text-slate-950">$ {money(roundMoney(overall.net))}</div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Net earned across {earningsHistory.length} recorded months</div>
              <div className="mt-4 flex gap-4 border-t border-slate-100 pt-3 text-xs"><span className="text-slate-500">Kept <strong className="text-teal-800">$ {money(roundMoney(overall.kept))}</strong></span><span className="text-slate-500">Overpaid <strong className="text-amber-700">$ {money(roundMoney(overall.overpaid))}</strong></span></div>
            </article>
            <article className="relative overflow-hidden rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
              <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
              <div className="text-xs font-black uppercase tracking-wider text-amber-800">Most profitable month</div>
              {bestMonth ? <><div className="mt-3 text-xl font-black text-slate-950">{monthName(bestMonth.month)}</div><div className="mt-1 text-3xl font-black tabular-nums tracking-tight text-teal-800">$ {money(bestMonth.net)}</div><div className="mt-1 text-sm font-semibold text-slate-500">Net · {bestMonth.checked} driver entries checked</div></> : <div className="mt-4 text-sm font-semibold text-slate-400">No earnings history yet</div>}
            </article>
            <article className="relative overflow-hidden rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
              <div className="absolute inset-x-0 top-0 h-1 bg-sky-500" />
              <div className="text-xs font-black uppercase tracking-wider text-sky-800">This month · {monthName(thisMonth)}</div>
              {thisMonthHistory ? <><div className={`mt-3 text-3xl font-black tabular-nums tracking-tight ${thisMonthHistory.net >= 0 ? "text-teal-800" : "text-red-700"}`}>{thisMonthHistory.net < 0 ? "− " : ""}$ {money(Math.abs(thisMonthHistory.net))}</div><div className="mt-1 text-sm font-semibold text-slate-500">Net earned so far</div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${thisMonthHistory.checked ? Math.min(100, thisMonthHistory.checked / Math.max(thisMonthHistory.checked, thisMonthHistory.mismatches) * 100) : 0}%` }} /></div><div className="mt-1 text-xs font-semibold text-slate-500">{thisMonthHistory.checked} driver entries recorded · {thisMonthHistory.mismatches} with differences</div></> : <><div className="mt-3 text-3xl font-black text-slate-300">—</div><div className="mt-1 text-sm font-semibold text-slate-500">No driver totals recorded yet</div></>}
            </article>
          </section>
          {chartMonths.length > 0 && <Panel className="!p-5 sm:!p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-2"><div><div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Earnings trend</div><h3 className="mt-1 text-lg font-black">Monthly net earnings</h3></div><div className="text-xs font-semibold text-slate-500">Positive and negative months</div></div>
            <div className="flex h-44 items-end justify-start gap-3 overflow-x-auto border-b border-slate-200 pb-2 sm:gap-4" role="img" aria-label="Bar chart showing monthly net earnings">
              {chartMonths.map((month) => <div key={month.month} className="group flex h-full w-20 shrink-0 flex-col items-center justify-end gap-2 sm:w-24" title={`${monthName(month.month)}: ${month.net < 0 ? "-" : ""}$${money(Math.abs(month.net))}`}>
                <span className="whitespace-nowrap text-[10px] font-bold tabular-nums text-slate-500">${money(Math.abs(month.net))}</span>
                <div className="flex h-28 w-full items-end justify-center"><div className={`min-h-1 w-5/6 max-w-12 rounded-t-md transition-opacity group-hover:opacity-80 ${month.net >= 0 ? "bg-teal-500" : "bg-rose-500"}`} style={{ height: `${Math.max(4, Math.abs(month.net) / maxChartValue * 100)}%` }} /></div>
                <span className="whitespace-nowrap text-[10px] font-bold text-slate-500">{new Date(Number(month.month.slice(0, 4)), Number(month.month.slice(5, 7)) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}</span>
              </div>)}
            </div>
            <div className="mt-3 flex gap-4 text-[11px] font-bold text-slate-500"><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-teal-500"/>Positive net</span><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-rose-500"/>Negative net</span></div>
          </Panel>}
          <Panel>
            {(() => {
              const TOL = 0.01;
              const rows = reconciliation;
              if (rows.length === 0) {
                return <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-400">No deliveries for this month.</div>;
              }
              const computed = rows.map((r) => {
                const raw = reconEdits[r.truckNo];
                const hasEntry = raw !== undefined && raw !== "" && raw != null;
                const driver = hasEntry ? Number(raw) || 0 : null;
                const diff = driver == null ? null : roundMoney(r.systemAmount - driver);
                return { ...r, raw: raw ?? "", driver, diff };
              });
              const totalSystem = roundMoney(computed.reduce((s, r) => s + r.systemAmount, 0));
              const totalDriver = roundMoney(computed.reduce((s, r) => s + (r.driver ?? 0), 0));
              const totalDiff = roundMoney(computed.reduce((s, r) => s + (r.diff ?? 0), 0));
              const checkedCount = computed.filter((r) => r.diff != null).length;
              const mismatchCount = computed.filter((r) => r.diff != null && Math.abs(r.diff) >= TOL).length;
              const totalOff = roundMoney(computed.reduce((s, r) => s + (r.diff != null ? Math.abs(r.diff) : 0), 0));
              const truckTypeCounts = computed.reduce((counts, row) => ({ ...counts, [row.truckType]: (counts[row.truckType] || 0) + 1 }), {});
              const visibleRows = computed.filter((r) => rowFilter === "all" || (rowFilter === "off" ? r.diff != null && Math.abs(r.diff) >= TOL : r.diff == null));
              const fmtDiff = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}$ ${money(Math.abs(v))}`;
              return (
                <>
                <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    <span className="font-bold text-slate-600"><strong className={mismatchCount ? "text-red-700" : "text-teal-700"}>{mismatchCount}</strong> off <span className="text-slate-400">/ {checkedCount} checked</span></span>
                    <span className="font-bold text-slate-600">Absolute gap <strong className={totalOff >= TOL ? "text-red-700" : "text-slate-800"}>$ {money(totalOff)}</strong></span>
                    <span className="font-bold text-slate-600">Net <strong className="text-slate-900">{fmtDiff(totalDiff)}</strong></span>
                  </div>
                  <div className="flex shrink-0 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
                    {[['all', 'All'], ['off', 'Needs review'], ['missing', 'Not entered']].map(([key, label]) => <button key={key} type="button" onClick={() => setRowFilter(key)} className={`rounded-lg px-3 py-2 text-xs font-black transition ${rowFilter === key ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}>{label}</button>)}
                  </div>
                </div>
                <div className="overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[720px] border-collapse bg-white text-sm">
                    <thead className="bg-slate-900 text-white">
                      <tr>
                        <th className="px-3 py-3 text-left font-black">Truck</th>
                        <th className="px-3 py-3 text-right font-black">System (gross)</th>
                        <th className="px-3 py-3 text-right font-black">Driver's own</th>
                        <th className="px-3 py-3 text-right font-black">Difference</th>
                        <th className="w-24 px-3 py-3 text-center font-black">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.length === 0 ? <tr><td colSpan="5" className="px-4 py-8 text-center text-sm font-semibold text-slate-400">No rows match this filter.</td></tr> : visibleRows.map((r, index) => {
                        const match = r.diff != null && Math.abs(r.diff) < TOL;
                        const startsGroup = index === 0 || visibleRows[index - 1].truckType !== r.truckType;
                        const isCrane = r.truckType === "With Crane";
                        return (
                          <Fragment key={r.truckNo}>
                          {startsGroup && (
                            <tr className={isCrane ? "bg-teal-50" : "bg-sky-50"}>
                              <td colSpan="5" className={`border-y px-3 py-2 text-xs font-black uppercase tracking-wider ${isCrane ? "border-teal-200 text-teal-800" : "border-sky-200 text-sky-800"}`}>
                                <span className={`mr-2 inline-block h-2 w-2 rounded-full ${isCrane ? "bg-teal-500" : "bg-sky-500"}`} />
                                {isCrane ? "Crane Trucks" : "No-Crane Trucks"} · {truckTypeCounts[r.truckType] || 0}
                              </td>
                            </tr>
                          )}
                          <tr className={`border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                            <td className="px-3 py-3">
                              <div className="font-black text-slate-800">{r.truckNo}</div>
                              <div className="text-xs text-slate-400">{truckTypeLabel(r.truckType)}{r.driverName ? ` · ${r.driverName}` : ""} · {r.trips} trips</div>
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums font-bold text-slate-700">$ {money(r.systemAmount)}</td>
                            <td className="px-3 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-slate-400">$</span>
                                <input
                                  type="number" step="0.01" inputMode="decimal" placeholder="—"
                                  className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm font-bold text-slate-800 focus:border-teal-500 focus:outline-none"
                                  value={r.raw}
                                  onChange={(event) => setReconEdits((prev) => ({ ...prev, [r.truckNo]: event.target.value }))}
                                  onBlur={() => saveReported(r.truckNo)}
                                />
                              </div>
                            </td>
                            <td className={`px-3 py-3 text-right tabular-nums font-black ${r.diff == null ? "text-slate-300" : match ? "text-teal-700" : "text-red-600"}`}>
                              {r.diff == null ? "—" : fmtDiff(r.diff)}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {r.diff == null ? <span className="text-xs font-bold text-slate-300">no entry</span>
                                : match ? <span className="text-xs font-black text-teal-700">✓ match</span>
                                : <span className="text-xs font-black text-red-600">⚠ off</span>}
                            </td>
                          </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 font-black text-white">
                        <td className="px-3 py-3">Total</td>
                        <td className="px-3 py-3 text-right tabular-nums">$ {money(totalSystem)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">$ {money(totalDriver)}</td>
                        <td className={`px-3 py-3 text-right tabular-nums ${Math.abs(totalDiff) < TOL ? "text-teal-300" : "text-red-300"}`}>{fmtDiff(totalDiff)}</td>
                        <td className="px-3 py-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                </>
              );
            })()}
          </Panel>

          <Panel>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700">History</div><h3 className="text-lg font-black tracking-tight">Monthly Earnings</h3></div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">All months · {earningsHistory.length}</span>
            </div>
            <p className="mb-4 text-xs font-bold text-slate-500">
              Kept minus overpaid, summarized across completed comparisons.
            </p>
            {earningsHistory.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-400">No driver figures entered yet. Fill in the sheet above for any month to start tracking earnings.</div>
            ) : (() => {
              const totalKept = roundMoney(earningsHistory.reduce((s, m) => s + m.kept, 0));
              const totalOverpaid = roundMoney(earningsHistory.reduce((s, m) => s + m.overpaid, 0));
              const totalNet = roundMoney(earningsHistory.reduce((s, m) => s + m.net, 0));
              return (
                <>
                <div className="mb-4 flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <div><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Kept</div><div className="text-lg font-black tabular-nums text-teal-800">$ {money(totalKept)}</div></div>
                  <div><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Overpaid</div><div className="text-lg font-black tabular-nums text-amber-700">$ {money(totalOverpaid)}</div></div>
                  <div><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Net earned</div><div className={`text-lg font-black tabular-nums ${totalNet >= 0 ? "text-teal-800" : "text-red-700"}`}>{totalNet < 0 ? "− " : ""}$ {money(Math.abs(totalNet))}</div></div>
                </div>
                <div className="overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[640px] border-collapse bg-white text-sm">
                    <thead className="bg-slate-900 text-white">
                      <tr>
                        <th className="px-3 py-3 text-left font-black">Month</th>
                        <th className="px-3 py-3 text-center font-black">Off / Checked</th>
                        <th className="px-3 py-3 text-right font-black">Kept</th>
                        <th className="px-3 py-3 text-right font-black">Overpaid</th>
                        <th className="px-3 py-3 text-right font-black">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earningsHistory.map((m) => (
                        <tr key={m.month} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                          <td className="px-3 py-3 font-black text-slate-800">{monthName(m.month)}</td>
                          <td className="px-3 py-3 text-center tabular-nums text-slate-500">{m.mismatches} / {m.checked}</td>
                          <td className="px-3 py-3 text-right tabular-nums font-bold text-teal-700">$ {money(m.kept)}</td>
                          <td className="px-3 py-3 text-right tabular-nums font-bold text-amber-600">{m.overpaid > 0 ? `$ ${money(m.overpaid)}` : "—"}</td>
                          <td className={`px-3 py-3 text-right tabular-nums font-black ${m.net >= 0 ? "text-teal-700" : "text-red-600"}`}>{m.net < 0 ? "− " : ""}$ {money(Math.abs(m.net))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 font-black text-white">
                        <td className="px-3 py-3" colSpan="2">Total</td>
                        <td className="px-3 py-3 text-right tabular-nums text-teal-300">$ {money(totalKept)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-amber-300">$ {money(totalOverpaid)}</td>
                        <td className={`px-3 py-3 text-right tabular-nums ${totalNet >= 0 ? "text-teal-300" : "text-red-300"}`}>{totalNet < 0 ? "− " : ""}$ {money(Math.abs(totalNet))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                </>
              );
            })()}
          </Panel>
        </main>
  );
}
