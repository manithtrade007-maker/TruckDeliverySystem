import { useMemo, useState } from "react";
import { activityChartData } from "../../../backend/lib/report-charts.js";
const colors = ["#0f766e", "#0284c7", "#7c3aed", "#d97706", "#db2777", "#64748b"];
const number = value => value.toLocaleString(undefined, { maximumFractionDigits: 5 });
export function ActivityOverview({ rows, year, setYear, hideShare, onPeriod }) {
  const [mode, setMode] = useState("month");
  const [metric, setMetric] = useState("trips");
  const years = [...new Set([...rows.map(row => row.deliveryDate.slice(0, 4)), year])].sort().reverse();
  const { bars, shares } = useMemo(() => activityChartData(rows, metric, mode, year), [rows, metric, mode, year]);
  const max = Math.max(1, ...bars.map(bar => bar.value));
  const total = bars.reduce((sum, bar) => sum + bar.value, 0);
  const canDrawShare = total > 0 && shares.every(share => share.value >= 0);
  let offset = 0;
  return <details open className="rounded-xl border border-slate-200 bg-white">
    <summary className="cursor-pointer px-4 py-3 font-bold">Activity overview</summary>
    <div className="grid gap-4 border-t border-slate-100 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">Compare <select className="min-h-10 rounded-lg border border-slate-300 px-2" value={mode} onChange={e => setMode(e.target.value)}><option value="month">Months</option><option value="year">Years</option></select></label>
        {mode === "month" && <label className="text-sm">Year <select className="min-h-10 rounded-lg border border-slate-300 px-2" value={year} onChange={e => setYear(e.target.value)}>{years.map(y => <option key={y}>{y}</option>)}</select></label>}
        <label className="text-sm">Measure <select className="min-h-10 rounded-lg border border-slate-300 px-2" value={metric} onChange={e => setMetric(e.target.value)}><option value="trips">Trips</option><option value="tons">Tons</option></select></label>
        <span className="text-sm text-slate-500">{number(total)} {metric} · {mode === "month" ? year : "All years"}</span>
      </div>
      <p className="text-xs text-slate-500">History for the current location and truck filters. Click a bar to show that period’s records below.</p>
      <div className={`grid gap-6 ${hideShare ? "" : "lg:grid-cols-3"}`}>
        <div className={hideShare ? "min-w-0" : "min-w-0 lg:col-span-2"}>
          <h3 className="mb-3 text-sm font-bold">{mode === "month" ? "Monthly" : "Yearly"} {metric}</h3>
          <div className="overflow-x-auto">
            <div className="flex h-52 min-w-[520px] items-end gap-2 border-b border-slate-200" style={{ minWidth: Math.max(520, bars.length * 48) }}>
              {bars.map(bar => <button key={bar.key} type="button" className="group flex h-full min-w-0 flex-1 flex-col justify-end rounded-t px-1 text-center focus-visible:outline-2 focus-visible:outline-teal-700" title={`${bar.key}: ${number(bar.value)} ${metric}`} aria-label={`Show ${bar.key}: ${number(bar.value)} ${metric}`} onClick={() => onPeriod(mode, bar.key)}>
                <span className="mb-1 truncate text-[10px] text-slate-600">{number(bar.value)}</span>
                <span className="block w-full rounded-t bg-teal-600 group-hover:bg-teal-800" style={{ height: `${Math.max(0, bar.value) / max * 140}px`, minHeight: bar.value > 0 ? 3 : 0 }} />
                <span className="py-2 text-xs text-slate-600">{mode === "month" ? new Date(`${bar.key}-01T12:00:00`).toLocaleDateString(undefined, { month: "short" }) : bar.key}</span>
              </button>)}
            </div>
          </div>
          {!rows.length && <p className="mt-2 text-sm text-slate-500">No recorded activity for these filters.</p>}
        </div>
        {!hideShare && <div><h3 className="mb-3 text-sm font-bold">Location share · {metric}</h3>
          {canDrawShare ? <div className="flex flex-wrap items-center gap-4">
            <svg viewBox="0 0 120 120" className="h-36 w-36 shrink-0" role="img" aria-label={`Location share of ${number(total)} ${metric}; values listed alongside`}>
              {shares.map((share, i) => { const percent = share.value / total * 100; const start = offset; offset += percent; return <circle key={share.key} cx="60" cy="60" r="45" fill="none" stroke={colors[i]} strokeWidth="18" pathLength="100" strokeDasharray={`${percent} ${100 - percent}`} strokeDashoffset={-start} transform="rotate(-90 60 60)"><title>{share.name}: {number(share.value)} {metric} ({percent.toFixed(1)}%)</title></circle>; })}
            </svg>
            <ul className="min-w-0 flex-1 space-y-2 text-xs">{shares.map((share, i) => <li key={share.key} className="flex items-start gap-2"><span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: colors[i] }} /><span>{share.name}<span className="block text-slate-500">{number(share.value)} · {(share.value / total * 100).toFixed(1)}%</span></span></li>)}</ul>
          </div> : <p className="text-sm text-slate-500">{total === 0 ? "No activity for this period." : "Location shares are unavailable for negative quantities."}</p>}
        </div>}
      </div>
    </div>
  </details>;
}
