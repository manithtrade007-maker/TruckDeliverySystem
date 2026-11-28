import { existsSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve("backend");
const databasePath = path.join(dataDir, "truck_delivery.db");
if (!existsSync(databasePath)) throw new Error(`Database not found: ${databasePath}`);

const database = new DatabaseSync(databasePath);
try {
  const columns = new Set(database.prepare("PRAGMA table_info(deliveries)").all().map(column => column.name));
  if (!columns.size) throw new Error("The deliveries table was not found.");
  database.exec("BEGIN IMMEDIATE");
  try {
    if (!columns.has("fromProvinceId")) database.exec("ALTER TABLE deliveries ADD COLUMN fromProvinceId TEXT");
    if (!columns.has("toProvinceId")) database.exec("ALTER TABLE deliveries ADD COLUMN toProvinceId TEXT");
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
  console.log("Province columns are ready. Existing delivery rows were not updated.");
} finally {
  database.close();
}
