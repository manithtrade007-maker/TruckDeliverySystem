import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import provinces from "../../shared/provinces.json" with { type: "json" };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mapSource = await readFile(path.join(root, "frontend/src/components/CambodiaMap.jsx"), "utf8");
const citiesBlock = mapSource.split("export const CITIES = [")[1]?.split("\n];")[0];
if (!citiesBlock) throw new Error("Could not find exported CITIES list in CambodiaMap.jsx.");
const mapIds = [...citiesBlock.matchAll(/\bid:\s*"([^"]+)"/gu)].map(match => match[1]).sort();
const provinceIds = provinces.map(province => province.id).sort();
if (JSON.stringify(mapIds) !== JSON.stringify(provinceIds)) {
  throw new Error(`Province catalog mismatch. Map: ${mapIds.join(", ")}; shared: ${provinceIds.join(", ")}`);
}
console.log(`Province catalog matches CambodiaMap.jsx (${provinceIds.length} ids).`);
