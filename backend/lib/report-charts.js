import { destinationKey } from "./location-report.js";

export function activityChartData(rows, metric, mode, year) {
  const valueOf = row => metric === "tons" ? (Number(row.qtyTon) || 0) : 1;
  const periods = new Map();
  if (mode === "month") for (let i = 1; i <= 12; i++) periods.set(`${year}-${String(i).padStart(2, "0")}`, 0);
  const locations = new Map();
  for (const row of rows) {
    const month = String(row.deliveryDate || "").slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) continue;
    if (mode === "month" && month.slice(0, 4) !== year) continue;
    const key = mode === "month" ? month : month.slice(0, 4);
    const value = valueOf(row);
    periods.set(key, (periods.get(key) || 0) + value);
    const location = destinationKey(row.toLocation);
    if (!locations.has(location)) locations.set(location, { key: location, name: String(row.toLocation || "").trim() || "Not recorded", value: 0 });
    locations.get(location).value += value;
  }
  const ranked = [...locations.values()].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const shares = ranked.slice(0, 5);
  if (ranked.length > 5) shares.push({ key: "__other", name: "Other", value: ranked.slice(5).reduce((sum, item) => sum + item.value, 0) });
  return { bars: [...periods].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => ({ key, value })), shares };
}
