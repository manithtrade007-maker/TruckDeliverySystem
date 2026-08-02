import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { salaryWorkbook } from "../lib/exports.js";

const data = {
  settings: { companyName: "N&M LOGISTIC" },
  trucks: [{ truckNo: "3G-0397", truckType: "With Crane", driverName: "Driver" }]
};

const rows = [
  {
    deliveryDate: "2026-07-01",
    invoiceNo: "8001095452",
    truckNo: "3G-0397",
    truckType: "With Crane",
    driverName: "Driver",
    fromLocation: "Warehouse-09",
    toLocation: "D.Samrong Torng",
    qtyTon: 2,
    truckSalaryUnitPrice: 3.5,
    truckSalaryAmount: 7
  },
  {
    deliveryDate: "2026-07-02",
    invoiceNo: "8001095453",
    truckNo: "3G-0397",
    truckType: "With Crane",
    driverName: "Driver",
    fromLocation: "Warehouse-09",
    toLocation: "D.Kandal Stueng",
    qtyTon: 1.234,
    truckSalaryUnitPrice: 4,
    truckSalaryAmount: 4.94
  }
];

async function loadSalarySheet(loanDeduction, garageFee) {
  const buffer = await salaryWorkbook(data, rows, { truckNo: "3G-0397", month: "2026-07" }, loanDeduction, garageFee);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook.getWorksheet("Driver Payment");
}

test("driver payment Excel calculates every Driver Amount from QTY and Driver Price", async () => {
  const sheet = await loadSalarySheet(10, 1.5);
  assert.deepEqual(sheet.getCell("H5").value, { formula: "ROUND(F5*G5,2)", result: 7 });
  assert.deepEqual(sheet.getCell("H6").value, { formula: "ROUND(F6*G6,2)", result: 4.94 });
});

test("driver payment Excel totals and Net Pay use formulas", async () => {
  const sheet = await loadSalarySheet(10, 1.5);
  assert.deepEqual(sheet.getCell("F7").value, { formula: "SUM(F5:F6)", result: 3.234 });
  assert.deepEqual(sheet.getCell("H7").value, { formula: "SUM(H5:H6)", result: 11.94 });
  assert.equal(sheet.getCell("H8").value, 10);
  assert.equal(sheet.getCell("H9").value, 1.5);
  assert.deepEqual(sheet.getCell("H10").value, { formula: "H7-H8-H9", result: 0.44 });
});

test("driver payment Excel keeps zero-value deduction rows editable", async () => {
  const sheet = await loadSalarySheet(0, 0);
  assert.equal(sheet.getCell("A8").value, "Loan Deduction");
  assert.equal(sheet.getCell("H8").value, 0);
  assert.equal(sheet.getCell("A9").value, "Garage Fee");
  assert.equal(sheet.getCell("H9").value, 0);
  assert.deepEqual(sheet.getCell("H10").value, { formula: "H7-H8-H9", result: 11.94 });
});
