import { useApp } from "../AppContext.js";
import { Button, Input, Select, Field, Panel, KpiCard, MetricCard, PageHead } from "../components/ui.jsx";
import { localDate, today, currentMonth, money, roundMoney, unitMoney, parseMoney, locationMatchKey, locationBaseKey, priceEffectiveDate, routeKey, CRANE_LOCATION_ORDER, NO_CRANE_LOCATION_ORDER, makeLocationSort, craneLocationSort, noCraneLocationSort, deliverySort, truckTypeLabel, formatDate, formatDateTime, monthName, groupPriceHistory } from "../lib/format.js";
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

        const StatementRow = ({ s, index, showPaymentMonth }) => (
          <tr key={s.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50 text-sm">
            <td className="px-3 py-2 text-center text-slate-500">{index + 1}</td>
            {showPaymentMonth && <td className="px-3 py-2 font-bold text-slate-600">{monthName(s.paymentMonth)}</td>}
            <td className="px-3 py-2 font-bold text-slate-600">{monthName(s.month)}</td>
            <td className="px-3 py-2 font-black tabular-nums">{s.statementNumber}</td>
            <td className="px-3 py-2 text-right font-black tabular-nums">$ {money(s.companyTotalAmount)}</td>
          </tr>
        );

        // Received history: payment months marked as received, sorted newest first
        const receivedHistory = allPaymentMonths
          .filter((pm) => pm.received)
          .map((pm) => {
            const pmStatements = allStatements.filter((s) => s.paymentMonth === pm.month);
            return { month: pm.month, total: sumAmount(pmStatements), count: pmStatements.length };
          })
          .sort((a, b) => b.month.localeCompare(a.month));

        return (
          <main className="mx-auto grid max-w-[1500px] gap-4 p-4 pb-20 lg:pb-4">
            <PageHead
              title="Payments"
              meta="Track which statements are sent to the company and what has been received."
              action={(
                <Field label="Payment Month">
                  <Input type="month" value={paymentsViewMonth} onChange={(e) => setPaymentsViewMonth(e.target.value)} />
                </Field>
              )}
            />

            {/* Received payments history */}
            {receivedHistory.length > 0 && (
              <Panel>
                <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Money Received from Company</p>
                <div className="flex flex-wrap gap-3">
                  {receivedHistory.map((rec) => {
                    const [yr, mo] = rec.month.split("-");
                    return (
                      <div key={rec.month} className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 min-w-[200px]">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-black">✓</div>
                        <div className="flex-1">
                          <div className="text-xs font-black uppercase tracking-wide text-emerald-700">Paid on 05/{mo}/{yr.slice(2)}</div>
                          <div className="text-lg font-black text-emerald-900">$ {money(rec.total)}</div>
                          <div className="text-xs font-bold text-emerald-600">{rec.count} statement{rec.count !== 1 ? "s" : ""}</div>
                        </div>
                      </div>
                    );
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
