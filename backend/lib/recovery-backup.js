import { createHash } from "node:crypto";
import JSZip from "jszip";

export const RECOVERY_FORMAT_VERSION = 1;

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function buildRecoveryArchive({ data, database, statementPdfs = [], reason = "scheduled", createdAt = new Date().toISOString() }) {
  const zip = new JSZip();
  const payloads = new Map();
  payloads.set("data.json", Buffer.from(JSON.stringify(data, null, 2)));
  payloads.set("database/truck_delivery.db", Buffer.from(database));
  for (const pdf of statementPdfs) payloads.set(`statement-pdfs/${pdf.name}`, Buffer.from(pdf.data));
  for (const [name, buffer] of payloads) zip.file(name, buffer);

  const checksums = Object.fromEntries([...payloads].map(([name, buffer]) => [name, sha256(buffer)]));
  const manifest = {
    format: "nm-logistic-recovery",
    version: RECOVERY_FORMAT_VERSION,
    createdAt,
    reason,
    counts: {
      trucks: data.trucks?.length || 0,
      prices: data.prices?.length || 0,
      statements: data.statements?.length || 0,
      deliveries: data.deliveries?.length || 0,
      statementPdfs: statementPdfs.length
    },
    files: [...payloads.keys()]
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("checksums.json", JSON.stringify(checksums, null, 2));
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const timestamp = createdAt.slice(0, 19).replaceAll(":", "-");
  return { buffer, filename: `nm-logistic-recovery-${timestamp}.zip`, manifest, checksums };
}

export async function inspectRecoveryArchive(buffer) {
  const zip = await JSZip.loadAsync(buffer, { checkCRC32: true });
  const manifestFile = zip.file("manifest.json");
  const checksumFile = zip.file("checksums.json");
  const dataFile = zip.file("data.json");
  const databaseFile = zip.file("database/truck_delivery.db");
  if (!manifestFile || !checksumFile || !dataFile || !databaseFile) throw new Error("Recovery ZIP is missing required files.");
  const manifest = JSON.parse(await manifestFile.async("string"));
  if (manifest.format !== "nm-logistic-recovery" || manifest.version !== RECOVERY_FORMAT_VERSION) throw new Error("Unsupported recovery ZIP format.");
  const checksums = JSON.parse(await checksumFile.async("string"));
  const files = {};
  for (const [name, expected] of Object.entries(checksums)) {
    const entry = zip.file(name);
    if (!entry) throw new Error(`Recovery ZIP is missing ${name}.`);
    const value = await entry.async("nodebuffer");
    if (sha256(value) !== expected) throw new Error(`Checksum failed for ${name}.`);
    files[name] = value;
  }
  const data = JSON.parse(files["data.json"].toString("utf8"));
  for (const key of ["settings", "trucks", "prices", "statements", "deliveries"]) {
    if (data[key] == null) throw new Error(`Recovery data is missing ${key}.`);
  }
  return { manifest, checksums, data, database: files["database/truck_delivery.db"], files, verified: true };
}
