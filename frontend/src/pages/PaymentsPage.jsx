import { useApp } from "../AppContext.js";
import { Button, Input, Select, Field, Panel, KpiCard, MetricCard, MonthPicker, PageHead } from "../components/ui.jsx";
import { localDate, today, currentMonth, money, roundMoney, unitMoney, parseMoney, locationMatchKey, locationBaseKey, priceEffectiveDate, routeKey, CRANE_LOCATION_ORDER, NO_CRANE_LOCATION_ORDER, makeLocationSort, craneLocationSort, noCraneLocationSort, deliverySort, truckTypeLabel, formatDate, formatDateTime, formatCambodiaDateTime, monthName, groupPriceHistory } from "../lib/format.js";
import { getToken, getRole, setToken, setRole, api, downloadFile } from "../lib/api.js";

export function PaymentsPage() {
  const { data, paymentsViewMonth, setPaymentsViewMonth, togglePaymentReceived } = useApp();
        const allStatements = data.statements || [];
        const allPaymentMonths = data.paymentMonths || [];

        // Section 1: all statements created in the selected calendar month
        const createdThisMonth = allStatements
          .filter((s) => s.month === paymentsViewMonth)
          .sort((a, b) => Number(a.statementNumber) - Number(b.statementNumber));

        // Section 2: statements assigned to selected payment month
        const assignedToMonth = allStatements
          .filter((s) => s.paymentMonth === paymentsViewMonth)
          .sort((a, b) => Number(a.statementNumber) - Number(b.statementNumber));
        const paymentMonthRecord = allPaymentMonths.find((pm) => pm.month === paymentsViewMonth);
        const isReceived = paymentMonthRecord?.received || false;

        // Section 3: everything the company owes
        // Includes: statements assigned to an unpaid payment month (submitted but not received)
        //           unassigned statements from the current calendar month only (pending next submission)
        // Excludes: statements whose paymentMonth has been marked as received
        //           old unassigned statements from past months (historical entries never submitted)
        const thisMonth = currentMonth();
        const outstanding = allStatements
          .filter((s) =>
            (s.paymentMonth && !allPaymentMonths.find((pm) => pm.month === s.paymentMonth && pm.received)) ||
            (!s.paymentMonth && s.month === thisMonth)
          )
          .sort((a, b) => (a.month || "").localeCompare(b.month || "") || Number(a.statementNumber) - Number(b.statementNumber));

        const sumAmount = (list) => list.reduce((sum, s) => sum + Number(s.companyTotalAmount || 0), 0);
        // This intentionally follows the Dashboard's calendar-month driver-payment view.
        // It is a cash-flow comparison: company money due this month versus drivers to pay this month.
        const activeTruckNos = new Set((data.trucks || []).map((truck) => truck.truckNo));
        const driverPaymentThisMonth = (data.deliveries || [])
          .filter((row) => row.deliveryDate?.slice(0, 7) === paymentsViewMonth)
          .filter((row) => activeTruckNos.has(row.truckNo))
          .reduce((sum, row) => sum + Number(row.truckSalaryAmount || 0), 0);
        const companyHaveToPay = sumAmount(assignedToMonth);
        const monthlyBalance = companyHaveToPay - driverPaymentThisMonth;

        const StatementRow = ({ s, index, showPaymentMonth }) => (
          <tr key={s.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50 text-sm">
            <td className="px-3 py-2 text-center text-slate-500">{index + 1}</td>
            {showPaymentMonth && <td className="px-3 py-2 font-bold text-slate-600">{monthName(s.paymentMonth)}</td>}
            <td className="px-3 py-2 font-bold text-slate-600">{monthName(s.month)}</td>
            <td className="px-3 py-2 font-black tabular-nums">{s.statementNumber}</td>
            <td className="px-3 py-2 text-right font-black tabular-nums">$ {money(s.companyTotalAmount)}</td>
          </tr>
        );

        // Received history is grouped by year for a readable multi-year ledger.
        const receivedHistory = allPaymentMonths
          .filter((pm) => pm.received)
          .map((pm) => {
            const pmStatements = allStatements.filter((s) => s.paymentMonth === pm.month);
            return { month: pm.month, receivedAt: pm.receivedAt || null, total: sumAmount(pmStatements), count: pmStatements.length };
          })
          .sort((a, b) => b.month.localeCompare(a.month));
        const receivedYears = [...new Set(receivedHistory.map((rec) => rec.month.slice(0, 4)))].sort().reverse();
        const receivedTotal = receivedHistory.reduce((sum, rec) => sum + rec.total, 0);
        const receivedStatementCount = receivedHistory.reduce((sum, rec) => sum + rec.count, 0);

        return (
          <main className="app-content mx-auto grid max-w-[1500px] gap-4 p-4 pb-20 lg:pb-4">
            <PageHead
              title="Payments"
              meta="Track which statements are sent to the company and what has been received."
              action={(
                <MonthPicker label="Payment Month" value={paymentsViewMonth} onChange={(e) => setPaymentsViewMonth(e.target.value)} />
              )}
            />

            {/* Received payments history */}
            {receivedHistory.length > 0 && (
              <Panel>
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div><h2 className="text-lg font-black tracking-tight">Money Received from Company</h2><p className="mt-1 text-sm text-slate-500">Received payment history, grouped by year.</p></div>
                  <div className="flex flex-wrap gap-2">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2"><div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Total received</div><div className="text-lg font-black tabular-nums text-emerald-950">$ {money(receivedTotal)}</div></div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"><div className="text-[10px] font-black uppercase tracking-wide text-slate-500">Payment months</div><div className="text-lg font-black tabular-nums text-slate-900">{receivedHistory.length} <span className="text-xs font-bold">· {receivedStatementCount} statements</span></div></div>
                  </div>
                </div>
                <div className="grid gap-5">
                  {receivedYears.map((year) => {
                    const records = receivedHistory.filter((rec) => rec.month.startsWith(`${year}-`));
                    const yearTotal = records.reduce((sum, rec) => sum + rec.total, 0);
                    const yearStatementCount = records.reduce((sum, rec) => sum + rec.count, 0);
                    return <section key={year} aria-labelledby={`received-year-${year}`} className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3"><h3 id={`received-year-${year}`} className="font-black text-slate-900">{year}</h3><p className="text-xs font-bold text-slate-500">{records.length} payment months · {yearStatementCount} statements · <span className="text-slate-800">$ {money(yearTotal)}</span></p></div>
                      <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm">
                        <thead className="bg-slate-900 text-xs text-white"><tr><th scope="col" className="px-4 py-3">Payment month</th><th scope="col" className="px-4 py-3">Received</th><th scope="col" className="px-4 py-3 text-right">Statements</th><th scope="col" className="px-4 py-3 text-right">Amount</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">{records.map((rec) => <tr key={rec.month} className="even:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-800">{monthName(rec.month)}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-2 font-semibold text-emerald-800"><span className="h-2 w-2 rounded-full bg-emerald-600" />{rec.receivedAt ? <time dateTime={rec.receivedAt}>{formatCambodiaDateTime(rec.receivedAt)} Cambodia</time> : <span className="text-slate-500">Date not recorded</span>}</span></td><td className="px-4 py-3 text-right tabular-nums text-slate-600">{rec.count}</td><td className="px-4 py-3 text-right font-black tabular-nums text-slate-900">$ {money(rec.total)}</td></tr>)}</tbody>
                      </table></div>
                    </section>;
                  })}
                </div>
              </Panel>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
              {/* File 1 — Statements created this month */}
              <Panel>
                <h3 className="mb-3 text-base font-black tracking-tight">Statements Created — {monthName(paymentsViewMonth)}</h3>
                <p className="mb-3 text-xs font-bold text-slate-500">All statements you created in this calendar month.</p>
                {createdThisMonth.length === 0 ? (
                  <p className="text-sm font-bold text-slate-400 text-center py-6">No statements for this month.</p>
                ) : (
                  <div className="overflow-auto rounded-xl border border-slate-200">
                    <table className="w-full border-collapse bg-white text-sm">
                      <thead className="bg-slate-900 text-white text-xs">
                        <tr>
                          <th className="px-3 py-2 text-center">N</th>
                          <th className="px-3 py-2 text-left">Month</th>
                          <th className="px-3 py-2 text-left">Statement</th>
                          <th className="px-3 py-2 text-right">Income</th>
                        </tr>
                      </thead>
                      <tbody>
                        {createdThisMonth.map((s, i) => <StatementRow key={s.id} s={s} index={i} />)}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-black text-sm border-t-2 border-slate-300">
                          <td className="px-3 py-2" colSpan="3">$ Total</td>
                          <td className="px-3 py-2 text-right tabular-nums">$ {money(sumAmount(createdThisMonth))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Panel>

              {/* File 2 — Company pays this month */}
              <Panel>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-base font-black tracking-tight">
                    {(() => {
                      if (!paymentsViewMonth) return "Company Have to Pay";
                      const [yr, mo] = paymentsViewMonth.split("-");
                      return `Company Have to Pay on 05/${mo}/${yr.slice(2)}`;
                    })()}
                  </h3>
                  {assignedToMonth.length > 0 && (
                    <button
                      onClick={() => togglePaymentReceived(paymentsViewMonth)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black transition ${isReceived ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                    >
                      {isReceived ? "✓ Received" : "Mark Received"}
                    </button>
                  )}
                </div>
                <p className="mb-3 text-xs font-bold text-slate-500">Statements assigned to this payment month.</p>
                {assignedToMonth.length === 0 ? (
                  <p className="text-sm font-bold text-slate-400 text-center py-6">No statements assigned to this payment month yet.</p>
                ) : (
                  <div className="overflow-auto rounded-xl border border-slate-200">
                    <table className="w-full border-collapse bg-white text-sm">
                      <thead className="bg-slate-900 text-white text-xs">
                        <tr>
                          <th className="px-3 py-2 text-center">N</th>
                          <th className="px-3 py-2 text-left">Month</th>
                          <th className="px-3 py-2 text-left">Statement</th>
                          <th className="px-3 py-2 text-right">Income</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignedToMonth.map((s, i) => (
                          <tr key={s.id} className={`border-b border-slate-100 text-sm ${i === assignedToMonth.length - 1 ? "bg-yellow-100" : i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                            <td className="px-3 py-2 text-center text-slate-500">{i + 1}</td>
                            <td className="px-3 py-2 font-bold text-slate-600">{monthName(s.month)}</td>
                            <td className="px-3 py-2 font-black tabular-nums">{s.statementNumber}</td>
                            <td className="px-3 py-2 text-right font-black tabular-nums">$ {money(s.companyTotalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-black text-sm border-t-2 border-slate-300">
                          <td className="px-3 py-2" colSpan="3">$ Total</td>
                          <td className="px-3 py-2 text-right tabular-nums">$ {money(sumAmount(assignedToMonth))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Monthly Cash Balance</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">Company payment due on the 5th minus driver payment for {monthName(paymentsViewMonth)}.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Company to pay</div>
                      <div className="font-black tabular-nums text-teal-700">$ {money(companyHaveToPay)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Driver payment</div>
                      <div className="font-black tabular-nums text-amber-600">$ {money(driverPaymentThisMonth)}</div>
                    </div>
                  </div>
                  <div className={`mt-3 rounded-lg px-3 py-2 text-sm font-black ${monthlyBalance > 0 ? "bg-emerald-100 text-emerald-800" : monthlyBalance < 0 ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-700"}`}>
                    {monthlyBalance > 0 ? "You Get" : monthlyBalance < 0 ? "You Need to Add" : "Balanced"}: $ {money(Math.abs(monthlyBalance))}
                  </div>
                </div>
              </Panel>

              {/* File 3 — Outstanding */}
              <Panel>
                <h3 className="mb-3 text-base font-black tracking-tight">Outstanding — Not Received Yet</h3>
                <p className="mb-3 text-xs font-bold text-slate-500">All assigned statements the company has not paid yet.</p>
                {outstanding.length === 0 ? (
                  <p className="text-sm font-bold text-emerald-600 text-center py-6">All clear — no outstanding payments.</p>
                ) : (
                  <div className="overflow-auto rounded-xl border border-slate-200">
                    <table className="w-full border-collapse bg-white text-sm">
                      <thead className="bg-slate-900 text-white text-xs">
                        <tr>
                          <th className="px-3 py-2 text-center">N</th>
                          <th className="px-3 py-2 text-left">Statement Month</th>
                          <th className="px-3 py-2 text-left">Statement</th>
                          <th className="px-3 py-2 text-right">Income</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outstanding.map((s, i) => <StatementRow key={s.id} s={s} index={i} />)}
                      </tbody>
                      <tfoot>
                        <tr className="bg-red-50 font-black text-sm border-t-2 border-red-200">
                          <td className="px-3 py-2 text-red-700" colSpan="3">$ Total Outstanding</td>
                          <td className="px-3 py-2 text-right tabular-nums text-red-700">$ {money(sumAmount(outstanding))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Panel>
            </div>
          </main>
        );
}
