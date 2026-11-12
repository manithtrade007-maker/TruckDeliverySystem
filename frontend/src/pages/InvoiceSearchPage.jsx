import { useMemo, useState } from "react";
import { useApp } from "../AppContext.js";
import { Button, Field, Input, PageHead, Panel } from "../components/ui.jsx";
import { formatDate, monthName } from "../lib/format.js";

export function InvoiceSearchPage() {
  const { data } = useApp();
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();
  const statementsById = useMemo(() => new Map(data.statements.map(statement => [statement.id, statement])), [data.statements]);
  const matches = useMemo(() => search ? data.deliveries
    .filter(row => String(row.invoiceNo ?? "").toLowerCase().includes(search))
    .sort((a, b) => String(b.deliveryDate).localeCompare(String(a.deliveryDate)) || String(a.invoiceNo).localeCompare(String(b.invoiceNo))) : [], [data.deliveries, search]);

  return <main className="app-content mx-auto grid max-w-[1500px] gap-4 p-4 pb-20 lg:pb-4">
    <PageHead title="Invoice Search" meta="Find deliveries and their statements across all months." />
    <Panel>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:max-w-md">
          <Field label="Invoice number">
            <Input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="e.g. 8001074244" aria-describedby="invoice-search-help" />
          </Field>
        </div>
        <Button variant="secondary" onClick={() => setQuery("")} disabled={!query}>Clear</Button>
      </div>
      <p id="invoice-search-help" className="mt-3 text-sm text-slate-500">Enter a full or partial invoice number. Searches all months, regardless of the report month.</p>
      <p role="status" className="my-4 text-sm font-bold text-slate-600">
        {!search ? "Enter an invoice number to search." : matches.length ? `${matches.length} matching ${matches.length === 1 ? "delivery" : "deliveries"} across all months.` : `No invoices found for “${query.trim()}”.`}
      </p>
      {matches.length > 0 && <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-slate-900 text-white"><tr>
            {["Invoice number", "Delivery date", "Car number", "Quantity (T)", "Statement", "Statement month"].map(heading => <th key={heading} scope="col" className={`px-4 py-3 ${heading === "Quantity (T)" ? "text-right" : ""}`}>{heading}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {matches.map(row => {
              const statement = statementsById.get(row.statementId);
              return <tr key={row.id} className="even:bg-slate-50">
                <td className="px-4 py-3 font-bold tabular-nums">{row.invoiceNo}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.deliveryDate)}</td>
                <td className="px-4 py-3 font-bold">{row.truckNo}</td>
                <td className="px-4 py-3 text-right tabular-nums">{Number(row.qtyTon || 0).toLocaleString(undefined, { maximumFractionDigits: 5 })}</td>
                <td className="px-4 py-3">{statement ? `Statement ${statement.statementNumber}` : "Statement unavailable"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{statement ? monthName(statement.month) : "—"}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>}
    </Panel>
  </main>;
}
