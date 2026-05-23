import { createServer } from "node:http";
import { readFile, writeFile, mkdir, rename, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, timingSafeEqual, scrypt } from "node:crypto";
import ExcelJS from "exceljs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "frontend");
const frontendDistDir = path.join(frontendDir, "dist");
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(rootDir, "backend");
const dataFile = path.join(dataDir, "data.json");
const dataTempFile = path.join(dataDir, "data.json.tmp");
const databaseFile = path.join(dataDir, "truck_delivery.db");
const backupDir = path.join(dataDir, "backups");
const port = Number(process.env.PORT || 5058);
const host = process.env.HOST || "0.0.0.0";
const appUsername = process.env.APP_USERNAME || "";
const appPassword = process.env.APP_PASSWORD || "";
let saveQueue = Promise.resolve();
let mutationQueue = Promise.resolve();

// Session store: token → expiresAt
const sessions = new Map();
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
// Rate limiting: ip → { count, resetAt }
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const PDF_PAGE_WIDTH = 595; // A4 portrait width in points
const PDF_PAGE_HEIGHT = 842; // A4 portrait height in points
const PDF_PAGE_MARGIN = 0;

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

const craneDriverPrices = new Map([
  ["Khan Kambol (PP)", 9.28],
  ["Khan Dangkao (PP)", 7],
  ["Khan Mean Chey (PP)", 7.38],
  ["Khan Chamkar Morn (PP)", 8.71],
  ["Khan Boeng Keng Kong (PP)", 8.71],
  ["Khan Doun Penh (PP)", 8.9],
  ["Khan 7 Makara (PP)", 8.9],
  ["Khan Tuol Kouk (PP)", 8.8],
  ["Khan Sen Sok (PP)", 9.18],
  ["Khan Russei Keo (PP)", 9.18],
  ["Khan Chba Ampeou (PP)", 7.95],
  ["Khan Posenchey (PP)", 9.46],
  ["Khan Prek Phnov (PP)", 11.46],
  ["Khan Chroy Changvar (PP)", 12.48],
  ["Takhmao (Kandal)", 7],
  ["Ang Snuol (Kandal)", 11.07],
  ["Saang (Kandal)", 9.85],
  ["Kandal Stueng (Kandal)", 7.14],
  ["Kien Svay (Kandal)", 9.36],
  ["Ponhea Leu (Kandal)", 12.18],
  ["Muk Kampoul (Kandal)", 12.11],
  ["Khsach Kandal (Kandal)", 12.3],
  ["Koh Thom (Kandal)", 12.78],
  ["Leukdek (Kandal)", 14.44],
  ["Lvea Em (Kandal)", 14.82],
  ["Kanh Chreach (Prey Veng)", 16.81],
  ["Kamchay Mea (Prey Veng)", 18.78],
  ["Mesang (Prey Veng)", 17.07],
  ["Kampong Trabek (Prey Veng)", 16.02],
  ["Svay Antor (Prey Veng)", 15.74],
  ["Baphnom (Prey Veng)", 15.25],
  ["Preah Sdach (Prey Veng)", 14.72],
  ["Sithor Kandal (Prey Veng)", 15.77],
  ["Pea Reang (Prey Veng)", 14.53],
  ["Po Rieng (Prey Veng)", 16.29],
  ["Peam Ro (Prey Veng)", 14.77],
  ["Peam Chor (Prey Veng)", 15.53],
  ["Prey Veng (Prey Veng)", 17.76],
  ["Rum Duol (S.Rieng)", 17.76],
  ["Svay Tiep (S.Rieng)", 18.33],
  ["Svay Rieng (S.Rieng)", 16.72],
  ["Svay Chrum (S.Rieng)", 16.15],
  ["Kompong Ro (S.Rieng)", 18.33],
  ["Bati (Takeo)", 9.08],
  ["Prey Kabas (Takeo)", 10.77],
  ["Angkor Borei (Takeo)", 13.77],
  ["Borei Chulsar (Takeo)", 17],
  ["Koh Andet (Takeo)", 15.81],
  ["Samrong (Takeo)", 11.35],
  ["Daun Keo (Takeo)", 12.78],
  ["Treang (Takeo)", 13.35],
  ["Kirivong (Takeo)", 17],
  ["Tram Kak (Takeo)", 13.89],
  ["Oudong (K.Speu)", 12.47],
  ["Thpong (K.Speu)", 15.89],
  ["Samrong Torng (K.Speu)", 12.97],
  ["Chbar Morn (K.Speu)", 12.4],
  ["Kong Pisei (K.Speu)", 12.68],
  ["Baset (K.Speu)", 14.01],
  ["Kampong Tralach (K.Chhnang)", 15.58],
  ["Kampong Siem (K.Cham)", 18.71],
  ["Batheay (K.Cham)", 15.53]
]);

const defaultData = {
  settings: {
    companyName: "N&M LOGISTIC",
    fromName: "Nhep Manith",
    toName: "SLP",
    defaultFromLocation: "Warehouse-09",
    deletePassword: ""
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
      truckSalaryUnitPrice: craneDriverPrices.get(price.toLocation) || 0,
      effectiveDate: "2026-01-01",
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
      effectiveDate: "2026-01-01",
      active: true
    }))
  ],
  statements: [],
  deliveries: [],
  activity: []
};

function baselinePrices() {
  return [
    ...craneCompanyPrices.map((price, index) => ({
      id: `crane-company-${index + 1}`,
      fromLocation: "Warehouse-09",
      toLocation: price.toLocation,
      truckType: "With Crane",
      distanceKm: price.distanceKm,
      companyUnitPrice: price.companyUnitPrice,
      truckSalaryUnitPrice: craneDriverPrices.get(price.toLocation) || 0,
      effectiveDate: "2026-01-01",
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
      effectiveDate: "2026-01-01",
      active: true
    }))
  ];
}

let db;

function getDb() {
  if (!db) db = new DatabaseSync(databaseFile);
  return db;
}

function normalizeDataShape(data) {
  data.settings ||= { ...defaultData.settings };
  data.statements ||= [];
  data.deliveries ||= [];
  data.trucks ||= [];
  data.prices ||= [];
  data.activity ||= [];
  data.truckDeductions ||= [];
  data.paymentMonths ||= [];
  data.prices = data.prices.map((price) => ({
    ...price,
    effectiveDate: price.effectiveDate || `${price.effectiveMonth || "2026-01"}-01`
  }));
  const pricesById = new Map();
  for (const price of data.prices) {
    const existing = pricesById.get(price.id);
    if (!existing || effectiveDateOf(price) >= effectiveDateOf(existing)) {
      pricesById.set(price.id, price);
    }
  }
  data.prices = [...pricesById.values()];
  return data;
}

function createSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS trucks (
      truckNo TEXT PRIMARY KEY,
      truckType TEXT NOT NULL,
      driverName TEXT,
      phone TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS prices (
      id TEXT PRIMARY KEY,
      fromLocation TEXT NOT NULL,
      toLocation TEXT NOT NULL,
      truckType TEXT NOT NULL,
      distanceKm REAL NOT NULL DEFAULT 0,
      companyUnitPrice REAL NOT NULL DEFAULT 0,
      truckSalaryUnitPrice REAL NOT NULL DEFAULT 0,
      effectiveDate TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS statements (
      id TEXT PRIMARY KEY,
      month TEXT NOT NULL,
      statementNumber INTEGER NOT NULL,
      statementDate TEXT NOT NULL,
      truckType TEXT NOT NULL,
      status TEXT NOT NULL,
      paymentMonth TEXT,
      isManual INTEGER NOT NULL DEFAULT 0,
      manualAmount REAL NOT NULL DEFAULT 0,
      createdAt TEXT,
      updatedAt TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS statements_month_number_idx ON statements(month, statementNumber);
    CREATE TABLE IF NOT EXISTS payment_months (
      month TEXT PRIMARY KEY,
      received INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      statementId TEXT NOT NULL,
      deliveryDate TEXT NOT NULL,
      invoiceNo TEXT NOT NULL,
      truckNo TEXT NOT NULL,
      truckType TEXT NOT NULL,
      driverName TEXT,
      fromLocation TEXT NOT NULL,
      toLocation TEXT NOT NULL,
      distanceKm REAL NOT NULL DEFAULT 0,
      qtyTon REAL NOT NULL DEFAULT 0,
      companyUnitPrice REAL NOT NULL DEFAULT 0,
      companyTotalAmount REAL NOT NULL DEFAULT 0,
      truckSalaryUnitPrice REAL NOT NULL DEFAULT 0,
      truckSalaryAmount REAL NOT NULL DEFAULT 0,
      status TEXT,
      highlighted INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT,
      updatedAt TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS deliveries_invoice_idx ON deliveries(invoiceNo);
    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY,
      message TEXT NOT NULL,
      type TEXT,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS truck_deductions (
      truckNo TEXT NOT NULL,
      month TEXT NOT NULL,
      loanDeduction REAL NOT NULL DEFAULT 0,
      garageFee REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (truckNo, month)
    );
  `);
}

function writeDataToDb(data) {
  const database = getDb();
  const normalized = normalizeDataShape(structuredClone(data));
  database.exec("BEGIN");
  try {
    database.exec("DELETE FROM settings; DELETE FROM trucks; DELETE FROM prices; DELETE FROM statements; DELETE FROM deliveries; DELETE FROM activity; DELETE FROM truck_deductions; DELETE FROM payment_months;");
    const insertSetting = database.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
    for (const [key, value] of Object.entries(normalized.settings)) insertSetting.run(key, JSON.stringify(value));

    const insertTruck = database.prepare("INSERT INTO trucks (truckNo, truckType, driverName, phone, active) VALUES (?, ?, ?, ?, ?)");
    for (const truck of normalized.trucks) insertTruck.run(truck.truckNo, truck.truckType, truck.driverName || "", truck.phone || "", truck.active === false ? 0 : 1);

    const insertPrice = database.prepare(`
      INSERT INTO prices (id, fromLocation, toLocation, truckType, distanceKm, companyUnitPrice, truckSalaryUnitPrice, effectiveDate, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const price of normalized.prices) {
      insertPrice.run(price.id, price.fromLocation, price.toLocation, price.truckType, toNumber(price.distanceKm), toNumber(price.companyUnitPrice), toNumber(price.truckSalaryUnitPrice), effectiveDateOf(price), price.active === false ? 0 : 1);
    }

    const insertStatement = database.prepare(`
      INSERT INTO statements (id, month, statementNumber, statementDate, truckType, status, paymentMonth, isManual, manualAmount, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const statement of normalized.statements) {
      insertStatement.run(statement.id, statement.month, Number(statement.statementNumber), statement.statementDate, statement.truckType, statement.status || "Draft", statement.paymentMonth || null, statement.isManual ? 1 : 0, toNumber(statement.manualAmount), statement.createdAt || "", statement.updatedAt || "");
    }

    const insertDelivery = database.prepare(`
      INSERT INTO deliveries (id, statementId, deliveryDate, invoiceNo, truckNo, truckType, driverName, fromLocation, toLocation, distanceKm, qtyTon, companyUnitPrice, companyTotalAmount, truckSalaryUnitPrice, truckSalaryAmount, status, highlighted, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const delivery of normalized.deliveries) {
      insertDelivery.run(delivery.id, delivery.statementId, delivery.deliveryDate, delivery.invoiceNo, delivery.truckNo, delivery.truckType, delivery.driverName || "", delivery.fromLocation, delivery.toLocation, toNumber(delivery.distanceKm), toNumber(delivery.qtyTon), toNumber(delivery.companyUnitPrice), toNumber(delivery.companyTotalAmount), toNumber(delivery.truckSalaryUnitPrice), toNumber(delivery.truckSalaryAmount), delivery.status || "Draft", delivery.highlighted ? 1 : 0, delivery.createdAt || "", delivery.updatedAt || "");
    }

    const insertActivity = database.prepare("INSERT INTO activity (id, message, type, createdAt) VALUES (?, ?, ?, ?)");
    for (const activity of normalized.activity) insertActivity.run(activity.id, activity.message, activity.type || "info", activity.createdAt || "");

    const insertDeduction = database.prepare("INSERT INTO truck_deductions (truckNo, month, loanDeduction, garageFee) VALUES (?, ?, ?, ?)");
    for (const d of (normalized.truckDeductions || [])) insertDeduction.run(d.truckNo, d.month, toNumber(d.loanDeduction), toNumber(d.garageFee));

    const insertPaymentMonth = database.prepare("INSERT INTO payment_months (month, received) VALUES (?, ?)");
    for (const pm of (normalized.paymentMonths || [])) insertPaymentMonth.run(pm.month, pm.received ? 1 : 0);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

async function dataFromJsonFile() {
  if (!existsSync(dataFile)) return structuredClone(defaultData);
  const raw = await readFile(dataFile, "utf8");
  return JSON.parse(raw);
}

async function ensureDataStore() {
  await mkdir(dataDir, { recursive: true });
  await mkdir(backupDir, { recursive: true });
  const database = getDb();
  createSchema(database);
  try { database.exec("ALTER TABLE deliveries ADD COLUMN highlighted INTEGER NOT NULL DEFAULT 0"); } catch (_) {}
  try { database.exec("ALTER TABLE statements ADD COLUMN paymentMonth TEXT"); } catch (_) {}
  try { database.exec("ALTER TABLE statements ADD COLUMN isManual INTEGER NOT NULL DEFAULT 0"); } catch (_) {}
  try { database.exec("ALTER TABLE statements ADD COLUMN manualAmount REAL NOT NULL DEFAULT 0"); } catch (_) {}
  try { database.exec("CREATE TABLE IF NOT EXISTS payment_months (month TEXT PRIMARY KEY, received INTEGER NOT NULL DEFAULT 0)"); } catch (_) {}
  try { database.exec("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, passwordHash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'staff', createdAt TEXT NOT NULL)"); } catch (_) {}
  const hasRows = database.prepare(`
    SELECT
      (SELECT COUNT(*) FROM trucks) +
      (SELECT COUNT(*) FROM prices) +
      (SELECT COUNT(*) FROM statements) +
      (SELECT COUNT(*) FROM deliveries) AS count
  `).get().count;
  if (!hasRows) {
    const sourceData = await dataFromJsonFile();
    writeDataToDb(sourceData);
  }
}

async function readData() {
  await ensureDataStore();
  const database = getDb();
  const settings = {};
  for (const row of database.prepare("SELECT key, value FROM settings").all()) {
    settings[row.key] = JSON.parse(row.value);
  }
  return normalizeDataShape({
    settings,
    trucks: database.prepare("SELECT truckNo, truckType, driverName, phone, active FROM trucks ORDER BY truckNo").all().map((row) => ({ ...row, active: Boolean(row.active) })),
    prices: database.prepare("SELECT id, fromLocation, toLocation, truckType, distanceKm, companyUnitPrice, truckSalaryUnitPrice, effectiveDate, active FROM prices ORDER BY truckType, toLocation, effectiveDate").all().map((row) => ({ ...row, active: Boolean(row.active) })),
    statements: database.prepare("SELECT id, month, statementNumber, statementDate, truckType, status, paymentMonth, isManual, manualAmount, createdAt, updatedAt FROM statements ORDER BY month, statementNumber").all().map((r) => ({ ...r, isManual: Boolean(r.isManual) })),
    deliveries: database.prepare("SELECT id, statementId, deliveryDate, invoiceNo, truckNo, truckType, driverName, fromLocation, toLocation, distanceKm, qtyTon, companyUnitPrice, companyTotalAmount, truckSalaryUnitPrice, truckSalaryAmount, status, highlighted, createdAt, updatedAt FROM deliveries ORDER BY createdAt").all().map((row) => ({ ...row, highlighted: Boolean(row.highlighted) })),
    activity: database.prepare("SELECT id, message, type, createdAt FROM activity ORDER BY createdAt DESC LIMIT 50").all(),
    truckDeductions: database.prepare("SELECT truckNo, month, loanDeduction, garageFee FROM truck_deductions").all(),
    paymentMonths: database.prepare("SELECT month, received FROM payment_months").all().map((r) => ({ ...r, received: Boolean(r.received) }))
  });
}

function addActivity(data, message, type = "info") {
  data.activity ||= [];
  data.activity.unshift({
    id: crypto.randomUUID(),
    message,
    type,
    createdAt: new Date().toISOString()
  });
  data.activity = data.activity.slice(0, 50);
}

function timestampForFile(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-") + `T${[pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join("-")}`;
}

function backupName(reason = "manual") {
  return `backup-${reason}-${timestampForFile()}.json`;
}

async function createBackup(data, reason = "manual") {
  await mkdir(backupDir, { recursive: true });
  const fileName = backupName(reason);
  const filePath = path.join(backupDir, fileName);
  await writeFile(filePath, JSON.stringify(data, null, 2));
  return fileName;
}

async function ensureDailyBackup(data) {
  await mkdir(backupDir, { recursive: true });
  const todayKey = timestampForFile().slice(0, 10);
  const files = await readdir(backupDir).catch(() => []);
  const alreadyBackedUp = files.some((file) => file.startsWith(`backup-auto-${todayKey}`));
  if (!alreadyBackedUp) {
    await createBackup(data, "auto");
    sendBackupToTelegram(data, "Daily Auto Backup").catch(() => {});
  }
}

function getTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  return token && chatId ? { token, chatId } : null;
}

async function sendBackupToTelegram(data, label = "Manual Backup") {
  const cfg = getTelegramConfig();
  if (!cfg) return { ok: false, reason: "not_configured" };
  const filename = `nm-logistic-backup-${timestampForFile()}.json`;
  const content = JSON.stringify(data, null, 2);
  const caption = [
    `N&M Logistic — ${label}`,
    `Date: ${new Date().toISOString().slice(0, 10)}`,
    `Statements: ${(data.statements || []).length} | Deliveries: ${(data.deliveries || []).length} | Trucks: ${(data.trucks || []).length}`,
  ].join("\n");
  const form = new FormData();
  form.append("chat_id", cfg.chatId);
  form.append("caption", caption);
  form.append("document", new Blob([content], { type: "application/json" }), filename);
  const res = await fetch(`https://api.telegram.org/bot${cfg.token}/sendDocument`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.description || `Telegram API error ${res.status}`);
  }
  return { ok: true };
}

async function sendFileToTelegram(fileBuffer, filename, caption, mimeType = "application/zip") {
  const cfg = getTelegramConfig();
  if (!cfg) throw new Error("Telegram is not configured.");
  const form = new FormData();
  form.append("chat_id", cfg.chatId);
  form.append("caption", caption);
  form.append("document", new Blob([fileBuffer], { type: mimeType }), filename);
  const res = await fetch(`https://api.telegram.org/bot${cfg.token}/sendDocument`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.description || `Telegram API error ${res.status}`);
  }
  return { ok: true };
}

function validateRestoreData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Backup file is not valid.");
  if (!data.settings || typeof data.settings !== "object") throw new Error("Backup is missing settings.");
  if (!Array.isArray(data.trucks)) throw new Error("Backup is missing trucks.");
  if (!Array.isArray(data.prices)) throw new Error("Backup is missing prices.");
  if (!Array.isArray(data.statements)) throw new Error("Backup is missing statements.");
  if (!Array.isArray(data.deliveries)) throw new Error("Backup is missing deliveries.");
}

async function saveData(data) {
  const body = JSON.stringify(data, null, 2);
  saveQueue = saveQueue.then(async () => {
    writeDataToDb(data);
    await writeFile(dataTempFile, body);
    await rename(dataTempFile, dataFile);
  });
  await saveQueue;
}

async function updateData(mutator) {
  const operation = mutationQueue.then(async () => {
    const data = await readData();
    await ensureDailyBackup(data);
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

function isAuthEnabled() {
  return Boolean(appUsername && appPassword);
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ""), "utf8");
  const bufB = Buffer.from(String(b || ""), "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString("hex");
    scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(`${salt}:${key.toString("hex")}`);
    });
  });
}

function verifyPassword(password, stored) {
  return new Promise((resolve) => {
    const [salt, key] = (stored || "").split(":");
    if (!salt || !key) return resolve(false);
    scrypt(String(password), salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      try { resolve(timingSafeEqual(Buffer.from(key, "hex"), derivedKey)); }
      catch { resolve(false); }
    });
  });
}

function createSession(role) {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, { role, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

function getSessionRole(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) { sessions.delete(token); return null; }
  return session.role;
}

function getAuthorizedRole(req) {
  if (!isAuthEnabled()) return "admin";
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return getSessionRole(header.slice(7));
}

function getClientIp(req) {
  return (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (now > entry.resetAt) { loginAttempts.delete(ip); return false; }
  return entry.count >= MAX_LOGIN_ATTEMPTS;
}

function recordFailedLogin(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_LOCKOUT_MS });
  } else {
    entry.count += 1;
  }
}

function isAuthorized(req) {
  return getAuthorizedRole(req) !== null;
}

function requestAuth(res) {
  res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error: "Login required." }));
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

// Remove extra space after KH. or D. prefix: "KH. Kambol" → "KH.Kambol"
function normalizeLocationName(value) {
  return normalizeText(value).replace(/^(KH|D)\.\s+/i, (_, p) => p.toUpperCase() + ".");
}

function locationMatchKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/\bkh[\s.]*/g, "khan")
    .replace(/[^a-z0-9]+/g, "");
}

function locationBaseKey(value) {
  return normalizeText(value)
    .replace(/\([^)]*\)/g, "")
    .toLowerCase()
    .replace(/^\s*d\s*\.\s*/i, "")
    .replace(/^\s*(khan|kh)\s*[.]?\s*/i, "")
    .replace(/[^a-z0-9]+/g, "");
}

function toNumber(value) {
  const number = Number(String(value ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function monthFromDate(value) {
  return normalizeText(value).slice(0, 7);
}

function effectiveDateOf(price) {
  return price.effectiveDate || `${price.effectiveMonth || "2026-01"}-01`;
}

function findEffectivePrice(data, { fromLocation, toLocation, truckType, deliveryDate }) {
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

function priceRouteKey({ fromLocation, toLocation, truckType }) {
  return [
    normalizeText(fromLocation),
    normalizeText(truckType),
    locationBaseKey(toLocation)
  ].join("||");
}

function applyEffectivePriceToDelivery(data, delivery) {
  const effectivePrice = findEffectivePrice(data, {
    fromLocation: delivery.fromLocation,
    toLocation: delivery.toLocation,
    truckType: delivery.truckType,
    deliveryDate: delivery.deliveryDate
  });
  if (!effectivePrice) return false;

  const qtyTon = toNumber(delivery.qtyTon);
  const nextDistanceKm = toNumber(effectivePrice.distanceKm);
  const nextCompanyPrice = toNumber(effectivePrice.companyUnitPrice);
  const nextDriverPrice = toNumber(effectivePrice.truckSalaryUnitPrice);
  let changed = false;

  if (nextDistanceKm > 0 && nextDistanceKm !== toNumber(delivery.distanceKm)) {
    delivery.distanceKm = nextDistanceKm;
    changed = true;
  }

  if (nextCompanyPrice > 0) {
    const nextCompanyAmount = roundMoney(qtyTon * nextCompanyPrice);
    if (
      nextCompanyPrice !== toNumber(delivery.companyUnitPrice) ||
      nextCompanyAmount !== toNumber(delivery.companyTotalAmount)
    ) {
      delivery.companyUnitPrice = nextCompanyPrice;
      delivery.companyTotalAmount = nextCompanyAmount;
      changed = true;
    }
  }

  if (nextDriverPrice > 0) {
    const nextDriverAmount = roundMoney(qtyTon * nextDriverPrice);
    if (
      nextDriverPrice !== toNumber(delivery.truckSalaryUnitPrice) ||
      nextDriverAmount !== toNumber(delivery.truckSalaryAmount)
    ) {
      delivery.truckSalaryUnitPrice = nextDriverPrice;
      delivery.truckSalaryAmount = nextDriverAmount;
      changed = true;
    }
  }

  if (changed) delivery.updatedAt = new Date().toISOString();
  return changed;
}

function recalculateDeliveriesForPriceRoutes(data, prices) {
  const routeKeys = new Set(prices.map((price) => priceRouteKey(price)));
  let recalculatedDeliveries = 0;
  for (const delivery of data.deliveries) {
    if (!routeKeys.has(priceRouteKey(delivery))) continue;
    if (applyEffectivePriceToDelivery(data, delivery)) recalculatedDeliveries += 1;
  }
  return recalculatedDeliveries;
}

function recalculateAllDeliveries(data) {
  let recalculatedDeliveries = 0;
  for (const delivery of data.deliveries) {
    if (applyEffectivePriceToDelivery(data, delivery)) recalculatedDeliveries += 1;
  }
  return recalculatedDeliveries;
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
  if (existing && existing.truckType !== truckType && statementRowCount(data, existing.id) > 0) {
    throw new Error("Cannot change truck type after delivery rows are added. Create a separate statement for the other truck type.");
  }

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
  const priceFromLocation = normalizeText(data.settings.defaultFromLocation) || fromLocation;
  const statement = data.statements.find((item) => item.id === statementId);
  const truck = data.trucks.find((item) => item.truckNo === truckNo && item.active !== false);

  if (!statementId || !statement) throw new Error("Statement is required.");
  if (statement.status !== "Draft") throw new Error("This statement is finished. Create or select another statement.");
  if (statementRowCount(data, statementId) >= 30 && !input.id) {
    throw new Error("This statement already has 30 rows. Create a new statement.");
  }
  if (!deliveryDate) throw new Error("Delivery date is required.");
  if (!invoiceNo) throw new Error("Invoice number is required.");
  if (!/^\d{1,10}$/.test(invoiceNo)) throw new Error("Invoice number must be 10 digits or fewer.");
  if (!truckNo) throw new Error("Truck number is required.");
  if (!truck) throw new Error("Truck number does not exist.");
  if (truck.truckType !== statement.truckType) {
    throw new Error(`Truck ${truckNo} is ${truckTypeLabel(truck.truckType)}, but this statement is ${truckTypeLabel(statement.truckType)}.`);
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

  const price = findEffectivePrice(data, {
    fromLocation: priceFromLocation,
    toLocation,
    truckType: truck.truckType,
    deliveryDate
  });
  if (!price) {
    throw new Error(`No active price found for ${toLocation} (${truckTypeLabel(truck.truckType)}) on ${deliveryDate}.`);
  }

  const companyUnitPrice = toNumber(price.companyUnitPrice);
  const truckSalaryUnitPrice = toNumber(price.truckSalaryUnitPrice);

  const existing = data.deliveries.find((item) => item.id === input.id);
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
    highlighted: existing ? true : false,
    createdAt: existing?.createdAt || input.createdAt || new Date().toISOString(),
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
  return rows.sort(
    (a, b) =>
      String(a.deliveryDate || "").localeCompare(String(b.deliveryDate || "")) ||
      String(a.invoiceNo || "").localeCompare(String(b.invoiceNo || "")) ||
      String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
  );
}

function statementsWithCounts(data) {
  return data.statements
    .map((statement) => {
      const rows = data.deliveries.filter((delivery) => delivery.statementId === statement.id);
      return {
        ...statement,
        rowCount: rows.length,
        totalQtyTon: roundMoney(rows.reduce((sum, row) => sum + toNumber(row.qtyTon), 0)),
        companyTotalAmount: statement.isManual ? toNumber(statement.manualAmount) : roundMoney(rows.reduce((sum, row) => sum + toNumber(row.companyTotalAmount), 0)),
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

function unitMoney(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0.000";
  const [whole, decimal = ""] = String(number).split(".");
  return `${whole}.${decimal.slice(0, 3).padEnd(3, "0")}`;
}

function formatShortDate(value) {
  const text = normalizeText(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return text;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function currentLocalDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Phnom_Penh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function slug(value) {
  return String(value || "all")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function numericMonthFilePart(value) {
  const text = normalizeText(value);
  const match = text.match(/^(\d{4})-(\d{2})$/);
  if (!match) return slug(text || "all-months");
  return `${match[2]}-${match[1]}`;
}

function monthLabel(value) {
  const text = normalizeText(value);
  const match = text.match(/^(\d{4})-(\d{2})$/);
  if (!match) return text || "All Months";
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  return `${monthNames[Number(match[2]) - 1] || match[2]} ${match[1]}`;
}

function truckTypeFileLabel(truckType) {
  return truckType === "With Crane" ? "car-crane" : "car-no-crane";
}

function truckTypeLabel(truckType) {
  if (truckType === "With Crane") return "Crane";
  if (truckType === "Without Crane") return "No Crane";
  return truckType || "";
}

function statementExportFileName(statement, fallbackRows = []) {
  if (!statement) {
    return `accounting-${slug(fallbackRows[0]?.truckType || "all")}`;
  }
  const month = statement.month || "";
  const m = month.match(/^(\d{4})-(\d{2})$/);
  const monthYear = m ? `${m[2]}-${m[1]}` : slug(month);
  const truckLabel = statement.truckType === "With Crane" ? "Crane" : "NoCrane";
  return `ST-${statement.statementNumber}-${monthYear}-${truckLabel}`;
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
  if (column.type === "unitCurrency") return `$ ${unitMoney(value)}`;
  if (column.type === "unitMoney") return `$ ${unitMoney(value)}`;
  if (column.type === "currency") return `$ ${money(value)}`;
  if (column.type === "money") return `$ ${money(value)}`;
  if (column.type === "qty") return `${Number(value || 0).toFixed(5)}T`;
  return value;
}

function cellClass(column) {
  return [column.align, column.type === "text" ? "text" : "", column.type === "date" ? "date" : ""]
    .filter(Boolean)
    .join(" ");
}

function excelTable(title, rows, columns, summaryColumns = [], options = {}) {
  const columnHeaderHeight = "18pt";
  const dataRowHeight = "22pt";
  const totalRowHeight = "18pt";
  const totals = Object.fromEntries(
    summaryColumns.map((key) => [key, rows.reduce((sum, row) => sum + toNumber(row[key]), 0)])
  );
  const headerHtml = options.headerHtml || ((pageIndex, pages) => `
    <tr><td class="title" colspan="${columns.length}">${htmlEscape(title)}</td></tr>
    <tr><td class="subtitle" colspan="${columns.length}">Page ${pageIndex + 1} of ${pages.length}</td></tr>`);
  const colgroup = `<colgroup>${columns
    .map((column) => {
      const width = column.excelWidth || `${100 / columns.length}%`;
      return `<col style="width:${htmlEscape(width)}; mso-width-source:userset;">`;
    })
    .join("")}</colgroup>`;
  const pages = rowsByPage(rows, 30);
  const tablePages = pages
    .map((pageRows, pageIndex) => {
      const isLastPage = pageIndex === pages.length - 1;
      return `<table class="page">
    ${colgroup}
    ${headerHtml(pageIndex, pages)}
    <tr class="column-header" style="height:${columnHeaderHeight}; mso-height-source:userset;">${columns.map((column) => `<th style="height:${columnHeaderHeight}; mso-height-source:userset;">${htmlEscape(column.label)}</th>`).join("")}</tr>
    ${pageRows
      .map(
        (row, index) =>
          `<tr class="data-row" style="height:${dataRowHeight}; mso-height-source:userset;">${columns
            .map((column) => {
              const value = column.key === "rowNo" ? pageIndex * 30 + index + 1 : row[column.key];
              const formatted = formatExcelValue(value, column);
              const className = cellClass(column) ? ` class="${cellClass(column)}"` : "";
              return `<td${className} style="height:${dataRowHeight}; mso-height-source:userset;">${htmlEscape(formatted)}</td>`;
            })
            .join("")}</tr>`
      )
      .join("")}
    ${
      isLastPage
        ? options.mergedTotal
          ? `<tr class="total-row" style="height:${totalRowHeight}; mso-height-source:userset;">
      <td class="center" colspan="7" style="height:${totalRowHeight}; mso-height-source:userset;"><strong>Total</strong></td>
      <td class="right" style="height:${totalRowHeight}; mso-height-source:userset;"><strong>${htmlEscape(`${Number(totals.qtyTon || 0).toFixed(5)}T`)}</strong></td>
      <td style="height:${totalRowHeight}; mso-height-source:userset;"></td>
      <td class="right" style="height:${totalRowHeight}; mso-height-source:userset;"><strong>${htmlEscape(`$ ${money(totals.companyTotalAmount || totals.truckSalaryAmount || 0)}`)}</strong></td>
    </tr>
    ${options.signatureHtml || ""}`
          : `<tr class="total-row" style="height:${totalRowHeight}; mso-height-source:userset;">
      ${columns
        .map((column, index) => {
          if (index === 0) return `<td style="height:${totalRowHeight}; mso-height-source:userset;"><strong>Total</strong></td>`;
          if (summaryColumns.includes(column.key)) {
            const formatted = formatExcelValue(totals[column.key], column);
            return `<td class="right" style="height:${totalRowHeight}; mso-height-source:userset;"><strong>${htmlEscape(formatted)}</strong></td>`;
          }
          return `<td style="height:${totalRowHeight}; mso-height-source:userset;"></td>`;
        })
        .join("")}
    </tr>${(options.extraTotalRows || []).map((extra) => `
    <tr class="total-row" style="height:${totalRowHeight}; mso-height-source:userset;">
      <td colspan="${columns.length - 1}" style="height:${totalRowHeight}; mso-height-source:userset;">${extra.bold ? `<strong>${htmlEscape(extra.label)}</strong>` : htmlEscape(extra.label)}</td>
      <td class="right" style="height:${totalRowHeight}; mso-height-source:userset;">${extra.bold ? `<strong>${htmlEscape(extra.value)}</strong>` : htmlEscape(extra.value)}</td>
    </tr>`).join("")}`
        : ""
    }
  </table>`;
    })
    .join("");

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
  <meta charset="utf-8">
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>${htmlEscape(title).slice(0, 31)}</x:Name>
          <x:WorksheetOptions>
            <x:PageSetup>
              <x:Layout x:Orientation="Portrait"/>
              <x:PageMargins x:Bottom="0" x:Left="0" x:Right="0" x:Top="0"/>
            </x:PageSetup>
            <x:FitToPage/>
            <x:Print>
              <x:FitWidth>1</x:FitWidth>
              <x:FitHeight>1</x:FitHeight>
              <x:PaperSizeIndex>9</x:PaperSizeIndex>
              <x:ValidPrinterInfo/>
            </x:Print>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
      mso-header-margin: 0;
      mso-footer-margin: 0;
      mso-page-orientation: portrait;
      mso-fit-to-page: yes;
      mso-fit-to-height: 1;
      mso-fit-to-width: 1;
    }
    html, body { margin: 0; padding: 0; }
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 9px; margin: 0; table-layout: fixed; width: 760pt; mso-width-source: userset; }
    th, td { border: 1px solid #333; height: 22pt; line-height: 1.25; mso-height-source: userset; overflow: hidden; padding: 3px 4px; text-overflow: clip; vertical-align: middle; }
    th { background: #fff200; font-weight: bold; }
    .title { font-size: 14px; font-weight: bold; text-align: center; }
    .meta { font-size: 9px; font-weight: bold; }
    .subtitle { font-size: 9px; text-align: right; border-top: 0; }
    .right { text-align: right; }
    .center { text-align: center; }
    .date { text-align: center; mso-number-format:"\\@"; }
    .text { mso-number-format:"\\@"; }
    .signature td { height: 18pt; }
    .signature-blank td { height: 34pt; }
    .line { border-bottom: 1px dotted #333; }
    .page { page-break-after: always; mso-page-orientation: portrait; }
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
  const displayRows = rows.map((row) => ({ ...row, truckType: truckTypeLabel(row.truckType) }));
  const signatureHeaderStyle = "height:18pt; mso-height-source:userset; text-align:center; vertical-align:middle;";
  const signatureBlankStyle = "height:34pt; mso-height-source:userset; vertical-align:middle;";
  const signatureLabelStyle = "height:18pt; mso-height-source:userset; vertical-align:middle;";
  const signatureHtml = `
    <tr class="signature" style="height:18pt; mso-height-source:userset;">
      <td class="center" colspan="3" align="center" style="${signatureHeaderStyle}">Prepared By</td>
      <td class="center" colspan="4" align="center" style="${signatureHeaderStyle}">Checked By</td>
      <td class="center" colspan="3" align="center" style="${signatureHeaderStyle}">Approved By</td>
    </tr>
    <tr class="signature signature-blank" style="height:34pt; mso-height-source:userset;">
      <td colspan="3" style="${signatureBlankStyle}"></td>
      <td colspan="4" style="${signatureBlankStyle}"></td>
      <td colspan="3" style="${signatureBlankStyle}"></td>
    </tr>
    <tr class="signature" style="height:18pt; mso-height-source:userset;">
      <td colspan="3" style="${signatureLabelStyle}">Name:</td>
      <td colspan="4" style="${signatureLabelStyle}">Name:</td>
      <td colspan="3" style="${signatureLabelStyle}">Name:</td>
    </tr>
    <tr class="signature" style="height:18pt; mso-height-source:userset;">
      <td colspan="3" style="${signatureLabelStyle}">Date:</td>
      <td colspan="4" style="${signatureLabelStyle}">Date:</td>
      <td colspan="3" style="${signatureLabelStyle}">Date:</td>
    </tr>`;
  const headerHtml = (pageIndex, pages) => `
    <tr style="height:17pt; mso-height-source:userset;">
      <td class="title" colspan="6" style="height:17pt; mso-height-source:userset;">${htmlEscape(data.settings.companyName)}</td>
      <td class="meta" colspan="2" style="height:17pt; mso-height-source:userset;">Invoice No:</td>
      <td class="meta right" colspan="2" align="right" x:str style="height:17pt; mso-height-source:userset; text-align:right; mso-number-format:'\\@';"><div style="text-align:right;">${htmlEscape(statement?.statementNumber || "")}</div></td>
    </tr>
    <tr style="height:16pt; mso-height-source:userset;">
      <td class="meta" colspan="6" style="height:16pt; mso-height-source:userset;">From: ${htmlEscape(data.settings.fromName || "Nhep Manith")}</td>
      <td class="meta" colspan="2" style="height:16pt; mso-height-source:userset;">Statement Date:</td>
      <td class="meta right" colspan="2" align="right" x:str style="height:16pt; mso-height-source:userset; text-align:right; mso-number-format:'\\@';"><div style="text-align:right;">${htmlEscape(formatShortDate(statement?.statementDate || ""))}</div></td>
    </tr>
    <tr style="height:16pt; mso-height-source:userset;">
      <td class="meta" colspan="6" style="height:16pt; mso-height-source:userset;">To: ${htmlEscape(data.settings.toName || "SLP")}</td>
      <td class="subtitle" colspan="4" align="right" style="height:16pt; mso-height-source:userset; text-align:right;">Page ${pageIndex + 1} of ${pages.length}</td>
    </tr>`;
  return excelTable(
    data.settings.companyName,
    displayRows,
    [
      { key: "rowNo", label: "No", align: "center", excelWidth: "3.72%" },
      { key: "deliveryDate", label: "Delivery Date", type: "date", excelWidth: "9.07%" },
      { key: "invoiceNo", label: "Invoice No", type: "text", excelWidth: "11.40%" },
      { key: "truckNo", label: "Truck No", type: "text", excelWidth: "9.77%" },
      { key: "truckType", label: "Type of Truck", excelWidth: "11.16%" },
      { key: "fromLocation", label: "From", excelWidth: "11.16%" },
      { key: "toLocation", label: "To", excelWidth: "17.44%" },
      { key: "qtyTon", label: "QTY(T)", type: "qty", align: "right", excelWidth: "8.37%" },
      { key: "companyUnitPrice", label: "Unit Price", type: "unitCurrency", align: "right", excelWidth: "7.44%" },
      { key: "companyTotalAmount", label: "Total Amount", type: "currency", align: "right", excelWidth: "10.47%" }
    ],
    ["qtyTon", "companyTotalAmount"],
    { headerHtml, signatureHtml, mergedTotal: true }
  );
}

async function accountingWorkbook(data, rows, signatureImage) {
  const statement = data.statements.find((item) => item.id === rows[0]?.statementId);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = data.settings.companyName || "N&M LOGISTIC";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("N&M LOGISTIC", {
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      horizontalCentered: false,
      verticalCentered: false,
      margins: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        header: 0,
        footer: 0
      }
    },
    views: [{ showGridLines: true }]
  });

  worksheet.properties.defaultRowHeight = 22;
  worksheet.columns = [
    { key: "rowNo", width: 4 },
    { key: "deliveryDate", width: 13 },
    { key: "invoiceNo", width: 13 },
    { key: "truckNo", width: 10 },
    { key: "truckType", width: 13 },
    { key: "fromLocation", width: 14 },
    { key: "toLocation", width: 24 },
    { key: "qtyTon", width: 12 },
    { key: "companyUnitPrice", width: 11 },
    { key: "companyTotalAmount", width: 14 }
  ];

  const thinBorder = {
    top: { style: "thin", color: { argb: "FF333333" } },
    left: { style: "thin", color: { argb: "FF333333" } },
    bottom: { style: "thin", color: { argb: "FF333333" } },
    right: { style: "thin", color: { argb: "FF333333" } }
  };
  const baseFont = { name: "Arial", size: 10 };
  const titleFont = { name: "Arial", size: 14, bold: true };
  const boldFont = { name: "Arial", size: 10, bold: true };

  const merge = (range, value, options = {}) => {
    worksheet.mergeCells(range);
    const cell = worksheet.getCell(range.split(":")[0]);
    cell.value = value;
    cell.font = options.font || baseFont;
    cell.alignment = options.alignment || { vertical: "middle" };
    cell.border = thinBorder;
    return cell;
  };

  const styleRange = (startRow, endRow, startCol = 1, endCol = 10, options = {}) => {
    for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
      for (let colNumber = startCol; colNumber <= endCol; colNumber += 1) {
        const cell = worksheet.getCell(rowNumber, colNumber);
        cell.font = options.font || cell.font || baseFont;
        cell.alignment = options.alignment || cell.alignment || { vertical: "middle" };
        cell.border = options.border || thinBorder;
        if (options.fill) cell.fill = options.fill;
      }
    }
  };

  merge("A1:F1", data.settings.companyName || "N&M LOGISTIC", {
    font: titleFont,
    alignment: { horizontal: "center", vertical: "middle" }
  });
  merge("G1:H1", "Invoice No:", { font: boldFont });
  merge("I1:J1", statement?.statementNumber || "", {
    font: boldFont,
    alignment: { horizontal: "right", vertical: "middle" }
  });
  merge("A2:F2", `From: ${data.settings.fromName || "Nhep Manith"}`, { font: boldFont });
  merge("G2:H2", "Statement Date:", { font: boldFont });
  merge("I2:J2", formatShortDate(statement?.statementDate || ""), {
    font: boldFont,
    alignment: { horizontal: "right", vertical: "middle" }
  });
  merge("A3:F3", `To: ${data.settings.toName || "SLP"}`, { font: boldFont });
  merge("G3:J3", "Page 1 of 1", {
    font: baseFont,
    alignment: { horizontal: "right", vertical: "middle" }
  });

  [1, 2, 3].forEach((rowNumber) => {
    worksheet.getRow(rowNumber).height = rowNumber === 1 ? 18 : 16;
  });
  styleRange(1, 3);

  const headers = ["No", "Delivery Date", "Invoice No", "Truck No", "Type of Truck", "From", "To", "QTY(T)", "Unit Price", "Total Amount"];
  worksheet.getRow(4).values = headers;
  worksheet.getRow(4).height = 20;
  styleRange(4, 4, 1, 10, {
    font: boldFont,
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } }
  });

  rows.forEach((row, index) => {
    const rowNumber = index + 5;
    worksheet.getRow(rowNumber).height = 22;
    worksheet.getRow(rowNumber).values = [
      index + 1,
      formatShortDate(row.deliveryDate),
      String(row.invoiceNo || ""),
      row.truckNo || "",
      truckTypeLabel(row.truckType),
      row.fromLocation || "",
      row.toLocation || "",
      `${Number(row.qtyTon || 0).toFixed(5)}T`,
      `$${unitMoney(row.companyUnitPrice)}`,
      `$${money(row.companyTotalAmount)}`
    ];
    const isHighlighted = Boolean(row.highlighted);
    styleRange(rowNumber, rowNumber, 1, 10, {
      font: baseFont,
      alignment: { horizontal: "center", vertical: "middle", wrapText: false },
      ...(isHighlighted ? { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE066" } } } : {})
    });
    worksheet.getCell(rowNumber, 7).alignment = { horizontal: "left", vertical: "middle", wrapText: false };
  });

  const totalRowNumber = rows.length + 5;
  worksheet.getRow(totalRowNumber).height = 20;
  worksheet.mergeCells(totalRowNumber, 1, totalRowNumber, 7);
  worksheet.getCell(totalRowNumber, 1).value = "Total";
  worksheet.getCell(totalRowNumber, 8).value = `${rows.reduce((sum, row) => sum + toNumber(row.qtyTon), 0).toFixed(5)}T`;
  worksheet.getCell(totalRowNumber, 10).value = `$${money(rows.reduce((sum, row) => sum + toNumber(row.companyTotalAmount), 0))}`;
  styleRange(totalRowNumber, totalRowNumber, 1, 10, {
    font: boldFont,
    alignment: { horizontal: "center", vertical: "middle" }
  });
  worksheet.getCell(totalRowNumber, 10).alignment = { horizontal: "right", vertical: "middle" };

  const signatureHeaderRow = totalRowNumber + 1;
  const signatureBlankRow = totalRowNumber + 2;
  const nameRow = totalRowNumber + 3;
  const dateRow = totalRowNumber + 4;
  worksheet.getRow(signatureHeaderRow).height = 20;
  worksheet.getRow(signatureBlankRow).height = 60;
  worksheet.getRow(nameRow).height = 18;
  worksheet.getRow(dateRow).height = 18;
  worksheet.mergeCells(signatureHeaderRow, 1, signatureHeaderRow, 3);
  worksheet.mergeCells(signatureHeaderRow, 4, signatureHeaderRow, 7);
  worksheet.mergeCells(signatureHeaderRow, 8, signatureHeaderRow, 10);
  worksheet.getCell(signatureHeaderRow, 1).value = "Prepared By";
  worksheet.getCell(signatureHeaderRow, 4).value = "Checked By";
  worksheet.getCell(signatureHeaderRow, 8).value = "Approved By";
  worksheet.mergeCells(signatureBlankRow, 1, signatureBlankRow, 3);
  worksheet.mergeCells(signatureBlankRow, 4, signatureBlankRow, 7);
  worksheet.mergeCells(signatureBlankRow, 8, signatureBlankRow, 10);
  worksheet.mergeCells(nameRow, 1, nameRow, 3);
  worksheet.mergeCells(nameRow, 4, nameRow, 7);
  worksheet.mergeCells(nameRow, 8, nameRow, 10);
  worksheet.getCell(nameRow, 1).value = "Name: Nhep Manith";
  worksheet.getCell(nameRow, 4).value = "Name:";
  worksheet.getCell(nameRow, 8).value = "Name:";
  worksheet.mergeCells(dateRow, 1, dateRow, 3);
  worksheet.mergeCells(dateRow, 4, dateRow, 7);
  worksheet.mergeCells(dateRow, 8, dateRow, 10);
  worksheet.getCell(dateRow, 1).value = `Date: ${formatShortDate(statement?.statementDate || "")}`;
  worksheet.getCell(dateRow, 4).value = "Date:";
  worksheet.getCell(dateRow, 8).value = "Date:";
  styleRange(signatureHeaderRow, dateRow, 1, 10, {
    font: baseFont,
    alignment: { horizontal: "center", vertical: "middle" }
  });
  [nameRow, dateRow].forEach((rowNumber) => {
    [1, 4, 8].forEach((colNumber) => {
      worksheet.getCell(rowNumber, colNumber).alignment = { horizontal: "left", vertical: "middle" };
    });
  });

  if (signatureImage) {
    const imgId = workbook.addImage({ buffer: signatureImage, extension: "jpeg" });
    worksheet.addImage(imgId, {
      tl: { col: 0, row: signatureBlankRow - 1 },
      br: { col: 3, row: signatureBlankRow },
      editAs: "oneCell"
    });
  }

  worksheet.pageSetup.printArea = `A1:J${dateRow}`;
  worksheet.views = [{ showGridLines: true }];
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function salaryExport(data, rows, query = {}, loanDeduction = 0, garageFee = 0) {
  const truck = data.trucks.find((item) => item.truckNo === query.truckNo) || {};
  const truckNo = query.truckNo || rows[0]?.truckNo || "All Trucks";
  const truckType = truckTypeLabel(rows[0]?.truckType || truck.truckType || query.truckType || "No Data");
  const driverName = rows[0]?.driverName || truck.driverName || "-";
  const reportMonth = monthLabel(query.month || rows[0]?.deliveryDate?.slice(0, 7));
  const totalDriverAmount = rows.reduce((sum, row) => sum + toNumber(row.truckSalaryAmount), 0);
  const netPay = totalDriverAmount - loanDeduction - garageFee;
  const extraTotalRows = [];
  if (loanDeduction > 0) extraTotalRows.push({ label: "Loan Deduction", value: `- $ ${money(loanDeduction)}` });
  if (garageFee > 0) extraTotalRows.push({ label: "Garage Fee", value: `- $ ${money(garageFee)}` });
  if (extraTotalRows.length > 0) extraTotalRows.push({ label: "Net Pay", value: `$ ${money(netPay)}`, bold: true });
  const headerHtml = (pageIndex, pages) => `
    <tr>
      <td class="title" colspan="8">${htmlEscape(data.settings.companyName || "N&M LOGISTIC")}</td>
    </tr>
    <tr>
      <td class="meta" colspan="4">Driver Verification: ${htmlEscape(truckNo)}</td>
      <td class="meta" colspan="2">Month:</td>
      <td class="meta" colspan="2">${htmlEscape(reportMonth)}</td>
    </tr>
    <tr>
      <td class="meta" colspan="4">Driver: ${htmlEscape(driverName)}</td>
      <td class="meta" colspan="2">Truck Type:</td>
      <td class="meta" colspan="2">${htmlEscape(truckType)}</td>
    </tr>
    <tr>
      <td class="meta" colspan="4">Driver Payment: $ ${htmlEscape(money(totalDriverAmount))}</td>
      <td class="subtitle" colspan="4">Page ${pageIndex + 1} of ${pages.length}</td>
    </tr>`;
  return excelTable(
    `${truckNo} Driver Verification`,
    rows,
    [
      { key: "rowNo", label: "No", align: "center" },
      { key: "deliveryDate", label: "Delivery Date", type: "date" },
      { key: "invoiceNo", label: "Invoice No" },
      { key: "fromLocation", label: "From" },
      { key: "toLocation", label: "To" },
      { key: "qtyTon", label: "QTY(T)", type: "qty", align: "right" },
      { key: "truckSalaryUnitPrice", label: "Driver Price", type: "unitMoney", align: "right" },
      { key: "truckSalaryAmount", label: "Driver Amount", type: "money", align: "right" }
    ],
    ["qtyTon", "truckSalaryAmount"],
    { headerHtml, extraTotalRows }
  );
}

function salaryPdf(data, rows, query = {}, loanDeduction = 0, garageFee = 0) {
  const truck = data.trucks.find((item) => item.truckNo === query.truckNo) || {};
  const truckNo = query.truckNo || rows[0]?.truckNo || "All Trucks";
  const truckType = rows[0]?.truckType || truck.truckType || "";
  const driverName = rows[0]?.driverName || truck.driverName || "-";
  const reportMonth = monthLabel(query.month || rows[0]?.deliveryDate?.slice(0, 7));
  const totalDriverAmount = rows.reduce((sum, row) => sum + toNumber(row.truckSalaryAmount), 0);
  const netPay = totalDriverAmount - loanDeduction - garageFee;
  const columns = [
    { key: "no", label: "No", width: 32, align: "center" },
    { key: "date", label: "Delivery Date", width: 80 },
    { key: "invoice", label: "Invoice No", width: 100 },
    { key: "from", label: "From", width: 96 },
    { key: "to", label: "To", width: 160 },
    { key: "qty", label: "QTY(T)", width: 88, align: "right", bold: true },
    { key: "unitPrice", label: "Driver Price", width: 80, align: "right" },
    { key: "driverAmount", label: "Driver Amount", width: 96, align: "right", bold: true }
  ];
  const extraTotals = [];
  if (loanDeduction > 0) extraTotals.push({ label: "Loan Deduction", value: `- $ ${money(loanDeduction)}` });
  if (garageFee > 0) extraTotals.push({ label: "Garage Fee", value: `- $ ${money(garageFee)}` });
  if (extraTotals.length > 0) extraTotals.push({ label: "Net Pay", value: `$ ${money(netPay)}`, bold: true, fill: [0.94, 0.99, 0.95] });
  return tablePdf({
    title: `Driver Verification - ${truckNo}`,
    subtitle: `${truckTypeLabel(truckType)} | Driver: ${driverName} | Month: ${reportMonth} | Gross Pay: $ ${money(totalDriverAmount)}`,
    columns,
    rows: rows.map((row, index) => ({
      no: index + 1,
      date: formatShortDate(row.deliveryDate),
      invoice: row.invoiceNo,
      from: row.fromLocation,
      to: row.toLocation,
      qty: `${Number(row.qtyTon || 0).toFixed(5)}T`,
      unitPrice: `$ ${unitMoney(row.truckSalaryUnitPrice)}`,
      driverAmount: `$ ${money(row.truckSalaryAmount)}`
    })),
    totals: {
      qty: `${rows.reduce((s, r) => s + toNumber(r.qtyTon), 0).toFixed(5)}T`,
      driverAmount: `$ ${money(totalDriverAmount)}`
    },
    totalsLabel: "TOTAL",
    extraTotals,
    footer: false
  });
}

function monthlyTruckPerformance(data, month) {
  const activeTruckNos = new Set(data.trucks.filter((truck) => truck.active !== false).map((truck) => truck.truckNo));
  const rows = data.deliveries
    .filter((row) => !month || row.deliveryDate?.slice(0, 7) === month)
    .filter((row) => activeTruckNos.has(row.truckNo));
  const byTruck = new Map();
  for (const truck of data.trucks.filter((truck) => truck.active !== false)) {
    byTruck.set(truck.truckNo, {
      truckNo: truck.truckNo,
      truckType: truck.truckType,
      driverName: truck.driverName || "",
      trips: 0,
      days: new Set(),
      qtyTon: 0,
      companyAmount: 0,
      driverAmount: 0,
      profit: 0
    });
  }
  for (const row of rows) {
    if (!byTruck.has(row.truckNo)) continue;
    const item = byTruck.get(row.truckNo);
    const companyAmount = toNumber(row.companyTotalAmount);
    const driverAmount = toNumber(row.truckSalaryAmount);
    item.trips += 1;
    if (row.deliveryDate) item.days.add(row.deliveryDate);
    item.qtyTon += toNumber(row.qtyTon);
    item.companyAmount += companyAmount;
    item.driverAmount += driverAmount;
    item.profit += companyAmount - driverAmount;
  }
  return [...byTruck.values()]
    .map((item) => ({ ...item, workingDays: item.days.size }))
    .sort((a, b) => b.companyAmount - a.companyAmount || a.truckNo.localeCompare(b.truckNo));
}

function dashboardExport(rows, month) {
  const label = monthLabel(month);
  const displayRows = rows.map((row) => ({ ...row, truckType: truckTypeLabel(row.truckType) }));
  return excelTable(
    `Truck Performance - ${label}`,
    displayRows,
    [
      { key: "rowNo", label: "No", align: "center" },
      { key: "truckNo", label: "Truck No", type: "text" },
      { key: "truckType", label: "Type" },
      { key: "driverName", label: "Driver" },
      { key: "workingDays", label: "Working Days", align: "center" },
      { key: "trips", label: "Trips", align: "center" },
      { key: "qtyTon", label: "QTY(T)", type: "qty", align: "right" },
      { key: "companyAmount", label: "Company Price", type: "currency", align: "right" },
      { key: "driverAmount", label: "Driver Payment", type: "currency", align: "right" },
      { key: "profit", label: "Profit", type: "currency", align: "right" }
    ],
    ["qtyTon", "companyAmount", "driverAmount", "profit"]
  );
}

// ── Minimal ZIP builder (no external dependency) ──────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = (c >>> 8) ^ CRC_TABLE[(c ^ b) & 0xFF];
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function buildZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const size = data.length;
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6); local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10); local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(size, 18); local.writeUInt32LE(size, 22);
    local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);
    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8); central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12); central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(size, 20); central.writeUInt32LE(size, 24);
    central.writeUInt16LE(nameBuf.length, 28); central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32); central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36); central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);
    locals.push(local, data);
    centrals.push(central);
    offset += local.length + size;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8); eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, cd, eocd]);
}
// ──────────────────────────────────────────────────────────────────────────────

function pdfEscape(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfTextWidth(value, fontSize) {
  return String(value ?? "").length * fontSize * 0.52;
}

function pdfFitText(value, width, fontSize) {
  const text = normalizeText(value).replace(/\s+/g, " ");
  const maxChars = Math.max(1, Math.floor(width / (fontSize * 0.52)));
  return text.length > maxChars ? `${text.slice(0, Math.max(1, maxChars - 1))}.` : text;
}

function pdfRgb([r, g, b]) {
  return `${r} ${g} ${b}`;
}

function drawRect(x, y, width, height, fill, stroke = null) {
  const commands = [];
  if (fill) commands.push(`q ${pdfRgb(fill)} rg ${x} ${y} ${width} ${height} re f Q`);
  if (stroke) commands.push(`q ${pdfRgb(stroke)} RG ${x} ${y} ${width} ${height} re S Q`);
  return commands.join("\n");
}

function drawLine(x1, y1, x2, y2, lineWidth = 0.5, color = [0.6, 0.6, 0.6]) {
  return `q ${pdfRgb(color)} RG ${lineWidth} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S Q`;
}

function drawText(value, x, y, options = {}) {
  const fontSize = options.size || 10;
  const font = options.bold ? "F2" : "F1";
  const color = options.color || [0.06, 0.09, 0.16];
  const width = options.width || 0;
  const text = pdfFitText(value, width || 600, fontSize);
  let textX = x;
  if (options.align === "right" && width) textX = x + width - pdfTextWidth(text, fontSize);
  if (options.align === "center" && width) textX = x + (width - pdfTextWidth(text, fontSize)) / 2;
  return `BT ${pdfRgb(color)} rg /${font} ${fontSize} Tf ${textX.toFixed(2)} ${y.toFixed(2)} Td (${pdfEscape(text)}) Tj ET`;
}

function readJpegInfo(buffer) {
  let i = 0;
  while (i < buffer.length - 12) {
    if (buffer[i] !== 0xFF) { i++; continue; }
    const marker = buffer[i + 1];
    if (marker >= 0xC0 && marker <= 0xC3) {
      return { height: (buffer[i+5] << 8) | buffer[i+6], width: (buffer[i+7] << 8) | buffer[i+8], components: buffer[i+9] };
    }
    if (marker === 0xD8 || marker === 0xFF) { i++; continue; }
    const segLen = (buffer[i+2] << 8) | buffer[i+3];
    if (segLen < 2) { i++; continue; }
    i += 2 + segLen;
  }
  return null;
}

function drawImage(imgName, x, y, width, height) {
  return `q ${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /${imgName} Do Q`;
}

function buildPdf(pages, images = []) {
  const pageObjects = [];
  const imageObjects = [];
  const kids = [];
  const imageBaseObj = 5;
  let objectNumber = imageBaseObj + images.length;

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const colorSpace = img.components === 1 ? "/DeviceGray" : "/DeviceRGB";
    const hexData = img.buffer.toString("hex").toUpperCase() + ">";
    imageObjects.push(`${imageBaseObj + i} 0 obj << /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace ${colorSpace} /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${hexData.length} >> stream\n${hexData}\nendstream endobj`);
  }

  const xObjPart = images.length > 0
    ? ` /XObject << ${images.map((_, i) => `/Im${i + 1} ${imageBaseObj + i} 0 R`).join(" ")} >>`
    : "";
  const resources = `<< /Font << /F1 3 0 R /F2 4 0 R >>${xObjPart} >>`;

  for (const page of pages) {
    const content = page.commands.join("\n");
    const pageObject = objectNumber;
    const contentObject = objectNumber + 1;
    kids.push(`${pageObject} 0 R`);
    const pageWidth = page.width || PDF_PAGE_WIDTH;
    const pageHeight = page.height || PDF_PAGE_HEIGHT;
    pageObjects.push(`${pageObject} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources ${resources} /Contents ${contentObject} 0 R >> endobj`);
    pageObjects.push(`${contentObject} 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`);
    objectNumber += 2;
  }
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    `2 0 obj << /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >> endobj`,
    "3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj",
    ...imageObjects,
    ...pageObjects
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${object}\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
}

function tablePdf({ title, subtitle, columns, rows, totals, totalsLabel, extraTotals, footer, header, preparedBy, signatureImage }) {
  const pageWidth = PDF_PAGE_WIDTH;
  const pageHeight = PDF_PAGE_HEIGHT;
  const margin = PDF_PAGE_MARGIN;
  const tableX = margin;
  const tableWidth = pageWidth - margin * 2;
  const hasCustomHeader = typeof header === "function";
  const requestedWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const widthScale = requestedWidth > tableWidth ? tableWidth / requestedWidth : 1;
  const tableColumns = columns.map((column) => ({ ...column, width: Math.floor(column.width * widthScale) }));
  const widthDifference = tableWidth - tableColumns.reduce((sum, column) => sum + column.width, 0);
  tableColumns[tableColumns.length - 1].width += widthDifference;
  const headerHeight = 22;
  const rowHeight = rows.length <= 30 ? 17 : 20;
  const titleY = pageHeight - 20;
  const subtitleY = pageHeight - 36;
  const tableTop = hasCustomHeader ? pageHeight - 66 : pageHeight - 56;
  const bottomY = footer ? 145 : 18;
  const calculatedRowsPerPage = Math.max(1, Math.floor((tableTop - bottomY - headerHeight - rowHeight) / rowHeight));
  const rowsPerPage = rows.length <= 30 ? 30 : calculatedRowsPerPage;
  const pages = [];
  const chunks = [];
  for (let index = 0; index < rows.length; index += rowsPerPage) {
    chunks.push(rows.slice(index, index + rowsPerPage));
  }
  if (!chunks.length) chunks.push([]);
  chunks.forEach((chunk, pageIndex) => {
    const commands = [];
    if (hasCustomHeader) {
      commands.push(...header({ pageIndex, pages: chunks, pageWidth, pageHeight, tableWidth, margin }));
    } else {
      commands.push(drawText(title, margin, titleY, { size: 12, bold: true, width: tableWidth }));
      if (subtitle) commands.push(drawText(subtitle, margin, subtitleY, { size: 7.5, bold: true, color: [0.39, 0.46, 0.56], width: tableWidth }));
    }
    commands.push(drawRect(tableX, tableTop - headerHeight, tableWidth, headerHeight, [0.06, 0.09, 0.16], [0.06, 0.09, 0.16]));
    let x = tableX;
    for (const column of tableColumns) {
      commands.push(drawText(column.label, x + 3, tableTop - 14, {
        size: 6.8,
        bold: true,
        color: [1, 1, 1],
        width: column.width - 6,
        align: column.align || "left"
      }));
      x += column.width;
    }
    let y = tableTop - headerHeight;
    chunk.forEach((row, index) => {
      y -= rowHeight;
      const fill = row._highlighted ? [1, 0.96, 0.2] : index % 2 === 0 ? [1, 1, 1] : [0.97, 0.98, 0.99];
      commands.push(drawRect(tableX, y, tableWidth, rowHeight, fill, [0.89, 0.92, 0.96]));
      let cellX = tableX;
      tableColumns.forEach((column) => {
        const value = row[column.key];
        commands.push(drawText(value, cellX + 3, y + 6, {
          size: 6.8,
          bold: column.bold || column.key === "truckNo" || column.key === "qty" || column.key === "amount" || column.key === "driverAmount",
          width: column.width - 6,
          align: column.align || "left"
        }));
        cellX += column.width;
      });
    });
    const isLastPage = pageIndex === chunks.length - 1;
    if (isLastPage && totals) {
      y -= rowHeight;
      commands.push(drawRect(tableX, y, tableWidth, rowHeight, [1, 0.98, 0.89], [0.89, 0.92, 0.96]));
      if (totalsLabel) {
        const firstValueIdx = tableColumns.findIndex((col) => totals[col.key]);
        const spanEnd = firstValueIdx < 0 ? tableColumns.length : firstValueIdx;
        const labelWidth = tableColumns.slice(0, spanEnd).reduce((s, c) => s + c.width, 0);
        commands.push(drawText(totalsLabel, tableX + 3, y + 6, { size: 7.5, bold: true, width: labelWidth - 6, align: "center" }));
        let cx = tableX + labelWidth;
        tableColumns.slice(spanEnd).forEach((column) => {
          commands.push(drawText(totals[column.key] || "", cx + 3, y + 6, { size: 6.8, bold: true, width: column.width - 6, align: column.align || "left" }));
          cx += column.width;
        });
      } else {
        let cellX = tableX;
        tableColumns.forEach((column) => {
          commands.push(drawText(totals[column.key] || "", cellX + 3, y + 6, { size: 6.8, bold: true, width: column.width - 6, align: column.align || "left" }));
          cellX += column.width;
        });
      }
    }
    if (isLastPage && extraTotals?.length) {
      const lastColWidth = tableColumns[tableColumns.length - 1].width;
      const labelWidth = tableWidth - lastColWidth;
      for (const extra of extraTotals) {
        y -= rowHeight;
        commands.push(drawRect(tableX, y, tableWidth, rowHeight, extra.fill || [0.97, 0.98, 0.99], [0.89, 0.92, 0.96]));
        commands.push(drawText(extra.label, tableX + 3, y + 6, { size: 6.8, bold: extra.bold, width: labelWidth - 6 }));
        commands.push(drawText(extra.value || "", tableX + labelWidth + 3, y + 6, { size: 6.8, bold: extra.bold, width: lastColWidth - 6, align: "right" }));
      }
    }
    if (isLastPage && footer) {
      const footerTop = Math.max(116, y - 20);
      const fcw = tableWidth / 3;
      const col1 = tableX;
      const col2 = tableX + fcw;
      const col3 = tableX + fcw * 2;
      const footerBottom = footerTop - 108;

      // outer box
      commands.push(drawRect(col1, footerBottom, tableWidth, footerTop - footerBottom + 14, null, [0.7, 0.7, 0.7]));
      // vertical dividers
      commands.push(drawLine(col2, footerTop + 14, col2, footerBottom, 0.5));
      commands.push(drawLine(col3, footerTop + 14, col3, footerBottom, 0.5));
      // horizontal line separating header label row from signing area
      commands.push(drawLine(col1, footerTop - 14, col1 + tableWidth, footerTop - 14, 0.5));
      // signature line above Name/Date
      commands.push(drawLine(col1 + 6, footerTop - 76, col2 - 6, footerTop - 76, 0.7, [0.3, 0.3, 0.3]));
      commands.push(drawLine(col2 + 6, footerTop - 76, col3 - 6, footerTop - 76, 0.7, [0.3, 0.3, 0.3]));
      commands.push(drawLine(col3 + 6, footerTop - 76, tableX + tableWidth - 6, footerTop - 76, 0.7, [0.3, 0.3, 0.3]));

      // header labels — all centered in their column box
      commands.push(drawText("Prepared By", col1 + 6, footerTop, { size: 7.2, bold: true, width: fcw - 12, align: "center" }));
      commands.push(drawText("Checked By", col2 + 6, footerTop, { size: 7.2, bold: true, width: fcw - 12, align: "center" }));
      commands.push(drawText("Approved By", col3 + 6, footerTop, { size: 7.2, bold: true, width: fcw - 12, align: "center" }));

      // signature image in Prepared By column
      if (signatureImage) {
        const sigWidth = Math.min(120, fcw - 12);
        const sigHeight = sigWidth * signatureImage.height / signatureImage.width;
        const sigX = col1 + 6;
        const sigY = footerTop - 14 - (60 - sigHeight) / 2 - sigHeight;
        commands.push(drawImage("Im1", sigX, sigY, sigWidth, sigHeight));
      }

      // Name / Date rows
      commands.push(drawText(preparedBy?.name ? `Name: ${preparedBy.name}` : "Name:", col1 + 6, footerTop - 88, { size: 6.8, width: fcw - 12 }));
      commands.push(drawText("Name:", col2 + 6, footerTop - 88, { size: 6.8, width: fcw - 12 }));
      commands.push(drawText("Name:", col3 + 6, footerTop - 88, { size: 6.8, width: fcw - 12 }));
      commands.push(drawText(preparedBy?.date ? `Date: ${preparedBy.date}` : "Date:", col1 + 6, footerTop - 100, { size: 6.8, width: fcw - 12 }));
      commands.push(drawText("Date:", col2 + 6, footerTop - 100, { size: 6.8, width: fcw - 12 }));
      commands.push(drawText("Date:", col3 + 6, footerTop - 100, { size: 6.8, width: fcw - 12 }));
    }
    commands.push(drawText(`Page ${pageIndex + 1} of ${chunks.length}`, pageWidth - 108, 14, { size: 8, color: [0.39, 0.46, 0.56], width: 100, align: "right" }));
    pages.push({ commands, width: pageWidth, height: pageHeight });
  });
  return buildPdf(pages, signatureImage ? [signatureImage] : []);
}

function statementPdf(data, rows, signatureImage) {
  const statement = data.statements.find((item) => item.id === rows[0]?.statementId);
  const totalQty = rows.reduce((sum, row) => sum + toNumber(row.qtyTon), 0);
  const totalAmount = rows.reduce((sum, row) => sum + toNumber(row.companyTotalAmount), 0);
  const statementHeader = ({ pageIndex, pages, pageWidth, pageHeight }) => {
    const rowHeight = 15;
    const top = pageHeight - 8;
    const leftWidth = pageWidth * 0.58;
    const labelWidth = pageWidth * 0.18;
    const valueWidth = pageWidth - leftWidth - labelWidth;
    const rowsY = [top - rowHeight, top - rowHeight * 2, top - rowHeight * 3];
    const commands = [];
    for (const y of rowsY) {
      commands.push(drawRect(0, y, leftWidth, rowHeight, null, [0.06, 0.09, 0.16]));
      commands.push(drawRect(leftWidth, y, labelWidth, rowHeight, null, [0.06, 0.09, 0.16]));
      commands.push(drawRect(leftWidth + labelWidth, y, valueWidth, rowHeight, null, [0.06, 0.09, 0.16]));
    }
    commands.push(drawText(data.settings.companyName || "N&M LOGISTIC", 0, rowsY[0] + 4, { size: 11, bold: true, width: leftWidth, align: "center" }));
    commands.push(drawText("Invoice No:", leftWidth + 3, rowsY[0] + 4, { size: 7, bold: true, width: labelWidth - 6 }));
    commands.push(drawText(statement?.statementNumber || "", leftWidth + labelWidth + 3, rowsY[0] + 4, { size: 7, bold: true, width: valueWidth - 6, align: "right" }));
    commands.push(drawText(`From: ${data.settings.fromName || "Nhep Manith"}`, 3, rowsY[1] + 4, { size: 7, bold: true, width: leftWidth - 6 }));
    commands.push(drawText("Statement Date:", leftWidth + 3, rowsY[1] + 4, { size: 7, bold: true, width: labelWidth - 6 }));
    commands.push(drawText(formatShortDate(statement?.statementDate || ""), leftWidth + labelWidth + 3, rowsY[1] + 4, { size: 7, bold: true, width: valueWidth - 6, align: "right" }));
    commands.push(drawText(`To: ${data.settings.toName || "SLP"}`, 3, rowsY[2] + 4, { size: 7, bold: true, width: leftWidth - 6 }));
    commands.push(drawText(`Page ${pageIndex + 1} of ${pages.length}`, leftWidth + labelWidth + 3, rowsY[2] + 4, { size: 7, width: valueWidth - 6, align: "right" }));
    return commands;
  };
  const columns = [
    { key: "no", label: "No", width: 32, align: "center" },
    { key: "date", label: "Delivery Date", width: 78 },
    { key: "invoice", label: "Invoice Number", width: 98 },
    { key: "truckNo", label: "Truck Number", width: 84 },
    { key: "truckType", label: "Type of Truck", width: 96 },
    { key: "from", label: "From Location", width: 96 },
    { key: "to", label: "To Location", width: 150 },
    { key: "qty", label: "QTY(T)", width: 88, align: "right", bold: true },
    { key: "unit", label: "Unit Price", width: 72, align: "right" },
    { key: "amount", label: "Total Amount", width: 96, align: "right", bold: true }
  ];
  return tablePdf({
    title: `Statement ${statement?.statementNumber || ""} - ${monthLabel(statement?.month)}`,
    subtitle: `${truckTypeLabel(statement?.truckType) || ""} | ${statement?.status || ""} | ${rows.length}/30 rows | From: ${data.settings.fromName || "Nhep Manith"} | To: ${data.settings.toName || "SLP"} | Date: ${formatShortDate(statement?.statementDate || "")}`,
    columns,
    header: statementHeader,
    rows: rows.map((row, index) => ({
      no: index + 1,
      date: formatShortDate(row.deliveryDate),
      invoice: row.invoiceNo,
      truckNo: row.truckNo,
      truckType: truckTypeLabel(row.truckType),
      from: row.fromLocation,
      to: row.toLocation,
      qty: `${Number(row.qtyTon || 0).toFixed(5)}T`,
      unit: `$ ${unitMoney(row.companyUnitPrice)}`,
      amount: `$ ${money(row.companyTotalAmount)}`,
      _highlighted: Boolean(row.highlighted)
    })),
    totals: {
      qty: `${totalQty.toFixed(5)}T`,
      amount: `$ ${money(totalAmount)}`
    },
    totalsLabel: "TOTAL",
    footer: true,
    preparedBy: { name: "Nhep Manith", date: formatShortDate(statement?.statementDate || "") },
    signatureImage
  });
}

function dashboardPdf(rows, month) {
  const totalQty = rows.reduce((sum, row) => sum + toNumber(row.qtyTon), 0);
  const totalCompany = rows.reduce((sum, row) => sum + toNumber(row.companyAmount), 0);
  const totalDriver = rows.reduce((sum, row) => sum + toNumber(row.driverAmount), 0);
  const totalProfit = rows.reduce((sum, row) => sum + toNumber(row.profit), 0);
  const columns = [
    { key: "truckNo", label: "Truck No", width: 80, bold: true },
    { key: "truckType", label: "Type", width: 96 },
    { key: "driverName", label: "Driver", width: 120 },
    { key: "workingDays", label: "Working Days", width: 92, align: "center" },
    { key: "trips", label: "Trips", width: 60, align: "center" },
    { key: "qty", label: "QTY(T)", width: 96, align: "right", bold: true },
    { key: "company", label: "Company Price", width: 110, align: "right" },
    { key: "driver", label: "Driver Payment", width: 110, align: "right", bold: true },
    { key: "profit", label: "Profit", width: 78, align: "right" }
  ];
  return tablePdf({
    title: "Truck Performance",
    subtitle: `Report Month: ${monthLabel(month)} | ${rows.length} trucks`,
    columns,
    rows: rows.map((row) => ({
      truckNo: row.truckNo,
      truckType: truckTypeLabel(row.truckType),
      driverName: row.driverName || "-",
      workingDays: row.workingDays || 0,
      trips: row.trips || 0,
      qty: `${Number(row.qtyTon || 0).toFixed(4)}T`,
      company: `$ ${money(row.companyAmount)}`,
      driver: `$ ${money(row.driverAmount)}`,
      profit: `$ ${money(row.profit)}`
    })),
    totals: {
      truckNo: "Total",
      qty: `${totalQty.toFixed(4)}T`,
      company: `$ ${money(totalCompany)}`,
      driver: `$ ${money(totalDriver)}`,
      profit: `$ ${money(totalProfit)}`
    }
  });
}

function parseQuery(url) {
  return Object.fromEntries(url.searchParams.entries());
}

async function api(req, res, url, role = "admin") {
  const data = await readData();
  const query = parseQuery(url);
  const db = getDb();
  function requireAdmin() {
    if (role !== "admin") throw Object.assign(new Error("Admin access required."), { status: 403 });
  }

  // Users management (admin only)
  if (req.method === "GET" && url.pathname === "/api/users") {
    requireAdmin();
    const users = db.prepare("SELECT id, username, role, createdAt FROM users ORDER BY createdAt").all();
    return sendJson(res, 200, users);
  }
  if (req.method === "POST" && url.pathname === "/api/users") {
    requireAdmin();
    const body = await readBody(req);
    const username = normalizeText(body.username);
    const password = String(body.password || "").trim();
    const userRole = body.role === "admin" ? "admin" : "staff";
    if (!username) throw new Error("Username is required.");
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");
    if (db.prepare("SELECT id FROM users WHERE username = ?").get(username)) throw new Error("Username already exists.");
    const id = `user-${Date.now()}`;
    const passwordHash = await hashPassword(password);
    db.prepare("INSERT INTO users (id, username, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, ?)").run(id, username, passwordHash, userRole, new Date().toISOString());
    return sendJson(res, 200, { id, username, role: userRole });
  }
  if (req.method === "PUT" && url.pathname.startsWith("/api/users/") && url.pathname.endsWith("/password")) {
    requireAdmin();
    const id = decodeURIComponent(url.pathname.split("/")[3]);
    const body = await readBody(req);
    const password = String(body.password || "").trim();
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");
    db.prepare("UPDATE users SET passwordHash = ? WHERE id = ?").run(await hashPassword(password), id);
    return sendJson(res, 200, { ok: true });
  }
  if (req.method === "DELETE" && url.pathname.startsWith("/api/users/")) {
    requireAdmin();
    const id = decodeURIComponent(url.pathname.split("/").pop());
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/api/data") {
    return sendJson(res, 200, { ...data, statements: statementsWithCounts(data) });
  }

  if (req.method === "GET" && url.pathname === "/api/backup/download") {
    requireAdmin();
    const fileName = `truck-delivery-backup-${timestampForFile()}.json`;
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`
    });
    return res.end(JSON.stringify(data, null, 2));
  }

  if (req.method === "POST" && url.pathname === "/api/backup/create") {
    requireAdmin();
    const result = await updateData(async (data) => {
      addActivity(data, "Created manual data backup.", "backup");
      const fileName = await createBackup(data, "manual");
      sendBackupToTelegram(data, "Manual Backup").catch(() => {});
      return { fileName };
    });
    return sendJson(res, 200, result);
  }

  if (req.method === "POST" && url.pathname === "/api/backup/send-telegram") {
    requireAdmin();
    const cfg = getTelegramConfig();
    if (!cfg) return sendJson(res, 400, { error: "Telegram is not configured. Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to environment variables." });
    await sendBackupToTelegram(data, "Manual Send");
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/api/telegram/status") {
    requireAdmin();
    return sendJson(res, 200, { configured: Boolean(getTelegramConfig()) });
  }

  if (req.method === "POST" && url.pathname === "/api/export/monthly-bundle-telegram") {
    requireAdmin();
    if (!getTelegramConfig()) return sendJson(res, 400, { error: "Telegram is not configured." });
    const month = normalizeText(query.month) || currentLocalDate().slice(0, 7);
    const monthStart = `${month}-01`;
    const [y2, m2] = month.split("-").map(Number);
    const monthEnd = `${month}-${String(new Date(y2, m2, 0).getDate()).padStart(2, "0")}`;
    const monthStmts2 = data.statements.filter((s) => s.month === month);
    const monthDeliveries2 = data.deliveries.filter((d) => d.deliveryDate >= monthStart && d.deliveryDate <= monthEnd);
    const safeMonth2 = numericMonthFilePart(month);
    const label2 = monthLabel(month);
    const companyName2 = data.settings.companyName || "N&M LOGISTIC";

    // Re-use the same generation logic (summary Excel + PDFs + per-statement files)
    const wb2 = new ExcelJS.Workbook();
    wb2.creator = companyName2;
    const totalRevenue2 = monthDeliveries2.reduce((s, d) => s + toNumber(d.companyTotalAmount), 0);
    const totalDriver2 = monthDeliveries2.reduce((s, d) => s + toNumber(d.truckSalaryAmount), 0);
    const totalQty2 = monthDeliveries2.reduce((s, d) => s + toNumber(d.qtyTon), 0);
    const margin2 = totalRevenue2 - totalDriver2;
    const outstanding2 = monthStmts2.filter((s) => !data.paymentMonths.find((pm) => pm.month === s.paymentMonth && pm.received));
    const activeTrucks2 = new Set(monthDeliveries2.map((d) => d.truckNo)).size;
    const thinBorder2 = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    const dash2 = wb2.addWorksheet("Dashboard");
    dash2.columns = [{ key: "a", width: 30 }, { key: "b", width: 20 }, { key: "c", width: 30 }, { key: "d", width: 20 }];
    dash2.mergeCells("A1:D1");
    const h1 = dash2.getCell("A1"); h1.value = companyName2; h1.font = { name: "Arial", size: 14, bold: true }; h1.alignment = { horizontal: "center" };
    dash2.getRow(1).height = 28;
    dash2.mergeCells("A2:D2");
    const h2 = dash2.getCell("A2"); h2.value = `Monthly Summary — ${label2}`; h2.font = { name: "Arial", size: 10, bold: true }; h2.alignment = { horizontal: "center" };
    [["Total Revenue", `$ ${money(totalRevenue2)}`, "Driver Salary", `$ ${money(totalDriver2)}`],
     ["Gross Margin", `$ ${money(margin2)}`, "Total Tonnage", `${totalQty2.toFixed(3)} T`],
     ["Statements", String(monthStmts2.length), "Deliveries", String(monthDeliveries2.length)],
     ["Active Trucks", String(activeTrucks2), "Outstanding", String(outstanding2.length)]].forEach((row, i) => {
      const r = i + 4; dash2.getRow(r).height = 22;
      [1, 3].forEach((col, j) => {
        const lc = dash2.getCell(r, col); lc.value = row[j * 2]; lc.font = { name: "Arial", size: 10, bold: true }; lc.border = thinBorder2;
        const vc = dash2.getCell(r, col + 1); vc.value = row[j * 2 + 1]; vc.font = { name: "Arial", size: 10 }; vc.border = thinBorder2;
      });
    });
    const xlsBuf2 = Buffer.from(await wb2.xlsx.writeBuffer());

    const sigPath2 = path.join(__dirname, "signature.jpg");
    let sigBuf2 = null;
    if (existsSync(sigPath2)) {
      const raw2 = await readFile(sigPath2);
      const info2 = readJpegInfo(raw2);
      if (info2) sigBuf2 = { buffer: raw2, width: info2.width, height: info2.height, components: info2.components };
    }

    const stFiles2 = [];
    for (const stmt of monthStmts2) {
      const stRows2 = data.deliveries.filter((d) => d.statementId === stmt.id);
      if (stRows2.length === 0) continue;
      const stName2 = `st-${stmt.statementNumber}-${safeMonth2}`;
      stFiles2.push({ name: `statements/${stName2}.xlsx`, data: await accountingWorkbook(data, stRows2, sigBuf2?.buffer) });
      stFiles2.push({ name: `statements/${stName2}.pdf`, data: statementPdf(data, stRows2, sigBuf2) });
    }

    const sortedDl2 = [...monthDeliveries2].sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
    const dlPdf2 = tablePdf({
      title: `${label2} — Deliveries`, subtitle: `${companyName2} | ${monthDeliveries2.length} rows`,
      columns: [
        { key: "no", label: "No", width: 26, align: "center" }, { key: "date", label: "Date", width: 60 },
        { key: "inv", label: "Invoice", width: 74 }, { key: "truck", label: "Truck", width: 55 },
        { key: "to", label: "To Location", width: 120 }, { key: "qty", label: "QTY(T)", width: 68, align: "right" },
        { key: "cTot", label: "Co. Total", width: 70, align: "right", bold: true }, { key: "dTot", label: "Dr. Total", width: 70, align: "right" },
      ],
      rows: sortedDl2.map((d, i) => ({ no: i + 1, date: formatShortDate(d.deliveryDate), inv: d.invoiceNo, truck: d.truckNo, to: d.toLocation, qty: `${Number(d.qtyTon || 0).toFixed(3)}T`, cTot: `$ ${money(d.companyTotalAmount)}`, dTot: `$ ${money(d.truckSalaryAmount)}` })),
      totals: { qty: `${totalQty2.toFixed(3)}T`, cTot: `$ ${money(totalRevenue2)}`, dTot: `$ ${money(totalDriver2)}` }, totalsLabel: "Total",
    });

    const zipBuf2 = buildZip([
      { name: `nm-logistic-${safeMonth2}.xlsx`, data: xlsBuf2 },
      { name: `nm-logistic-${safeMonth2}-deliveries.pdf`, data: dlPdf2 },
      ...stFiles2,
    ]);

    const zipFilename2 = `nm-logistic-summary-${safeMonth2}.zip`;
    const caption2 = [
      `N&M Logistic — Monthly Bundle`,
      `Month: ${label2}`,
      `Statements: ${monthStmts2.length} | Deliveries: ${monthDeliveries2.length} | Revenue: $ ${money(totalRevenue2)}`,
    ].join("\n");
    await sendFileToTelegram(zipBuf2, zipFilename2, caption2);
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/api/backup/list") {
    const files = (await readdir(backupDir).catch(() => []))
      .filter((file) => file.endsWith(".json"))
      .sort((a, b) => b.localeCompare(a));
    return sendJson(res, 200, { files });
  }

  if (req.method === "POST" && url.pathname === "/api/backup/restore") {
    requireAdmin();
    const restored = await readBody(req);
    validateRestoreData(restored);
    await updateData(async (data) => {
      await createBackup(data, "before-restore");
      for (const key of Object.keys(data)) delete data[key];
      Object.assign(data, restored);
      data.activity ||= [];
      addActivity(data, "Restored data from backup file.", "backup");
      return { ok: true };
    });
    return sendJson(res, 200, { ok: true });
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

  if (req.method === "POST" && url.pathname.startsWith("/api/statements/") && url.pathname.endsWith("/reopen")) {
    const id = decodeURIComponent(url.pathname.split("/")[3]);
    const statement = await updateData((data) => {
      const statement = data.statements.find((item) => item.id === id);
      if (!statement) throw new Error("Statement not found.");
      statement.status = "Draft";
      statement.updatedAt = new Date().toISOString();
      return statement;
    });
    return sendJson(res, 200, statement);
  }

  if (req.method === "DELETE" && url.pathname === "/api/statements/empty-drafts") {
    const result = await updateData((data) => {
      const emptyDrafts = data.statements.filter(
        (statement) => statement.status === "Draft" && statementRowCount(data, statement.id) === 0
      );
      if (emptyDrafts.length < 1) return { deleted: 0 };
      const emptyDraftIds = new Set(emptyDrafts.map((statement) => statement.id));
      data.statements = data.statements.filter((statement) => !emptyDraftIds.has(statement.id));
      addActivity(data, `Cleaned ${emptyDrafts.length} empty draft statement${emptyDrafts.length > 1 ? "s" : ""}.`, "statement");
      return { deleted: emptyDrafts.length };
    });
    return sendJson(res, 200, result);
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/statements/")) {
    requireAdmin();
    const id = decodeURIComponent(url.pathname.split("/").pop());
    await updateData((data) => {
      const statement = data.statements.find((item) => item.id === id);
      if (!statement) throw new Error("Statement not found.");
      const deletePassword = data.settings?.deletePassword || "";
      if (deletePassword) {
        const provided = req.headers["x-delete-password"] || "";
        if (provided !== deletePassword) throw new Error("Incorrect password. You are not authorized to delete statements.");
      }
      data.statements = data.statements.filter((item) => item.id !== id);
      data.deliveries = data.deliveries.filter((item) => item.statementId !== id);
      addActivity(data, `Deleted statement ${statement.statementNumber} (${statement.status}).`, "statement");
      return { ok: true };
    });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/statements/quick") {
    requireAdmin();
    const body = await readBody(req);
    const month = normalizeText(body.month);
    const statementNumber = Number(body.statementNumber);
    const manualAmount = toNumber(body.manualAmount);
    if (!month) throw new Error("Month is required.");
    if (!Number.isInteger(statementNumber) || statementNumber <= 0) throw new Error("Statement number must be a positive number.");
    if (manualAmount <= 0) throw new Error("Amount must be greater than zero.");
    const statement = await updateData((data) => {
      const duplicate = data.statements.some((s) => s.month === month && Number(s.statementNumber) === statementNumber);
      if (duplicate) throw new Error("Statement number already exists in this month.");
      const now = new Date().toISOString();
      const newStatement = {
        id: crypto.randomUUID(),
        month,
        statementNumber,
        statementDate: `${month}-01`,
        truckType: "With Crane",
        status: "Finished",
        paymentMonth: null,
        isManual: true,
        manualAmount,
        createdAt: now,
        updatedAt: now
      };
      data.statements.push(newStatement);
      return newStatement;
    });
    return sendJson(res, 200, statement);
  }

  if (req.method === "POST" && url.pathname.startsWith("/api/statements/") && url.pathname.endsWith("/assign-payment")) {
    requireAdmin();
    const id = decodeURIComponent(url.pathname.split("/")[3]);
    const { paymentMonth } = await readBody(req);
    await updateData((data) => {
      const statement = data.statements.find((item) => item.id === id);
      if (!statement) throw new Error("Statement not found.");
      statement.paymentMonth = paymentMonth || null;
      if (paymentMonth) {
        data.paymentMonths ||= [];
        if (!data.paymentMonths.find((pm) => pm.month === paymentMonth)) {
          data.paymentMonths.push({ month: paymentMonth, received: false });
        }
      }
    });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/payment-months/toggle") {
    requireAdmin();
    const { month } = await readBody(req);
    if (!month) throw new Error("month is required.");
    await updateData((data) => {
      data.paymentMonths ||= [];
      const pm = data.paymentMonths.find((item) => item.month === month);
      if (pm) pm.received = !pm.received;
      else data.paymentMonths.push({ month, received: true });
    });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/settings") {
    requireAdmin();
    const body = await readBody(req);
    const settings = await updateData((data) => {
      data.settings = { ...data.settings, ...body };
      return data.settings;
    });
    return sendJson(res, 200, settings);
  }

  if (req.method === "POST" && url.pathname === "/api/trucks") {
    requireAdmin();
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
      addActivity(data, `${index >= 0 ? "Updated" : "Added"} truck ${truck.truckNo} (${truckTypeLabel(truck.truckType)}).`, "truck");
      return truck;
    });
    return sendJson(res, 200, truck);
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/trucks/")) {
    requireAdmin();
    const truckNo = decodeURIComponent(url.pathname.split("/").pop());
    const result = await updateData((data) => {
      const truck = data.trucks.find((item) => item.truckNo === truckNo);
      if (!truck) throw new Error("Truck not found.");
      const hasHistory = data.deliveries.some((delivery) => delivery.truckNo === truckNo);
      if (hasHistory) {
        truck.active = false;
        addActivity(data, `Deactivated truck ${truckNo} because it has delivery history.`, "truck");
        return { ok: true, action: "deactivated" };
      }
      data.trucks = data.trucks.filter((item) => item.truckNo !== truckNo);
      addActivity(data, `Deleted unused truck ${truckNo}.`, "truck");
      return { ok: true, action: "deleted" };
    });
    return sendJson(res, 200, result);
  }

  if (req.method === "POST" && url.pathname === "/api/prices") {
    const body = await readBody(req);
    const price = await updateData((data) => {
      const existingById = body.id ? data.prices.find((item) => item.id === body.id) : null;
      const price = {
        id: body.id || crypto.randomUUID(),
        fromLocation: normalizeText(body.fromLocation || data.settings.defaultFromLocation),
        toLocation: normalizeLocationName(body.toLocation),
        truckType: normalizeText(body.truckType),
        distanceKm: toNumber(body.distanceKm),
        companyUnitPrice: toNumber(body.companyUnitPrice),
        truckSalaryUnitPrice: toNumber(body.truckSalaryUnitPrice),
        effectiveDate: normalizeText(body.effectiveDate || (body.effectiveMonth ? `${body.effectiveMonth}-01` : "2026-01-01")),
        active: body.active !== false
      };
      if (!price.toLocation || !price.truckType) throw new Error("To Location and Truck Type are required.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(price.effectiveDate)) throw new Error("Effective Date is required.");
      const duplicateRoute = data.prices.find((item) =>
        item.id !== price.id &&
        item.fromLocation === price.fromLocation &&
        item.truckType === price.truckType &&
        locationBaseKey(item.toLocation) === locationBaseKey(price.toLocation) &&
        item.toLocation !== price.toLocation &&
        !existingById
      );
      if (duplicateRoute) {
        throw new Error(`Duplicate location is not allowed. "${price.toLocation}" already exists as "${duplicateRoute.toLocation}" for ${truckTypeLabel(price.truckType)}.`);
      }
      const index = data.prices.findIndex((item) =>
        item.id === price.id ||
        (
          item.fromLocation === price.fromLocation &&
          item.toLocation === price.toLocation &&
          item.truckType === price.truckType &&
          effectiveDateOf(item) === price.effectiveDate
        )
      );
      if (index >= 0) data.prices[index] = price;
      else data.prices.push(price);
      const recalcCount = recalculateDeliveriesForPriceRoutes(data, [price]);
      addActivity(data, `${index >= 0 ? "Updated" : "Added"} ${truckTypeLabel(price.truckType)} price for ${price.toLocation}, effective ${price.effectiveDate}${recalcCount ? `, recalculated ${recalcCount} delivery row${recalcCount > 1 ? "s" : ""}` : ""}.`, "price");
      return price;
    });
    return sendJson(res, 200, price);
  }

  if (req.method === "POST" && url.pathname === "/api/recalculate") {
    const result = await updateData((data) => {
      const count = recalculateAllDeliveries(data);
      addActivity(data, `Force-recalculated ${count} delivery row${count !== 1 ? "s" : ""} against current prices.`, "price");
      return { recalculatedDeliveries: count };
    });
    return sendJson(res, 200, result);
  }

  if (req.method === "POST" && url.pathname === "/api/fix-location-names") {
    const result = await updateData((data) => {
      let fixed = 0;
      for (const delivery of data.deliveries) {
        const deliveryKey = locationBaseKey(delivery.toLocation);
        // Find the canonical price list name for this route
        const matchedPrice = data.prices.find(
          (p) =>
            p.fromLocation === delivery.fromLocation &&
            p.truckType === delivery.truckType &&
            locationBaseKey(p.toLocation) === deliveryKey
        );
        if (matchedPrice && matchedPrice.toLocation !== delivery.toLocation) {
          delivery.toLocation = matchedPrice.toLocation;
          delivery.updatedAt = new Date().toISOString();
          fixed += 1;
        }
      }
      // Recalculate driver prices now that location names are corrected
      const recalculated = recalculateAllDeliveries(data);
      if (fixed > 0 || recalculated > 0) {
        addActivity(data, `Fixed ${fixed} delivery location name${fixed !== 1 ? "s" : ""} to match price list, recalculated ${recalculated} driver price${recalculated !== 1 ? "s" : ""}.`, "price");
      }
      return { fixed, recalculated };
    });
    return sendJson(res, 200, result);
  }

  if (req.method === "GET" && url.pathname === "/api/diagnose-driver") {
    const data = await readData();
    const problems = [];
    for (const delivery of data.deliveries) {
      if (toNumber(delivery.truckSalaryUnitPrice) !== 0) continue;
      const allForRoute = data.prices.filter(
        (p) =>
          p.fromLocation === delivery.fromLocation &&
          locationBaseKey(p.toLocation) === locationBaseKey(delivery.toLocation) &&
          p.truckType === delivery.truckType
      );
      const effectivePrice = findEffectivePrice(data, {
        fromLocation: delivery.fromLocation,
        toLocation: delivery.toLocation,
        truckType: delivery.truckType,
        deliveryDate: delivery.deliveryDate
      });
      problems.push({
        toLocation: delivery.toLocation,
        truckType: delivery.truckType,
        deliveryDate: delivery.deliveryDate,
        storedDriverPrice: delivery.truckSalaryUnitPrice,
        effectivePriceFound: effectivePrice ? effectivePrice.truckSalaryUnitPrice : null,
        effectivePriceDate: effectivePrice ? effectiveDateOf(effectivePrice) : null,
        allPricesForRoute: allForRoute.map((p) => ({
          effectiveDate: effectiveDateOf(p),
          driver: p.truckSalaryUnitPrice,
          active: p.active
        }))
      });
    }
    return sendJson(res, 200, { zeroPriceDeliveries: problems.length, problems });
  }

  if (req.method === "GET" && url.pathname === "/api/diagnose-empty-prices") {
    const data = await readData();
    const activeByRoute = new Map();
    for (const price of data.prices) {
      if (price.active === false) continue;
      const key = `${price.fromLocation}||${locationBaseKey(price.toLocation)}||${price.truckType}`;
      const current = activeByRoute.get(key);
      if (!current || effectiveDateOf(price) > effectiveDateOf(current)) {
        activeByRoute.set(key, price);
      }
    }
    const missingDriver = { "With Crane": [], "Without Crane": [] };
    const missingCompany = { "With Crane": [], "Without Crane": [] };
    for (const price of activeByRoute.values()) {
      if (toNumber(price.truckSalaryUnitPrice) === 0) (missingDriver[price.truckType] ||= []).push(price.toLocation);
      if (toNumber(price.companyUnitPrice) === 0) (missingCompany[price.truckType] ||= []).push(price.toLocation);
    }
    for (const key of Object.keys(missingDriver)) missingDriver[key].sort();
    for (const key of Object.keys(missingCompany)) missingCompany[key].sort();
    return sendJson(res, 200, { missingDriver, missingCompany });
  }

  if (req.method === "POST" && url.pathname === "/api/prices/cleanup-zero-driver") {
    const result = await updateData((data) => {
      // Group Without Crane prices by route
      const routes = new Map();
      for (const price of data.prices) {
        if (price.truckType !== "Without Crane") continue;
        const key = `${price.fromLocation}||${locationBaseKey(price.toLocation)}`;
        if (!routes.has(key)) routes.set(key, []);
        routes.get(key).push(price);
      }

      let deleted = 0;
      const stillMissing = [];
      const idsToDelete = new Set();

      for (const entries of routes.values()) {
        entries.sort((a, b) => effectiveDateOf(b).localeCompare(effectiveDateOf(a)));
        const newest = entries[0];

        if (toNumber(newest.truckSalaryUnitPrice) === 0) {
          stillMissing.push(newest.toLocation);
          continue;
        }

        // Delete older entries that have $0 driver price
        for (let i = 1; i < entries.length; i++) {
          const old = entries[i];
          if (toNumber(old.truckSalaryUnitPrice) !== 0) continue;
          // Only delete if no deliveries fall before the newer entry's effective date
          const hasOldDeliveries = data.deliveries.some(
            (d) =>
              d.fromLocation === old.fromLocation &&
              locationBaseKey(d.toLocation) === locationBaseKey(old.toLocation) &&
              d.truckType === old.truckType &&
              d.deliveryDate < effectiveDateOf(newest)
          );
          if (!hasOldDeliveries) {
            idsToDelete.add(old.id);
            deleted += 1;
          }
        }
      }

      if (idsToDelete.size > 0) {
        data.prices = data.prices.filter((p) => !idsToDelete.has(p.id));
      }

      if (deleted > 0 || stillMissing.length > 0) {
        addActivity(
          data,
          `Cleaned up ${deleted} old Without Crane $0-driver price entr${deleted !== 1 ? "ies" : "y"}.${stillMissing.length ? ` ${stillMissing.length} location${stillMissing.length !== 1 ? "s" : ""} still missing driver price.` : ""}`,
          "price"
        );
      }

      return { deleted, stillMissing };
    });
    return sendJson(res, 200, result);
  }

  if (req.method === "POST" && url.pathname === "/api/prices/bulk") {
    const body = await readBody(req);
    const result = await updateData((data) => {
      const priceType = normalizeText(body.priceType || "both");
      const truckType = normalizeText(body.truckType);
      const effectiveDate = normalizeText(body.effectiveDate);
      const fromLocation = normalizeText(body.fromLocation || data.settings.defaultFromLocation);
      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (!["company", "driver", "both"].includes(priceType)) throw new Error("Price type is required.");
      if (!truckType) throw new Error("Truck type is required.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) throw new Error("Effective Date is required.");
      if (rows.length < 1) throw new Error("Paste at least one price row.");

      let added = 0;
      let updated = 0;
      const saved = [];
      const seenRows = new Map();
      for (const row of rows) {
        const pastedLocation = normalizeLocationName(row.rawLocation || row.toLocation);
        const toLocation = normalizeLocationName(row.toLocation || pastedLocation);
        if (!toLocation) throw new Error(`Missing location on row ${row.line || saved.length + 1}.`);
        const rowKey = locationBaseKey(toLocation);
        if (seenRows.has(rowKey)) {
          throw new Error(`Duplicate location in pasted rows: "${toLocation}" also appears on row ${seenRows.get(rowKey)}.`);
        }
        seenRows.set(rowKey, row.line || saved.length + 1);
        const matchedRoute = data.prices.find(
          (price) =>
            price.fromLocation === fromLocation &&
            locationBaseKey(price.toLocation) === locationBaseKey(toLocation) &&
            price.truckType === truckType
        );
        if (!matchedRoute && !/^\s*(KH\.|D\.)/i.test(toLocation)) {
          throw new Error(`Location "${toLocation}" must start with KH. or D. to be created.`);
        }
        const matchedLocation = matchedRoute ? matchedRoute.toLocation : toLocation;
        const currentPrice = findEffectivePrice(data, { fromLocation, toLocation: matchedLocation, truckType, deliveryDate: effectiveDate });
        const distanceKm = row.distanceKm === "" || row.distanceKm == null
          ? toNumber(currentPrice?.distanceKm)
          : toNumber(row.distanceKm);
        const companyUnitPrice =
          priceType === "driver"
            ? toNumber(currentPrice?.companyUnitPrice)
            : toNumber(row.companyUnitPrice);
        const truckSalaryUnitPrice =
          priceType === "company"
            ? toNumber(currentPrice?.truckSalaryUnitPrice)
            : toNumber(row.truckSalaryUnitPrice);
        if ((priceType === "company" || priceType === "both") && companyUnitPrice <= 0) {
          throw new Error(`Company price is required for ${toLocation}.`);
        }
        if ((priceType === "driver" || priceType === "both") && truckSalaryUnitPrice < 0) {
          throw new Error(`Driver price is invalid for ${toLocation}.`);
        }
        const price = {
          id: crypto.randomUUID(),
          fromLocation,
          toLocation: matchedLocation,
          truckType,
          distanceKm,
          companyUnitPrice,
          truckSalaryUnitPrice,
          effectiveDate,
          active: true
        };
        const index = data.prices.findIndex((item) =>
          item.fromLocation === price.fromLocation &&
          item.toLocation === price.toLocation &&
          item.truckType === price.truckType &&
          effectiveDateOf(item) === price.effectiveDate
        );
        if (index >= 0) {
          price.id = data.prices[index].id;
          data.prices[index] = price;
          updated += 1;
        } else {
          data.prices.push(price);
          added += 1;
        }
        saved.push(price);
      }
      if (saved.length < 1) throw new Error("No valid price rows found.");

      let recalculatedDeliveries = 0;
      if (priceType === "driver" || priceType === "both") {
        const savedRouteKeys = new Set(saved.map((price) => [
          price.fromLocation,
          price.truckType,
          locationBaseKey(price.toLocation)
        ].join("||")));

        for (const delivery of data.deliveries) {
          const routeKey = [
            delivery.fromLocation,
            delivery.truckType,
            locationBaseKey(delivery.toLocation)
          ].join("||");
          if (!savedRouteKeys.has(routeKey)) continue;
          const effectivePrice = findEffectivePrice(data, {
            fromLocation: delivery.fromLocation,
            toLocation: delivery.toLocation,
            truckType: delivery.truckType,
            deliveryDate: delivery.deliveryDate
          });
          if (!effectivePrice) continue;
          const nextDriverPrice = toNumber(effectivePrice.truckSalaryUnitPrice);
          const nextDriverAmount = roundMoney(toNumber(delivery.qtyTon) * nextDriverPrice);
          if (
            nextDriverPrice !== toNumber(delivery.truckSalaryUnitPrice) ||
            nextDriverAmount !== toNumber(delivery.truckSalaryAmount)
          ) {
            delivery.truckSalaryUnitPrice = nextDriverPrice;
            delivery.truckSalaryAmount = nextDriverAmount;
            delivery.updatedAt = new Date().toISOString();
            recalculatedDeliveries += 1;
          }
        }
      }

      addActivity(
        data,
        `Bulk updated ${saved.length} ${truckTypeLabel(truckType)} ${priceType} price row${saved.length > 1 ? "s" : ""}, effective ${effectiveDate}${recalculatedDeliveries ? `, recalculated ${recalculatedDeliveries} delivery row${recalculatedDeliveries > 1 ? "s" : ""}` : ""}.`,
        "price"
      );
      return { added, updated, total: saved.length, recalculatedDeliveries };
    });
    return sendJson(res, 200, result);
  }

  if (req.method === "POST" && url.pathname === "/api/prices/delete-nonstandard-format") {
    const result = await updateData(async (data) => {
      await createBackup(data, "before-delete-nonstandard-format");
      const before = data.prices.length;
      data.prices = data.prices.filter((p) => /^\s*(KH\.|D\.)/i.test(p.toLocation));
      const deleted = before - data.prices.length;
      if (deleted > 0) addActivity(data, `Deleted ${deleted} price entries with non-standard location format (not starting with KH. or D.).`, "setup");
      return { deleted };
    });
    return sendJson(res, 200, result);
  }

  if (req.method === "POST" && url.pathname === "/api/prices/delete-by-date") {
    const body = await readBody(req);
    const result = await updateData(async (data) => {
      const truckType = normalizeText(body.truckType);
      const effectiveDate = normalizeText(body.effectiveDate);
      if (!truckType) throw new Error("Truck type is required.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) throw new Error("Effective date is required.");
      await createBackup(data, "before-delete-by-date");
      let deleted = 0;
      for (const p of data.prices) {
        if (p.truckType === truckType && effectiveDateOf(p) === effectiveDate && p.active !== false) {
          p.active = false;
          p.updatedAt = new Date().toISOString();
          deleted++;
        }
      }
      if (deleted > 0) addActivity(data, `Deactivated ${deleted} ${truckType} price entries for effective date ${effectiveDate} (locations preserved).`, "setup");
      return { deleted };
    });
    return sendJson(res, 200, result);
  }

  if (req.method === "POST" && url.pathname === "/api/prices/normalize-location-spacing") {
    const result = await updateData((data) => {
      let fixedPrices = 0;
      let fixedDeliveries = 0;
      for (const price of data.prices) {
        const normalized = normalizeLocationName(price.toLocation);
        if (normalized !== price.toLocation) {
          price.toLocation = normalized;
          price.updatedAt = new Date().toISOString();
          fixedPrices++;
        }
      }
      for (const delivery of data.deliveries) {
        const normalized = normalizeLocationName(delivery.toLocation);
        if (normalized !== delivery.toLocation) {
          delivery.toLocation = normalized;
          delivery.updatedAt = new Date().toISOString();
          fixedDeliveries++;
        }
      }
      if (fixedPrices > 0 || fixedDeliveries > 0) {
        addActivity(data, `Normalized location spacing: fixed ${fixedPrices} price entries and ${fixedDeliveries} deliveries.`, "setup");
      }
      return { fixedPrices, fixedDeliveries };
    });
    return sendJson(res, 200, result);
  }

  if (req.method === "DELETE" && url.pathname === "/api/prices") {
    requireAdmin();
    const result = await updateData(async (data) => {
      await createBackup(data, "before-clear-prices");
      const deletedCount = data.prices.length;
      data.prices = [];
      addActivity(data, `Cleared ${deletedCount} location price records.`, "setup");
      return { ok: true, deletedCount };
    });
    return sendJson(res, 200, result);
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/prices/")) {
    requireAdmin();
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const result = await updateData((data) => {
      const price = data.prices.find((item) => item.id === id);
      if (!price) throw new Error("Price not found.");
      const hasDeliveryHistory = data.deliveries.some(
        (delivery) =>
          delivery.fromLocation === price.fromLocation &&
          delivery.toLocation === price.toLocation &&
          delivery.truckType === price.truckType &&
          delivery.deliveryDate >= effectiveDateOf(price)
      );
      if (hasDeliveryHistory) {
        price.active = false;
        addActivity(data, `Deactivated ${truckTypeLabel(price.truckType)} price for ${price.toLocation}, effective ${effectiveDateOf(price)}, because it may be used by delivery history.`, "price");
        return { ok: true, action: "deactivated" };
      }
      data.prices = data.prices.filter((item) => item.id !== id);
      addActivity(data, `Deleted unused ${truckTypeLabel(price.truckType)} price for ${price.toLocation}, effective ${effectiveDateOf(price)}.`, "price");
      return { ok: true, action: "deleted" };
    });
    return sendJson(res, 200, result);
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

  if (req.method === "POST" && url.pathname === "/api/deliveries/clear-highlights") {
    const { statementId } = await readBody(req);
    if (!statementId) throw new Error("statementId is required.");
    await updateData((data) => {
      for (const delivery of data.deliveries) {
        if (delivery.statementId === statementId) delivery.highlighted = false;
      }
    });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/deliveries/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop());
    await updateData((data) => {
      const delivery = data.deliveries.find((item) => item.id === id);
      if (!delivery) throw new Error("Delivery row not found.");
      const statement = data.statements.find((item) => item.id === delivery.statementId);
      if (!statement) throw new Error("Statement not found.");
      if (statement.status !== "Draft") throw new Error("Reopen this statement before deleting delivery rows.");
      data.deliveries = data.deliveries.filter((item) => item.id !== id);
      return { ok: true };
    });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/api/export/monthly-bundle") {
    const month = normalizeText(query.month) || currentLocalDate().slice(0, 7);
    const monthStart = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const monthEnd = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
    const monthStmts = data.statements.filter((s) => s.month === month);
    const monthDeliveries = data.deliveries.filter((d) => d.deliveryDate >= monthStart && d.deliveryDate <= monthEnd);
    const label = monthLabel(month);
    const companyName = data.settings.companyName || "N&M LOGISTIC";
    const safeMonth = numericMonthFilePart(month);

    // ── Excel workbook ──────────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = companyName;
    wb.created = new Date();

    const thinBorder = {
      top: { style: "thin", color: { argb: "FF333333" } },
      left: { style: "thin", color: { argb: "FF333333" } },
      bottom: { style: "thin", color: { argb: "FF333333" } },
      right: { style: "thin", color: { argb: "FF333333" } }
    };
    const baseFont = { name: "Arial", size: 10 };
    const boldFont = { name: "Arial", size: 10, bold: true };
    const titleFont = { name: "Arial", size: 14, bold: true };
    const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    const headerFont = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    const subFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };

    // Sheet 1: Dashboard
    const dash = wb.addWorksheet("Dashboard");
    dash.columns = [
      { key: "a", width: 30 }, { key: "b", width: 20 },
      { key: "c", width: 30 }, { key: "d", width: 20 }
    ];
    const totalRevenue = monthDeliveries.reduce((s, d) => s + toNumber(d.companyTotalAmount), 0);
    const totalDriver = monthDeliveries.reduce((s, d) => s + toNumber(d.truckSalaryAmount), 0);
    const totalQty = monthDeliveries.reduce((s, d) => s + toNumber(d.qtyTon), 0);
    const margin = totalRevenue - totalDriver;
    const outstanding = monthStmts.filter((s) => !data.paymentMonths.find((pm) => pm.month === s.paymentMonth && pm.received));
    const outstandingAmt = outstanding.reduce((s, st) => {
      const rows = monthDeliveries.filter((d) => d.statementId === st.id);
      return s + rows.reduce((rs, d) => rs + toNumber(d.companyTotalAmount), 0);
    }, 0);
    const activeTrucks = new Set(monthDeliveries.map((d) => d.truckNo)).size;

    const setCell = (ws, row, col, value, options = {}) => {
      const cell = ws.getCell(row, col);
      cell.value = value;
      if (options.font) cell.font = options.font;
      if (options.fill) cell.fill = options.fill;
      if (options.alignment) cell.alignment = options.alignment;
      if (options.border) cell.border = options.border;
      return cell;
    };

    dash.mergeCells("A1:D1");
    setCell(dash, 1, 1, companyName, { font: titleFont, alignment: { horizontal: "center", vertical: "middle" } });
    dash.getRow(1).height = 28;
    dash.mergeCells("A2:D2");
    setCell(dash, 2, 1, `Monthly Summary Report — ${label}`, { font: boldFont, alignment: { horizontal: "center", vertical: "middle" } });
    dash.getRow(2).height = 20;

    const kpis = [
      ["Total Revenue", `$ ${money(totalRevenue)}`, "Total Driver Salary", `$ ${money(totalDriver)}`],
      ["Gross Margin", `$ ${money(margin)}`, "Total Tonnage", `${totalQty.toFixed(3)} T`],
      ["Total Statements", String(monthStmts.length), "Total Deliveries", String(monthDeliveries.length)],
      ["Active Trucks", String(activeTrucks), "Outstanding Payments", `${outstanding.length} stmt / $ ${money(outstandingAmt)}`],
    ];
    dash.getRow(3).height = 8;
    kpis.forEach((row, i) => {
      const r = i + 4;
      dash.getRow(r).height = 22;
      [1, 3].forEach((col, j) => {
        setCell(dash, r, col, row[j * 2], { font: boldFont, fill: subFill, border: thinBorder, alignment: { vertical: "middle" } });
        setCell(dash, r, col + 1, row[j * 2 + 1], { font: baseFont, border: thinBorder, alignment: { vertical: "middle" } });
      });
    });

    // Sheet 2: Statements
    const stSheet = wb.addWorksheet("Statements");
    stSheet.columns = [
      { key: "no", width: 6 }, { key: "stNo", width: 14 }, { key: "date", width: 14 },
      { key: "type", width: 16 }, { key: "status", width: 14 }, { key: "payMonth", width: 14 },
      { key: "paid", width: 12 }, { key: "amount", width: 16 }
    ];
    const stHeaders = ["No", "Stmt No", "Date", "Truck Type", "Status", "Payment Month", "Paid", "Total Amount"];
    stSheet.getRow(1).values = stHeaders;
    stSheet.getRow(1).height = 20;
    for (let c = 1; c <= stHeaders.length; c++) {
      const cell = stSheet.getCell(1, c);
      cell.font = headerFont; cell.fill = headerFill;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = thinBorder;
    }
    monthStmts.forEach((s, i) => {
      const r = i + 2;
      stSheet.getRow(r).height = 18;
      const totalAmt = monthDeliveries.filter((d) => d.statementId === s.id).reduce((sum, d) => sum + toNumber(d.companyTotalAmount), 0);
      const isPaid = data.paymentMonths.find((pm) => pm.month === s.paymentMonth && pm.received);
      const vals = [i + 1, s.statementNumber, formatShortDate(s.statementDate), truckTypeLabel(s.truckType), s.status || "", s.paymentMonth || "", isPaid ? "Yes" : "No", `$ ${money(totalAmt)}`];
      vals.forEach((v, ci) => {
        const cell = stSheet.getCell(r, ci + 1);
        cell.value = v; cell.font = baseFont; cell.border = thinBorder;
        cell.alignment = { horizontal: ci === 0 ? "center" : "left", vertical: "middle" };
        if (i % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      });
    });

    // Sheet 3: Deliveries
    const dlSheet = wb.addWorksheet("Deliveries");
    dlSheet.columns = [
      { key: "no", width: 5 }, { key: "date", width: 13 }, { key: "inv", width: 13 },
      { key: "truck", width: 10 }, { key: "type", width: 12 }, { key: "from", width: 14 },
      { key: "to", width: 22 }, { key: "qty", width: 12 }, { key: "cUp", width: 11 },
      { key: "cTot", width: 13 }, { key: "dUp", width: 11 }, { key: "dTot", width: 13 }
    ];
    const dlHeaders = ["No", "Date", "Invoice No", "Truck", "Type", "From", "To", "QTY(T)", "Co. Price", "Co. Total", "Dr. Price", "Dr. Total"];
    dlSheet.getRow(1).values = dlHeaders;
    dlSheet.getRow(1).height = 20;
    for (let c = 1; c <= dlHeaders.length; c++) {
      const cell = dlSheet.getCell(1, c);
      cell.font = headerFont; cell.fill = headerFill;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = thinBorder;
    }
    const sortedDeliveries = [...monthDeliveries].sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
    sortedDeliveries.forEach((d, i) => {
      const r = i + 2;
      dlSheet.getRow(r).height = 18;
      const vals = [i + 1, formatShortDate(d.deliveryDate), d.invoiceNo, d.truckNo, truckTypeLabel(d.truckType), d.fromLocation, d.toLocation,
        Number(d.qtyTon || 0).toFixed(5), `$ ${unitMoney(d.companyUnitPrice)}`, `$ ${money(d.companyTotalAmount)}`,
        `$ ${unitMoney(d.truckSalaryUnitPrice)}`, `$ ${money(d.truckSalaryAmount)}`];
      vals.forEach((v, ci) => {
        const cell = dlSheet.getCell(r, ci + 1);
        cell.value = v; cell.font = baseFont; cell.border = thinBorder;
        cell.alignment = { horizontal: ci === 0 || ci === 7 || ci === 8 || ci === 9 || ci === 10 || ci === 11 ? "right" : "left", vertical: "middle" };
        if (i % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      });
    });

    const xlsBuffer = Buffer.from(await wb.xlsx.writeBuffer());

    // ── PDF ─────────────────────────────────────────────────────────────────
    const W = PDF_PAGE_WIDTH;
    const H = PDF_PAGE_HEIGHT;
    const M = 30;
    const TW = W - M * 2;

    // Page 1: Summary dashboard
    const summaryCommands = [];
    summaryCommands.push(drawRect(M, H - 60, TW, 50, [0.06, 0.09, 0.16]));
    summaryCommands.push(drawText(companyName, M + 8, H - 26, { size: 16, bold: true, color: [1, 1, 1], width: TW - 16 }));
    summaryCommands.push(drawText(`Monthly Summary Report — ${label}`, M + 8, H - 44, { size: 9, color: [0.7, 0.75, 0.85], width: TW - 16 }));

    const kpiDefs = [
      { label: "Total Revenue", value: `$ ${money(totalRevenue)}`, fill: [0.94, 0.99, 0.97] },
      { label: "Total Driver Salary", value: `$ ${money(totalDriver)}`, fill: [1, 0.97, 0.93] },
      { label: "Gross Margin", value: `$ ${money(margin)}`, fill: margin >= 0 ? [0.94, 0.99, 0.97] : [1, 0.94, 0.94] },
      { label: "Total Tonnage", value: `${totalQty.toFixed(3)} T`, fill: [0.97, 0.97, 1] },
      { label: "Statements", value: String(monthStmts.length), fill: [0.97, 0.98, 0.99] },
      { label: "Deliveries", value: String(monthDeliveries.length), fill: [0.97, 0.98, 0.99] },
      { label: "Active Trucks", value: String(activeTrucks), fill: [0.97, 0.98, 0.99] },
      { label: "Outstanding", value: `${outstanding.length} / $ ${money(outstandingAmt)}`, fill: outstanding.length > 0 ? [1, 0.94, 0.94] : [0.94, 0.99, 0.97] },
    ];
    const cardW = (TW - 10) / 4;
    const cardH = 60;
    kpiDefs.forEach((kpi, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const cx = M + col * (cardW + 3.3);
      const cy = H - 90 - row * (cardH + 8) - cardH;
      summaryCommands.push(drawRect(cx, cy, cardW, cardH, kpi.fill, [0.85, 0.88, 0.92]));
      summaryCommands.push(drawText(kpi.label, cx + 6, cy + cardH - 14, { size: 7, bold: true, color: [0.39, 0.46, 0.56], width: cardW - 12 }));
      summaryCommands.push(drawText(kpi.value, cx + 6, cy + 14, { size: 13, bold: true, width: cardW - 12 }));
    });
    const pdfPages = [{ commands: summaryCommands, width: W, height: H }];

    // Statements table pages
    const stPdf = tablePdf({
      title: `${label} — Statements`,
      subtitle: `${companyName} | ${monthStmts.length} statements`,
      columns: [
        { key: "no", label: "No", width: 30, align: "center" },
        { key: "stNo", label: "Stmt No", width: 60, align: "center" },
        { key: "date", label: "Date", width: 80 },
        { key: "type", label: "Type", width: 80 },
        { key: "status", label: "Status", width: 70 },
        { key: "payMonth", label: "Pay Month", width: 80 },
        { key: "paid", label: "Paid", width: 50, align: "center" },
        { key: "amount", label: "Total Amount", width: 95, align: "right", bold: true },
      ],
      rows: monthStmts.map((s, i) => {
        const totalAmt = monthDeliveries.filter((d) => d.statementId === s.id).reduce((sum, d) => sum + toNumber(d.companyTotalAmount), 0);
        const isPaid = data.paymentMonths.find((pm) => pm.month === s.paymentMonth && pm.received);
        return { no: i + 1, stNo: s.statementNumber, date: formatShortDate(s.statementDate), type: truckTypeLabel(s.truckType), status: s.status || "", payMonth: s.paymentMonth || "-", paid: isPaid ? "Yes" : "No", amount: `$ ${money(totalAmt)}` };
      }),
      totals: { amount: `$ ${money(monthStmts.reduce((sum, s) => sum + monthDeliveries.filter((d) => d.statementId === s.id).reduce((rs, d) => rs + toNumber(d.companyTotalAmount), 0), 0))}` },
      totalsLabel: "Total",
    });

    // Deliveries table pages
    const dlPdf = tablePdf({
      title: `${label} — Deliveries`,
      subtitle: `${companyName} | ${monthDeliveries.length} delivery rows`,
      columns: [
        { key: "no", label: "No", width: 26, align: "center" },
        { key: "date", label: "Date", width: 60 },
        { key: "inv", label: "Invoice", width: 74 },
        { key: "truck", label: "Truck", width: 55 },
        { key: "type", label: "Type", width: 55 },
        { key: "to", label: "To Location", width: 120 },
        { key: "qty", label: "QTY(T)", width: 68, align: "right" },
        { key: "cUp", label: "Co. Price", width: 60, align: "right" },
        { key: "cTot", label: "Co. Total", width: 66, align: "right", bold: true },
        { key: "dUp", label: "Dr. Price", width: 60, align: "right" },
        { key: "dTot", label: "Dr. Total", width: 66, align: "right" },
      ],
      rows: sortedDeliveries.map((d, i) => ({
        no: i + 1, date: formatShortDate(d.deliveryDate), inv: d.invoiceNo,
        truck: d.truckNo, type: truckTypeLabel(d.truckType), to: d.toLocation,
        qty: `${Number(d.qtyTon || 0).toFixed(3)}T`,
        cUp: `$ ${unitMoney(d.companyUnitPrice)}`, cTot: `$ ${money(d.companyTotalAmount)}`,
        dUp: `$ ${unitMoney(d.truckSalaryUnitPrice)}`, dTot: `$ ${money(d.truckSalaryAmount)}`,
      })),
      totals: { qty: `${totalQty.toFixed(3)}T`, cTot: `$ ${money(totalRevenue)}`, dTot: `$ ${money(totalDriver)}` },
      totalsLabel: "Total",
    });

    const summaryPdfBuf = buildPdf(pdfPages);

    // ── Signature image (shared across all per-statement exports) ────────────
    const sigPath = path.join(__dirname, "signature.jpg");
    let sigBuffer = null;
    if (existsSync(sigPath)) {
      const raw = await readFile(sigPath);
      const info = readJpegInfo(raw);
      if (info) sigBuffer = { buffer: raw, width: info.width, height: info.height, components: info.components };
    }

    // ── Per-statement files ──────────────────────────────────────────────────
    const stmtFiles = [];
    for (const stmt of monthStmts) {
      const stRows = data.deliveries.filter((d) => d.statementId === stmt.id);
      if (stRows.length === 0) continue;
      const stName = `st-${stmt.statementNumber}-${safeMonth}`;
      const [stXls, stPdfBuf] = await Promise.all([
        accountingWorkbook(data, stRows, sigBuffer?.buffer),
        Promise.resolve(statementPdf(data, stRows, sigBuffer)),
      ]);
      stmtFiles.push({ name: `statements/${stName}.xlsx`, data: stXls });
      stmtFiles.push({ name: `statements/${stName}.pdf`, data: stPdfBuf });
    }

    const zipBuf = buildZip([
      { name: `nm-logistic-${safeMonth}.xlsx`, data: xlsBuffer },
      { name: `nm-logistic-${safeMonth}-summary.pdf`, data: summaryPdfBuf },
      { name: `nm-logistic-${safeMonth}-statements.pdf`, data: stPdf },
      { name: `nm-logistic-${safeMonth}-deliveries.pdf`, data: dlPdf },
      ...stmtFiles,
    ]);

    const zipName = `nm-logistic-summary-${safeMonth}.zip`;
    res.writeHead(200, {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipName}"`
    });
    return res.end(zipBuf);
  }

  if (req.method === "GET" && url.pathname === "/api/export/accounting") {
    const rows = filteredDeliveries(data, query);
    const format = normalizeText(query.format || "xls");
    if (query.statementId && rows.length > 30) {
      throw new Error("A statement export cannot contain more than 30 rows.");
    }
    if (!query.truckType && new Set(rows.map((row) => row.truckType)).size > 1) {
      throw new Error("Please export Crane and No Crane accounting reports separately.");
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
    const fileName = statementExportFileName(statement, rows);
    const sigPath = path.join(__dirname, "signature.jpg");
    let sigBuffer = null;
    if (existsSync(sigPath)) {
      const raw = await readFile(sigPath);
      const info = readJpegInfo(raw);
      if (info) sigBuffer = { buffer: raw, width: info.width, height: info.height, components: info.components };
    }
    if (format === "pdf") {
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}.pdf"`
      });
      return res.end(statementPdf(data, rows, sigBuffer));
    }
    const workbookBuffer = await accountingWorkbook(data, rows, sigBuffer?.buffer);
    res.writeHead(200, {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}.xlsx"`
    });
    return res.end(workbookBuffer);
  }

  if (req.method === "POST" && url.pathname === "/api/truck-deductions") {
    const { truckNo, month, loanDeduction, garageFee } = await readBody(req);
    if (!truckNo || !month) throw new Error("truckNo and month are required.");
    await updateData((data) => {
      data.truckDeductions ||= [];
      const index = data.truckDeductions.findIndex((d) => d.truckNo === truckNo && d.month === month);
      const record = { truckNo, month, loanDeduction: toNumber(loanDeduction), garageFee: toNumber(garageFee) };
      if (index >= 0) data.truckDeductions[index] = record;
      else data.truckDeductions.push(record);
    });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/api/export/salary") {
    requireAdmin();
    const rows = filteredDeliveries(data, query);
    if (!query.truckType && !query.truckNo && new Set(rows.map((row) => row.truckType)).size > 1) {
      throw new Error("Please export Crane and No Crane salary reports separately, or select one truck.");
    }
    const format = normalizeText(query.format || "xls");
    const loanDeduction = toNumber(query.loanDeduction);
    const garageFee = toNumber(query.garageFee);
    const truckTypeName = query.truckNo || query.truckType || rows[0]?.truckType || "all";
    const fileName = `driver-payment-${slug(truckTypeName)}-${slug(monthLabel(query.month || rows[0]?.deliveryDate?.slice(0, 7)))}`;
    if (format === "pdf") {
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}.pdf"`
      });
      return res.end(salaryPdf(data, rows, query, loanDeduction, garageFee));
    }
    res.writeHead(200, {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}.xls"`
    });
    return res.end(salaryExport(data, rows, query, loanDeduction, garageFee));
  }

  if (req.method === "GET" && url.pathname === "/api/export/dashboard") {
    const month = normalizeText(query.month);
    const format = normalizeText(query.format || "xls");
    const rows = monthlyTruckPerformance(data, month);
    const fileName = `truck-performance-${slug(month || "all")}`;
    if (format === "pdf") {
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}.pdf"`
      });
      return res.end(dashboardPdf(rows, month));
    }
    res.writeHead(200, {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}.xls"`
    });
    return res.end(dashboardExport(rows, month));
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
    if (url.pathname === "/api/health") return sendJson(res, 200, { ok: true });
    if (url.pathname === "/api/logo") {
      const logoPath = path.join(__dirname, "logo.jpg");
      if (existsSync(logoPath)) {
        const buffer = await readFile(logoPath);
        const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
        const contentType = isPng ? "image/png" : "image/jpeg";
        res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "public, max-age=3600" });
        return res.end(buffer);
      }
      res.writeHead(404);
      return res.end();
    }
    // Serve static files without auth — React app must load to show login page
    if (!url.pathname.startsWith("/api/")) return await staticFile(req, res, url);

    // Login endpoint — public, no auth required
    if (req.method === "POST" && url.pathname === "/api/auth/login") {
      const body = await readBody(req);
      const ip = getClientIp(req);
      if (isRateLimited(ip)) {
        res.writeHead(429, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ error: "Too many failed attempts. Try again in 15 minutes." }));
      }
      if (!isAuthEnabled()) {
        return sendJson(res, 200, { token: "no-auth", role: "admin" });
      }
      // Check admin (env vars)
      if (safeEqual(body.username || "", appUsername) && safeEqual(body.password || "", appPassword)) {
        loginAttempts.delete(ip);
        return sendJson(res, 200, { token: createSession("admin"), role: "admin" });
      }
      // Check staff users in database
      const db = getDb();
      const dbUser = db.prepare("SELECT id, passwordHash, role FROM users WHERE username = ?").get(String(body.username || ""));
      if (dbUser && await verifyPassword(body.password || "", dbUser.passwordHash)) {
        loginAttempts.delete(ip);
        return sendJson(res, 200, { token: createSession(dbUser.role), role: dbUser.role });
      }
      recordFailedLogin(ip);
      res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ error: "Incorrect username or password." }));
    }

    // Logout endpoint — invalidates session token
    if (req.method === "POST" && url.pathname === "/api/auth/logout") {
      const header = req.headers.authorization || "";
      if (header.startsWith("Bearer ")) sessions.delete(header.slice(7));
      return sendJson(res, 200, { ok: true });
    }

    const role = getAuthorizedRole(req);
    if (!role) return requestAuth(res);
    return await api(req, res, url, role);
  } catch (error) {
    const status = error.status || 400;
    return sendJson(res, status, { error: error.message || "Unexpected error." });
  }
});

server.listen(port, host, () => {
  console.log(`Truck Delivery System running at http://${host}:${port}`);
  console.log(`Data directory: ${dataDir}`);
  if (!isAuthEnabled()) console.log("Warning: APP_USERNAME and APP_PASSWORD are not set. Login is disabled.");
});
