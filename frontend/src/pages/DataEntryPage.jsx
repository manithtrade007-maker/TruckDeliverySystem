import { useApp } from "../AppContext.js";
import { Button, Input, Select, Field, Panel, KpiCard, MetricCard, PageHead } from "../components/ui.jsx";
import { localDate, today, currentMonth, money, roundMoney, unitMoney, parseMoney, locationMatchKey, locationBaseKey, priceEffectiveDate, routeKey, CRANE_LOCATION_ORDER, NO_CRANE_LOCATION_ORDER, makeLocationSort, craneLocationSort, noCraneLocationSort, deliverySort, truckTypeLabel, formatDate, formatDateTime, monthName, groupPriceHistory } from "../lib/format.js";
import { getToken, getRole, setToken, setRole, api, downloadFile } from "../lib/api.js";

export function DataEntryPage() {
  const { activeField, backToStatementList, canEditRows, canFinishStatement, canSaveDelivery, clearHighlights, createEntryStatement, deleteDelivery, deleteStatement, deliveryForm, deliveryFormRef, duplicateInvoice, duplicateInvoiceStatement, editDelivery, entryActionTruckType, entryTruckType, expandStatementEdit, exportStatementFile, filteredStatements, filters, finishStatement, flash, getNextStatementNumber, invoiceInputRef, isAdmin, isDraft, isEditingDelivery, locations, missingPrice, openStatement, quickForm, reopenStatement, reportMonth, resetDeliveryForm, saveDelivery, saveQuickStatement, saveStatement, selectedPrice, selectedStatement, selectedStatementId, selectedTruck, selectedViewStatement, setActiveField, setAssignModal, setAssignMonth, setDeliveryForm, setEntryActionTruckType, setExpandStatementEdit, setFilters, setQuickForm, setReportMonth, setShowQuickEntry, setStatementForm, showQuickEntry, showStatementWorkspace, startEntryAction, statementCounts, statementForm, statementRows, totals, truckInputRef, truckMissing, truckOptions, truckTypeMismatch, viewStatement, viewStatementRows, viewTotals } = useApp();
  return (
        <main className="mx-auto grid max-w-[1500px] gap-4 p-4 pb-20 lg:pb-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          {!selectedViewStatement && !selectedStatement && !showStatementWorkspace && (
          <Panel className="lg:col-span-2">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Data Entry</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">Choose one entry option, then create or edit a statement.</p>
              </div>
              <div className="grid gap-1 rounded-2xl bg-slate-100 p-1 md:grid-cols-2">
                {["With Crane", "Without Crane"].map((truckType) => (
                  <button
                    key={truckType}
                    type="button"
                    onClick={() => startEntryAction(truckType).catch((err) => flash(err.message, "error"))}
                    className={`w-full sm:min-w-[220px] rounded-xl px-4 py-3 text-left transition ${
                      entryTruckType === truckType
                        ? "bg-teal-700 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:text-slate-950"
                    }`}
                  >
                    <div className="text-base font-black">{truckType === "With Crane" ? "Crane Entry" : "No Crane Entry"}</div>
                    <div className="mt-0.5 text-xs font-bold opacity-75">
                      {truckType === "With Crane"
                        ? `6 trucks | ${statementCounts.withCrane} statements`
                        : `3 trucks | ${statementCounts.withoutCrane} statements`}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Panel>
          )}

          {!selectedViewStatement && entryActionTruckType && (
            <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-slate-950/40 sm:p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/20">
                <div className="mb-4">
                  <h3 className="text-xl font-black tracking-tight">
                    {entryActionTruckType === "With Crane" ? "Crane Entry" : "No Crane Entry"}
                  </h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">Choose what you want to do next.</p>
                </div>
                <div className="grid gap-3">
                  <Button type="button" onClick={() => createEntryStatement(entryActionTruckType).catch((err) => flash(err.message, "error"))}>
                    Create Statement
                  </Button>
                  <Button type="button" variant="quiet" onClick={() => setEntryActionTruckType("")}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {selectedViewStatement && (
            <Panel className="lg:col-span-2">
              <div className="mb-4 flex flex-col gap-3">
                <div>
                  <h2 className="text-lg font-black tracking-tight">Statement {selectedViewStatement.statementNumber} — {monthName(selectedViewStatement.month)}</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {truckTypeLabel(selectedViewStatement.truckType)} | {selectedViewStatement.status} | {viewStatementRows.length}/30 rows
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={backToStatementList}>Back to Statements</Button>
                  <Button type="button" variant="secondary" onClick={() => openStatement(selectedViewStatement)}>Edit</Button>
                  <Button
                    type="button"
                    onClick={() => {
                      downloadFile(`/api/export/accounting?statementId=${encodeURIComponent(selectedViewStatement.id)}&truckType=${encodeURIComponent(selectedViewStatement.truckType)}`).catch((err) => flash(err.message, "error"));
                    }}
                    disabled={viewStatementRows.length < 1 && !selectedViewStatement?.isManual}
                  >
                    Export Statement
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <KpiCard label="Rows" value={`${viewStatementRows.length}/30`} tone="blue" />
                <KpiCard label="Total QTY" value={`${viewTotals.qty.toFixed(4)}T`} tone="slate" />
                <KpiCard label="Total Amount" value={`$${money(viewTotals.amount)}`} tone="amber" />
              </div>
              <div className="mt-4 overflow-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[1100px] border-collapse bg-white text-sm">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="px-3 py-3 text-left font-black">No</th>
                      <th className="px-3 py-3 text-left font-black">Delivery Date</th>
                      <th className="px-3 py-3 text-left font-black">Invoice Number</th>
                      <th className="px-3 py-3 text-left font-black">Truck Number</th>
                      <th className="px-3 py-3 text-left font-black">Type of Truck</th>
                      <th className="px-3 py-3 text-left font-black">From Location</th>
                      <th className="px-3 py-3 text-left font-black">To Location</th>
                      <th className="px-3 py-3 text-right font-black">QTY(T)</th>
                      <th className="px-3 py-3 text-right font-black">Unit Price</th>
                      <th className="px-3 py-3 text-right font-black">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewStatementRows.map((row, index) => (
                      <tr key={row.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                        <td className="px-3 py-3 font-bold">{index + 1}</td>
                        <td className="px-3 py-3">{formatDate(row.deliveryDate)}</td>
                        <td className="px-3 py-3">{row.invoiceNo}</td>
                        <td className="px-3 py-3 font-bold">{row.truckNo}</td>
                        <td className="px-3 py-3">{truckTypeLabel(row.truckType)}</td>
                        <td className="px-3 py-3">{row.fromLocation}</td>
                        <td className="px-3 py-3">{row.toLocation}</td>
                        <td className="px-3 py-3 text-right font-bold">{Number(row.qtyTon || 0).toFixed(5)}T</td>
                        <td className="px-3 py-3 text-right">$ {unitMoney(row.companyUnitPrice)}</td>
                        <td className="px-3 py-3 text-right font-black">$ {money(row.companyTotalAmount)}</td>
                      </tr>
                    ))}
                    {viewStatementRows.length === 0 && (
                      <tr>
                        <td className="px-3 py-6 text-center text-sm font-bold text-slate-500" colSpan="10">No delivery rows in this statement.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {!selectedViewStatement && !showStatementWorkspace && !selectedStatement && (() => {
            const svgR = 54;
            const svgCirc = 2 * Math.PI * svgR;
            const total = statementCounts.total;
            const craneFrac = total > 0 ? statementCounts.withCrane / total : 0;
            const nocrFrac = total > 0 ? statementCounts.withoutCrane / total : 0;
            const monthLabel = statementCounts.month
              ? new Date(statementCounts.month + "-01").toLocaleString("default", { month: "long", year: "numeric" })
              : "";
            return (
              <Panel className="lg:col-span-2">
                <p className="mb-4 text-xs font-black uppercase tracking-wide text-slate-500">{monthLabel} — Statement Overview</p>
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                  <div className="relative flex-shrink-0">
                    <svg width="160" height="160" viewBox="0 0 160 160">
                      <circle cx="80" cy="80" r={svgR} fill="none" stroke="#e2e8f0" strokeWidth="26" />
                      {craneFrac > 0 && (
                        <circle cx="80" cy="80" r={svgR} fill="none" stroke="#0d9488" strokeWidth="26"
                          strokeDasharray={`${craneFrac * svgCirc} ${svgCirc}`}
                          transform="rotate(-90 80 80)" strokeLinecap="butt" />
                      )}
                      {nocrFrac > 0 && (
                        <circle cx="80" cy="80" r={svgR} fill="none" stroke="#3b82f6" strokeWidth="26"
                          strokeDasharray={`${nocrFrac * svgCirc} ${svgCirc}`}
                          transform={`rotate(${-90 + craneFrac * 360} 80 80)`} strokeLinecap="butt" />
                      )}
                      <text x="80" y="73" textAnchor="middle" fontSize="28" fontWeight="900" fill="#0f172a">{total}</text>
                      <text x="80" y="92" textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b" letterSpacing="1">TOTAL</text>
                    </svg>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 w-full">
                    <div className="flex items-center gap-4 rounded-xl bg-teal-50 border border-teal-100 px-4 py-3">
                      <div className="h-4 w-4 rounded-sm bg-teal-600 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-xs font-black uppercase tracking-wide text-teal-700">Crane Statements</div>
                        <div className="text-2xl font-black text-teal-950">{statementCounts.withCrane}</div>
                        <div className="text-xs font-bold text-teal-600 mt-0.5">${statementCounts.craneAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-teal-700">{total > 0 ? Math.round(craneFrac * 100) : 0}%</div>
                        <div className="text-xs font-bold text-teal-500">of count</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 rounded-xl bg-sky-50 border border-sky-100 px-4 py-3">
                      <div className="h-4 w-4 rounded-sm bg-blue-500 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-xs font-black uppercase tracking-wide text-blue-700">No Crane Statements</div>
                        <div className="text-2xl font-black text-blue-950">{statementCounts.withoutCrane}</div>
                        <div className="text-xs font-bold text-blue-600 mt-0.5">${statementCounts.noCraneAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-blue-600">{total > 0 ? Math.round(nocrFrac * 100) : 0}%</div>
                        <div className="text-xs font-bold text-blue-400">of count</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5">
                      <div className="text-xs font-black uppercase tracking-wide text-slate-600">Total Revenue</div>
                      <div className="text-xl font-black text-slate-900">${statementCounts.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                </div>
              </Panel>
            );
          })()}

          {!selectedViewStatement && !showStatementWorkspace && !selectedStatement && (
            <Panel className="lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black tracking-tight">Historical Quick Entry</h3>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">For past statements before this system — enter statement number, month, and amount directly.</p>
                </div>
                <Button type="button" variant="secondary" onClick={() => setShowQuickEntry((v) => !v)}>
                  {showQuickEntry ? "Hide" : "Add Past Statement"}
                </Button>
              </div>
              {showQuickEntry && (
                <form onSubmit={saveQuickStatement} className="mt-4 grid gap-3 md:grid-cols-4 border-t border-slate-100 pt-4">
                  <Field label="Statement Number">
                    <Input
                      type="number"
                      placeholder="e.g. 1531"
                      required
                      value={quickForm.statementNumber}
                      onChange={(e) => setQuickForm({ ...quickForm, statementNumber: e.target.value })}
                    />
                  </Field>
                  <Field label="Month">
                    <Input
                      type="month"
                      required
                      value={quickForm.month}
                      onChange={(e) => setQuickForm({ ...quickForm, month: e.target.value })}
                    />
                  </Field>
                  <Field label="Amount ($)">
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="e.g. 2914.60"
                      required
                      value={quickForm.manualAmount}
                      onChange={(e) => setQuickForm({ ...quickForm, manualAmount: e.target.value })}
                    />
                  </Field>
                  <Field label=" ">
                    <Button type="submit">Save Statement</Button>
                  </Field>
                </form>
              )}
            </Panel>
          )}

          {!selectedViewStatement && !showStatementWorkspace && !selectedStatement && (
            <Panel id="all-statements-panel" className="lg:col-span-2">
              <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-black tracking-tight">All Statements</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-600">
                  Crane {statementCounts.withCrane} | No Crane {statementCounts.withoutCrane} | Total {statementCounts.total}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Month"><Input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} /></Field>
                <Field label="Statement No">
                  <Input
                    placeholder="Search statement number"
                    value={filters.statementNumber}
                    onChange={(e) => setFilters({ ...filters, statementNumber: e.target.value })}
                  />
                </Field>
              </div>
              <div className="mt-4 overflow-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[420px] border-collapse text-sm">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-black">Statement</th>
                      <th className="hidden sm:table-cell px-3 py-2.5 text-center font-black">Type</th>
                      <th className="px-3 py-2.5 text-center font-black">Status</th>
                      <th className="hidden sm:table-cell px-3 py-2.5 text-center font-black">Rows</th>
                      <th className="px-3 py-2.5 text-right font-black">Amount</th>
                      {isAdmin && <th className="hidden md:table-cell px-3 py-2.5 text-center font-black">Pay Month</th>}
                      <th className="px-3 py-2.5 text-right font-black">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStatements.length === 0 && (
                      <tr><td colSpan="99" className="px-4 py-8 text-center text-sm font-bold text-slate-400">No statements for this month.</td></tr>
                    )}
                    {filteredStatements.map((statement) => {
                      const statusCls = statement.isManual
                        ? "bg-orange-100 text-orange-700"
                        : statement.status === "Draft" ? "bg-amber-100 text-amber-800"
                        : statement.status === "Exported" ? "bg-sky-100 text-sky-800"
                        : statement.status === "Finished" ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600";
                      const statusLabel = statement.isManual ? "Manual" : statement.status;
                      const isActive = statement.id === selectedStatementId;
                      return (
                        <tr key={statement.id} className={`border-b border-slate-100 transition ${isActive ? "bg-teal-50" : "odd:bg-white even:bg-slate-50/60 hover:bg-slate-100"}`}>
                          <td className="px-3 py-2.5 font-black text-slate-800">
                            {statement.statementNumber}
                          </td>
                          <td className="hidden sm:table-cell px-3 py-2.5 text-center">
                            {!statement.isManual && (
                              <span className={`rounded-full px-2 py-0.5 text-xs font-black ${statement.truckType === "With Crane" ? "bg-teal-100 text-teal-800" : "bg-sky-100 text-sky-800"}`}>
                                {truckTypeLabel(statement.truckType)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-black ${statusCls}`}>{statusLabel}</span>
                          </td>
                          <td className="hidden sm:table-cell px-3 py-2.5 text-center tabular-nums text-slate-600">
                            {statement.isManual ? "—" : `${statement.rowCount}/30`}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-black text-slate-800">
                            ${money(statement.companyTotalAmount)}
                          </td>
                          {isAdmin && (
                            <td className="hidden md:table-cell px-3 py-2.5 text-center">
                              <button type="button"
                                onClick={() => { setAssignModal(statement); setAssignMonth(statement.paymentMonth || currentMonth()); }}
                                className="w-[150px] whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:border-teal-600 hover:text-teal-700 transition text-center">
                                {statement.paymentMonth ? `Pay: ${monthName(statement.paymentMonth)}` : "Set Pay"}
                              </button>
                            </td>
                          )}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <button type="button" onClick={() => viewStatement(statement)}
                                className="hidden sm:block rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:border-teal-600 hover:text-teal-700 transition">View</button>
                              {isAdmin && (statement.rowCount > 0 || statement.isManual) && (
                                <>
                                  <button type="button" onClick={() => exportStatementFile(statement, "xls")}
                                    className="hidden sm:block rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:border-teal-600 hover:text-teal-700 transition">Excel</button>
                                  <button type="button" onClick={() => exportStatementFile(statement, "pdf")}
                                    className="hidden sm:block rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:border-teal-600 hover:text-teal-700 transition">PDF</button>
                                </>
                              )}
                              <button type="button" onClick={() => openStatement(statement)}
                                className="rounded-lg border border-teal-700 bg-teal-700 px-2.5 py-1 text-xs font-bold text-white hover:bg-teal-800 transition">Edit</button>
                              {isAdmin && (
                                <button type="button" onClick={() => deleteStatement(statement)}
                                  className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-red-600 hover:bg-red-100 transition"
                                  title="Delete statement">
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {showStatementWorkspace && !selectedStatement && (
            <Panel id="statement-form-panel" className="lg:col-span-2">
              <h2 className="mb-4 text-lg font-black tracking-tight">Create {truckTypeLabel(entryTruckType)} Statement</h2>
              <form className="grid gap-3 md:grid-cols-4" onSubmit={saveStatement}>
                <Field label="Month">
                  <Input type="month" required value={statementForm.month}
                    onChange={async (event) => {
                      const month = event.target.value;
                      setStatementForm((current) => ({ ...current, month }));
                      if (!statementForm.id && month) {
                        try { const statementNumber = await getNextStatementNumber(month); setStatementForm((current) => ({ ...current, month, statementNumber })); }
                        catch (err) { flash(err.message, "error"); }
                      }
                    }} />
                </Field>
                <Field label="Truck Type"><Input value={truckTypeLabel(entryTruckType)} disabled readOnly /></Field>
                <Field label="Statement No"><Input type="number" min="1" required placeholder="Statement number" value={statementForm.statementNumber} onChange={(e) => setStatementForm({ ...statementForm, statementNumber: e.target.value })} /></Field>
                <Field label="Statement Date"><Input type="date" required value={statementForm.statementDate} onChange={(e) => setStatementForm({ ...statementForm, statementDate: e.target.value })} /></Field>
                <div className="flex flex-wrap items-end gap-2 md:col-span-4">
                  <Button type="submit">Create Statement</Button>
                  <Button type="button" variant="secondary" onClick={backToStatementList}>Cancel</Button>
                </div>
              </form>
            </Panel>
          )}

          {selectedStatement && (
            <>
              {/* ── Compact statement info bar ─────────────────────────────── */}
              <div className="lg:col-span-2 rounded-2xl bg-slate-900 px-4 py-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <button type="button" onClick={backToStatementList}
                    className="flex items-center gap-1.5 text-sm font-black text-slate-400 hover:text-white transition shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
                    Back
                  </button>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-black text-white">Stmt {selectedStatement.statementNumber}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-black ${selectedStatement.truckType === "With Crane" ? "bg-teal-500/20 text-teal-300" : "bg-sky-500/20 text-sky-300"}`}>{truckTypeLabel(selectedStatement.truckType)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-black ${selectedStatement.status === "Draft" ? "bg-amber-500/20 text-amber-300" : selectedStatement.status === "Finished" ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300"}`}>{selectedStatement.status}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="text-slate-300 font-bold">{statementRows.length}/30</span>
                    <span className="text-slate-300 font-bold">{totals.qty.toFixed(3)}T</span>
                    <span className="text-white font-black">${money(totals.amount)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button type="button" onClick={() => setExpandStatementEdit((v) => !v)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-black transition ${expandStatementEdit ? "border-slate-500 bg-slate-700 text-white" : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"}`}>
                      {expandStatementEdit ? "Hide" : "Edit"}
                    </button>
                    {!isDraft && <button type="button" onClick={reopenStatement} className="rounded-lg border border-amber-800 px-3 py-1.5 text-xs font-black text-amber-300 hover:border-amber-600 transition">Reopen</button>}
                    {canFinishStatement && <button type="button" onClick={finishStatement} className="rounded-lg border border-emerald-700 bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-500 transition">Finish</button>}
                  </div>
                </div>
              </div>

              {/* ── Collapsible statement edit form ───────────────────────── */}
              {expandStatementEdit && (
                <Panel className="lg:col-span-2">
                  <h2 className="mb-3 text-base font-black tracking-tight text-slate-700">Statement Details</h2>
                  <form className="grid gap-3 md:grid-cols-4" onSubmit={saveStatement}>
                    <Field label="Month">
                      <Input type="month" required value={statementForm.month}
                        onChange={async (event) => {
                          const month = event.target.value;
                          setStatementForm((current) => ({ ...current, month }));
                          if (!statementForm.id && month) {
                            try { const statementNumber = await getNextStatementNumber(month); setStatementForm((current) => ({ ...current, month, statementNumber })); }
                            catch (err) { flash(err.message, "error"); }
                          }
                        }} />
                    </Field>
                    <Field label="Truck Type"><Input value={truckTypeLabel(entryTruckType)} disabled readOnly /></Field>
                    <Field label="Statement No"><Input type="number" min="1" required value={statementForm.statementNumber} onChange={(e) => setStatementForm({ ...statementForm, statementNumber: e.target.value })} /></Field>
                    <Field label="Statement Date"><Input type="date" required value={statementForm.statementDate} onChange={(e) => setStatementForm({ ...statementForm, statementDate: e.target.value })} /></Field>
                    <div className="flex flex-wrap gap-2 md:col-span-4">
                      <Button type="submit">Save Changes</Button>
                      <Button type="button" variant="secondary" onClick={() => setExpandStatementEdit(false)}>Close</Button>
                    </div>
                  </form>
                </Panel>
              )}

              <Panel className="lg:col-span-2">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-black tracking-tight">{isEditingDelivery ? "Edit Delivery Row" : "Delivery Entry"}</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    Stmt {selectedStatement.statementNumber} · {statementRows.length}/30
                  </span>
                </div>
                <form ref={deliveryFormRef} className="grid gap-3 md:grid-cols-4" onSubmit={saveDelivery}>
                  <Field label="Delivery Date"><Input type="date" required disabled={!canEditRows} style={activeField === "deliveryDate" ? { backgroundColor: "#fef08a" } : {}} onFocus={() => setActiveField("deliveryDate")} onBlur={() => setActiveField("")} value={deliveryForm.deliveryDate} onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryDate: e.target.value })} /></Field>
                  <Field label={
                    <span className="flex items-center justify-between">
                      <span>Invoice No</span>
                      <span className={`normal-case tracking-normal tabular-nums ${deliveryForm.invoiceNo.length === 10 ? "text-emerald-600" : deliveryForm.invoiceNo.length > 0 ? "text-amber-600" : "text-slate-400"}`}>
                        {deliveryForm.invoiceNo.length}/10
                      </span>
                    </span>
                  }>
                    <Input
                      ref={invoiceInputRef}
                      required
                      disabled={!canEditRows}
                      inputMode="numeric"
                      maxLength="10"
                      pattern="[0-9]{10}"
                      placeholder="10 digit number"
                      style={activeField === "invoiceNo" ? { backgroundColor: "#fef08a" } : {}}
                      onFocus={() => setActiveField("invoiceNo")}
                      onBlur={() => setActiveField("")}
                      value={deliveryForm.invoiceNo}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setDeliveryForm({ ...deliveryForm, invoiceNo: val });
                        if (val.length === 10) truckInputRef.current?.focus();
                      }}
                    />
                  </Field>
                  <Field label="Truck No">
                    <Input
                      ref={truckInputRef}
                      list="delivery-truck-options"
                      required
                      disabled={!canEditRows}
                      placeholder="Type truck"
                      style={activeField === "truckNo" ? { backgroundColor: "#fef08a" } : {}}
                      onFocus={() => setActiveField("truckNo")}
                      onBlur={() => {
                        setActiveField("");
                        if (deliveryForm.truckNo && (truckMissing || truckTypeMismatch)) {
                          setTimeout(() => truckInputRef.current?.focus(), 0);
                        }
                      }}
                      value={deliveryForm.truckNo}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, truckNo: e.target.value.toUpperCase() })}
                    />
                    <datalist id="delivery-truck-options">
                      {truckOptions.map((truck) => <option key={truck.truckNo} value={truck.truckNo} />)}
                    </datalist>
                  </Field>
                  <Field label="To Location">
                    <Input
                      list="delivery-location-options"
                      required
                      disabled={!canEditRows}
                      placeholder="Type location"
                      style={activeField === "toLocation" ? { backgroundColor: "#fef08a" } : {}}
                      onFocus={() => setActiveField("toLocation")}
                      onBlur={() => setActiveField("")}
                      value={deliveryForm.toLocation}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, toLocation: e.target.value })}
                    />
                    <datalist id="delivery-location-options">
                      {locations.map((location) => <option key={location} value={location} />)}
                    </datalist>
                  </Field>
                  {isEditingDelivery && (
                    <Field label="From Location">
                      <Select
                        required
                        disabled={!canEditRows}
                        style={activeField === "fromLocation" ? { backgroundColor: "#fef08a" } : {}}
                        onFocus={() => setActiveField("fromLocation")}
                        onBlur={() => setActiveField("")}
                        value={deliveryForm.fromLocation}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, fromLocation: e.target.value })}
                      >
                        <option value="Warehouse-09">Warehouse-09</option>
                        <option value="GS01">GS01</option>
                      </Select>
                    </Field>
                  )}
                  <Field label="QTY(T)">
                    <Input type="number" step="any" min="0" required disabled={!canEditRows} style={activeField === "qtyTon" ? { backgroundColor: "#fef08a" } : {}} onFocus={() => setActiveField("qtyTon")} onBlur={() => setActiveField("")} value={deliveryForm.qtyTon} onChange={(e) => setDeliveryForm({ ...deliveryForm, qtyTon: e.target.value })} />
                    {selectedPrice && Number(deliveryForm.qtyTon) > 0 && (
                      <div className="mt-1 text-[11px] font-black text-teal-700">
                        {Number(deliveryForm.qtyTon).toFixed(3)}T × ${unitMoney(selectedPrice.companyUnitPrice)} = <span className="text-teal-900">${money(Number(deliveryForm.qtyTon) * Number(selectedPrice.companyUnitPrice))}</span>
                      </div>
                    )}
                  </Field>
                  <Field label="Unit Price"><Input disabled value={selectedPrice ? `$${unitMoney(selectedPrice.companyUnitPrice)}` : ""} readOnly /></Field>
                  {(duplicateInvoice || truckMissing || truckTypeMismatch || missingPrice) && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 md:col-span-4">
                      {duplicateInvoice && <div>Invoice already exists in Statement {duplicateInvoiceStatement?.statementNumber ?? "unknown"}. Check before saving.</div>}
                      {truckMissing && <div>Truck number does not exist or is inactive.</div>}
                      {truckTypeMismatch && <div>This truck belongs to {truckTypeLabel(selectedTruck.truckType)}, so it cannot be saved inside a {truckTypeLabel(selectedStatement.truckType)} statement.</div>}
                      {missingPrice && <div>No active price found for this location and delivery date. Add the price in Setup before saving.</div>}
                    </div>
                  )}
                  <div className="flex flex-wrap items-end gap-2 md:col-span-2">
                    <Button type="submit" disabled={!canSaveDelivery}>{isEditingDelivery ? "Update Row" : "Save Delivery"}</Button>
                    <Button type="button" variant="secondary" onClick={() => resetDeliveryForm()}>Cancel</Button>
                    {isDraft && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={finishStatement}
                        disabled={!canFinishStatement}
                        title={canFinishStatement ? "Finish this statement" : "Add at least one delivery row before finishing"}
                      >
                        Finish
                      </Button>
                    )}
                  </div>
                </form>
              </Panel>

          <Panel className="lg:col-span-2">
            <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-lg font-black tracking-tight">Current Statement Rows</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm font-black text-slate-600">
                <span>QTY: {totals.qty.toFixed(4)}T</span>
                <span>Total: ${money(totals.amount)}</span>
                {statementRows.some((r) => r.highlighted) && (
                  <Button type="button" variant="secondary" onClick={clearHighlights}>Clear Highlights</Button>
                )}
              </div>
            </div>
            {(() => {
              const count = statementRows.length;
              const pct = Math.round((count / 30) * 100);
              const barColor = count >= 29 ? "bg-red-500" : count >= 25 ? "bg-amber-400" : "bg-teal-500";
              const textColor = count >= 29 ? "text-red-700" : count >= 25 ? "text-amber-700" : "text-slate-500";
              return (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-black ${textColor}`}>
                      {count} / 30 rows {count >= 29 ? "— Full! Start a new statement." : count >= 25 ? "— Almost full" : ""}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{pct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
            <div className="overflow-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1100px] border-collapse bg-white text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    {["No", "Delivery Date", "Invoice Number", "Truck Number", "Type of Truck", "From Location", "To Location", "QTY(T)", "Unit Price", "Total Amount"].map((heading) => (
                      <th key={heading} className="border-b border-slate-800 px-3 py-3 text-left font-black">{heading}</th>
                    ))}
                    <th className="border-b border-slate-800 px-3 py-3 text-left font-black">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {statementRows.map((row, index) => (
                    <tr key={row.id} className={`border-b border-slate-100 transition ${deliveryForm.id === row.id ? "bg-teal-50" : row.highlighted ? "bg-yellow-100" : "odd:bg-white even:bg-slate-50 hover:bg-sky-50"}`}>
                      <td className="px-3 py-3">{index + 1}</td>
                      <td className="px-3 py-3 text-center">{formatDate(row.deliveryDate)}</td>
                      <td className="px-3 py-3">{row.invoiceNo}</td>
                      <td className="px-3 py-3 font-bold">{row.truckNo}</td>
                      <td className="px-3 py-3">{truckTypeLabel(row.truckType)}</td>
                      <td className="px-3 py-3">{row.fromLocation}</td>
                      <td className="px-3 py-3">{row.toLocation}</td>
                      <td className="px-3 py-3 text-right font-bold">{Number(row.qtyTon).toFixed(5)}T</td>
                      <td className="px-3 py-3 text-right">$ {unitMoney(row.companyUnitPrice)}</td>
                      <td className="px-3 py-3 text-right font-bold">$ {money(row.companyTotalAmount)}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <Button type="button" variant="secondary" onClick={() => editDelivery(row)} disabled={!isDraft}>Edit</Button>
                          <Button type="button" variant="danger" onClick={() => deleteDelivery(row)} disabled={!isDraft}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
            </>
          )}
        </main>
  );
}
