// Keep destination names intact: case/spacing differences are harmless, but
// district prefixes and parenthesized place names may identify different stops.
export function destinationKey(value) {
  return String(value || "").normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase();
}

export function locationReport(deliveries, month, truckType = "") {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "")) throw new Error("Choose a valid report month.");
  if (!["", "With Crane", "Without Crane"].includes(truckType)) throw new Error("Choose a valid truck type.");
  const rows = deliveries.filter(row => row.deliveryDate?.slice(0, 7) === month && (!truckType || row.truckType === truckType));
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
  return { month, truckType, rows, locations: sort(locations), trucks: sort(trucks), trips: rows.length, tons, missingLocations, missingTrucks };
}
