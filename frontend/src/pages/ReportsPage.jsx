import { useApp } from "../AppContext.js";
import { Button, Input, Select, Field, Panel, KpiCard, MetricCard, PageHead } from "../components/ui.jsx";
import { localDate, today, currentMonth, money, roundMoney, unitMoney, parseMoney, locationMatchKey, locationBaseKey, priceEffectiveDate, routeKey, CRANE_LOCATION_ORDER, NO_CRANE_LOCATION_ORDER, makeLocationSort, craneLocationSort, noCraneLocationSort, deliverySort, truckTypeLabel, formatDate, formatDateTime, monthName, groupPriceHistory } from "../lib/format.js";
import { getToken, getRole, setToken, setRole, api, downloadFile } from "../lib/api.js";

export function ReportsPage() {
  const { data, driverPaymentSections, exportSalary, getDeduction, isAdmin, reportMonth, saveDeduction, selectedDriverPaymentSection, setDeductionEdits, setReportMonth, setReportTruckNo } = useApp();
  return (
        <main className="mx-auto grid max-w-[1500px] gap-4 p-4 pb-20 lg:pb-4">
          <PageHead
            title="Driver Payment"
            meta="Month-end salary, deductions, and net pay by truck."
            action={(
              <Field label="Report Month">
                <Input
                  type="month"
                  value={reportMonth}
                  onChange={(event) => {
                    setReportMonth(event.target.value);
                    setReportTruckNo("");
                  }}
                />
              </Field>
            )}
          />

          {selectedDriverPaymentSection ? (() => {
            const d = getDeduction(selectedDriverPaymentSection.truckNo);
            const loanAmt = Number(d.loanDeduction) || 0;
            const garageAmt = Number(d.garageFee) || 0;
            const netPay = selectedDriverPaymentSection.driverAmount - loanAmt - garageAmt;
            return (
              <Panel>
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black tracking-tight">{selectedDriverPaymentSection.truckNo}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-black ${selectedDriverPaymentSection.truckType === "With Crane" ? "bg-teal-100 text-teal-800" : "bg-sky-100 text-sky-800"}`}>
                        {truckTypeLabel(selectedDriverPaymentSection.truckType)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {selectedDriverPaymentSection.driverName} | {selectedDriverPaymentSection.workingDays} days · {selectedDriverPaymentSection.trips} trips · {selectedDriverPaymentSection.qty.toFixed(4)}T
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => setReportTruckNo("")}>Back</Button>
                    {isAdmin && <Button type="button" variant="secondary" onClick={() => exportSalary(selectedDriverPaymentSection, "pdf")}>PDF</Button>}
                    {isAdmin && <Button type="button" onClick={() => exportSalary(selectedDriverPaymentSection, "xls")}>Excel</Button>}
                  </div>
                </div>
                <div className="overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[1050px] table-fixed border-collapse bg-white text-sm">
                    <thead className="bg-slate-900 text-white">
                      <tr>
                        <th className="w-14 px-3 py-3 text-center font-black">No</th>
                        <th className="w-32 px-3 py-3 text-center font-black">Delivery Date</th>
                        <th className="w-36 px-3 py-3 text-left font-black">Invoice No</th>
                        <th className="w-40 px-3 py-3 text-left font-black">From</th>
                        <th className="px-3 py-3 text-left font-black">To</th>
                        <th className="w-32 px-3 py-3 text-right font-black">QTY(T)</th>
                        <th className="w-36 px-3 py-3 text-right font-black">Driver Price</th>
                        <th className="w-40 px-3 py-3 text-right font-black">Driver Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDriverPaymentSection.rows.map((row, index) => (
                        <tr key={row.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                          <td className="px-3 py-3 text-center">{index + 1}</td>
                          <td className="px-3 py-3 text-center whitespace-nowrap">{formatDate(row.deliveryDate)}</td>
                          <td className="px-3 py-3 tabular-nums">
                            <div>{row.invoiceNo}</div>
                            {(() => { const s = data.statements.find(st => st.id === row.statementId); return s ? <div className="text-xs text-slate-400 font-normal">Stmt {s.statementNumber}</div> : null; })()}
                          </td>
                          <td className="px-3 py-3">{row.fromLocation}</td>
                          <td className="px-3 py-3">{row.toLocation}</td>
                          <td className="px-3 py-3 text-right font-bold tabular-nums">{Number(row.qtyTon || 0).toFixed(4)}T</td>
                          <td className="px-3 py-3 text-right font-bold tabular-nums">$ {unitMoney(row.truckSalaryUnitPrice)}</td>
                          <td className="px-3 py-3 text-right font-black tabular-nums">$ {money(row.truckSalaryAmount)}</td>
                        </tr>
                      ))}
                      <tr className="bg-amber-50 font-black border-t-2 border-amber-200">
                        <td className="px-3 py-3" colSpan="5">Total</td>
                        <td className="px-3 py-3 text-right tabular-nums">{selectedDriverPaymentSection.qty.toFixed(4)}T</td>
                        <td className="px-3 py-3"></td>
                        <td className="px-3 py-3 text-right tabular-nums">$ {money(selectedDriverPaymentSection.driverAmount)}</td>
                      </tr>
                      {loanAmt > 0 && (
                        <tr className="bg-red-50 text-red-700 font-bold">
                          <td className="px-3 py-3 text-sm" colSpan="7">Loan Deduction</td>
                          <td className="px-3 py-3 text-right tabular-nums text-sm">- $ {money(loanAmt)}</td>
                        </tr>
                      )}
                      {garageAmt > 0 && (
                        <tr className="bg-red-50 text-red-700 font-bold">
                          <td className="px-3 py-3 text-sm" colSpan="7">Garage Fee</td>
                          <td className="px-3 py-3 text-right tabular-nums text-sm">- $ {money(garageAmt)}</td>
                        </tr>
                      )}
                      {(loanAmt > 0 || garageAmt > 0) && (
                        <tr className="bg-emerald-50 font-black border-t-2 border-emerald-200">
                          <td className="px-3 py-3 text-emerald-800" colSpan="7">Net Pay</td>
                          <td className="px-3 py-3 text-right tabular-nums text-emerald-800">$ {money(netPay)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>
            );
          })() : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {driverPaymentSections.map((truck) => {
                const d = getDeduction(truck.truckNo);
                const loanAmt = Number(d.loanDeduction) || 0;
                const garageAmt = Number(d.garageFee) || 0;
                const netPay = truck.driverAmount - loanAmt - garageAmt;
                const isCrane = truck.truckType === "With Crane";
                return (
                  <div key={truck.truckNo} className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h4 className="text-lg font-black text-white tracking-tight">{truck.truckNo}</h4>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${isCrane ? "bg-teal-400 text-teal-950" : "bg-sky-400 text-sky-950"}`}>
                          {truckTypeLabel(truck.truckType)}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-400">{truck.driverName || "—"}</span>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                      {[["Days", truck.workingDays], ["Trips", truck.trips], ["QTY", `${truck.qty.toFixed(2)}T`]].map(([label, value]) => (
                        <div key={label} className="px-3 py-3 text-center">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</div>
                          <div className="mt-0.5 text-base font-black text-slate-800">{value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="px-5 py-4 flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-500">Gross Pay</span>
                        <span className="text-sm font-black tabular-nums text-slate-800">$ {money(truck.driverAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-slate-500 shrink-0">Loan Deduction</span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-slate-400 font-bold">-$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-sm font-black tabular-nums text-slate-800 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                            value={d.loanDeduction}
                            onChange={(e) => setDeductionEdits((prev) => ({ ...prev, [truck.truckNo]: { ...prev[truck.truckNo], loanDeduction: e.target.value } }))}
                            onBlur={() => saveDeduction(truck.truckNo)}
                          />
                        </div>
                      </div>
                      {isCrane && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-bold text-slate-500 shrink-0">Garage Fee</span>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-slate-400 font-bold">-$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-sm font-black tabular-nums text-slate-800 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                              value={d.garageFee}
                              onChange={(e) => setDeductionEdits((prev) => ({ ...prev, [truck.truckNo]: { ...prev[truck.truckNo], garageFee: e.target.value } }))}
                              onBlur={() => saveDeduction(truck.truckNo)}
                            />
                          </div>
                        </div>
                      )}
                      <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                        <span className="text-sm font-black text-slate-700">Net Pay</span>
                        <span className={`text-base font-black tabular-nums ${netPay >= 0 ? "text-emerald-700" : "text-red-600"}`}>$ {money(netPay)}</span>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 px-5 py-3 flex justify-end gap-2">
                      <Button type="button" variant="secondary" onClick={() => setReportTruckNo(truck.truckNo)}>View</Button>
                      {isAdmin && <Button type="button" variant="secondary" onClick={() => exportSalary(truck, "pdf")}>PDF</Button>}
                      {isAdmin && <Button type="button" onClick={() => exportSalary(truck, "xls")}>Excel</Button>}
                    </div>
                  </div>
                );
              })}
              {driverPaymentSections.length === 0 && (
                <div className="col-span-3 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-bold text-slate-500">
                  No driver payment data for this month.
                </div>
              )}
            </div>
          )}
        </main>
  );
}
