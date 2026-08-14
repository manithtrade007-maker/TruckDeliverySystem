import { copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectRecoveryArchive } from "../lib/recovery-backup.js";

const archiveArg = process.argv[2];
if (!archiveArg) {
  console.error("Usage: npm run restore -- /path/to/nm-logistic-recovery.zip [data-directory]");
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultDataDir = path.resolve(scriptDir, "..");
const dataDir = path.resolve(process.argv[3] || process.env.DATA_DIR || defaultDataDir);
const archivePath = path.resolve(archiveArg);
const databasePath = path.join(dataDir, "truck_delivery.db");
const dataPath = path.join(dataDir, "data.json");
const pdfDir = path.join(dataDir, "statement-pdfs");
const safetyDir = path.join(dataDir, `before-offline-restore-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}`);

const inspected = await inspectRecoveryArchive(await readFile(archivePath));
await mkdir(dataDir, { recursive: true });
await mkdir(safetyDir, { recursive: true });
if (existsSync(databasePath)) await copyFile(databasePath, path.join(safetyDir, "truck_delivery.db"));
if (existsSync(dataPath)) await copyFile(dataPath, path.join(safetyDir, "data.json"));
if (existsSync(pdfDir)) {
  const safetyPdfs = path.join(safetyDir, "statement-pdfs");
  await mkdir(safetyPdfs, { recursive: true });
  for (const name of await readdir(pdfDir)) if (name.endsWith(".pdf")) await copyFile(path.join(pdfDir, name), path.join(safetyPdfs, name));
}

const tempDatabase = `${databasePath}.restore.tmp`;
const tempData = `${dataPath}.restore.tmp`;
await writeFile(tempDatabase, inspected.database);
await writeFile(tempData, JSON.stringify(inspected.data, null, 2));
await rename(tempDatabase, databasePath);
await rename(tempData, dataPath);
await rm(pdfDir, { recursive: true, force: true });
await mkdir(pdfDir, { recursive: true });
for (const [name, contents] of Object.entries(inspected.files)) {
  if (!name.startsWith("statement-pdfs/")) continue;
  const fileName = path.basename(name);
  if (fileName.endsWith(".pdf")) await writeFile(path.join(pdfDir, fileName), contents);
}

console.log(`Restored verified backup created ${inspected.manifest.createdAt}.`);
console.log(`Data directory: ${dataDir}`);
console.log(`Safety copy: ${safetyDir}`);
console.log("Restart the application and verify the Dashboard totals.");
