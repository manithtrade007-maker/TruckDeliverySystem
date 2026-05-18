import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const root = process.cwd();
const dataDir = process.env.DATA_DIR || path.join(root, "backend");
const dbPath = process.env.DATABASE_PATH || path.join(dataDir, "truck_delivery.db");
const backupDir = process.env.BACKUP_DIR || path.join(dataDir, "backups");
const dataFile = path.join(dataDir, "data.json");
const effectiveDate = "2026-05-11";
const fromLocation = "Warehouse-09";
const truckType = "With Crane";

const rows = [
  ["KH.Kambol (PP)", "19.0", "9.69"],
  ["KH.Dangkao (PP)", "9.0", "7.51"],
  ["KH.Mean Chey (PP)", "14.0", "7.89"],
  ["KH.Chamkar Morn (PP)", "18.0", "9.12"],
  ["KH. Boeng Keng Kong (PP)", "18.0", "9.12"],
  ["KH.Doun Penh (PP)", "21.0", "9.22"],
  ["KH.7 Makara (PP)", "21.0", "9.22"],
  ["KH.Tuol Kouk (PP)", "18.0", "9.22"],
  ["KH.Sen Sok (PP)", "24.0", "9.50"],
  ["KH.Russei Keo (PP)", "24.0", "9.50"],
  ["KH.Chba Ampeou (PP)", "20.0", "8.36"],
  ["KH.Posenchey (PP)", "29.0", "9.79"],
  ["KH.Prek Phnov (PP)", "30.0", "11.78"],
  ["KH.Chroy Changvar (PP)", "49.0", "13.02"],
  ["D.Takhmao (Kandal)", "11.0", "7.41"],
  ["D.Ang Snuol (Kandal)", "32.0", "11.40"],
  ["D.Saang (Kandal)", "25.0", "10.07"],
  ["D.Kandal Stueng (Kandal)", "8.0", "7.60"],
  ["D.Kien Svay (Kandal)", "27.0", "9.69"],
  ["D.Ponhea Leu (Kandal)", "53.0", "12.64"],
  ["D.Muk Kampoul (Kandal)", "47.0", "12.16"],
  ["D.Khsach Kandal (Kandal)", "50.0", "12.26"],
  ["D.Koh Thom (Kandal)", "54.0", "12.73"],
  ["D.Leukdek (Kandal)", "79.0", "14.82"],
  ["D.Lvea Em (Kandal)", "83.0", "15.11"],
  ["D.Kanh Chreach (Prey Veng)", "132.0", "16.15"],
  ["D.Kamchay Mea (Prey Veng)", "145.0", "16.53"],
  ["D.Mesang (Prey Veng)", "113.0", "15.49"],
  ["D.Kampong Trabek (Prey Veng)", "96.0", "14.82"],
  ["D.Svay Antor (Prey Veng)", "116.0", "15.87"],
  ["D.Baphnom (Prey Veng)", "88.0", "14.44"],
  ["D.Preah Sdach (Prey Veng)", "96.0", "14.82"],
  ["D.Sithor Kandal (Prey Veng)", "112.0", "15.49"],
  ["D.Pea Reang (Prey Veng)", "82.0", "14.92"],
  ["D.Po Rieng (Prey Veng)", "106.0", "15.11"],
  ["D.Peam Ro (Prey Veng)", "79.0", "14.16"],
  ["D.Peam Chor (Prey Veng)", "91.0", "14.73"],
  ["D.Prey Veng (Prey Veng)", "102.0", "17.67"],
  ["D.Rum Duol (S.Rieng)", "149.0", "16.72"],
  ["D.Svay Tiep (S.Rieng)", "158.0", "17.10"],
  ["D.Svay Rieng (S.Rieng)", "131.0", "16.06"],
  ["D.Svay Chrum (S.Rieng)", "120.0", "15.77"],
  ["D.Kompong Ro (S.Rieng)", "158.0", "17.10"],
  ["D.Romeas Hek (S.Rieng)", "153.0", "16.82"],
  ["D.Bati (Takeo)", "23.0", "9.41"],
  ["D.Prey Kabas (Takeo)", "52.0", "10.93"],
  ["D.Angkor Borei (Takeo)", "70.0", "14.35"],
  ["D.Borei Chulsar (Takeo)", "96.0", "17.10"],
  ["D.Koh Andet (Takeo)", "92.0", "16.91"],
  ["D.Samrong (Takeo)", "38.0", "11.59"],
  ["D.Daun Keo (Takeo)", "56.0", "12.64"],
  ["D.Treang (Takeo)", "64.0", "13.02"],
  ["D.Kirivong (Takeo)", "97.0", "17.01"],
  ["D.Tram Kak (Takeo)", "77.0", "13.87"],
  ["D.Oudong (K.Speu)", "57.0", "12.83"],
  ["D.Thpong (K.Speu)", "93.0", "15.49"],
  ["D.Samrong Torng (K.Speu)", "60.0", "12.73"],
  ["D.Chbar Morn (K.Speu)", "52.0", "12.35"],
  ["D.Kong Pisei (K.Speu)", "43.0", "12.83"],
  ["D.Baset (K.Speu)", "62.0", "13.78"],
  ["D.Kampong Tralach (K.Chhnang)", "89.0", "16.15"],
  ["D.Kampong Siem (K.Cham)", "135.0", "17.67"],
  ["D.Batheay (K.Cham)", "81.0", "14.73"]
];

function timestampForFile(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function dumpJson(database) {
  const settings = {};
  for (const row of database.prepare("SELECT key, value FROM settings").all()) {
    settings[row.key] = JSON.parse(row.value);
  }
  return {
    settings,
    trucks: database.prepare("SELECT truckNo, truckType, driverName, phone, active FROM trucks ORDER BY truckNo").all().map((row) => ({ ...row, active: Boolean(row.active) })),
    prices: database.prepare("SELECT id, fromLocation, toLocation, truckType, distanceKm, companyUnitPrice, truckSalaryUnitPrice, effectiveDate, active FROM prices ORDER BY truckType, toLocation, effectiveDate").all().map((row) => ({ ...row, active: Boolean(row.active) })),
    statements: database.prepare("SELECT id, month, statementNumber, statementDate, truckType, status, createdAt, updatedAt FROM statements ORDER BY month, statementNumber").all(),
    deliveries: database.prepare("SELECT id, statementId, deliveryDate, invoiceNo, truckNo, truckType, driverName, fromLocation, toLocation, distanceKm, qtyTon, companyUnitPrice, companyTotalAmount, truckSalaryUnitPrice, truckSalaryAmount, status, createdAt, updatedAt FROM deliveries ORDER BY createdAt").all(),
    activity: database.prepare("SELECT id, message, type, createdAt FROM activity ORDER BY createdAt DESC LIMIT 50").all()
  };
}

mkdirSync(backupDir, { recursive: true });
const backupPath = path.join(backupDir, `backup-before-import-crane-company-prices-${timestampForFile()}.db`);
copyFileSync(dbPath, backupPath);

const database = new DatabaseSync(dbPath);
const insertPrice = database.prepare(`
  INSERT INTO prices (id, fromLocation, toLocation, truckType, distanceKm, companyUnitPrice, truckSalaryUnitPrice, effectiveDate, active)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

database.exec("BEGIN");
try {
  database.prepare("DELETE FROM prices WHERE truckType = ? AND truckSalaryUnitPrice = 0").run(truckType);
  for (const [toLocation, distanceKm, companyUnitPrice] of rows) {
    insertPrice.run(
      randomUUID(),
      fromLocation,
      toLocation,
      truckType,
      Number(distanceKm),
      Number(companyUnitPrice),
      0,
      effectiveDate,
      1
    );
  }
  database.exec("COMMIT");
} catch (error) {
  database.exec("ROLLBACK");
  throw error;
}

writeFileSync(dataFile, JSON.stringify(dumpJson(database), null, 2));

const count = database.prepare("SELECT COUNT(*) AS count FROM prices WHERE truckType = ? AND effectiveDate = ?").get(truckType, effectiveDate).count;
console.log(JSON.stringify({ imported: count, truckType, effectiveDate, backupPath }, null, 2));
database.close();
