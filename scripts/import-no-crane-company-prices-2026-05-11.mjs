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
const truckType = "Without Crane";

const rows = [
  ["KH.Kambol (PP)", "19.0", "10.64"],
  ["KH.Dangkao (PP)", "9.0", "8.46"],
  ["KH.Mean Chey (PP)", "14.0", "8.84"],
  ["KH.Chamkar Morn (PP)", "18.0", "10.17"],
  ["KH. Boeng Keng Kong (PP)", "18.0", "10.17"],
  ["KH.Doun Penh (PP)", "21.0", "10.17"],
  ["KH.7 Makara (PP)", "21.0", "10.17"],
  ["KH.Tuol Kouk (PP)", "18.0", "10.17"],
  ["KH.Sen Sok (PP)", "24.0", "10.45"],
  ["KH.Russei Keo (PP)", "24.0", "10.45"],
  ["KH.Chba Ampeou (PP)", "20.0", "9.31"],
  ["KH.Posenchey (PP)", "29.0", "10.74"],
  ["KH.Prek Phnov (PP)", "30.0", "12.73"],
  ["KH.Chroy Changvar (PP)", "49.0", "13.97"],
  ["D.Takhmao (Kandal)", "11.0", "8.46"],
  ["D.Ang Snuol (Kandal)", "32.0", "12.73"],
  ["D.Saang (Kandal)", "25.0", "11.31"],
  ["D.Kandal Stueng (Kandal)", "8.0", "8.65"],
  ["D.Kien Svay (Kandal)", "27.0", "10.93"],
  ["D.Ponhea Leu (Kandal)", "53.0", "13.97"],
  ["D.Muk Kampoul (Kandal)", "47.0", "13.59"],
  ["D.Khsach Kandal (Kandal)", "50.0", "13.78"],
  ["D.Koh Thom (Kandal)", "54.0", "14.16"],
  ["D.Leukdek (Kandal)", "79.0", "16.53"],
  ["D.Lvea Em (Kandal)", "83.0", "16.91"],
  ["D.Kanh Chreach (Prey Veng)", "132.0", "14.25"],
  ["D.Kamchay Mea (Prey Veng)", "145.0", "14.25"],
  ["D.Mesang (Prey Veng)", "113.0", "14.25"],
  ["D.Kampong Trabek (Prey Veng)", "96.0", "14.25"],
  ["D.Svay Antor (Prey Veng)", "116.0", "14.25"],
  ["D.Baphnom (Prey Veng)", "88.0", "14.25"],
  ["D.Preah Sdach (Prey Veng)", "96.0", "14.25"],
  ["D.Sithor Kandal (Prey Veng)", "112.0", "14.25"],
  ["D.Pea Reang (Prey Veng)", "82.0", "14.25"],
  ["D.Po Rieng (Prey Veng)", "106.0", "14.25"],
  ["D.Peam Ro (Prey Veng)", "79.0", "14.25"],
  ["D.Peam Chor (Prey Veng)", "91.0", "14.25"],
  ["D.Prey Veng (Prey Veng)", "102.0", "14.25"],
  ["D.Rum Duol (S.Rieng)", "149.0", "14.25"],
  ["D.Svay Tiep (S.Rieng)", "158.0", "14.25"],
  ["D.Chantrea (S.Rieng)", "170.0", "14.25"],
  ["D.Svay Rieng (S.Rieng)", "131.0", "14.25"],
  ["D.Svay Chrum (S.Rieng)", "120.0", "14.25"],
  ["D.Kompong Ro (S.Rieng)", "158.0", "14.25"],
  ["D.Romeas Hek (S.Rieng)", "153.0", "14.25"],
  ["D.Bavet (S.Rieng)", "169.0", "14.25"],
  ["D.Bati (Takeo)", "23.0", "10.55"],
  ["D.Prey Kabas (Takeo)", "52.0", "12.35"],
  ["D.Angkor Borei (Takeo)", "70.0", "15.96"],
  ["D.Borei Chulsar (Takeo)", "96.0", "17.96"],
  ["D.Koh Andet (Takeo)", "92.0", "17.77"],
  ["D.Samrong (Takeo)", "38.0", "12.92"],
  ["D.Daun Keo (Takeo)", "56.0", "14.06"],
  ["D.Treang (Takeo)", "64.0", "14.63"],
  ["D.Kirivong (Takeo)", "97.0", "18.05"],
  ["D.Tram Kak (Takeo)", "77.0", "15.49"],
  ["D. Kep (Kep)", "151.0", "18.34"],
  ["D. Damnak Changoer (Kep)", "137.0", "17.77"],
  ["D.Angkor Chey (Kampot)", "91.0", "15.96"],
  ["D.Banteay Meas (Kampot)", "106.0", "16.53"],
  ["D.Chumkiri (Kampot)", "107.0", "16.63"],
  ["D.Chhouk (Kampot)", "94.0", "16.15"],
  ["D.Dong Tung (Kampot)", "110.0", "16.72"],
  ["D.Kampong Trach (Kampot)", "124.0", "17.20"],
  ["D.Tuek Chhu (Kampot)", "139.0", "17.86"],
  ["D.Kampot (Kampot)", "137.0", "17.77"],
  ["D.Oudong (K.Speu)", "57.0", "13.30"],
  ["D.Thpong (K.Speu)", "93.0", "17.29"],
  ["D.Samrong Torng (K.Speu)", "60.0", "14.25"],
  ["D.Chbar Morn (K.Speu)", "52.0", "13.78"],
  ["D.Kong Pisei (K.Speu)", "43.0", "14.16"],
  ["D.Baset (K.Speu)", "62.0", "15.30"],
  ["D.Oral (K.Speu)", "102.0", "18.34"],
  ["D.Phnom Srouch (K.Speu)", "70.0", "15.01"],
  ["D.Kirirom (K.Speu)", "99.0", "18.15"],
  ["D.Kampong Leng (K.Chhnang)", "231.0", "21.57"],
  ["D.Chulkiri (K.Chhnang)", "115.0", "16.82"],
  ["D.Kampong Chhnang (K.Chhnang)", "109.0", "16.63"],
  ["D.Rolear Phiear (K.Chhnang)", "103.0", "16.34"],
  ["D.Kampong Tralach (K.Chhnang)", "89.0", "15.96"],
  ["D.Boribo (K.Chhnang)", "142.0", "17.96"],
  ["D.Tuek Phos (K.Chhnang)", "116.0", "16.91"],
  ["D.Samaki Meanchey (K.Chhnang)", "75.0", "15.39"],
  ["D.Kampong Siem (K.Cham)", "135.0", "16.15"],
  ["D.Chamkar Leu (K.Cham)", "156.0", "18.53"],
  ["D.Prey Chhor (K.Cham)", "114.0", "16.91"],
  ["D.Kang Meas (K.Cham)", "160.0", "18.72"],
  ["D.Srey Santhor (K.Cham)", "70.0", "15.11"],
  ["D.Cheung Prey (K.Cham)", "107.0", "16.63"],
  ["D.Batheay (K.Cham)", "81.0", "15.58"]
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
const backupPath = path.join(backupDir, `backup-before-import-no-crane-company-prices-${timestampForFile()}.db`);
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
