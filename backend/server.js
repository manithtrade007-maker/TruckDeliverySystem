import { createServer } from "node:http";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "frontend");
const frontendDistDir = path.join(frontendDir, "dist");
const dataDir = path.join(rootDir, "backend");
const dataFile = path.join(dataDir, "data.json");
const dataTempFile = path.join(dataDir, "data.json.tmp");
const port = Number(process.env.PORT || 5058);
const host = process.env.HOST || "0.0.0.0";
let saveQueue = Promise.resolve();
let mutationQueue = Promise.resolve();

const craneCompanyPrices = [
  { toLocation: "Khan Kambol (PP)", distanceKm: 19, companyUnitPrice: 9.98 },
  { toLocation: "Khan Dangkao (PP)", distanceKm: 9, companyUnitPrice: 7.7 },
  { toLocation: "Khan Mean Chey (PP)", distanceKm: 14, companyUnitPrice: 8.08 },
  { toLocation: "Khan Chamkar Morn (PP)", distanceKm: 18, companyUnitPrice: 9.41 },
  { toLocation: "Khan Boeng Keng Kong (PP)", distanceKm: 18, companyUnitPrice: 9.41 },
  { toLocation: "Khan Doun Penh (PP)", distanceKm: 21, companyUnitPrice: 9.6 },
  { toLocation: "Khan 7 Makara (PP)", distanceKm: 21, companyUnitPrice: 9.6 },
  { toLocation: "Khan Tuol Kouk (PP)", distanceKm: 18, companyUnitPrice: 9.5 },
  { toLocation: "Khan Sen Sok (PP)", distanceKm: 24, companyUnitPrice: 9.88 },
  { toLocation: "Khan Russei Keo (PP)", distanceKm: 24, companyUnitPrice: 9.88 },
  { toLocation: "Khan Chba Ampeou (PP)", distanceKm: 20, companyUnitPrice: 8.65 },
  { toLocation: "Khan Posenchey (PP)", distanceKm: 29, companyUnitPrice: 10.26 },
  { toLocation: "Khan Prek Phnov (PP)", distanceKm: 30, companyUnitPrice: 12.26 },
  { toLocation: "Khan Chroy Changvar (PP)", distanceKm: 49, companyUnitPrice: 13.78 },
  { toLocation: "Takhmao (Kandal)", distanceKm: 11, companyUnitPrice: 7.6 },
  { toLocation: "Ang Snuol (Kandal)", distanceKm: 32, companyUnitPrice: 12.07 },
  { toLocation: "Saang (Kandal)", distanceKm: 25, companyUnitPrice: 10.55 },
  { toLocation: "Kandal Stueng (Kandal)", distanceKm: 8, companyUnitPrice: 7.79 },
  { toLocation: "Kien Svay (Kandal)", distanceKm: 27, companyUnitPrice: 10.26 },
  { toLocation: "Ponhea Leu (Kandal)", distanceKm: 53, companyUnitPrice: 13.68 },
  { toLocation: "Muk Kampoul (Kandal)", distanceKm: 47, companyUnitPrice: 13.11 },
  { toLocation: "Khsach Kandal (Kandal)", distanceKm: 50, companyUnitPrice: 13.3 },
  { toLocation: "Koh Thom (Kandal)", distanceKm: 54, companyUnitPrice: 13.78 },
  { toLocation: "Leukdek (Kandal)", distanceKm: 79, companyUnitPrice: 16.44 },
  { toLocation: "Lvea Em (Kandal)", distanceKm: 83, companyUnitPrice: 16.82 },
  { toLocation: "Kanh Chreach (Prey Veng)", distanceKm: 132, companyUnitPrice: 18.81 },
  { toLocation: "Kamchay Mea (Prey Veng)", distanceKm: 145, companyUnitPrice: 19.48 },
  { toLocation: "Mesang (Prey Veng)", distanceKm: 113, companyUnitPrice: 17.77 },
  { toLocation: "Kampong Trabek (Prey Veng)", distanceKm: 96, companyUnitPrice: 16.72 },
  { toLocation: "Svay Antor (Prey Veng)", distanceKm: 116, companyUnitPrice: 18.24 },
  { toLocation: "Baphnom (Prey Veng)", distanceKm: 88, companyUnitPrice: 16.25 },
  { toLocation: "Preah Sdach (Prey Veng)", distanceKm: 96, companyUnitPrice: 16.72 },
  { toLocation: "Sithor Kandal (Prey Veng)", distanceKm: 112, companyUnitPrice: 17.77 },
  { toLocation: "Pea Reang (Prey Veng)", distanceKm: 82, companyUnitPrice: 16.53 },
  { toLocation: "Po Rieng (Prey Veng)", distanceKm: 106, companyUnitPrice: 17.29 },
  { toLocation: "Peam Ro (Prey Veng)", distanceKm: 79, companyUnitPrice: 15.77 },
  { toLocation: "Peam Chor (Prey Veng)", distanceKm: 91, companyUnitPrice: 16.53 },
  { toLocation: "Prey Veng (Prey Veng)", distanceKm: 102, companyUnitPrice: 19.76 },
  { toLocation: "Rum Duol (S.Rieng)", distanceKm: 149, companyUnitPrice: 19.76 },
  { toLocation: "Svay Tiep (S.Rieng)", distanceKm: 158, companyUnitPrice: 20.33 },
  { toLocation: "Svay Rieng (S.Rieng)", distanceKm: 131, companyUnitPrice: 18.72 },
  { toLocation: "Svay Chrum (S.Rieng)", distanceKm: 120, companyUnitPrice: 18.15 },
  { toLocation: "Kompong Ro (S.Rieng)", distanceKm: 158, companyUnitPrice: 20.33 },
  { toLocation: "Bati (Takeo)", distanceKm: 23, companyUnitPrice: 9.88 },
  { toLocation: "Prey Kabas (Takeo)", distanceKm: 52, companyUnitPrice: 11.97 },
  { toLocation: "Angkor Borei (Takeo)", distanceKm: 70, companyUnitPrice: 15.77 },
  { toLocation: "Borei Chulsar (Takeo)", distanceKm: 96, companyUnitPrice: 19 },
  { toLocation: "Koh Andet (Takeo)", distanceKm: 92, companyUnitPrice: 18.81 },
  { toLocation: "Samrong (Takeo)", distanceKm: 38, companyUnitPrice: 12.35 },
  { toLocation: "Daun Keo (Takeo)", distanceKm: 56, companyUnitPrice: 13.78 },
  { toLocation: "Treang (Takeo)", distanceKm: 64, companyUnitPrice: 13.45 },
  { toLocation: "Kirivong (Takeo)", distanceKm: 97, companyUnitPrice: 19 },
  { toLocation: "Tram Kak (Takeo)", distanceKm: 77, companyUnitPrice: 15.39 },
  { toLocation: "Oudong (K.Speu)", distanceKm: 57, companyUnitPrice: 13.97 },
  { toLocation: "Thpong (K.Speu)", distanceKm: 93, companyUnitPrice: 17.39 },
  { toLocation: "Samrong Torng (K.Speu)", distanceKm: 60, companyUnitPrice: 13.97 },
  { toLocation: "Chbar Morn (K.Speu)", distanceKm: 52, companyUnitPrice: 13.4 },
  { toLocation: "Kong Pisei (K.Speu)", distanceKm: 43, companyUnitPrice: 13.68 },
  { toLocation: "Baset (K.Speu)", distanceKm: 62, companyUnitPrice: 15.01 },
  { toLocation: "Kampong Tralach (K.Chhnang)", distanceKm: 89, companyUnitPrice: 17.58 },
  { toLocation: "Kampong Siem (K.Cham)", distanceKm: 135, companyUnitPrice: 20.71 },
  { toLocation: "Batheay (K.Cham)", distanceKm: 81, companyUnitPrice: 16.53 }
];

const noCraneCompanyPrices = [
  { toLocation: "Khan Kambol (PP)", distanceKm: 19, companyUnitPrice: 10.93 },
  { toLocation: "Khan Dangkao (PP)", distanceKm: 9, companyUnitPrice: 8.65 },
  { toLocation: "Khan Mean Chey (PP)", distanceKm: 14, companyUnitPrice: 9.03 },
  { toLocation: "Khan Chamkar Morn (PP)", distanceKm: 18, companyUnitPrice: 10.45 },
  { toLocation: "Khan Boeng Keng Kong (PP)", distanceKm: 18, companyUnitPrice: 10.45 },
  { toLocation: "Khan Doun Penh (PP)", distanceKm: 21, companyUnitPrice: 10.55 },
  { toLocation: "Khan 7 Makara (PP)", distanceKm: 21, companyUnitPrice: 10.55 },
  { toLocation: "Khan Tuol Kouk (PP)", distanceKm: 18, companyUnitPrice: 10.45 },
  { toLocation: "Khan Sen Sok (PP)", distanceKm: 24, companyUnitPrice: 10.83 },
  { toLocation: "Khan Russei Keo (PP)", distanceKm: 24, companyUnitPrice: 10.83 },
  { toLocation: "Khan Chba Ampeou (PP)", distanceKm: 20, companyUnitPrice: 9.6 },
  { toLocation: "Khan Posenchey (PP)", distanceKm: 29, companyUnitPrice: 11.21 },
  { toLocation: "Khan Prek Phnov (PP)", distanceKm: 30, companyUnitPrice: 13.21 },
  { toLocation: "Khan Chroy Changvar (PP)", distanceKm: 49, companyUnitPrice: 14.73 },
  { toLocation: "Takhmao (Kandal)", distanceKm: 11, companyUnitPrice: 8.65 },
  { toLocation: "Ang Snuol (Kandal)", distanceKm: 32, companyUnitPrice: 13.21 },
  { toLocation: "Saang (Kandal)", distanceKm: 25, companyUnitPrice: 11.69 },
  { toLocation: "Kandal Stueng (Kandal)", distanceKm: 8, companyUnitPrice: 8.74 },
  { toLocation: "Kien Svay (Kandal)", distanceKm: 27, companyUnitPrice: 11.4 },
  { toLocation: "Ponhea Leu (Kandal)", distanceKm: 53, companyUnitPrice: 14.82 },
  { toLocation: "Muk Kampoul (Kandal)", distanceKm: 47, companyUnitPrice: 14.35 },
  { toLocation: "Khsach Kandal (Kandal)", distanceKm: 50, companyUnitPrice: 14.54 },
  { toLocation: "Koh Thom (Kandal)", distanceKm: 54, companyUnitPrice: 15.01 },
  { toLocation: "Leukdek (Kandal)", distanceKm: 79, companyUnitPrice: 17.77 },
  { toLocation: "Lvea Em (Kandal)", distanceKm: 83, companyUnitPrice: 18.24 },
  { toLocation: "Kanh Chreach (Prey Veng)", distanceKm: 132, companyUnitPrice: 14.73 },
  { toLocation: "Kamchay Mea (Prey Veng)", distanceKm: 145, companyUnitPrice: 14.73 },
  { toLocation: "Mesang (Prey Veng)", distanceKm: 113, companyUnitPrice: 14.73 },
  { toLocation: "Kampong Trabek (Prey Veng)", distanceKm: 96, companyUnitPrice: 14.73 },
  { toLocation: "Svay Antor (Prey Veng)", distanceKm: 116, companyUnitPrice: 14.73 },
  { toLocation: "Baphnom (Prey Veng)", distanceKm: 88, companyUnitPrice: 14.73 },
  { toLocation: "Preah Sdach (Prey Veng)", distanceKm: 96, companyUnitPrice: 14.73 },
  { toLocation: "Sithor Kandal (Prey Veng)", distanceKm: 112, companyUnitPrice: 14.73 },
  { toLocation: "Pea Reang (Prey Veng)", distanceKm: 82, companyUnitPrice: 14.73 },
  { toLocation: "Po Rieng (Prey Veng)", distanceKm: 106, companyUnitPrice: 14.73 },
  { toLocation: "Peam Ro (Prey Veng)", distanceKm: 79, companyUnitPrice: 14.73 },
  { toLocation: "Peam Chor (Prey Veng)", distanceKm: 91, companyUnitPrice: 14.73 },
  { toLocation: "Prey Veng (Prey Veng)", distanceKm: 102, companyUnitPrice: 14.73 },
  { toLocation: "Rum Duol (S.Rieng)", distanceKm: 149, companyUnitPrice: 14.96 },
  { toLocation: "Svay Tiep (S.Rieng)", distanceKm: 158, companyUnitPrice: 14.96 },
  { toLocation: "Chantrea (S.Rieng)", distanceKm: 170, companyUnitPrice: 14.96 },
  { toLocation: "Svay Rieng (S.Rieng)", distanceKm: 131, companyUnitPrice: 14.96 },
  { toLocation: "Svay Chrum (S.Rieng)", distanceKm: 120, companyUnitPrice: 14.96 },
  { toLocation: "Kompong Ro (S.Rieng)", distanceKm: 158, companyUnitPrice: 14.96 },
  { toLocation: "Bavet (S.Rieng)", distanceKm: 169, companyUnitPrice: 14.96 },
  { toLocation: "Bati (Takeo)", distanceKm: 23, companyUnitPrice: 10.93 },
  { toLocation: "Prey Kabas (Takeo)", distanceKm: 52, companyUnitPrice: 13.21 },
  { toLocation: "Angkor Borei (Takeo)", distanceKm: 70, companyUnitPrice: 17.1 },
  { toLocation: "Borei Chulsar (Takeo)", distanceKm: 96, companyUnitPrice: 19.48 },
  { toLocation: "Koh Andet (Takeo)", distanceKm: 92, companyUnitPrice: 19.29 },
  { toLocation: "Samrong (Takeo)", distanceKm: 38, companyUnitPrice: 13.49 },
  { toLocation: "Daun Keo (Takeo)", distanceKm: 56, companyUnitPrice: 15.01 },
  { toLocation: "Treang (Takeo)", distanceKm: 64, companyUnitPrice: 15.68 },
  { toLocation: "Kirivong (Takeo)", distanceKm: 97, companyUnitPrice: 19.57 },
  { toLocation: "Tram Kak (Takeo)", distanceKm: 77, companyUnitPrice: 16.72 },
  { toLocation: "Kep (Kep)", distanceKm: 151, companyUnitPrice: 20.81 },
  { toLocation: "Damnak Changoer (Kep)", distanceKm: 137, companyUnitPrice: 19.95 },
  { toLocation: "Angkor Chey (Kampot)", distanceKm: 91, companyUnitPrice: 17.39 },
  { toLocation: "Banteay Meas (Kampot)", distanceKm: 106, companyUnitPrice: 18.24 },
  { toLocation: "Chumkiri (Kampot)", distanceKm: 107, companyUnitPrice: 18.34 },
  { toLocation: "Chhouk (Kampot)", distanceKm: 94, companyUnitPrice: 17.67 },
  { toLocation: "Dong Tung (Kampot)", distanceKm: 110, companyUnitPrice: 18.53 },
  { toLocation: "Kampong Trach (Kampot)", distanceKm: 124, companyUnitPrice: 19.19 },
  { toLocation: "Tuek Chhu (Kampot)", distanceKm: 139, companyUnitPrice: 20.14 },
  { toLocation: "Oudong (K.Speu)", distanceKm: 57, companyUnitPrice: 14.25 },
  { toLocation: "Thpong (K.Speu)", distanceKm: 93, companyUnitPrice: 18.81 },
  { toLocation: "Samrong Torng (K.Speu)", distanceKm: 60, companyUnitPrice: 15.2 },
  { toLocation: "Chbar Morn (K.Speu)", distanceKm: 52, companyUnitPrice: 14.63 },
  { toLocation: "Kong Pisei (K.Speu)", distanceKm: 43, companyUnitPrice: 14.82 },
  { toLocation: "Baset (K.Speu)", distanceKm: 62, companyUnitPrice: 16.34 },
  { toLocation: "Oral (K.Speu)", distanceKm: 102, companyUnitPrice: 19.95 },
  { toLocation: "Phnom Srouch (K.Speu)", distanceKm: 70, companyUnitPrice: 16.15 },
  { toLocation: "Kirirom (K.Speu)", distanceKm: 99, companyUnitPrice: 19.76 },
  { toLocation: "Kampong Leng (K.Chhnang)", distanceKm: 231, companyUnitPrice: 25.27 },
  { toLocation: "Chulkiri (K.Chhnang)", distanceKm: 115, companyUnitPrice: 18.72 },
  { toLocation: "Rolear Phiear (K.Chhnang)", distanceKm: 103, companyUnitPrice: 18.05 },
  { toLocation: "Kampong Tralach (K.Chhnang)", distanceKm: 89, companyUnitPrice: 17.39 },
  { toLocation: "Boribo (K.Chhnang)", distanceKm: 142, companyUnitPrice: 20.24 },
  { toLocation: "Tuek Phos (K.Chhnang)", distanceKm: 116, companyUnitPrice: 18.81 },
  { toLocation: "Samaki Meanchey (K.Chhnang)", distanceKm: 75, companyUnitPrice: 16.63 },
  { toLocation: "Santuk (K.Thom)", distanceKm: 158, companyUnitPrice: 20.62 },
  { toLocation: "Stueng Sen (K.Thom)", distanceKm: 175, companyUnitPrice: 21 },
  { toLocation: "Staung (K.Thom)", distanceKm: 238, companyUnitPrice: 22.71 },
  { toLocation: "Kampong Siem (K.Cham)", distanceKm: 135, companyUnitPrice: 18.34 },
  { toLocation: "Chamkar Leu (K.Cham)", distanceKm: 156, companyUnitPrice: 21.09 },
  { toLocation: "Prey Chhor (K.Cham)", distanceKm: 114, companyUnitPrice: 18.72 },
  { toLocation: "Kang Meas (K.Cham)", distanceKm: 160, companyUnitPrice: 21.28 },
  { toLocation: "Srey Santhor (K.Cham)", distanceKm: 70, companyUnitPrice: 16.25 },
  { toLocation: "Cheung Prey (K.Cham)", distanceKm: 107, companyUnitPrice: 18.34 },
  { toLocation: "Batheay (K.Cham)", distanceKm: 81, companyUnitPrice: 16.91 },
  { toLocation: "Kampong Chhnang (K.Chhnang)", distanceKm: 109, companyUnitPrice: 18.43 }
];

const defaultData = {
  settings: {
    companyName: "N&M LOGISTIC",
    fromName: "Nhep Manith",
    toName: "SLP",
    defaultFromLocation: "Warehouse-09"
  },
  trucks: [
    { truckNo: "3G-0397", truckType: "With Crane", driverName: "", phone: "", active: true },
    { truckNo: "3B-4693", truckType: "With Crane", driverName: "", phone: "", active: true },
    { truckNo: "3E-0096", truckType: "With Crane", driverName: "", phone: "", active: true },
    { truckNo: "3E-5987", truckType: "With Crane", driverName: "", phone: "", active: true },
    { truckNo: "3F-6390", truckType: "With Crane", driverName: "", phone: "", active: true },
    { truckNo: "3F-5239", truckType: "With Crane", driverName: "", phone: "", active: true },
    { truckNo: "3E-8896", truckType: "Without Crane", driverName: "", phone: "", active: true },
    { truckNo: "3B-9368", truckType: "Without Crane", driverName: "", phone: "", active: true },
    { truckNo: "3A-2230", truckType: "Without Crane", driverName: "", phone: "", active: true }
  ],
  prices: [
    ...craneCompanyPrices.map((price, index) => ({
      id: `crane-company-${index + 1}`,
      fromLocation: "Warehouse-09",
      toLocation: price.toLocation,
      truckType: "With Crane",
      distanceKm: price.distanceKm,
      companyUnitPrice: price.companyUnitPrice,
      truckSalaryUnitPrice: 0,
      active: true
    })),
    ...noCraneCompanyPrices.map((price, index) => ({
      id: `no-crane-company-${index + 1}`,
      fromLocation: "Warehouse-09",
      toLocation: price.toLocation,
      truckType: "Without Crane",
      distanceKm: price.distanceKm,
      companyUnitPrice: price.companyUnitPrice,
      truckSalaryUnitPrice: 0,
      active: true
    }))
  ],
  statements: [],
  deliveries: []
};

async function ensureDataFile() {
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(dataFile)) {
    await writeFile(dataFile, JSON.stringify(defaultData, null, 2));
  }
}

async function readData() {
  await ensureDataFile();
  const raw = await readFile(dataFile, "utf8");
  const data = JSON.parse(raw);
  data.statements ||= [];
  data.deliveries ||= [];
  data.trucks ||= [];
  data.prices ||= [];
  return data;
}

async function saveData(data) {
  const body = JSON.stringify(data, null, 2);
  saveQueue = saveQueue.then(async () => {
    await writeFile(dataTempFile, body);
    await rename(dataTempFile, dataFile);
  });
  await saveQueue;
}

async function updateData(mutator) {
  const operation = mutationQueue.then(async () => {
    const data = await readData();
    const result = await mutator(data);
    await saveData(data);
    return result;
  });
  mutationQueue = operation.catch(() => {});
  return operation;
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function sendText(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeCode(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function monthFromDate(value) {
  return normalizeText(value).slice(0, 7);
}

function nextStatementNumber(data, month) {
  const numbers = data.statements
    .filter((statement) => statement.month === month)
    .map((statement) => Number(statement.statementNumber || 0));
  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

function statementRowCount(data, statementId) {
  return data.deliveries.filter((delivery) => delivery.statementId === statementId).length;
}

function saveStatement(data, input) {
  const month = normalizeText(input.month);
  const truckType = normalizeText(input.truckType);
  const statementNumber = Number(input.statementNumber);
  const statementDate = normalizeText(input.statementDate);

  if (!month) throw new Error("Month is required.");
  if (!truckType) throw new Error("Truck type is required.");
  if (!statementDate) throw new Error("Statement date is required.");
  if (!Number.isInteger(statementNumber) || statementNumber <= 0) {
    throw new Error("Statement number must be a positive number.");
  }

  const duplicate = data.statements.some(
    (statement) =>
      statement.month === month &&
      Number(statement.statementNumber) === statementNumber &&
      statement.id !== input.id
  );
  if (duplicate) throw new Error("Statement number already exists in this month.");

  const existing = data.statements.find((statement) => statement.id === input.id);

  const statement = {
    id: input.id || crypto.randomUUID(),
    month,
    statementNumber,
    statementDate,
    truckType,
    status: input.status || existing?.status || "Draft",
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const index = data.statements.findIndex((item) => item.id === statement.id);
  if (index >= 0) data.statements[index] = statement;
  else data.statements.push(statement);
  return statement;
}

function enrichDelivery(data, input) {
  const statementId = normalizeText(input.statementId);
  const deliveryDate = normalizeText(input.deliveryDate);
  const invoiceNo = normalizeText(input.invoiceNo);
  const truckNo = normalizeCode(input.truckNo);
  const toLocation = normalizeText(input.toLocation);
  const qtyTon = toNumber(input.qtyTon);
  const fromLocation = normalizeText(input.fromLocation || data.settings.defaultFromLocation);
  const statement = data.statements.find((item) => item.id === statementId);
  const truck = data.trucks.find((item) => item.truckNo === truckNo && item.active !== false);

  if (!statementId || !statement) throw new Error("Statement is required.");
  if (statement.status !== "Draft") throw new Error("This statement is finished. Create or select another statement.");
  if (statementRowCount(data, statementId) >= 30 && !input.id) {
    throw new Error("This statement already has 30 rows. Create a new statement.");
  }
  if (!deliveryDate) throw new Error("Delivery date is required.");
  if (!invoiceNo) throw new Error("Invoice number is required.");
  if (!truckNo) throw new Error("Truck number is required.");
  if (!truck) throw new Error("Truck number does not exist.");
  if (truck.truckType !== statement.truckType) {
    throw new Error(`Truck ${truckNo} is ${truck.truckType}, but this statement is ${statement.truckType}.`);
  }
  if (monthFromDate(deliveryDate) !== statement.month) {
    throw new Error("Delivery date must be inside the selected statement month.");
  }
  if (!toLocation) throw new Error("To location is required.");
  if (qtyTon <= 0) throw new Error("QTY(T) must be greater than zero.");

  const duplicate = data.deliveries.some(
    (item) => item.invoiceNo === invoiceNo && item.id !== input.id
  );
  if (duplicate) throw new Error("Invoice number already exists.");

  const price = data.prices.find(
    (item) =>
      item.active !== false &&
      item.fromLocation === fromLocation &&
      item.toLocation === toLocation &&
      item.truckType === truck.truckType
  );
  if (!price) {
    throw new Error(`No price found for ${fromLocation} to ${toLocation} (${truck.truckType}).`);
  }

  const companyUnitPrice = toNumber(price.companyUnitPrice);
  const truckSalaryUnitPrice = toNumber(price.truckSalaryUnitPrice);

  return {
    id: input.id || crypto.randomUUID(),
    statementId,
    deliveryDate,
    invoiceNo,
    truckNo,
    truckType: truck.truckType,
    driverName: truck.driverName,
    fromLocation,
    toLocation,
    distanceKm: toNumber(price.distanceKm),
    qtyTon,
    companyUnitPrice,
    companyTotalAmount: roundMoney(qtyTon * companyUnitPrice),
    truckSalaryUnitPrice,
    truckSalaryAmount: roundMoney(qtyTon * truckSalaryUnitPrice),
    status: input.status || "Draft",
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function filterByMonth(items, month) {
  if (!month) return items;
  return items.filter((item) => item.deliveryDate.slice(0, 7) === month);
}

function filteredDeliveries(data, query) {
  let rows = [...data.deliveries];
  if (query.statementId) rows = rows.filter((item) => item.statementId === query.statementId);
  if (query.month) rows = filterByMonth(rows, query.month);
  if (query.truckNo) rows = rows.filter((item) => item.truckNo === query.truckNo);
  if (query.truckType) rows = rows.filter((item) => item.truckType === query.truckType);
  if (query.statementId) {
    return rows.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  }
  return rows.sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate) || a.invoiceNo.localeCompare(b.invoiceNo));
}

function statementsWithCounts(data) {
  return data.statements
    .map((statement) => {
      const rows = data.deliveries.filter((delivery) => delivery.statementId === statement.id);
      return {
        ...statement,
        rowCount: rows.length,
        totalQtyTon: roundMoney(rows.reduce((sum, row) => sum + toNumber(row.qtyTon), 0)),
        companyTotalAmount: roundMoney(rows.reduce((sum, row) => sum + toNumber(row.companyTotalAmount), 0)),
        truckSalaryAmount: roundMoney(rows.reduce((sum, row) => sum + toNumber(row.truckSalaryAmount), 0))
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month) || Number(a.statementNumber) - Number(b.statementNumber));
}

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function money(value) {
  return Number(value || 0).toFixed(2);
}

function formatShortDate(value) {
  const text = normalizeText(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return text;
  return `${match[3]}/${match[2]}/${match[1].slice(2)}`;
}

function slug(value) {
  return String(value || "all")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function truckTypeFileLabel(truckType) {
  return truckType === "With Crane" ? "car-with-crane" : "car-no-crane";
}

function rowsByPage(rows, pageSize = 30) {
  const pages = [];
  for (let index = 0; index < rows.length; index += pageSize) {
    pages.push(rows.slice(index, index + pageSize));
  }
  return pages.length ? pages : [[]];
}

function formatExcelValue(value, column) {
  if (column.key === "rowNo") return value;
  if (column.type === "date") return formatShortDate(value);
  if (column.type === "currency") return `$ ${money(value)}`;
  if (column.type === "qty") return `${Number(value || 0).toFixed(5)}T`;
  return value;
}

function cellClass(column) {
  return [column.align, column.type === "text" ? "text" : "", column.type === "date" ? "date" : ""]
    .filter(Boolean)
    .join(" ");
}

function excelTable(title, rows, columns, summaryColumns = [], options = {}) {
  const totals = Object.fromEntries(
    summaryColumns.map((key) => [key, rows.reduce((sum, row) => sum + toNumber(row[key]), 0)])
  );
  const headerHtml = options.headerHtml || ((pageIndex, pages) => `
    <tr><td class="title" colspan="${columns.length}">${htmlEscape(title)}</td></tr>
    <tr><td class="subtitle" colspan="${columns.length}">Page ${pageIndex + 1} of ${pages.length}</td></tr>`);
  const pages = rowsByPage(rows, 30);
  const tablePages = pages
    .map((pageRows, pageIndex) => {
      const isLastPage = pageIndex === pages.length - 1;
      return `<table class="page">
    ${headerHtml(pageIndex, pages)}
    <tr>${columns.map((column) => `<th>${htmlEscape(column.label)}</th>`).join("")}</tr>
    ${pageRows
      .map(
        (row, index) =>
          `<tr>${columns
            .map((column) => {
              const value = column.key === "rowNo" ? pageIndex * 30 + index + 1 : row[column.key];
              const formatted = formatExcelValue(value, column);
              const className = cellClass(column) ? ` class="${cellClass(column)}"` : "";
              return `<td${className}>${htmlEscape(formatted)}</td>`;
            })
            .join("")}</tr>`
      )
      .join("")}
    ${
      isLastPage
        ? options.mergedTotal
          ? `<tr>
      <td class="center" colspan="7"><strong>Total</strong></td>
      <td class="right"><strong>${htmlEscape(`${Number(totals.qtyTon || 0).toFixed(5)}T`)}</strong></td>
      <td></td>
      <td class="right"><strong>${htmlEscape(`$ ${money(totals.companyTotalAmount || totals.truckSalaryAmount || 0)}`)}</strong></td>
    </tr>
    ${options.signatureHtml || ""}`
          : `<tr>
      ${columns
        .map((column, index) => {
          if (index === 0) return `<td><strong>Total</strong></td>`;
          if (summaryColumns.includes(column.key)) {
            const formatted = formatExcelValue(totals[column.key], column);
            return `<td class="right"><strong>${htmlEscape(formatted)}</strong></td>`;
          }
          return "<td></td>";
        })
        .join("")}
    </tr>`
        : ""
    }
  </table>`;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 18px; }
    th, td { border: 1px solid #333; padding: 5px; }
    th { background: #fff200; font-weight: bold; }
    .title { font-size: 18px; font-weight: bold; text-align: center; }
    .meta { font-size: 12px; font-weight: bold; }
    .subtitle { font-size: 11px; text-align: right; border-top: 0; }
    .right { text-align: right; }
    .center { text-align: center; }
    .date { text-align: center; }
    .text { mso-number-format:"\\@"; }
    .signature td { height: 24px; }
    .line { border-bottom: 1px dotted #333; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
  </style>
</head>
<body>
  ${tablePages}
</body>
</html>`;
}

function accountingExport(data, rows) {
  const statement = data.statements.find((item) => item.id === rows[0]?.statementId);
  const signatureHtml = `
    <tr class="signature">
      <td class="center" colspan="3">Prepared By</td>
      <td class="center" colspan="4">Checked By</td>
      <td class="center" colspan="3">Approved By</td>
    </tr>
    <tr class="signature">
      <td colspan="3"></td>
      <td colspan="4"></td>
      <td colspan="3"></td>
    </tr>
    <tr class="signature">
      <td colspan="3"></td>
      <td colspan="4"></td>
      <td colspan="3"></td>
    </tr>
    <tr class="signature">
      <td colspan="3">Name:</td>
      <td colspan="4">Name:</td>
      <td colspan="3">Name:</td>
    </tr>
    <tr class="signature">
      <td colspan="3">Date:</td>
      <td colspan="4">Date:</td>
      <td colspan="3">Date:</td>
    </tr>`;
  const headerHtml = (pageIndex, pages) => `
    <tr>
      <td class="title" colspan="6">${htmlEscape(data.settings.companyName)}</td>
      <td class="meta" colspan="2">Invoice No:</td>
      <td class="meta" colspan="2">${htmlEscape(statement?.statementNumber || "")}</td>
    </tr>
    <tr>
      <td class="meta" colspan="6">From: ${htmlEscape(data.settings.fromName || "Nhep Manith")}</td>
      <td class="meta" colspan="2">Statement Date:</td>
      <td class="meta" colspan="2">${htmlEscape(formatShortDate(statement?.statementDate || ""))}</td>
    </tr>
    <tr>
      <td class="meta" colspan="6">To: ${htmlEscape(data.settings.toName || "SLP")}</td>
      <td class="subtitle" colspan="4">Page ${pageIndex + 1} of ${pages.length}</td>
    </tr>`;
  return excelTable(
    data.settings.companyName,
    rows,
    [
      { key: "rowNo", label: "No", align: "center" },
      { key: "deliveryDate", label: "Delivery Date", type: "date" },
      { key: "invoiceNo", label: "Invoice No", type: "text" },
      { key: "truckNo", label: "Truck No", type: "text" },
      { key: "truckType", label: "Type of Truck" },
      { key: "fromLocation", label: "From" },
      { key: "toLocation", label: "To" },
      { key: "qtyTon", label: "QTY(T)", type: "qty", align: "right" },
      { key: "companyUnitPrice", label: "Unit Price", type: "currency", align: "right" },
      { key: "companyTotalAmount", label: "Total Amount", type: "currency", align: "right" }
    ],
    ["qtyTon", "companyTotalAmount"],
    { headerHtml, signatureHtml, mergedTotal: true }
  );
}

function salaryExport(rows) {
  const truckType = rows[0]?.truckType || "No Data";
  return excelTable(
    `${truckType} Monthly Truck Salary Report`,
    rows,
    [
      { key: "rowNo", label: "No", align: "center" },
      { key: "deliveryDate", label: "Delivery Date" },
      { key: "invoiceNo", label: "Invoice No" },
      { key: "truckNo", label: "Truck No" },
      { key: "driverName", label: "Driver Name" },
      { key: "truckType", label: "Type of Truck" },
      { key: "fromLocation", label: "From" },
      { key: "toLocation", label: "To" },
      { key: "qtyTon", label: "QTY(T)", align: "right" },
      { key: "truckSalaryUnitPrice", label: "Truck Unit Price", type: "money", align: "right" },
      { key: "truckSalaryAmount", label: "Truck Salary", type: "money", align: "right" }
    ],
    ["qtyTon", "truckSalaryAmount"]
  );
}

function parseQuery(url) {
  return Object.fromEntries(url.searchParams.entries());
}

async function api(req, res, url) {
  const data = await readData();
  const query = parseQuery(url);

  if (req.method === "GET" && url.pathname === "/api/data") {
    return sendJson(res, 200, { ...data, statements: statementsWithCounts(data) });
  }

  if (req.method === "GET" && url.pathname === "/api/next-statement-number") {
    const month = normalizeText(query.month);
    if (!month) throw new Error("Month is required.");
    return sendJson(res, 200, { nextStatementNumber: nextStatementNumber(data, month) });
  }

  if (req.method === "POST" && url.pathname === "/api/statements") {
    const body = await readBody(req);
    const statement = await updateData((data) => saveStatement(data, body));
    return sendJson(res, 200, statement);
  }

  if (req.method === "POST" && url.pathname.startsWith("/api/statements/") && url.pathname.endsWith("/finish")) {
    const id = decodeURIComponent(url.pathname.split("/")[3]);
    const statement = await updateData((data) => {
      const statement = data.statements.find((item) => item.id === id);
      if (!statement) throw new Error("Statement not found.");
      const rows = statementRowCount(data, id);
      if (rows < 1) throw new Error("Cannot finish an empty statement.");
      statement.status = "Finished";
      statement.updatedAt = new Date().toISOString();
      return statement;
    });
    return sendJson(res, 200, statement);
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/statements/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop());
    await updateData((data) => {
      const statement = data.statements.find((item) => item.id === id);
      if (!statement) throw new Error("Statement not found.");
      data.statements = data.statements.filter((item) => item.id !== id);
      data.deliveries = data.deliveries.filter((item) => item.statementId !== id);
      return { ok: true };
    });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/settings") {
    const body = await readBody(req);
    const settings = await updateData((data) => {
      data.settings = { ...data.settings, ...body };
      return data.settings;
    });
    return sendJson(res, 200, settings);
  }

  if (req.method === "POST" && url.pathname === "/api/trucks") {
    const body = await readBody(req);
    const truck = await updateData((data) => {
      const truck = {
      truckNo: normalizeCode(body.truckNo),
        truckType: normalizeText(body.truckType),
        driverName: normalizeText(body.driverName),
        phone: normalizeText(body.phone),
        active: body.active !== false
      };
      if (!truck.truckNo || !truck.truckType) throw new Error("Truck No and Truck Type are required.");
      const index = data.trucks.findIndex((item) => item.truckNo === truck.truckNo);
      if (index >= 0) data.trucks[index] = truck;
      else data.trucks.push(truck);
      return truck;
    });
    return sendJson(res, 200, truck);
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/trucks/")) {
    const truckNo = decodeURIComponent(url.pathname.split("/").pop());
    await updateData((data) => {
      data.trucks = data.trucks.filter((item) => item.truckNo !== truckNo);
      return { ok: true };
    });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/prices") {
    const body = await readBody(req);
    const price = await updateData((data) => {
      const price = {
        id: body.id || crypto.randomUUID(),
        fromLocation: normalizeText(body.fromLocation || data.settings.defaultFromLocation),
        toLocation: normalizeText(body.toLocation),
        truckType: normalizeText(body.truckType),
        distanceKm: toNumber(body.distanceKm),
        companyUnitPrice: toNumber(body.companyUnitPrice),
        truckSalaryUnitPrice: toNumber(body.truckSalaryUnitPrice),
        active: body.active !== false
      };
      if (!price.toLocation || !price.truckType) throw new Error("To Location and Truck Type are required.");
      const index = data.prices.findIndex((item) => item.id === price.id);
      if (index >= 0) data.prices[index] = price;
      else data.prices.push(price);
      return price;
    });
    return sendJson(res, 200, price);
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/prices/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop());
    await updateData((data) => {
      data.prices = data.prices.filter((item) => item.id !== id);
      return { ok: true };
    });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/deliveries") {
    const body = await readBody(req);
    const delivery = await updateData((data) => {
      const delivery = enrichDelivery(data, body);
      const index = data.deliveries.findIndex((item) => item.id === delivery.id);
      if (index >= 0) data.deliveries[index] = delivery;
      else data.deliveries.push(delivery);
      return delivery;
    });
    return sendJson(res, 200, delivery);
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/deliveries/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop());
    await updateData((data) => {
      data.deliveries = data.deliveries.filter((item) => item.id !== id);
      return { ok: true };
    });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/api/export/accounting") {
    const rows = filteredDeliveries(data, query);
    if (query.statementId && rows.length > 30) {
      throw new Error("A statement export cannot contain more than 30 rows.");
    }
    if (!query.truckType && new Set(rows.map((row) => row.truckType)).size > 1) {
      throw new Error("Please export With Crane and Without Crane accounting reports separately.");
    }
    if (query.statementId) {
      await updateData((data) => {
        const statement = data.statements.find((item) => item.id === query.statementId);
        if (statement && statement.status === "Finished") {
          statement.status = "Exported";
          statement.updatedAt = new Date().toISOString();
        }
        return statement;
      });
    }
    const statement = query.statementId
      ? data.statements.find((item) => item.id === query.statementId)
      : null;
    const fileName = statement
      ? `statement-${statement.statementNumber}-${truckTypeFileLabel(statement.truckType)}`
      : `accounting-${slug(query.truckType || rows[0]?.truckType || "all")}`;
    res.writeHead(200, {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug(fileName)}.xls"`
    });
    return res.end(accountingExport(data, rows));
  }

  if (req.method === "GET" && url.pathname === "/api/export/salary") {
    const rows = filteredDeliveries(data, query);
    if (!query.truckType && !query.truckNo && new Set(rows.map((row) => row.truckType)).size > 1) {
      throw new Error("Please export With Crane and Without Crane salary reports separately, or select one truck.");
    }
    const truckTypeName = query.truckType || rows[0]?.truckType || query.truckNo || "all";
    res.writeHead(200, {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="truck-salary-${slug(truckTypeName)}.xls"`
    });
    return res.end(salaryExport(rows));
  }

  return sendJson(res, 404, { error: "API route not found." });
}

async function staticFile(req, res, url) {
  const staticRoot = existsSync(frontendDistDir) ? frontendDistDir : frontendDir;
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(staticRoot, requested));
  if (!filePath.startsWith(staticRoot)) return sendText(res, 403, "Forbidden");

  try {
    const body = await readFile(filePath);
    const ext = path.extname(filePath);
    const contentTypes = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".svg": "image/svg+xml"
    };
    res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
    res.end(body);
  } catch {
    if (existsSync(frontendDistDir)) {
      const body = await readFile(path.join(frontendDistDir, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(body);
    }
    sendText(res, 404, "Not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    return await staticFile(req, res, url);
  } catch (error) {
    return sendJson(res, 400, { error: error.message || "Unexpected error." });
  }
});

server.listen(port, host, () => {
  console.log(`Truck Delivery System running at http://${host}:${port}`);
});
