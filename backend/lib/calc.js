// Shared pure helpers: text/location normalization, money coercion,
// price effective-date matching. Imported by server.js and exports.js.
export function normalizeText(value) {
  return String(value || "").trim();
}

export function normalizeCode(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

// Remove extra space after KH. or D. prefix: "KH. Kambol" → "KH.Kambol"
export function normalizeLocationName(value) {
  return normalizeText(value).replace(/^(KH|D)\.\s+/i, (_, p) => p.toUpperCase() + ".");
}

export function locationMatchKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/\bkh[\s.]*/g, "khan")
    .replace(/[^a-z0-9]+/g, "");
}

export function locationBaseKey(value) {
  return normalizeText(value)
    .replace(/\([^)]*\)/g, "")
    .toLowerCase()
    .replace(/^\s*d\s*\.\s*/i, "")
    .replace(/^\s*(khan|kh)\s*[.]?\s*/i, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function toNumber(value) {
  const number = Number(String(value ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function monthFromDate(value) {
  return normalizeText(value).slice(0, 7);
}

export function effectiveDateOf(price) {
  return price.effectiveDate || `${price.effectiveMonth || "2026-01"}-01`;
}

export function findEffectivePrice(data, { fromLocation, toLocation, truckType, deliveryDate }) {
  const fromKey = normalizeText(fromLocation);
  const toKey = locationBaseKey(toLocation);
  const typeKey = normalizeText(truckType);

  return data.prices
    .filter((item) => item.active !== false)
    .filter((item) => normalizeText(item.fromLocation) === fromKey)
    .filter((item) => locationBaseKey(item.toLocation) === toKey)
    .filter((item) => normalizeText(item.truckType) === typeKey)
    .filter((item) => effectiveDateOf(item) <= deliveryDate)
    .sort((a, b) => effectiveDateOf(b).localeCompare(effectiveDateOf(a)))
    [0];
}

export function priceRouteKey({ fromLocation, toLocation, truckType }) {
  return [
    normalizeText(fromLocation),
    normalizeText(truckType),
    locationBaseKey(toLocation)
  ].join("||");
}
