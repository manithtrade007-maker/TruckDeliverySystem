// Pure date / money / location formatting helpers and the Cambodian
// location-order constants. Extracted from main.jsx (no app state).
const localDate = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const today = () => localDate();
const currentMonth = () => localDate().slice(0, 7);
const money = (value) => Number(value || 0).toFixed(2);
// Snap a summed money value to clean cents, removing floating-point crumbs
// (e.g. 850.5399999999998 -> 850.54). Matches roundMoney() in the backend.
const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const unitMoney = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0.000";
  const [whole, decimal = ""] = String(number).split(".");
  return `${whole}.${decimal.slice(0, 3).padEnd(3, "0")}`;
};
const parseMoney = (value) => {
  const number = Number(String(value || "").replace(/[$,\s]/g, ""));
  return Number.isFinite(number) ? number : "";
};
const locationMatchKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\bkh[\s.]*/g, "khan")
    .replace(/[^a-z0-9]+/g, "");
const locationBaseKey = (value) => locationMatchKey(String(value || "").replace(/\([^)]*\)/g, "").replace(/^\s*d\s*\.\s*/i, ""));
const priceEffectiveDate = (price) => price.effectiveDate || `${price.effectiveMonth || "2026-01"}-01`;
const routeKey = (price) => [price.fromLocation, locationBaseKey(price.toLocation), price.truckType].join("::");
const CRANE_LOCATION_ORDER = [
  // PP (14)
  "KH.Kambol (PP)",
  "KH.Dangkao (PP)",
  "KH.Mean Chey (PP)",
  "KH.Chamkar Morn (PP)",
  "KH.Boeng Keng Kong (PP)",
  "KH.Doun Penh (PP)",
  "KH.7 Makara (PP)",
  "KH.Tuol Kouk (PP)",
  "KH.Sen Sok (PP)",
  "KH.Russei Keo (PP)",
  "KH.Chba Ampeou (PP)",
  "KH.Posenchey (PP)",
  "KH.Prek Phnov (PP)",
  "KH.Chroy Changvar (PP)",
  // Kandal (11)
  "D.Takhmao (Kandal)",
  "D.Kandal Stueng (Kandal)",
  "D.Saang (Kandal)",
  "D.Kien Svay (Kandal)",
  "D.Ang Snuol (Kandal)",
  "D.Muk Kampoul (Kandal)",
  "D.Khsach Kandal (Kandal)",
  "D.Ponhea Leu (Kandal)",
  "D.Koh Thom (Kandal)",
  "D.Leukdek (Kandal)",
  "D.Lvea Em (Kandal)",
  // Takeo (10)
  "D.Bati (Takeo)",
  "D.Samrong (Takeo)",
  "D.Prey Kabas (Takeo)",
  "D.Daun Keo (Takeo)",
  "D.Treang (Takeo)",
  "D.Angkor Borei (Takeo)",
  "D.Tram Kak (Takeo)",
  "D.Koh Andet (Takeo)",
  "D.Borei Chulsar (Takeo)",
  "D.Kirivong (Takeo)",
  // K.Speu (7)
  "D.Kong Pisei (K.Speu)",
  "D.Chbar Morn (K.Speu)",
  "D.Oudong (K.Speu)",
  "D.Samrong Torng (K.Speu)",
  "D.Baset (K.Speu)",
  "D.Phnom Srouch (K.Speu)",
  "D.Thpong (K.Speu)",
  // Prey Veng (13)
  "D.Peam Ro (Prey Veng)",
  "D.Pea Reang (Prey Veng)",
  "D.Baphnom (Prey Veng)",
  "D.Peam Chor (Prey Veng)",
  "D.Kampong Trabek (Prey Veng)",
  "D.Preah Sdach (Prey Veng)",
  "D.Prey Veng (Prey Veng)",
  "D.Po Rieng (Prey Veng)",
  "D.Sithor Kandal (Prey Veng)",
  "D.Mesang (Prey Veng)",
  "D.Svay Antor (Prey Veng)",
  "D.Kanh Chreach (Prey Veng)",
  "D.Kamchay Mea (Prey Veng)",
  // Svay Rieng (6)
  "D.Svay Chrum (Svay Rieng)",
  "D.Svay Rieng (Svay Rieng)",
  "D.Rum Duol (Svay Rieng)",
  "D.Romeas Hek (Svay Rieng)",
  "D.Svay Tiep (Svay Rieng)",
  "D.Kompong Ro (Svay Rieng)",
  // K.Chhnan (7)
  "D.Kampong Tralach (K.Chhnan)",
  "D.Rolear Phiear (K.Chhnan)",
  "D.Kampong Chhnang (K.Chhnan)",
  "D.Chulkiri (K.Chhnan)",
  "D.Tuek Phos (K.Chhnan)",
  "D.Boribo (K.Chhnan)",
  "D.Kampong Leng (K.Chhnan)",
  // K.Cham (4)
  "D.Srey Santhor (K.Cham)",
  "D.Batheay (K.Cham)",
  "D.Prey Chhor (K.Cham)",
  "D.Kampong Siem (K.Cham)",
];
const NO_CRANE_LOCATION_ORDER = [
  "KH.Kambol (PP)", "KH.Dangkao (PP)", "KH.Mean Chey (PP)", "KH.Chamkar Morn (PP)",
  "KH.Boeng Keng Kong (PP)", "KH.Doun Penh (PP)", "KH.7 Makara (PP)", "KH.Tuol Kouk (PP)",
  "KH.Sen Sok (PP)", "KH.Russei Keo (PP)", "KH.Chba Ampeou (PP)", "KH.Posenchey (PP)",
  "KH.Prek Phnov (PP)", "KH.Chroy Changvar (PP)",
  "D.Takhmao (Kandal)", "D.Kandal Stueng (Kandal)", "D.Saang (Kandal)", "D.Kien Svay (Kandal)",
  "D.Ang Snuol (Kandal)", "D.Muk Kampoul (Kandal)", "D.Khsach Kandal (Kandal)",
  "D.Ponhea Leu (Kandal)", "D.Koh Thom (Kandal)", "D.Leukdek (Kandal)", "D.Lvea Em (Kandal)",
  "D.Bati (Takeo)", "D.Samrong (Takeo)", "D.Prey Kabas (Takeo)", "D.Daun Keo (Takeo)",
  "D.Treang (Takeo)", "D.Angkor Borei (Takeo)", "D.Tram Kak (Takeo)", "D.Koh Andet (Takeo)",
  "D.Borei Chulsar (Takeo)", "D.Kirivong (Takeo)",
  "D.Kong Pisei (K.Speu)", "D.Chbar Morn (K.Speu)", "D.Oudong (K.Speu)",
  "D.Samrong Torng (K.Speu)", "D.Baset (K.Speu)", "D.Phnom Srouch (K.Speu)",
  "D.Thpong (K.Speu)", "D.Kirirom (K.Speu)", "D.Oral (K.Speu)",
  "D.Peam Ro (Prey Veng)", "D.Pea Reang (Prey Veng)", "D.Baphnom (Prey Veng)",
  "D.Peam Chor (Prey Veng)", "D.Kampong Trabek (Prey Veng)", "D.Preah Sdach (Prey Veng)",
  "D.Prey Veng (Prey Veng)", "D.Po Rieng (Prey Veng)", "D.Sithor Kandal (Prey Veng)",
  "D.Mesang (Prey Veng)", "D.Svay Antor (Prey Veng)", "D.Kanh Chreach (Prey Veng)",
  "D.Kamchay Mea (Prey Veng)",
  "D.Svay Chrum (Svay Rieng)", "D.Svay Rieng (Svay Rieng)", "D.Rum Duol (Svay Rieng)",
  "D.Romeas Hek (Svay Rieng)", "D.Svay Tiep (Svay Rieng)", "D.Kompong Ro (Svay Rieng)",
  "D.Bavet (Svay Rieng)", "D.Chantrea (Svay Rieng)",
  "D.Angkor Chey (Kampot)", "D.Chhouk (Kampot)", "D.Chumkiri (Kampot)",
  "D.Dong Tung (Kampot)", "D.Kampong Trach (Kampot)", "D.Kampot (Kampot)", "D.Tuek Chhu (Kampot)",
  "D.Damnak Changeor (Kep)", "D.Kep (Kep)",
  "D.Samaki Meanchey (K.Chhnan)", "D.Kampong Tralach (K.Chhnan)", "D.Rolear Phiear (K.Chhnan)",
  "D.Kampong Chhnang (K.Chhnan)", "D.Chulkiri (K.Chhnan)", "D.Tuek Phos (K.Chhnan)",
  "D.Boribo (K.Chhnan)", "D.Kampong Leng (K.Chhnan)",
  "D.Srey Santhor (K.Cham)", "D.Batheay (K.Cham)", "D.Prey Chhor (K.Cham)",
  "D.Kampong Siem (K.Cham)", "D.Chamkar Leu (K.Cham)", "D.Kang Meas (K.Cham)",
  "D.Santuk (K.Thom)", "D.Stueng Sen (K.Thom)", "D.Staung (K.Thom)",
];
const makeLocationSort = (order) => (a, b) => {
  const ai = order.indexOf(a);
  const bi = order.indexOf(b);
  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;
  return a.localeCompare(b);
};
const craneLocationSort = makeLocationSort(CRANE_LOCATION_ORDER);
const noCraneLocationSort = makeLocationSort(NO_CRANE_LOCATION_ORDER);
const deliverySort = (a, b) =>
  String(a.deliveryDate || "").localeCompare(String(b.deliveryDate || "")) ||
  String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
const truckTypeLabel = (truckType) => truckType === "With Crane" ? "Crane" : truckType === "Without Crane" ? "No Crane" : truckType;
const formatDate = (value) => {
  const text = String(value || "");
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return text;
  return `${match[3]}.${match[2]}.${match[1]}`;
};
const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  return `${formatDate(localDate(date))} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};
const monthName = (value) => {
  if (!value) return "";
  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

function groupPriceHistory(prices) {
  const groups = new Map();
  for (const price of prices) {
    const key = routeKey(price);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        fromLocation: price.fromLocation,
        toLocation: price.toLocation,
        truckType: price.truckType,
        versions: []
      });
    }
    groups.get(key).versions.push(price);
  }
  return [...groups.values()]
    .map((group) => {
      const versions = group.versions
        .slice()
        .sort((a, b) => priceEffectiveDate(b).localeCompare(priceEffectiveDate(a)));
      const activePrice =
        versions.find((price) => price.active !== false && priceEffectiveDate(price) <= today()) ||
        versions.find((price) => price.active !== false) ||
        null;
      return { ...group, toLocation: activePrice?.toLocation || versions[0]?.toLocation || group.toLocation, versions, activePrice };
    })
    .sort((a, b) => a.toLocation.localeCompare(b.toLocation));
}

export {
  localDate, today, currentMonth, money, roundMoney, unitMoney, parseMoney, locationMatchKey, locationBaseKey, priceEffectiveDate, routeKey, CRANE_LOCATION_ORDER, NO_CRANE_LOCATION_ORDER, makeLocationSort, craneLocationSort, noCraneLocationSort, deliverySort, truckTypeLabel, formatDate, formatDateTime, monthName, groupPriceHistory
};
