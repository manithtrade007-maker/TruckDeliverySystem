import { useApp } from "../AppContext.js";
import { PageHead, Field, Input, Panel } from "../components/ui.jsx";
import { money, roundMoney, monthName, truckTypeLabel } from "../lib/format.js";

export function ComparePayPage() {
  const { reconMonth, setReconMonth, reconEdits, setReconEdits, reconciliation, earningsHistory, saveReported } = useApp();
  return (
        <main className="mx-auto grid max-w-[1500px] gap-4 p-4 pb-20 lg:pb-4">
          <PageHead
            title="Compare Pay"
            meta="Compare the system's driver payment to the driver's own reported total."
            action={(
              <Field label="Month">
                <Input type="month" value={reconMonth} onChange={(event) => setReconMonth(event.target.value)} />
              </Field>
            )}
          />
          <Panel>
            <p className="mb-4 text-xs font-bold text-slate-500">
              Difference = System − Driver's own. A <span className="text-red-600">positive</span> value means the driver under-counted (money missing from his own total). Enter each driver's reported total; it saves automatically.
            </p>
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
              const fmtDiff = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}$ ${money(Math.abs(v))}`;
              return (
                <>
                <div className="mb-4 grid gap-3 grid-cols-1 sm:grid-cols-3">
                  <div className={`rounded-2xl border p-4 ${mismatchCount > 0 ? "border-red-200 bg-red-50/60" : "border-teal-200 bg-teal-50/60"}`}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Trucks Off</div>
                    <div className={`text-2xl font-black tabular-nums ${mismatchCount > 0 ? "text-red-700" : "text-teal-800"}`}>{mismatchCount}<span className="text-sm font-bold text-slate-400"> / {checkedCount} checked</span></div>
                  </div>
                  <div className={`rounded-2xl border p-4 ${totalOff >= TOL ? "border-red-200 bg-red-50/60" : "border-slate-100 bg-slate-50/60"}`}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total Discrepancy</div>
                    <div className={`text-2xl font-black tabular-nums ${totalOff >= TOL ? "text-red-700" : "text-slate-800"}`}>$ {money(totalOff)}</div>
                    <div className="text-[11px] font-medium text-slate-400 mt-0.5">sum of all errors, ignoring +/−</div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Net Difference</div>
                    <div className={`text-2xl font-black tabular-nums ${Math.abs(totalDiff) < TOL ? "text-slate-800" : totalDiff > 0 ? "text-red-700" : "text-amber-600"}`}>{fmtDiff(totalDiff)}</div>
                    <div className="text-[11px] font-medium text-slate-400 mt-0.5">over-counts cancel under-counts</div>
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
                      {computed.map((r) => {
                        const match = r.diff != null && Math.abs(r.diff) < TOL;
                        return (
                          <tr key={r.truckNo} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
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
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-lg font-black tracking-tight">Monthly Earnings</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">All months</span>
            </div>
            <p className="mb-4 text-xs font-bold text-slate-500">
              How much you earned from driver under-counts each month. <span className="text-teal-700">Kept</span> = money drivers left on the table; <span className="text-amber-600">Overpaid</span> = over-counts; <span className="font-black">Net</span> = your true gain.
            </p>
            {earningsHistory.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-400">No driver figures entered yet. Fill in the sheet above for any month to start tracking earnings.</div>
            ) : (() => {
              const totalKept = roundMoney(earningsHistory.reduce((s, m) => s + m.kept, 0));
              const totalOverpaid = roundMoney(earningsHistory.reduce((s, m) => s + m.overpaid, 0));
              const totalNet = roundMoney(earningsHistory.reduce((s, m) => s + m.net, 0));
              return (
                <>
                <div className="mb-4 grid gap-3 grid-cols-1 sm:grid-cols-3">
                  <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total Kept</div>
                    <div className="text-2xl font-black tabular-nums text-teal-800">$ {money(totalKept)}</div>
                    <div className="text-[11px] font-medium text-slate-400 mt-0.5">from driver under-counts</div>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total Overpaid</div>
                    <div className="text-2xl font-black tabular-nums text-amber-700">$ {money(totalOverpaid)}</div>
                    <div className="text-[11px] font-medium text-slate-400 mt-0.5">from driver over-counts</div>
                  </div>
                  <div className={`rounded-2xl border p-4 ${totalNet >= 0 ? "border-teal-200 bg-teal-50/60" : "border-red-200 bg-red-50/60"}`}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Net Earned</div>
                    <div className={`text-2xl font-black tabular-nums ${totalNet >= 0 ? "text-teal-800" : "text-red-700"}`}>{totalNet < 0 ? "− " : ""}$ {money(Math.abs(totalNet))}</div>
                    <div className="text-[11px] font-medium text-slate-400 mt-0.5">kept minus overpaid, all months</div>
                  </div>
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
