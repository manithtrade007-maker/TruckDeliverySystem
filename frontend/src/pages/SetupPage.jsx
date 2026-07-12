import { useApp } from "../AppContext.js";
import { Button, Input, Select, Field, Panel, KpiCard, MetricCard, PageHead } from "../components/ui.jsx";
import { localDate, today, currentMonth, money, roundMoney, unitMoney, parseMoney, locationMatchKey, locationBaseKey, priceEffectiveDate, routeKey, CRANE_LOCATION_ORDER, NO_CRANE_LOCATION_ORDER, makeLocationSort, craneLocationSort, noCraneLocationSort, deliverySort, truckTypeLabel, formatDate, formatDateTime, monthName, groupPriceHistory } from "../lib/format.js";
import { getToken, getRole, setToken, setRole, api, downloadFile } from "../lib/api.js";

export function SetupPage() {
  const { activeCompanyPriceCounts, activeCompanyPriceRows, applyBulkPriceUpdate, backupFiles, bulkExistingDates, bulkPriceForm, bulkPriceRows, companyPriceGroups, createManualBackup, createStaffUser, data, deletePrice, deletePricesByDate, deleteStaffUser, deleteTruck, downloadBackup, driverPriceForm, driverPriceGroups, editPasswordId, editPasswordValue, isAdmin, isEditingTruck, locations, newUserForm, priceCompareDates, priceForm, saveDriverPrice, savePrice, saveSettings, saveStaffPassword, saveTruck, sendToTelegram, setBulkLocationFilter, setBulkPriceForm, setDriverPriceForm, setEditPasswordId, setEditPasswordValue, setNewUserForm, setPriceForm, setSettingsForm, setSetupLocationSearch, setSetupSection, setTruckForm, settingsForm, setupLocationSearch, setupSection, staffUsers, telegramConfigured, truckForm } = useApp();
  return (
        <main className="mx-auto grid max-w-[1500px] gap-4 p-4 pb-20 lg:pb-4">
          <PageHead title="Setup" meta="Manage trucks, company price, and driver price separately." />

          {/* System overview */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Trucks", value: data.trucks.length, sub: `${data.trucks.filter((t) => t.active !== false).length} active`, tone: "border-teal-200 bg-teal-50 text-teal-950 text-teal-700" },
              { label: "Crane Locations", value: activeCompanyPriceCounts.withCrane, sub: "active prices", tone: "border-sky-200 bg-sky-50 text-sky-950 text-sky-600" },
              { label: "No-Crane Locations", value: activeCompanyPriceCounts.withoutCrane, sub: "active prices", tone: "border-amber-200 bg-amber-50 text-amber-950 text-amber-600" },
              { label: "Staff Users", value: staffUsers.length, sub: "can do data entry", tone: "border-slate-200 bg-white text-slate-900 text-slate-500" },
            ].map(({ label, value, sub, tone }) => {
              const [border, bg, textVal, textSub] = tone.split(" ");
              return (
                <div key={label} className={`rounded-2xl border p-4 shadow-sm ${border} ${bg}`}>
                  <div className="text-[10px] font-black uppercase tracking-wider opacity-50">{label}</div>
                  <div className={`mt-1 text-2xl font-black ${textVal}`}>{value}</div>
                  <div className={`mt-0.5 text-xs font-bold ${textSub}`}>{sub}</div>
                </div>
              );
            })}
          </div>

          {/* Tab strip with icons */}
          <Panel>
            <div className="grid gap-1 rounded-2xl bg-slate-100 p-1 sm:grid-cols-5">
              {[
                ["trucks", "Truck Master", <><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>],
                ["company", "Company Price", <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>],
                ["driver", "Driver Price", <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="16" y1="11" x2="22" y2="11"/><line x1="19" y1="8" x2="19" y2="14"/></>],
                ["bulk", "Bulk Update", <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>],
                ["users", "Users", <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>],
              ].map(([key, label, iconPaths]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSetupSection(key)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-black transition ${setupSection === key ? "bg-teal-700 text-white shadow-sm" : "bg-white text-slate-600 hover:text-slate-950"}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    {iconPaths}
                  </svg>
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </Panel>

          {setupSection === "trucks" && (
            <Panel>
              <h2 className="mb-3 text-lg font-bold">Truck Master</h2>
              <form className="grid gap-3 md:grid-cols-5" onSubmit={saveTruck}>
                <Input placeholder="Truck No" required value={truckForm.truckNo} onChange={(e) => setTruckForm({ ...truckForm, truckNo: e.target.value.toUpperCase() })} />
                <Select value={truckForm.truckType} onChange={(e) => setTruckForm({ ...truckForm, truckType: e.target.value })}>
                  <option value="With Crane">Crane</option>
                  <option value="Without Crane">No Crane</option>
                </Select>
                <Input placeholder="Driver Name" value={truckForm.driverName} onChange={(e) => setTruckForm({ ...truckForm, driverName: e.target.value })} />
                <Input placeholder="Phone" value={truckForm.phone} onChange={(e) => setTruckForm({ ...truckForm, phone: e.target.value })} />
                <div className="flex gap-2">
                  <Button type="submit">{isEditingTruck ? "Save Truck" : "Add Truck"}</Button>
                  {isEditingTruck && (
                    <Button type="button" variant="secondary" onClick={() => setTruckForm({ truckNo: "", truckType: "With Crane", driverName: "", phone: "" })}>Cancel</Button>
                  )}
                </div>
              </form>
              <div className="mt-4 grid gap-5 max-h-[640px] overflow-auto pr-1">
                {["With Crane", "Without Crane"].map((truckType) => {
                  const isCrane = truckType === "With Crane";
                  const trucks = data.trucks.filter((t) => t.truckType === truckType);
                  return (
                    <div key={truckType}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${isCrane ? "bg-teal-500" : "bg-sky-500"}`} />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
                          {truckTypeLabel(truckType)} — {trucks.length} trucks
                        </h3>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {trucks.map((truck) => {
                          const isActive = truck.active !== false;
                          return (
                            <div key={truck.truckNo} className={`overflow-hidden rounded-2xl border shadow-sm ${isActive ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
                              <div className={`flex items-center justify-between px-4 py-3 ${isCrane ? "bg-teal-700" : "bg-sky-700"}`}>
                                <div className="flex items-center gap-2">
                                  <span className="text-base font-black tracking-tight text-white">{truck.truckNo}</span>
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isCrane ? "bg-teal-500/40 text-white" : "bg-sky-500/40 text-white"}`}>
                                    {isCrane ? "CRANE" : "NO CRANE"}
                                  </span>
                                </div>
                                {!isActive && (
                                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black text-white">Inactive</span>
                                )}
                              </div>
                              <div className="bg-white px-4 py-3">
                                <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                  {truck.driverName || <span className="font-bold text-slate-400">No driver assigned</span>}
                                </div>
                                {truck.phone && (
                                  <div className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                    {truck.phone}
                                  </div>
                                )}
                                <div className="mt-3 flex gap-2">
                                  <Button type="button" variant="secondary" onClick={() => setTruckForm(truck)}>Edit</Button>
                                  <Button type="button" variant="danger" onClick={() => deleteTruck(truck)}>Delete</Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {trucks.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-bold text-slate-400">
                            No {truckTypeLabel(truckType).toLowerCase()} trucks yet.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {setupSection === "bulk" && (
            <Panel>
              <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold">Bulk Price Update</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    Paste fixed system locations and new prices. The system will block unknown or duplicated locations before updating.
                  </p>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-black text-teal-800">
                  {bulkPriceRows.filter((row) => row.valid).length} ready / {bulkPriceRows.length} rows
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <Field label="Price Update Type">
                  <Select value={bulkPriceForm.priceType} onChange={(e) => setBulkPriceForm({ ...bulkPriceForm, priceType: e.target.value })}>
                    <option value="both">Company + Driver</option>
                    <option value="company">Company Price Only</option>
                    <option value="driver">Driver Price Only</option>
                  </Select>
                </Field>
                <Field label="Truck Type">
                  <Select value={bulkPriceForm.truckType} onChange={(e) => { setBulkPriceForm({ ...bulkPriceForm, truckType: e.target.value }); setBulkLocationFilter(""); }}>
                    <option value="With Crane">Crane</option>
                    <option value="Without Crane">No Crane</option>
                  </Select>
                </Field>
                <Field label="Effective Date">
                  <Input type="date" required value={bulkPriceForm.effectiveDate} onChange={(e) => setBulkPriceForm({ ...bulkPriceForm, effectiveDate: e.target.value })} />
                  {bulkExistingDates.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {bulkExistingDates.map((d) => (
                        <button key={d} type="button"
                          onClick={() => setBulkPriceForm((f) => ({ ...f, effectiveDate: d }))}
                          className={`rounded px-2 py-0.5 text-xs font-medium border transition-colors ${d === bulkPriceForm.effectiveDate ? "bg-teal-600 text-white border-teal-600" : "bg-white text-slate-600 border-slate-300 hover:border-teal-400 hover:text-teal-700"}`}>
                          {formatDate(d)}
                        </button>
                      ))}
                    </div>
                  )}
                </Field>
                <Field label="From Location">
                  <Input placeholder={data.settings.defaultFromLocation || "Warehouse-09"} value={bulkPriceForm.fromLocation} onChange={(e) => setBulkPriceForm({ ...bulkPriceForm, fromLocation: e.target.value })} />
                </Field>
              </div>

              {(() => {
                const order = bulkPriceForm.truckType === "With Crane" ? CRANE_LOCATION_ORDER : NO_CRANE_LOCATION_ORDER;
                const provinceGroups = [];
                const seen = new Map();
                for (const loc of order) {
                  const m = loc.match(/\(([^)]+)\)$/);
                  const prov = m ? m[1] : "Other";
                  if (!seen.has(prov)) { seen.set(prov, []); provinceGroups.push(prov); }
                  seen.get(prov).push(loc);
                }
                return (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500 font-medium mb-2">Click a province to fill the Location box, then paste your prices:</p>
                    <div className="flex flex-wrap gap-2">
                      {provinceGroups.map((prov) => {
                        const locs = seen.get(prov);
                        return (
                          <button key={prov} type="button"
                            onClick={() => setBulkPriceForm((f) => ({ ...f, locationsText: locs.join("\n"), pricesText: "", driverPricesText: "", rowsText: "" }))}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-teal-50 hover:border-teal-500 hover:text-teal-700 transition">
                            {prov} <span className="text-xs font-normal text-slate-400">({locs.length})</span>
                          </button>
                        );
                      })}
                      <button type="button"
                        onClick={() => setBulkPriceForm((f) => ({ ...f, locationsText: order.join("\n"), pricesText: "", driverPricesText: "", rowsText: "" }))}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition">
                        All <span className="text-xs font-normal opacity-80">({order.length})</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.3fr]">
                <div>
                  <div className={`grid gap-3 ${bulkPriceForm.priceType === "both" ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                    <Field label="Location">
                      <textarea
                        className="min-h-[260px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                        placeholder={"KH.Dangkao (PP)\nKH.Mean Chey (PP)\nD.Ang Snuol (Kandal)"}
                        value={bulkPriceForm.locationsText}
                        onChange={(e) => setBulkPriceForm({ ...bulkPriceForm, locationsText: e.target.value, rowsText: "" })}
                      />
                    </Field>
                    <Field label={bulkPriceForm.priceType === "driver" ? "Driver Price" : "Company Price"}>
                      <textarea
                        className="min-h-[260px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                        placeholder={"7.51\n7.89\n9.12"}
                        value={bulkPriceForm.pricesText}
                        onChange={(e) => setBulkPriceForm({ ...bulkPriceForm, pricesText: e.target.value })}
                      />
                    </Field>
                    {bulkPriceForm.priceType === "both" && (
                      <Field label="Driver Price">
                        <textarea
                          className="min-h-[260px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                          placeholder={"7.00\n7.20\n8.40"}
                          value={bulkPriceForm.driverPricesText}
                          onChange={(e) => setBulkPriceForm({ ...bulkPriceForm, driverPricesText: e.target.value })}
                        />
                      </Field>
                    )}
                  </div>
                  {(() => {
                    const locCount = (bulkPriceForm.locationsText || bulkPriceForm.rowsText).split(/\r?\n/).map(l => l.trim()).filter(Boolean).length;
                    const priceCount = bulkPriceForm.pricesText.split(/\r?\n/).map(l => l.trim()).filter(Boolean).length;
                    const driverCount = bulkPriceForm.priceType === "both" ? bulkPriceForm.driverPricesText.split(/\r?\n/).map(l => l.trim()).filter(Boolean).length : priceCount;
                    if (locCount === 0 && priceCount === 0) return null;
                    const mismatch = locCount !== priceCount || (bulkPriceForm.priceType === "both" && locCount !== driverCount);
                    return mismatch ? (
                      <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                        {locCount} location{locCount !== 1 ? "s" : ""} but {priceCount} price{priceCount !== 1 ? "s" : ""}
                        {bulkPriceForm.priceType === "both" && locCount !== driverCount ? ` and ${driverCount} driver price${driverCount !== 1 ? "s" : ""}` : ""}
                        {" "}— counts must match exactly.
                      </div>
                    ) : (
                      <div className="mt-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-bold text-teal-700">
                        {locCount} location{locCount !== 1 ? "s" : ""} and {priceCount} price{priceCount !== 1 ? "s" : ""} — counts match ✓
                      </div>
                    );
                  })()}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(() => {
                      const locCount = (bulkPriceForm.locationsText || bulkPriceForm.rowsText).split(/\r?\n/).map(l => l.trim()).filter(Boolean).length;
                      const priceCount = bulkPriceForm.pricesText.split(/\r?\n/).map(l => l.trim()).filter(Boolean).length;
                      const driverCount = bulkPriceForm.priceType === "both" ? bulkPriceForm.driverPricesText.split(/\r?\n/).map(l => l.trim()).filter(Boolean).length : priceCount;
                      const countMismatch = locCount > 0 && (locCount !== priceCount || (bulkPriceForm.priceType === "both" && locCount !== driverCount));
                      return (
                        <Button type="button" onClick={applyBulkPriceUpdate} disabled={bulkPriceRows.length < 1 || bulkPriceRows.some((row) => !row.valid) || countMismatch}>
                          Apply Price Update
                        </Button>
                      );
                    })()}
                    <Button type="button" variant="secondary" onClick={() => setBulkPriceForm({ ...bulkPriceForm, locationsText: "", pricesText: "", driverPricesText: "", rowsText: "" })}>
                      Clear
                    </Button>
                    <Button type="button" variant="danger" onClick={deletePricesByDate}>
                      Delete All Prices for This Date
                    </Button>
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-500">
                    Paste the same number of rows in Location and Price. All rows must match an existing system location before Apply is enabled.
                  </p>
                </div>

                <div className="overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[760px] border-collapse bg-white text-sm">
                    <thead className="bg-slate-900 text-white">
                      <tr>
                        <th className="px-3 py-3 text-left font-black">Pasted Location</th>
                        <th className="px-3 py-3 text-left font-black">System Location</th>
                        <th className="px-3 py-3 text-right font-black">Old Price</th>
                        <th className="px-3 py-3 text-right font-black">New Price</th>
                        <th className="px-3 py-3 text-left font-black">Comparison</th>
                        <th className="px-3 py-3 text-center font-black">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPriceRows.map((row) => (
                        <tr key={row.line} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                          <td className="px-3 py-3 font-bold">{row.rawLocation || `Line ${row.line}`}</td>
                          <td className="px-3 py-3 font-bold text-teal-800">{row.toLocation || "No match"}</td>
                          <td className="px-3 py-3 text-right">
                            {bulkPriceForm.priceType === "both"
                              ? `$ ${unitMoney(row.currentCompanyUnitPrice)} / $ ${unitMoney(row.currentTruckSalaryUnitPrice)}`
                              : `$ ${unitMoney(row.oldPrice)}`}
                          </td>
                          <td className="px-3 py-3 text-right font-black">
                            {bulkPriceForm.priceType === "both"
                              ? `${row.companyUnitPrice === "" ? "Missing" : `$ ${unitMoney(row.companyUnitPrice)}`} / ${row.truckSalaryUnitPrice === "" ? "Missing" : `$ ${unitMoney(row.truckSalaryUnitPrice)}`}`
                              : row.newPrice === "" ? "Missing" : `$ ${unitMoney(row.newPrice)}`}
                          </td>
                          <td className="px-3 py-3 font-bold">{row.compareText}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-black ${row.valid ? "bg-teal-100 text-teal-800" : "bg-rose-100 text-rose-700"}`}>
                              {row.statusText || (row.valid ? "Approve" : "Check")}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {bulkPriceRows.length === 0 && (
                        <tr>
                          <td className="px-3 py-6 text-center text-sm font-bold text-slate-500" colSpan="6">
                            Paste locations and prices to verify before applying.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Panel>
          )}

          {setupSection === "active-prices" && (
            <Panel>
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold">Active Company Prices</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    Latest active company price per location as of {formatDate(today())}.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">
                  Crane {activeCompanyPriceCounts.withCrane} | No Crane {activeCompanyPriceCounts.withoutCrane} | Total {activeCompanyPriceCounts.total}
                </span>
              </div>
              <div className="mb-4 max-w-2xl">
                <Field label="Search To Location">
                  <Input
                    placeholder="Type location name"
                    value={setupLocationSearch}
                    onChange={(event) => setSetupLocationSearch(event.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <KpiCard label="Crane Locations" value={activeCompanyPriceCounts.withCrane} tone="teal" />
                <KpiCard label="No Crane Locations" value={activeCompanyPriceCounts.withoutCrane} tone="sky" />
                <KpiCard label="Total Active Locations" value={activeCompanyPriceCounts.total} />
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {["With Crane", "Without Crane"].map((truckType) => {
                  const rows = activeCompanyPriceRows.filter((price) => price.truckType === truckType);
                  return (
                    <div key={truckType} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className={`flex items-center justify-between px-4 py-3 ${truckType === "With Crane" ? "bg-teal-50" : "bg-sky-50"}`}>
                        <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">{truckTypeLabel(truckType)}</h3>
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-slate-600">{rows.length} locations</span>
                      </div>
                      <div className="max-h-[620px] overflow-auto">
                        <table className="w-full min-w-[620px] border-collapse text-sm">
                          <thead className="sticky top-0 bg-slate-900 text-white">
                            <tr>
                              <th className="w-14 px-3 py-3 text-center font-black">No</th>
                              <th className="px-3 py-3 text-left font-black">To Location</th>
                              <th className="w-24 px-3 py-3 text-right font-black">KM</th>
                              <th className="w-32 px-3 py-3 text-right font-black">Company Price</th>
                              <th className="w-32 px-3 py-3 text-center font-black">Effective</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((price, index) => (
                              <tr key={price.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                                <td className="px-3 py-3 text-center font-bold">{index + 1}</td>
                                <td className="px-3 py-3 font-black">{price.toLocation}</td>
                                <td className="px-3 py-3 text-right tabular-nums">{price.distanceKm || ""}</td>
                                <td className="px-3 py-3 text-right font-black tabular-nums">$ {unitMoney(price.companyUnitPrice)}</td>
                                <td className="px-3 py-3 text-center text-xs font-bold text-slate-500">{formatDate(priceEffectiveDate(price))}</td>
                              </tr>
                            ))}
                            {rows.length === 0 && (
                              <tr>
                                <td className="px-3 py-6 text-center text-sm font-bold text-slate-500" colSpan="5">
                                  No active company prices for {truckTypeLabel(truckType)}.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {setupSection === "company" && (
            <Panel>
              <h2 className="mb-3 text-lg font-bold">Company Price</h2>
              <form className="grid gap-3" onSubmit={savePrice}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="From Location"><Input placeholder="From Location" required value={priceForm.fromLocation} onChange={(e) => setPriceForm({ ...priceForm, fromLocation: e.target.value })} /></Field>
                  <Field label="To Location"><Input placeholder="To Location" required value={priceForm.toLocation} onChange={(e) => setPriceForm({ ...priceForm, toLocation: e.target.value })} /></Field>
                  <Field label="Truck Type">
                    <Select value={priceForm.truckType} onChange={(e) => setPriceForm({ ...priceForm, truckType: e.target.value })}>
                      <option value="With Crane">Crane</option>
                      <option value="Without Crane">No Crane</option>
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Effective Date"><Input type="date" required value={priceForm.effectiveDate || today()} onChange={(e) => setPriceForm({ ...priceForm, effectiveDate: e.target.value })} /></Field>
                  <Field label="Distance (KM)"><Input type="number" step="0.1" placeholder="e.g. 25.5" value={priceForm.distanceKm} onChange={(e) => setPriceForm({ ...priceForm, distanceKm: e.target.value })} /></Field>
                  <Field label="Company Price ($)"><Input type="number" step="0.001" placeholder="e.g. 7.500" required value={priceForm.companyUnitPrice} onChange={(e) => setPriceForm({ ...priceForm, companyUnitPrice: e.target.value })} /></Field>
                  <Field label=" ">
                    <div className="flex gap-2">
                      <Button type="submit">{priceForm.id ? "Save" : "Add Price"}</Button>
                      {priceForm.id && (
                        <Button type="button" variant="secondary" onClick={() => setPriceForm({ id: "", fromLocation: data.settings.defaultFromLocation || "", toLocation: "", truckType: priceForm.truckType, distanceKm: "", companyUnitPrice: "", truckSalaryUnitPrice: "", effectiveDate: priceCompareDates[priceCompareDates.length - 1] || today() })}>Cancel</Button>
                      )}
                    </div>
                  </Field>
                </div>
              </form>
              <div className="mt-4 max-w-2xl">
                <Field label="Search To Location">
                  <Input
                    placeholder="Type location name"
                    value={setupLocationSearch}
                    onChange={(event) => setSetupLocationSearch(event.target.value)}
                  />
                </Field>
              </div>
              <div className="mt-4 grid max-h-[620px] gap-2 overflow-auto pr-1">
                  <div className="grid gap-2">
                    <h3 className="mt-2 text-sm font-black uppercase tracking-wide text-slate-500">{truckTypeLabel(priceForm.truckType)}</h3>
                    {companyPriceGroups.map((group) => (
                      <div key={group.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
                          <div>
                            <strong className="block text-base">{group.fromLocation} to {group.toLocation}</strong>
                            <span className="text-xs font-bold text-slate-500">
                              {truckTypeLabel(group.truckType)} | {group.versions.length} price version{group.versions.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="rounded-xl bg-teal-50 px-3 py-2 text-right">
                            <div className="text-[11px] font-black uppercase tracking-wide text-teal-700">Active Today</div>
                            <div className="text-lg font-black text-teal-950">{group.activePrice ? `$ ${unitMoney(group.activePrice.companyUnitPrice)}` : "No active price"}</div>
                            {group.activePrice && <div className="text-xs font-bold text-teal-700">from {formatDate(priceEffectiveDate(group.activePrice))}</div>}
                          </div>
                        </div>
                        <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
                          {group.versions.map((price) => {
                            const isActive = price.id === group.activePrice?.id;
                            return (
                              <div key={price.id} className={`grid gap-3 border-b border-slate-100 p-3 last:border-b-0 md:grid-cols-[130px_1fr_auto] md:items-center ${isActive ? "bg-teal-50/70" : "bg-white"}`}>
                                <div className="font-black text-slate-900">{formatDate(priceEffectiveDate(price))}</div>
                                <div className="text-sm font-bold text-slate-600">
                                  {Number(price.distanceKm || 0).toFixed(1)} KM | Company $ {unitMoney(price.companyUnitPrice)}
                                  {isActive && <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-black text-teal-800">Active</span>}
                                  {price.active === false && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-500">Inactive</span>}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button type="button" variant="secondary" onClick={() => setPriceForm({ ...price, effectiveDate: priceEffectiveDate(price) })}>Edit</Button>
                                  <Button type="button" variant="danger" onClick={() => deletePrice(price)}>Delete</Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
            </Panel>
          )}

          {setupSection === "driver" && (
            <Panel>
              <h2 className="mb-3 text-lg font-bold">Driver Price</h2>
              <form className="grid gap-3" onSubmit={saveDriverPrice}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="From Location"><Input placeholder="From Location" required value={driverPriceForm.fromLocation} onChange={(e) => setDriverPriceForm({ ...driverPriceForm, fromLocation: e.target.value })} /></Field>
                  <Field label="To Location"><Input placeholder="To Location" required value={driverPriceForm.toLocation} onChange={(e) => setDriverPriceForm({ ...driverPriceForm, toLocation: e.target.value })} /></Field>
                  <Field label="Truck Type">
                    <Select value={driverPriceForm.truckType} onChange={(e) => setDriverPriceForm({ ...driverPriceForm, truckType: e.target.value })}>
                      <option value="With Crane">Crane</option>
                      <option value="Without Crane">No Crane</option>
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Effective Date"><Input type="date" required value={driverPriceForm.effectiveDate || today()} onChange={(e) => setDriverPriceForm({ ...driverPriceForm, effectiveDate: e.target.value })} /></Field>
                  <Field label="Distance (KM)"><Input type="number" step="0.1" placeholder="e.g. 25.5" value={driverPriceForm.distanceKm} onChange={(e) => setDriverPriceForm({ ...driverPriceForm, distanceKm: e.target.value })} /></Field>
                  <Field label="Driver Price ($)"><Input type="number" step="0.001" placeholder="e.g. 6.500" required value={driverPriceForm.truckSalaryUnitPrice} onChange={(e) => setDriverPriceForm({ ...driverPriceForm, truckSalaryUnitPrice: e.target.value })} /></Field>
                  <Field label=" ">
                    <div className="flex gap-2">
                      <Button type="submit">{driverPriceForm.id ? "Save" : "Add Price"}</Button>
                      {driverPriceForm.id && (
                        <Button type="button" variant="secondary" onClick={() => setDriverPriceForm({ id: "", fromLocation: data.settings.defaultFromLocation || "", toLocation: "", truckType: driverPriceForm.truckType, distanceKm: "", truckSalaryUnitPrice: "", effectiveDate: priceCompareDates[priceCompareDates.length - 1] || today() })}>Cancel</Button>
                      )}
                    </div>
                  </Field>
                </div>
              </form>
              <div className="mt-4 max-w-2xl">
                <Field label="Search To Location">
                  <Input
                    placeholder="Type location name"
                    value={setupLocationSearch}
                    onChange={(event) => setSetupLocationSearch(event.target.value)}
                  />
                </Field>
              </div>
              <div className="mt-4 grid max-h-[620px] gap-2 overflow-auto pr-1">
                  <div className="grid gap-2">
                    <h3 className="mt-2 text-sm font-black uppercase tracking-wide text-slate-500">{truckTypeLabel(driverPriceForm.truckType)}</h3>
                    {driverPriceGroups.map((group) => (
                      <div key={group.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
                          <div>
                            <strong className="block text-base">{group.fromLocation} to {group.toLocation}</strong>
                            <span className="text-xs font-bold text-slate-500">
                              {truckTypeLabel(group.truckType)} | {group.versions.length} driver price version{group.versions.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="rounded-xl bg-amber-50 px-3 py-2 text-right">
                            <div className="text-[11px] font-black uppercase tracking-wide text-amber-700">Active Today</div>
                            <div className="text-lg font-black text-amber-950">{group.activePrice ? `$ ${unitMoney(group.activePrice.truckSalaryUnitPrice)}` : "No active price"}</div>
                            {group.activePrice && <div className="text-xs font-bold text-amber-700">from {formatDate(priceEffectiveDate(group.activePrice))}</div>}
                          </div>
                        </div>
                        <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
                          {group.versions.map((price) => {
                            const isActive = price.id === group.activePrice?.id;
                            return (
                              <div key={price.id} className={`grid gap-3 border-b border-slate-100 p-3 last:border-b-0 md:grid-cols-[130px_1fr_auto] md:items-center ${isActive ? "bg-amber-50/70" : "bg-white"}`}>
                                <div className="font-black text-slate-900">{formatDate(priceEffectiveDate(price))}</div>
                                <div className="text-sm font-bold text-slate-600">
                                  {Number(price.distanceKm || 0).toFixed(1)} KM | Driver $ {unitMoney(price.truckSalaryUnitPrice)}
                                  {isActive && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800">Active</span>}
                                  {price.active === false && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-500">Inactive</span>}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button type="button" variant="secondary" onClick={() => setDriverPriceForm({
                                    id: price.id,
                                    fromLocation: price.fromLocation,
                                    toLocation: price.toLocation,
                                    truckType: price.truckType,
                                    distanceKm: price.distanceKm,
                                    truckSalaryUnitPrice: price.truckSalaryUnitPrice,
                                    effectiveDate: priceEffectiveDate(price)
                                  })}>Edit</Button>
                                  <Button type="button" variant="danger" onClick={() => deletePrice(price)}>Delete</Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
            </Panel>
          )}

          {setupSection === "users" && (
            <>
              <Panel>
                <h2 className="mb-4 text-lg font-bold">User Management</h2>
                <p className="mb-4 text-sm font-bold text-slate-500">Staff users can do data entry but cannot access Payments, Prices, Setup, or export reports.</p>
                <form onSubmit={createStaffUser} className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Add New User</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Username"><Input value={newUserForm.username} onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })} required placeholder="e.g. sokheng" /></Field>
                    <Field label="Password"><Input type="password" value={newUserForm.password} onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} required placeholder="Min 6 characters" /></Field>
                    <Field label="Role">
                      <select value={newUserForm.role} onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    </Field>
                  </div>
                  <div><Button type="submit">Create User</Button></div>
                </form>
                {staffUsers.length === 0 ? (
                  <p className="text-sm font-bold text-slate-400 text-center py-4">No staff users yet.</p>
                ) : (
                  <div className="overflow-auto rounded-xl border border-slate-200">
                    <table className="w-full border-collapse bg-white text-sm">
                      <thead className="bg-slate-900 text-white text-xs">
                        <tr>
                          <th className="px-4 py-3 text-left">Username</th>
                          <th className="px-4 py-3 text-left">Role</th>
                          <th className="px-4 py-3 text-left">Created</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffUsers.map((u) => (
                          <tr key={u.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                            <td className="px-4 py-3 font-black">{u.username}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-black ${u.role === "admin" ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-600"}`}>{u.role}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-xs">{u.createdAt?.slice(0, 10)}</td>
                            <td className="px-4 py-3 text-right">
                              {editPasswordId === u.id ? (
                                <div className="flex items-center gap-2 justify-end">
                                  <input type="password" value={editPasswordValue} onChange={(e) => setEditPasswordValue(e.target.value)} placeholder="New password" className="h-8 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-teal-500 w-36" />
                                  <Button type="button" onClick={() => saveStaffPassword(u.id)}>Save</Button>
                                  <Button type="button" variant="secondary" onClick={() => { setEditPasswordId(null); setEditPasswordValue(""); }}>Cancel</Button>
                                </div>
                              ) : (
                                <div className="flex gap-2 justify-end">
                                  <Button type="button" variant="secondary" onClick={() => { setEditPasswordId(u.id); setEditPasswordValue(""); }}>Change Password</Button>
                                  <Button type="button" variant="danger" onClick={() => deleteStaffUser(u.id)}>Delete</Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

              {isAdmin && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Panel>
                    <h2 className="mb-3 text-lg font-bold">Settings</h2>
                    <form className="grid gap-3" onSubmit={saveSettings}>
                      <Field label="Company"><Input value={settingsForm.companyName} onChange={(e) => setSettingsForm({ ...settingsForm, companyName: e.target.value })} /></Field>
                      <Field label="Default From Location"><Input value={settingsForm.defaultFromLocation} onChange={(e) => setSettingsForm({ ...settingsForm, defaultFromLocation: e.target.value })} /></Field>
                      <Field label="VIP Delete Password" hint="Required to delete any statement. Leave blank to allow deletion without a password.">
                        <Input type="password" value={settingsForm.deletePassword} onChange={(e) => setSettingsForm({ ...settingsForm, deletePassword: e.target.value })} placeholder="Set a password…" />
                      </Field>
                      <div><Button type="submit">Save Settings</Button></div>
                    </form>
                  </Panel>

                  <Panel>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h2 className="text-lg font-bold">Data Backup</h2>
                      {telegramConfigured === true && (
                        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-black text-emerald-700">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>
                          Telegram Active
                        </span>
                      )}
                      {telegramConfigured === false && (
                        <span className="flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-black text-slate-500">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>
                          Telegram Not Set Up
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-500">
                      Automatic backup runs before the first data change each day.
                      {telegramConfigured === true && " Backup is also sent automatically to Telegram."}
                    </p>
                    <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">
                      Latest: {backupFiles[0] || "No backup yet"}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" onClick={createManualBackup}>Create Backup</Button>
                      <Button type="button" variant="secondary" onClick={downloadBackup}>Download Backup</Button>
                      {telegramConfigured === true && (
                        <Button type="button" variant="secondary" onClick={sendToTelegram}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{display:"inline",marginRight:4,verticalAlign:"middle"}}><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>
                          Send to Telegram
                        </Button>
                      )}
                      {telegramConfigured === false && (
                        <p className="w-full mt-1 text-xs text-slate-400">To enable Telegram backup, add <code className="bg-slate-100 px-1 rounded">TELEGRAM_BOT_TOKEN</code> and <code className="bg-slate-100 px-1 rounded">TELEGRAM_CHAT_ID</code> to your Render environment variables.</p>
                      )}
                    </div>
                  </Panel>
                </div>
              )}
            </>
          )}

        </main>
  );
}
