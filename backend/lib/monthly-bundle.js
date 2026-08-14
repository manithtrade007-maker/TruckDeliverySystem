import ExcelJS from "exceljs";
import {
  accountingWorkbook, buildZip, dashboardPdf, formatDotDate, money, monthLabel,
  monthlyTruckPerformance, numericMonthFilePart, salaryPdf, salaryWorkbook,
  statementPdf, tablePdf, truckTypeLabel, unitMoney
} from "./exports.js";
import { effectiveDateOf, fromLocationMatchKey, locationBaseKey, toNumber } from "./calc.js";

function validMonth(value) {
  const month = String(value || "").trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw Object.assign(new Error("Month must use YYYY-MM format."), { status: 400 });
  }
  return month;
}

function paymentStatus(data, statement) {
  return Boolean(data.paymentMonths?.find((item) => item.month === statement.paymentMonth && item.received));
}

async function simpleWorkbook(companyName, sheets) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = companyName;
  workbook.created = new Date();
  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name.slice(0, 31));
    ws.columns = sheet.columns.map((column) => ({ key: column.key, header: column.label, width: column.width || 16 }));
    const header = ws.getRow(1);
    header.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    header.alignment = { vertical: "middle", horizontal: "center" };
    sheet.rows.forEach((row) => ws.addRow(row));
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function findUsedPrice(data, delivery) {
  return data.prices
    .filter((price) => price.truckType === delivery.truckType)
    .filter((price) => fromLocationMatchKey(price.fromLocation) === fromLocationMatchKey(delivery.fromLocation))
    .filter((price) => locationBaseKey(price.toLocation) === locationBaseKey(delivery.toLocation))
    .filter((price) => toNumber(price.companyUnitPrice) === toNumber(delivery.companyUnitPrice))
    .filter((price) => toNumber(price.truckSalaryUnitPrice) === toNumber(delivery.truckSalaryUnitPrice))
    .filter((price) => effectiveDateOf(price) <= delivery.deliveryDate)
    .sort((a, b) => effectiveDateOf(b).localeCompare(effectiveDateOf(a)))[0];
}

function usedPriceRows(data, deliveries) {
  const groups = new Map();
  for (const delivery of deliveries) {
    const price = findUsedPrice(data, delivery);
    const effectiveDate = price ? effectiveDateOf(price) : "Unknown";
    const key = [effectiveDate, delivery.truckType, delivery.fromLocation, delivery.toLocation,
      delivery.companyUnitPrice, delivery.truckSalaryUnitPrice].join("|");
    if (!groups.has(key)) groups.set(key, { effectiveDate, truckType: delivery.truckType, from: delivery.fromLocation,
      to: delivery.toLocation, companyPrice: delivery.companyUnitPrice, driverPrice: delivery.truckSalaryUnitPrice,
      deliveries: 0, qty: 0, statements: new Set() });
    const row = groups.get(key);
    row.deliveries += 1;
    row.qty += toNumber(delivery.qtyTon);
    row.statements.add(delivery.statementId);
  }
  return [...groups.values()].map((row) => ({ ...row, statements: row.statements.size }));
}

export async function buildMonthlyBundle({ data, month: inputMonth, signatureImage = null, readUploadedStatementPdf = null }) {
  const month = validMonth(inputMonth);
  const label = monthLabel(month);
  const safeMonth = numericMonthFilePart(month);
  const companyName = data.settings.companyName || "N&M LOGISTIC";
  const statements = data.statements.filter((statement) => statement.month === month)
    .sort((a, b) => Number(a.statementNumber) - Number(b.statementNumber));
  const deliveries = data.deliveries.filter((delivery) => delivery.deliveryDate?.slice(0, 7) === month)
    .sort((a, b) => String(a.deliveryDate).localeCompare(String(b.deliveryDate)) || String(a.invoiceNo).localeCompare(String(b.invoiceNo)));
  const performance = monthlyTruckPerformance(data, month).filter((truck) => truck.trips > 0);
  const totalRevenue = deliveries.reduce((sum, row) => sum + toNumber(row.companyTotalAmount), 0);
  const totalDriver = deliveries.reduce((sum, row) => sum + toNumber(row.truckSalaryAmount), 0);
  const totalQty = deliveries.reduce((sum, row) => sum + toNumber(row.qtyTon), 0);
  const outstanding = statements.filter((statement) => !paymentStatus(data, statement));
  const files = [];

  const dashboardColumns = [
    { key: "metric", label: "Metric", width: 28 }, { key: "value", label: "Value", width: 22 }
  ];
  const statementColumns = [
    { key: "number", label: "Statement", width: 14 }, { key: "date", label: "Date", width: 14 },
    { key: "type", label: "Type", width: 15 }, { key: "status", label: "Status", width: 14 },
    { key: "paymentMonth", label: "Payment Month", width: 16 }, { key: "paid", label: "Received", width: 12 },
    { key: "revenue", label: "Revenue", width: 16 }, { key: "driver", label: "Driver Pay", width: 16 }, { key: "profit", label: "Profit", width: 16 }
  ];
  const deliveryColumns = [
    { key: "date", label: "Date", width: 14 }, { key: "invoice", label: "Invoice", width: 16 },
    { key: "truck", label: "Truck", width: 12 }, { key: "type", label: "Type", width: 14 },
    { key: "from", label: "From", width: 18 }, { key: "to", label: "To", width: 24 },
    { key: "qty", label: "QTY(T)", width: 12 }, { key: "companyPrice", label: "Company Price", width: 15 },
    { key: "companyTotal", label: "Company Total", width: 15 }, { key: "driverPrice", label: "Driver Price", width: 15 },
    { key: "driverTotal", label: "Driver Total", width: 15 }
  ];
  const statementSummaryRows = statements.map((statement) => {
    const rows = deliveries.filter((delivery) => delivery.statementId === statement.id);
    const revenue = rows.reduce((sum, row) => sum + toNumber(row.companyTotalAmount), 0);
    const driver = rows.reduce((sum, row) => sum + toNumber(row.truckSalaryAmount), 0);
    return { number: statement.statementNumber, date: formatDotDate(statement.statementDate), type: truckTypeLabel(statement.truckType),
      status: statement.status || "", paymentMonth: statement.paymentMonth || "", paid: paymentStatus(data, statement) ? "Yes" : "No",
      revenue, driver, profit: revenue - driver };
  });
  const deliveryRows = deliveries.map((row) => ({ date: formatDotDate(row.deliveryDate), invoice: row.invoiceNo, truck: row.truckNo,
    type: truckTypeLabel(row.truckType), from: row.fromLocation, to: row.toLocation, qty: toNumber(row.qtyTon),
    companyPrice: toNumber(row.companyUnitPrice), companyTotal: toNumber(row.companyTotalAmount),
    driverPrice: toNumber(row.truckSalaryUnitPrice), driverTotal: toNumber(row.truckSalaryAmount) }));
  const dashboardXlsx = await simpleWorkbook(companyName, [
    { name: "Dashboard", columns: dashboardColumns, rows: [
      { metric: "Month", value: label }, { metric: "Company Revenue", value: totalRevenue },
      { metric: "Driver Payment", value: totalDriver }, { metric: "Profit", value: totalRevenue - totalDriver },
      { metric: "Margin", value: totalRevenue ? (totalRevenue - totalDriver) / totalRevenue : 0 },
      { metric: "Trips", value: deliveries.length }, { metric: "Tonnage", value: totalQty },
      { metric: "Statements", value: statements.length }, { metric: "Active Trucks", value: performance.length },
      { metric: "Outstanding Statements", value: outstanding.length }
    ] },
    { name: "Statements", columns: statementColumns, rows: statementSummaryRows },
    { name: "Deliveries", columns: deliveryColumns, rows: deliveryRows },
    { name: "Truck Performance", columns: [
      { key: "truckNo", label: "Truck" }, { key: "truckType", label: "Type" }, { key: "driverName", label: "Driver", width: 22 },
      { key: "workingDays", label: "Days" }, { key: "trips", label: "Trips" }, { key: "qtyTon", label: "QTY(T)" },
      { key: "companyAmount", label: "Revenue" }, { key: "driverAmount", label: "Driver Pay" }, { key: "profit", label: "Profit" }
    ], rows: performance.map((row) => ({ ...row, truckType: truckTypeLabel(row.truckType) })) }
  ]);
  files.push({ name: `01-Dashboard/dashboard-${safeMonth}.xlsx`, data: dashboardXlsx });
  files.push({ name: `01-Dashboard/dashboard-${safeMonth}.pdf`, data: tablePdf({
    title: `${companyName} Dashboard - ${label}`,
    subtitle: `Revenue $ ${money(totalRevenue)} | Driver $ ${money(totalDriver)} | Profit $ ${money(totalRevenue - totalDriver)} | ${deliveries.length} trips | ${totalQty.toFixed(3)}T | ${outstanding.length} outstanding`,
    columns: [{ key: "number", label: "Statement", width: 70 }, { key: "type", label: "Type", width: 80 },
      { key: "status", label: "Status", width: 70 }, { key: "revenue", label: "Revenue", width: 90, align: "right" },
      { key: "driver", label: "Driver Pay", width: 90, align: "right" }, { key: "profit", label: "Profit", width: 90, align: "right", bold: true }],
    rows: statementSummaryRows.map((row) => ({ ...row, revenue: `$ ${money(row.revenue)}`, driver: `$ ${money(row.driver)}`, profit: `$ ${money(row.profit)}` })),
    totals: { revenue: `$ ${money(totalRevenue)}`, driver: `$ ${money(totalDriver)}`, profit: `$ ${money(totalRevenue - totalDriver)}` }, totalsLabel: "Total"
  }) });
  files.push({ name: `01-Dashboard/truck-performance-${safeMonth}.pdf`, data: dashboardPdf(performance, month) });

  for (const statement of statements) {
    const rows = data.deliveries.filter((delivery) => delivery.statementId === statement.id);
    if (!rows.length) continue;
    const base = `02-Statements/statement-${statement.statementNumber}`;
    files.push({ name: `${base}/statement-${statement.statementNumber}.xlsx`, data: await accountingWorkbook(data, rows, signatureImage?.buffer) });
    files.push({ name: `${base}/statement-${statement.statementNumber}.pdf`, data: statementPdf(data, rows, signatureImage) });
    if (readUploadedStatementPdf) {
      const uploaded = await readUploadedStatementPdf(statement);
      if (uploaded) files.push({ name: `${base}/original-scan-${statement.statementNumber}.pdf`, data: uploaded });
    }
  }

  for (const truck of performance) {
    const rows = deliveries.filter((delivery) => delivery.truckNo === truck.truckNo);
    const deduction = data.truckDeductions?.find((item) => item.truckNo === truck.truckNo && item.month === month) || {};
    const query = { month, truckNo: truck.truckNo, truckType: truck.truckType };
    files.push({ name: `03-Driver-Reports/${truck.truckNo}-${safeMonth}.xlsx`, data: await salaryWorkbook(data, rows, query, toNumber(deduction.loanDeduction), toNumber(deduction.garageFee)) });
    files.push({ name: `03-Driver-Reports/${truck.truckNo}-${safeMonth}.pdf`, data: salaryPdf(data, rows, query, toNumber(deduction.loanDeduction), toNumber(deduction.garageFee)) });
  }

  const driverSummaryRows = performance.map((truck) => {
    const deduction = data.truckDeductions?.find((item) => item.truckNo === truck.truckNo && item.month === month) || {};
    const deductions = toNumber(deduction.loanDeduction) + toNumber(deduction.garageFee);
    return { truck: truck.truckNo, driver: truck.driverName || "-", type: truckTypeLabel(truck.truckType), trips: truck.trips,
      qty: truck.qtyTon, gross: truck.driverAmount, deductions, net: truck.driverAmount - deductions };
  });
  files.push({ name: `03-Driver-Reports/driver-payment-summary-${safeMonth}.xlsx`, data: await simpleWorkbook(companyName, [{ name: "Driver Payment Summary", columns: [
    { key: "truck", label: "Truck" }, { key: "driver", label: "Driver", width: 22 }, { key: "type", label: "Type" },
    { key: "trips", label: "Trips" }, { key: "qty", label: "QTY(T)" }, { key: "gross", label: "Gross Pay" },
    { key: "deductions", label: "Deductions" }, { key: "net", label: "Net Pay" }
  ], rows: driverSummaryRows }]) });
  files.push({ name: `03-Driver-Reports/driver-payment-summary-${safeMonth}.pdf`, data: tablePdf({ title: `Driver Payment Summary - ${label}`, subtitle: `${performance.length} active trucks`,
    columns: [{ key: "truck", label: "Truck", width: 60 }, { key: "driver", label: "Driver", width: 100 }, { key: "type", label: "Type", width: 70 },
      { key: "trips", label: "Trips", width: 45, align: "center" }, { key: "qty", label: "QTY(T)", width: 70, align: "right" },
      { key: "gross", label: "Gross", width: 75, align: "right" }, { key: "deductions", label: "Deductions", width: 75, align: "right" },
      { key: "net", label: "Net Pay", width: 75, align: "right", bold: true }],
    rows: driverSummaryRows.map((row) => ({ ...row, qty: `${row.qty.toFixed(3)}T`, gross: `$ ${money(row.gross)}`, deductions: `$ ${money(row.deductions)}`, net: `$ ${money(row.net)}` }))
  }) });

  const assigned = data.statements.filter((statement) => statement.paymentMonth === month);
  const allOutstanding = data.statements.filter((statement) => statement.paymentMonth && !paymentStatus(data, statement));
  const paymentRows = [
    ...statements.map((statement) => ({ category: "Created this month", statement })),
    ...assigned.map((statement) => ({ category: "Due this month", statement })),
    ...allOutstanding.map((statement) => ({ category: "Outstanding snapshot", statement }))
  ];
  files.push({ name: `04-Payments/company-payments-${safeMonth}.pdf`, data: tablePdf({
    title: `Company Payments - ${label}`, subtitle: `Created: ${statements.length} | Due: ${assigned.length} | Outstanding now: ${allOutstanding.length}`,
    columns: [{ key: "category", label: "Section", width: 110 }, { key: "number", label: "Statement", width: 75 }, { key: "statementMonth", label: "Statement Month", width: 100 },
      { key: "paymentMonth", label: "Payment Month", width: 110 }, { key: "status", label: "Status", width: 90 },
      { key: "amount", label: "Amount", width: 110, align: "right", bold: true }],
    rows: paymentRows.map(({ category, statement }) => ({ category, number: statement.statementNumber, statementMonth: statement.month,
      paymentMonth: statement.paymentMonth, status: paymentStatus(data, statement) ? "Received" : "Outstanding",
      amount: `$ ${money(statement.companyTotalAmount)}` }))
  }) });

  const prices = usedPriceRows(data, deliveries);
  files.push({ name: `05-Prices-Used/prices-used-${safeMonth}.pdf`, data: tablePdf({
    title: `Prices Used - ${label}`, subtitle: `${prices.length} distinct price applications across ${deliveries.length} deliveries`,
    columns: [{ key: "effective", label: "Effective", width: 70 }, { key: "type", label: "Type", width: 65 },
      { key: "from", label: "From", width: 90 }, { key: "to", label: "To", width: 130 },
      { key: "company", label: "Company", width: 65, align: "right" }, { key: "driver", label: "Driver", width: 65, align: "right" },
      { key: "deliveries", label: "Trips", width: 45, align: "center" }, { key: "qty", label: "QTY(T)", width: 65, align: "right" }],
    rows: prices.map((row) => ({ effective: row.effectiveDate, type: truckTypeLabel(row.truckType), from: row.from, to: row.to,
      company: `$ ${unitMoney(row.companyPrice)}`, driver: `$ ${unitMoney(row.driverPrice)}`, deliveries: row.deliveries, qty: `${row.qty.toFixed(3)}T` }))
  }) });

  const reported = new Map((data.driverReportedPayments || []).filter((item) => item.month === month).map((item) => [item.truckNo, toNumber(item.amount)]));
  const compareRows = performance.map((truck) => ({ truck: truck.truckNo, driver: truck.driverName || "-", system: truck.driverAmount,
    reported: reported.has(truck.truckNo) ? reported.get(truck.truckNo) : null,
    difference: reported.has(truck.truckNo) ? truck.driverAmount - reported.get(truck.truckNo) : null }));
  files.push({ name: `06-Compare-Pay/compare-pay-${safeMonth}.xlsx`, data: await simpleWorkbook(companyName, [{ name: "Compare Pay", columns: [
    { key: "truck", label: "Truck" }, { key: "driver", label: "Driver", width: 22 }, { key: "system", label: "System Gross" },
    { key: "reported", label: "Driver Reported" }, { key: "difference", label: "Difference" }
  ], rows: compareRows }]) });
  files.push({ name: `06-Compare-Pay/compare-pay-${safeMonth}.pdf`, data: tablePdf({ title: `Compare Pay - ${label}`, subtitle: `${reported.size}/${performance.length} trucks checked`,
    columns: [{ key: "truck", label: "Truck", width: 90 }, { key: "driver", label: "Driver", width: 120 },
      { key: "system", label: "System Gross", width: 110, align: "right" }, { key: "reported", label: "Driver Reported", width: 110, align: "right" },
      { key: "difference", label: "Difference", width: 110, align: "right", bold: true }],
    rows: compareRows.map((row) => ({ ...row, system: `$ ${money(row.system)}`, reported: row.reported == null ? "Not entered" : `$ ${money(row.reported)}`,
      difference: row.difference == null ? "-" : `$ ${money(row.difference)}` })) }) });

  files.push({ name: `07-Monthly-Data/all-deliveries-${safeMonth}.xlsx`, data: await simpleWorkbook(companyName, [{ name: "All Deliveries", columns: deliveryColumns, rows: deliveryRows }]) });
  files.push({ name: `07-Monthly-Data/all-deliveries-${safeMonth}.pdf`, data: tablePdf({ title: `All Deliveries - ${label}`, subtitle: `${deliveries.length} rows`,
    columns: [{ key: "date", label: "Date", width: 65 }, { key: "invoice", label: "Invoice", width: 85 }, { key: "truck", label: "Truck", width: 60 },
      { key: "to", label: "To", width: 150 }, { key: "qty", label: "QTY(T)", width: 70, align: "right" },
      { key: "companyTotal", label: "Revenue", width: 80, align: "right" }, { key: "driverTotal", label: "Driver Pay", width: 80, align: "right" }],
    rows: deliveryRows.map((row) => ({ ...row, qty: `${toNumber(row.qty).toFixed(3)}T`, companyTotal: `$ ${money(row.companyTotal)}`, driverTotal: `$ ${money(row.driverTotal)}` })),
    totals: { qty: `${totalQty.toFixed(3)}T`, companyTotal: `$ ${money(totalRevenue)}`, driverTotal: `$ ${money(totalDriver)}` }, totalsLabel: "Total" }) });

  const manifestRows = [
    ["Month", label], ["Statements", statements.length], ["Deliveries", deliveries.length], ["Active trucks", performance.length],
    ["Revenue", `$ ${money(totalRevenue)}`], ["Driver payment", `$ ${money(totalDriver)}`], ["Profit", `$ ${money(totalRevenue - totalDriver)}`],
    ["Outstanding statements", outstanding.length], ["Files in archive", files.length + 1]
  ].map(([item, value]) => ({ item, value }));
  files.unshift({ name: "00-Archive-Manifest.pdf", data: tablePdf({ title: `${companyName} Monthly Archive`, subtitle: `${label} | Generated ${new Date().toISOString()}`,
    columns: [{ key: "item", label: "Item", width: 250 }, { key: "value", label: "Value", width: 250, align: "right", bold: true }], rows: manifestRows }) });

  const filename = `nm-logistic-monthly-archive-${safeMonth}.zip`;
  return { buffer: buildZip(files), filename, files: files.map((file) => file.name),
    caption: [`N&M Logistic - Monthly Archive`, `Month: ${label}`, `Statements: ${statements.length} | Deliveries: ${deliveries.length} | Files: ${files.length}`, `Revenue: $ ${money(totalRevenue)}`].join("\n") };
}
