import test from "node:test";
import assert from "node:assert/strict";
import { activityChartData } from "../lib/report-charts.js";
import { locationReport } from "../lib/location-report.js";
import { locationReportWorkbook } from "../lib/location-report-export.js";
import ExcelJS from "exceljs";
const rows = [
  { deliveryDate: "2025-12-01", toLocation: "A", qtyTon: 3 },
  { deliveryDate: "2026-02-01", toLocation: "A", qtyTon: 4 },
  { deliveryDate: "2026-02-02", toLocation: " a ", qtyTon: 2 },
];
test("monthly charts include empty months and scope location shares to the year", () => {
  const chart = activityChartData(rows, "tons", "month", "2026");
  assert.equal(chart.bars.length, 12);
  assert.equal(chart.bars[0].value, 0);
  assert.equal(chart.bars[1].value, 6);
  assert.equal(chart.shares.length, 1);
  assert.equal(chart.shares[0].value, 6);
  assert.deepEqual(activityChartData(rows, "trips", "year", "2026").bars, [{key: "2025", value: 1}, {key: "2026", value: 2}]);
});
test("top five plus Other preserves totals and missing locations", () => {
  const many = Array.from({length: 8}, (_, i) => ({deliveryDate: "2026-01-01", toLocation: i ? `Place ${i}` : "", qtyTon: i + 1}));
  const chart = activityChartData(many, "tons", "year", "2026");
  assert.equal(chart.shares.length, 6);
  assert.equal(chart.shares.at(-1).name, "Other");
  assert.equal(chart.shares.reduce((sum, item) => sum + item.value, 0), 36);
  assert.equal(activityChartData([], "trips", "year", "2026").bars.length, 0);
});
test("year drill-down and export contain only the chosen year", async () => {
  assert.equal(locationReport(rows, "all", "", {year: "2026"}).trips, 2);
  assert.throws(() => locationReport(rows, "all", "", {year: "bad"}), /valid report year/);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await locationReportWorkbook(rows, "all", "", {year: "2025"}));
  assert.equal(workbook.getWorksheet("Deliveries").rowCount, 2);
  assert.equal(workbook.getWorksheet("Deliveries").getCell("A2").value, "2025-12-01");
});
