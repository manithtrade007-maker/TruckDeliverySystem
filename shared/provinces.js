import provinces from "./provinces.json" with { type: "json" };
import WAREHOUSE_PROVINCE from "./warehouse-provinces.json" with { type: "json" };

export { provinces };
export { WAREHOUSE_PROVINCE };

const provinceAliases = new Map();
const aliasesById = {
  "phnom-penh": ["phnom penh", "krong phnom penh", "pp", "ភ្នំពេញ"],
  "banteay-meanchey": ["banteay meanchey", "banteay meanchey province", "បន្ទាយមានជ័យ"],
  battambang: ["battambang", "បាត់ដំបង"],
  "kampong-cham": ["kampong cham", "kompong cham", "k cham", "កំពង់ចាម"],
  "kampong-chhnang": ["kampong chhnang", "kompong chhnang", "k chhnang", "កំពង់ឆ្នាំង"],
  "kampong-speu": ["kampong speu", "kompong speu", "k speu", "កំពង់ស្ពឺ"],
  "kampong-thom": ["kampong thom", "kompong thom", "k thom", "កំពង់ធំ"],
  kampot: ["kampot", "កំពត"],
  kandal: ["kandal", "កណ្ដាល"],
  kep: ["kep", "កែប"],
  "koh-kong": ["koh kong", "កោះកុង"],
  kratie: ["kratie", "kracheh", "ក្រចេះ"],
  mondulkiri: ["mondulkiri", "mondul kiri", "មណ្ឌលគិរី"],
  "oddar-meanchey": ["oddar meanchey", "ឧត្តរមានជ័យ"],
  pailin: ["pailin", "ប៉ៃលិន"],
  "preah-sihanouk": ["preah sihanouk", "sihanoukville", "kompong som", "កំពង់សោម", "ព្រះសីហនុ"],
  "preah-vihear": ["preah vihear", "ព្រះវិហារ"],
  pursat: ["pursat", "ពោធិ៍សាត់"],
  "prey-veng": ["prey veng", "ព្រៃវែង"],
  ratanakiri: ["ratanakiri", "ratanak kiri", "រតនគិរី"],
  "siem-reap": ["siem reap", "សៀមរាប"],
  "stung-treng": ["stung treng", "steung treng", "ស្ទឹងត្រែង"],
  "svay-rieng": ["svay rieng", "s rieng", "ស្វាយរៀង"],
  takeo: ["takeo", "តាកែវ"],
  "tboung-khmum": ["tboung khmum", "tbong khmum", "tbaung khmum", "ត្បូងឃ្មុំ"],
};

function normalizeAlias(value) {
  return String(value || "")
    .normalize("NFC")
    .toLocaleLowerCase()
    .replace(/\bprovince\b|ខេត្ត|\bkrong\b|\bmunicipality\b/gu, " ")
    .replace(/[^a-z0-9\u1780-\u17ff]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

for (const province of provinces) {
  const names = [province.name, ...(aliasesById[province.id] || [])];
  for (const alias of names) {
    const key = normalizeAlias(alias);
    const ids = provinceAliases.get(key) || new Set();
    ids.add(province.id);
    provinceAliases.set(key, ids);
  }
}

function exactProvinceMatch(text) {
  const ids = provinceAliases.get(normalizeAlias(text));
  return ids?.size === 1 ? [...ids][0] : null;
}

export function inferProvinceId(value) {
  const text = String(value || "").normalize("NFC").trim();
  if (!text) return null;

  const parenthetical = [...text.matchAll(/\(([^)]*)\)/gu)].map(match => match[1]);
  const suffixMatches = new Set(parenthetical.map(exactProvinceMatch).filter(Boolean));
  if (suffixMatches.size === 1) return [...suffixMatches][0];
  if (suffixMatches.size > 1) return null;

  for (const candidate of [text.replace(/^\s*(?:kh|d)\s*\.\s*/iu, ""), text]) {
    const id = exactProvinceMatch(candidate);
    if (id) return id;
  }
  return null;
}

const validIds = new Set(provinces.map(province => province.id));
export const isProvinceId = value => typeof value === "string" && validIds.has(value);

export function getProvinceId(delivery) {
  return isProvinceId(delivery?.toProvinceId) ? delivery.toProvinceId : inferProvinceId(delivery?.toLocation);
}

export function getProvince(id) {
  return provinces.find(province => province.id === id) || null;
}

export function getWarehouseProvinceId(warehouseCode) {
  const key = String(warehouseCode || "").trim().toLocaleLowerCase();
  const entry = Object.entries(WAREHOUSE_PROVINCE).find(([code]) => code.toLocaleLowerCase() === key);
  return entry?.[1] || null;
}
