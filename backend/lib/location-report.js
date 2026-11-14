// Keep destination names intact: case/spacing differences are harmless, but
// district prefixes and parenthesized place names may identify different stops.
export function destinationKey(value) {
  return String(value || "").normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase();
}

export function locationReport(deliveries, month, truckType = "", filters = {}) {
  if (month !== "all" && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "")) throw new Error("Choose a valid report month.");
  if (!["", "With Crane", "Without Crane"].includes(truckType)) throw new Error("Choose a valid truck type.");
  if (filters.year && !/^\d{4}$/.test(filters.year)) throw new Error("Choose a valid report year.");
  const search = destinationKey(filters.search);
  const rows = deliveries.filter(row => {
    const rowMonth = String(row.deliveryDate || "").slice(0, 7);
    const location = destinationKey(row.toLocation);
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(rowMonth)
      && (month === "all" || rowMonth === month)
      && (!filters.year || rowMonth.slice(0, 4) === filters.year)
      && (!truckType || row.truckType === truckType)
      && (!search || location.includes(search))
      && (!filters.location || location === destinationKey(filters.location))
      && (!filters.truck || String(row.truckNo || "").trim() === filters.truck);
  });
  const locations = new Map();
  const trucks = new Map();
  let tons = 0;
  let missingLocations = 0;
  let missingTrucks = 0;
  for (const row of rows) {
    const location = destinationKey(row.toLocation);
    const truck = String(row.truckNo || "").trim();
    const qty = Number(row.qtyTon);
    tons += Number.isFinite(qty) ? qty : 0;
    if (!location) missingLocations++;
    if (!truck) missingTrucks++;
    if (location) {
      if (!locations.has(location)) locations.set(location, { key: location, name: row.toLocation.trim(), rows: [] });
      locations.get(location).rows.push(row);
    }
    if (truck) {
      if (!trucks.has(truck)) trucks.set(truck, { key: truck, name: truck, rows: [] });
      trucks.get(truck).rows.push(row);
    }
  }
  const summarize = group => ({ ...group, trips: group.rows.length,
    tons: group.rows.reduce((sum, row) => sum + (Number(row.qtyTon) || 0), 0),
    trucks: new Set(group.rows.map(row => String(row.truckNo || "").trim()).filter(Boolean)).size,
    locations: new Set(group.rows.map(row => destinationKey(row.toLocation)).filter(Boolean)).size });
  const sort = map => [...map.values()].map(summarize).sort((a, b) => b.trips - a.trips || a.name.localeCompare(b.name));
  const monthlyRows = new Map();
  for (const row of rows) {
    const key = row.deliveryDate.slice(0, 7);
    if (!monthlyRows.has(key)) monthlyRows.set(key, { key, name: key, rows: [] });
    monthlyRows.get(key).rows.push(row);
  }
  const months = [...monthlyRows.values()].map(summarize).sort((a, b) => b.key.localeCompare(a.key));
  return { month, truckType, months, rows, locations: sort(locations), trucks: sort(trucks), trips: rows.length, tons, missingLocations, missingTrucks };
}
