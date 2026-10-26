import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { locationReport } from "../lib/location-report.js";
import { locationReportWorkbook } from "../lib/location-report-export.js";

const rows = [
  { deliveryDate: "2026-10-01", truckNo: "T1", toLocation: "Phnom Penh", qtyTon: 1.12345 },
  { deliveryDate: "2026-10-02", truckNo: "T1", toLocation: " phnom  penh ", qtyTon: 2 },
  { deliveryDate: "2026-10-03", truckNo: "T2", toLocation: "Phnom Penh", qtyTon: 3 },
  { deliveryDate: "2026-10-04", truckNo: "T1", toLocation: "កំពត", qtyTon: 4 },
  { deliveryDate: "2026-09-30", truckNo: "T3", toLocation: "Other", qtyTon: 50 },
];
test("monthly destinations distinguish unique trucks from repeated trips", () => {
  const r = locationReport(rows, "2026-10");
  assert.equal(r.locations.length, 2);
  assert.equal(r.trucks.length, 2);
  assert.equal(r.trips, 4);
  assert.equal(r.tons, 10.12345);
  assert.equal(r.locations[0].trucks, 2);
  assert.equal(r.locations[0].trips, 3);
  assert.equal(r.trucks[0].locations, 2);
});
test("Khmer destinations and meaningful qualifiers remain distinct", () => {
  const names = ["កំពត", "កំពង់ចាម", "Depot (North)", "Depot (South)"];
  assert.equal(locationReport(names.map(toLocation => ({ deliveryDate: "2026-10-01", toLocation })), "2026-10").locations.length, 4);
});
test("missing names are flagged without losing monthly trips or tonnage", () => {
  const r = locationReport([{ deliveryDate: "2026-10-01", qtyTon: 5 }], "2026-10");
  assert.equal(r.trips, 1);
  assert.equal(r.tons, 5);
  assert.equal(r.locations.length, 0);
  assert.equal(r.trucks.length, 0);
  assert.equal(r.missingLocations, 1);
  assert.equal(r.missingTrucks, 1);
  assert.equal(locationReport(rows, "2026-08").trips, 0);
  assert.throws(() => locationReport(rows, "2026-13"), /valid report month/);
});
test("Excel contains matching summaries and numeric delivery quantities", async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await locationReportWorkbook(rows, "2026-10"));
  assert.equal(workbook.getWorksheet("By Location").getCell("B2").value, 2);
  assert.equal(workbook.getWorksheet("By Location").getCell("C2").value, 3);
  assert.equal(workbook.getWorksheet("By Truck").getCell("B2").value, 2);
  assert.equal(workbook.getWorksheet("Deliveries").rowCount, 5);
  assert.equal(workbook.getWorksheet("Deliveries").getCell("E2").value, 1.12345);
});
