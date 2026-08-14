import assert from "node:assert/strict";
import test from "node:test";
import { buildMonthlyBundle } from "../lib/monthly-bundle.js";

const data = {
  settings: { companyName: "N&M LOGISTIC", defaultFromLocation: "GS01" },
  trucks: [{ truckNo: "T-01", truckType: "With Crane", driverName: "Driver One", active: true }],
  statements: [{ id: "s1", statementNumber: "1001", month: "2026-08", statementDate: "2026-08-31", truckType: "With Crane", status: "Finished", paymentMonth: "2026-09", companyTotalAmount: 100 }],
  deliveries: [{ id: "d1", statementId: "s1", deliveryDate: "2026-08-05", invoiceNo: "INV-1", truckNo: "T-01", truckType: "With Crane", driverName: "Driver One", fromLocation: "GS01", toLocation: "Kandal", qtyTon: 10, companyUnitPrice: 10, companyTotalAmount: 100, truckSalaryUnitPrice: 8, truckSalaryAmount: 80 }],
  prices: [{ id: "p1", effectiveDate: "2026-08-01", truckType: "With Crane", fromLocation: "GS01", toLocation: "Kandal", companyUnitPrice: 10, truckSalaryUnitPrice: 8 }],
  paymentMonths: [], truckDeductions: [], driverReportedPayments: [{ truckNo: "T-01", month: "2026-08", amount: 80 }]
};

test("monthly archive contains every agreed report section", async () => {
  const archive = await buildMonthlyBundle({ data, month: "2026-08" });
  assert.equal(archive.filename, "nm-logistic-monthly-archive-08-2026.zip");
  for (const expected of [
    "00-Archive-Manifest.pdf", "01-Dashboard/dashboard-08-2026.xlsx", "01-Dashboard/dashboard-08-2026.pdf",
    "02-Statements/statement-1001/statement-1001.xlsx", "02-Statements/statement-1001/statement-1001.pdf",
    "03-Driver-Reports/T-01-08-2026.xlsx", "03-Driver-Reports/T-01-08-2026.pdf",
    "03-Driver-Reports/driver-payment-summary-08-2026.xlsx", "03-Driver-Reports/driver-payment-summary-08-2026.pdf",
    "04-Payments/company-payments-08-2026.pdf", "05-Prices-Used/prices-used-08-2026.pdf",
    "06-Compare-Pay/compare-pay-08-2026.xlsx", "06-Compare-Pay/compare-pay-08-2026.pdf",
    "07-Monthly-Data/all-deliveries-08-2026.xlsx", "07-Monthly-Data/all-deliveries-08-2026.pdf"
  ]) assert.ok(archive.files.includes(expected), `missing ${expected}`);
  assert.ok(archive.buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])));
});

test("monthly archive rejects malformed months", async () => {
  await assert.rejects(() => buildMonthlyBundle({ data, month: "2026-13" }), /YYYY-MM/);
});
