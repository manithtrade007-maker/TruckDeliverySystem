import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { resolveGarageFee } from "../lib/garage-fees.js";
import { salaryPdf, salaryWorkbook } from "../lib/exports.js";

test("fixed garage fees apply from September 2026 and override the submitted value", () => {
  assert.equal(resolveGarageFee("3F-5239", "2026-09", 0), 136.5);
  assert.equal(resolveGarageFee("3B-4693", "2026-10", ""), 136.5);
  assert.equal(resolveGarageFee("3E-0096", "2027-01", 5), 91);
  assert.equal(resolveGarageFee("3E-5987", "2026-09", undefined), 91);
  assert.equal(resolveGarageFee("3F-6390", "2026-09", 0), 45.5);
});

test("earlier months and other trucks keep the stored garage fee", () => {
  assert.equal(resolveGarageFee("3F-5239", "2026-08", 10), 10);
  assert.equal(resolveGarageFee("3G-0397", "2026-09", 20), 20);
  assert.equal(resolveGarageFee("3G-0397", "2026-09", ""), 0);
});

test("salary Excel and PDF deduct the fixed garage fee from net pay", async () => {
  const data = { settings: { companyName: "N&M LOGISTIC" }, trucks: [{ truckNo: "3F-5239", truckType: "With Crane" }] };
  const rows = [{ deliveryDate: "2026-09-10", invoiceNo: "1001", truckNo: "3F-5239", truckType: "With Crane",
    fromLocation: "Warehouse-09", toLocation: "Ang Snuol (Kandal)", qtyTon: 20, truckSalaryUnitPrice: 11.07, truckSalaryAmount: 221.4 }];
  const query = { month: "2026-09", truckNo: "3F-5239" };
  const garageFee = resolveGarageFee("3F-5239", "2026-09", 0);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await salaryWorkbook(data, rows, query, 10, garageFee));
  const cells = [];
  workbook.worksheets[0].eachRow((row) => cells.push([row.getCell(1).value, row.getCell(8).value]));
  assert.equal(cells.find(([label]) => label === "ថ្លៃហ្គារ៉ាស")[1], 136.5);
  assert.equal(cells.find(([label]) => label === "ប្រាក់ត្រូវទូទាត់")[1].result, 74.9);

  const pdf = salaryPdf(data, rows, query, 10, garageFee).toString("latin1");
  assert.match(pdf, /\(Garage Fee\)/);
  assert.match(pdf, /\(\$ 136\.50\)/);
  assert.match(pdf, /\(\$ 74\.90\)/);
});
