// Excel + PDF export builders (accounting, salary, statement, price
// comparison, dashboard) and the zip/PDF primitives they use.
import ExcelJS from "exceljs";
import { normalizeText, locationBaseKey, toNumber, effectiveDateOf } from "./calc.js";

export const PDF_PAGE_WIDTH = 595; // A4 portrait width in points
export const PDF_PAGE_HEIGHT = 842; // A4 portrait height in points
export const PDF_PAGE_MARGIN = 0;

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function money(value) {
  return Number(value || 0).toFixed(2);
}

export function unitMoney(value) {
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
export function formatDotDate(value) {
  const text = normalizeText(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return text;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

export function currentLocalDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Phnom_Penh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function slug(value) {
  return String(value || "all")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function numericMonthFilePart(value) {
  const text = normalizeText(value);
  const match = text.match(/^(\d{4})-(\d{2})$/);
  if (!match) return slug(text || "all-months");
  return `${match[2]}-${match[1]}`;
}

export function monthLabel(value) {
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

export function truckTypeLabel(truckType) {
  if (truckType === "With Crane") return "Crane";
  if (truckType === "Without Crane") return "No Crane";
  return truckType || "";
}

export function statementExportFileName(statement, fallbackRows = []) {
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
  if (column.type === "date") return formatDotDate(value);
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
      <td class="meta right" colspan="2" align="right" x:str style="height:16pt; mso-height-source:userset; text-align:right; mso-number-format:'\\@';"><div style="text-align:right;">${htmlEscape(formatDotDate(statement?.statementDate || ""))}</div></td>
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

export async function accountingWorkbook(data, rows, signatureImage) {
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
    { key: "qtyTon", width: 12, style: { numFmt: '0.00000"T"' } },
    { key: "companyUnitPrice", width: 11, style: { numFmt: '"$"0.000' } },
    { key: "companyTotalAmount", width: 14, style: { numFmt: '"$"0.00' } }
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
  merge("I1:J1", String(statement?.statementNumber ?? ""), {
    font: boldFont,
    alignment: { horizontal: "right", vertical: "middle" }
  });
  merge("A2:F2", `From: ${data.settings.fromName || "Nhep Manith"}`, { font: boldFont });
  merge("G2:H2", "Statement Date:", { font: boldFont });
  merge("I2:J2", formatDotDate(statement?.statementDate || ""), {
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
      formatDotDate(row.deliveryDate),
      String(row.invoiceNo || ""),
      row.truckNo || "",
      truckTypeLabel(row.truckType),
      row.fromLocation || "",
      row.toLocation || "",
      Number(row.qtyTon || 0),
      Number(row.companyUnitPrice || 0),
      Number(row.companyTotalAmount || 0)
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
  worksheet.getCell(totalRowNumber, 8).value = rows.reduce((sum, row) => sum + toNumber(row.qtyTon), 0);
  worksheet.getCell(totalRowNumber, 8).numFmt = '0.00000"T"';
  worksheet.getCell(totalRowNumber, 10).value = rows.reduce((sum, row) => sum + toNumber(row.companyTotalAmount), 0);
  worksheet.getCell(totalRowNumber, 10).numFmt = '"$"0.00';
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
  worksheet.getCell(dateRow, 1).value = `Date: ${formatDotDate(statement?.statementDate || "")}`;
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
  if (loanDeduction > 0) extraTotalRows.push({ label: "Loan Deduction", value: `$ ${money(loanDeduction)}` });
  if (garageFee > 0) extraTotalRows.push({ label: "Garage Fee", value: `$ ${money(garageFee)}` });
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
      <td class="subtitle" colspan="8">Page ${pageIndex + 1} of ${pages.length}</td>
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

export async function salaryWorkbook(data, rows, query = {}, loanDeduction = 0, garageFee = 0) {
  const truck = data.trucks.find((item) => item.truckNo === query.truckNo) || {};
  const truckNo = query.truckNo || rows[0]?.truckNo || "All Trucks";
  const truckType = truckTypeLabel(rows[0]?.truckType || truck.truckType || query.truckType || "No Data");
  const driverName = rows[0]?.driverName || truck.driverName || "-";
  const reportMonth = monthLabel(query.month || rows[0]?.deliveryDate?.slice(0, 7));
  const totalDriverAmount = rows.reduce((sum, row) => sum + toNumber(row.truckSalaryAmount), 0);
  const netPay = totalDriverAmount - loanDeduction - garageFee;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = data.settings.companyName || "N&M LOGISTIC";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("Driver Payment", {
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0, right: 0, top: 0, bottom: 0, header: 0, footer: 0 }
    },
    views: [{ showGridLines: true }]
  });

  worksheet.columns = [
    { key: "no", width: 5 },
    { key: "deliveryDate", width: 14 },
    { key: "invoiceNo", width: 14 },
    { key: "fromLocation", width: 14 },
    { key: "toLocation", width: 24 },
    { key: "qtyTon", width: 14, style: { numFmt: '0.00000"T"' } },
    { key: "unitPrice", width: 12, style: { numFmt: '"$"0.000' } },
    { key: "driverAmount", width: 14, style: { numFmt: '"$"0.00' } }
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

  const styleRange = (startRow, endRow, startCol = 1, endCol = 8, options = {}) => {
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = worksheet.getCell(r, c);
        cell.font = options.font || cell.font || baseFont;
        cell.alignment = options.alignment || cell.alignment || { vertical: "middle" };
        cell.border = options.border || thinBorder;
        if (options.fill) cell.fill = options.fill;
      }
    }
  };

  // Header rows
  merge("A1:H1", data.settings.companyName || "N&M LOGISTIC", {
    font: titleFont,
    alignment: { horizontal: "center", vertical: "middle" }
  });
  merge("A2:D2", `Driver Verification: ${truckNo}`, { font: boldFont });
  merge("E2:F2", "Month:", { font: boldFont });
  merge("G2:H2", reportMonth, { font: boldFont });
  merge("A3:D3", `Driver: ${driverName}`, { font: boldFont });
  merge("E3:F3", "Truck Type:", { font: boldFont });
  merge("G3:H3", truckType, { font: boldFont });
  worksheet.getRow(1).height = 18;
  worksheet.getRow(2).height = 16;
  worksheet.getRow(3).height = 16;
  styleRange(1, 3);

  // Column headers
  const colHeaders = ["No", "Delivery Date", "Invoice No", "From", "To", "QTY(T)", "Driver Price", "Driver Amount"];
  worksheet.getRow(4).values = colHeaders;
  worksheet.getRow(4).height = 20;
  styleRange(4, 4, 1, 8, {
    font: boldFont,
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } }
  });

  // Data rows
  rows.forEach((row, index) => {
    const rowNumber = index + 5;
    worksheet.getRow(rowNumber).height = 22;
    worksheet.getRow(rowNumber).values = [
      index + 1,
      formatDotDate(row.deliveryDate),
      String(row.invoiceNo || ""),
      row.fromLocation || "",
      row.toLocation || "",
      Number(row.qtyTon || 0),
      Number(row.truckSalaryUnitPrice || 0),
      Number(row.truckSalaryAmount || 0)
    ];
    styleRange(rowNumber, rowNumber, 1, 8, {
      font: baseFont,
      alignment: { horizontal: "center", vertical: "middle", wrapText: false }
    });
    worksheet.getCell(rowNumber, 4).alignment = { horizontal: "left", vertical: "middle" };
    worksheet.getCell(rowNumber, 5).alignment = { horizontal: "left", vertical: "middle" };
  });

  // Total row
  const totalRowNumber = rows.length + 5;
  worksheet.getRow(totalRowNumber).height = 20;
  worksheet.mergeCells(totalRowNumber, 1, totalRowNumber, 5);
  worksheet.getCell(totalRowNumber, 1).value = "Total";
  worksheet.getCell(totalRowNumber, 6).value = rows.reduce((sum, row) => sum + toNumber(row.qtyTon), 0);
  worksheet.getCell(totalRowNumber, 6).numFmt = '0.00000"T"';
  worksheet.getCell(totalRowNumber, 8).value = totalDriverAmount;
  worksheet.getCell(totalRowNumber, 8).numFmt = '"$"0.00';
  styleRange(totalRowNumber, totalRowNumber, 1, 8, {
    font: boldFont,
    alignment: { horizontal: "center", vertical: "middle" }
  });
  worksheet.getCell(totalRowNumber, 1).alignment = { horizontal: "left", vertical: "middle" };
  worksheet.getCell(totalRowNumber, 8).alignment = { horizontal: "right", vertical: "middle" };

  // Extra total rows (loan deduction, garage fee, net pay)
  let nextRow = totalRowNumber + 1;
  if (loanDeduction > 0) {
    worksheet.getRow(nextRow).height = 18;
    worksheet.mergeCells(nextRow, 1, nextRow, 7);
    worksheet.getCell(nextRow, 1).value = "Loan Deduction";
    worksheet.getCell(nextRow, 8).value = `$ ${money(loanDeduction)}`;
    styleRange(nextRow, nextRow, 1, 8, { font: baseFont, alignment: { vertical: "middle" } });
    worksheet.getCell(nextRow, 8).alignment = { horizontal: "right", vertical: "middle" };
    nextRow++;
  }
  if (garageFee > 0) {
    worksheet.getRow(nextRow).height = 18;
    worksheet.mergeCells(nextRow, 1, nextRow, 7);
    worksheet.getCell(nextRow, 1).value = "Garage Fee";
    worksheet.getCell(nextRow, 8).value = `$ ${money(garageFee)}`;
    styleRange(nextRow, nextRow, 1, 8, { font: baseFont, alignment: { vertical: "middle" } });
    worksheet.getCell(nextRow, 8).alignment = { horizontal: "right", vertical: "middle" };
    nextRow++;
  }
  if (loanDeduction > 0 || garageFee > 0) {
    worksheet.getRow(nextRow).height = 18;
    worksheet.mergeCells(nextRow, 1, nextRow, 7);
    worksheet.getCell(nextRow, 1).value = "Net Pay";
    worksheet.getCell(nextRow, 8).value = `$ ${money(netPay)}`;
    styleRange(nextRow, nextRow, 1, 8, { font: boldFont, alignment: { vertical: "middle" } });
    worksheet.getCell(nextRow, 8).alignment = { horizontal: "right", vertical: "middle" };
    nextRow++;
  }

  worksheet.pageSetup.printArea = `A1:H${nextRow - 1}`;
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function salaryPdf(data, rows, query = {}, loanDeduction = 0, garageFee = 0) {
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
  if (loanDeduction > 0) extraTotals.push({ label: "Loan Deduction", value: `$ ${money(loanDeduction)}` });
  if (garageFee > 0) extraTotals.push({ label: "Garage Fee", value: `$ ${money(garageFee)}` });
  if (extraTotals.length > 0) extraTotals.push({ label: "Net Pay", value: `$ ${money(netPay)}`, bold: true, fill: [0.94, 0.99, 0.95] });
  return tablePdf({
    title: `Driver Verification - ${truckNo}`,
    subtitle: `${truckTypeLabel(truckType)} | Driver: ${driverName} | Month: ${reportMonth}`,
    columns,
    rows: rows.map((row, index) => ({
      no: index + 1,
      date: formatDotDate(row.deliveryDate),
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
    footer: false,
    headerFirstPageOnly: true
  });
}

export function monthlyTruckPerformance(data, month) {
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

function buildPriceCompareRows(data, date) {
  const craneMap = new Map();
  const noCraneMap = new Map();
  for (const price of data.prices) {
    if (price.active === false) continue;
    if (effectiveDateOf(price) > date) continue;
    const key = locationBaseKey(price.toLocation);
    if (price.truckType === "With Crane") {
      const ex = craneMap.get(key);
      if (!ex || effectiveDateOf(price) > effectiveDateOf(ex)) craneMap.set(key, price);
    } else if (price.truckType === "Without Crane") {
      const ex = noCraneMap.get(key);
      if (!ex || effectiveDateOf(price) > effectiveDateOf(ex)) noCraneMap.set(key, price);
    }
  }
  const allKeys = new Set([...craneMap.keys(), ...noCraneMap.keys()]);
  const PROVINCE_ORDER = ["PP", "Kandal", "Takeo", "K.Speu", "Prey Veng", "Svay Rieng", "Kampot", "Kep", "K.Chhnan", "K.Cham", "K.Thom"];
  const provinceOf = (name) => { const m = String(name || "").match(/\(([^)]+)\)$/); return m ? m[1] : "ZZ"; };
  const rows = [...allKeys].map((key) => {
    const crane = craneMap.get(key) || null;
    const noCrane = noCraneMap.get(key) || null;
    return { key, canonicalName: (crane || noCrane).toLocation, crane, noCrane };
  });
  rows.sort((a, b) => {
    const pa = PROVINCE_ORDER.indexOf(provinceOf(a.canonicalName));
    const pb = PROVINCE_ORDER.indexOf(provinceOf(b.canonicalName));
    const pa2 = pa === -1 ? 999 : pa;
    const pb2 = pb === -1 ? 999 : pb;
    return pa2 - pb2 || a.canonicalName.localeCompare(b.canonicalName);
  });
  return rows;
}

export async function priceComparisonWorkbook(data, date) {
  const rows = buildPriceCompareRows(data, date);
  const companyName = data.settings.companyName || "N&M LOGISTIC";

  const workbook = new ExcelJS.Workbook();
  workbook.creator = companyName;
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Price Comparison", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.3, right: 0.3, top: 0.3, bottom: 0.3, header: 0, footer: 0 } },
    views: [{ showGridLines: true }]
  });

  ws.columns = [
    { key: "no", width: 5 },
    { key: "location", width: 28 },
    { key: "craneComp", width: 14, style: { numFmt: '"$"0.000' } },
    { key: "craneDriv", width: 14, style: { numFmt: '"$"0.000' } },
    { key: "craneMargin", width: 14, style: { numFmt: '"$"0.000' } },
    { key: "ncComp", width: 14, style: { numFmt: '"$"0.000' } },
    { key: "ncDriv", width: 14, style: { numFmt: '"$"0.000' } },
    { key: "ncMargin", width: 14, style: { numFmt: '"$"0.000' } }
  ];

  const thinBorder = {
    top: { style: "thin", color: { argb: "FF333333" } },
    left: { style: "thin", color: { argb: "FF333333" } },
    bottom: { style: "thin", color: { argb: "FF333333" } },
    right: { style: "thin", color: { argb: "FF333333" } }
  };
  const baseFont = { name: "Arial", size: 10 };
  const boldFont = { name: "Arial", size: 10, bold: true };
  const titleFont = { name: "Arial", size: 14, bold: true };

  const styleCell = (cell, options = {}) => {
    cell.font = options.font || baseFont;
    cell.alignment = options.alignment || { vertical: "middle" };
    cell.border = thinBorder;
    if (options.fill) cell.fill = options.fill;
    if (options.numFmt) cell.numFmt = options.numFmt;
  };

  // Title row
  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = companyName;
  styleCell(ws.getCell("A1"), { font: titleFont, alignment: { horizontal: "center", vertical: "middle" } });
  ws.getRow(1).height = 22;

  // Subtitle row
  ws.mergeCells("A2:H2");
  ws.getCell("A2").value = `Price Comparison — As of ${formatDotDate(date)}`;
  styleCell(ws.getCell("A2"), { font: boldFont, alignment: { horizontal: "center", vertical: "middle" } });
  ws.getRow(2).height = 16;

  // Merged group headers row 3
  ws.mergeCells("A3:B3");
  ws.getCell("A3").value = "";
  ws.mergeCells("C3:E3");
  ws.getCell("C3").value = "CRANE";
  ws.mergeCells("F3:H3");
  ws.getCell("F3").value = "NO CRANE";
  [["A3", "B3"], ["C3", "D3", "E3"], ["F3", "G3", "H3"]].forEach(([start]) => {});
  ["A3", "C3", "F3"].forEach((addr) => {
    styleCell(ws.getCell(addr), {
      font: boldFont,
      alignment: { horizontal: "center", vertical: "middle" },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }
    });
    ws.getCell(addr).font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  });
  for (let c = 1; c <= 8; c++) {
    const cell = ws.getCell(3, c);
    cell.border = thinBorder;
  }
  ws.getRow(3).height = 18;

  // Column headers row 4
  const colHeaders = ["No", "Location", "Company", "Driver", "Margin", "Company", "Driver", "Margin"];
  ws.getRow(4).values = colHeaders;
  ws.getRow(4).height = 18;
  for (let c = 1; c <= 8; c++) {
    styleCell(ws.getCell(4, c), {
      font: boldFont,
      alignment: { horizontal: "center", vertical: "middle" },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } }
    });
  }

  // Data rows
  rows.forEach((row, i) => {
    const r = i + 5;
    ws.getRow(r).height = 18;
    const cComp = row.crane ? Number(row.crane.companyUnitPrice || 0) : null;
    const cDriv = row.crane ? Number(row.crane.truckSalaryUnitPrice || 0) : null;
    const cMargin = cComp !== null ? cComp - cDriv : null;
    const nComp = row.noCrane ? Number(row.noCrane.companyUnitPrice || 0) : null;
    const nDriv = row.noCrane ? Number(row.noCrane.truckSalaryUnitPrice || 0) : null;
    const nMargin = nComp !== null ? nComp - nDriv : null;
    const hasNegative = (cMargin !== null && cMargin < 0) || (nMargin !== null && nMargin < 0);
    const rowFill = hasNegative
      ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } }
      : i % 2 === 0
        ? null
        : { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };

    const setDataCell = (col, value, extraOptions = {}) => {
      const cell = ws.getCell(r, col);
      cell.value = value;
      styleCell(cell, { font: baseFont, alignment: { horizontal: col <= 2 ? (col === 1 ? "center" : "left") : "right", vertical: "middle" }, fill: rowFill, ...extraOptions });
    };

    setDataCell(1, i + 1);
    setDataCell(2, row.canonicalName, { font: boldFont });

    if (row.crane) {
      setDataCell(3, cComp);
      setDataCell(4, cDriv);
      const mCell = ws.getCell(r, 5);
      mCell.value = cMargin;
      styleCell(mCell, { font: { name: "Arial", size: 10, bold: true, color: { argb: cMargin < 0 ? "FFDC2626" : "FF0F766E" } }, alignment: { horizontal: "right", vertical: "middle" }, fill: rowFill });
    } else {
      ws.mergeCells(r, 3, r, 5);
      const cell = ws.getCell(r, 3);
      cell.value = "—";
      styleCell(cell, { font: { name: "Arial", size: 10, color: { argb: "FFCBD5E1" } }, alignment: { horizontal: "center", vertical: "middle" }, fill: rowFill });
    }

    if (row.noCrane) {
      setDataCell(6, nComp);
      setDataCell(7, nDriv);
      const mCell = ws.getCell(r, 8);
      mCell.value = nMargin;
      styleCell(mCell, { font: { name: "Arial", size: 10, bold: true, color: { argb: nMargin < 0 ? "FFDC2626" : "FF0F766E" } }, alignment: { horizontal: "right", vertical: "middle" }, fill: rowFill });
    } else {
      ws.mergeCells(r, 6, r, 8);
      const cell = ws.getCell(r, 6);
      cell.value = "—";
      styleCell(cell, { font: { name: "Arial", size: 10, color: { argb: "FFCBD5E1" } }, alignment: { horizontal: "center", vertical: "middle" }, fill: rowFill });
    }
  });

  ws.pageSetup.printArea = `A1:H${rows.length + 4}`;
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function priceComparisonPdf(data, date) {
  const rows = buildPriceCompareRows(data, date);
  const companyName = data.settings.companyName || "N&M LOGISTIC";
  return tablePdf({
    title: `${companyName} — Price Comparison`,
    subtitle: `Active prices as of ${formatDotDate(date)} | ${rows.length} locations`,
    columns: [
      { key: "no", label: "No", width: 22, align: "center" },
      { key: "location", label: "Location", width: 155 },
      { key: "craneComp", label: "Crane Co.", width: 58, align: "right" },
      { key: "craneDriv", label: "Crane Dr.", width: 58, align: "right" },
      { key: "craneMargin", label: "Crane Margin", width: 68, align: "right", bold: true },
      { key: "ncComp", label: "NoCrane Co.", width: 58, align: "right" },
      { key: "ncDriv", label: "NoCrane Dr.", width: 58, align: "right" },
      { key: "ncMargin", label: "NoCrane Margin", width: 68, align: "right", bold: true }
    ],
    rows: rows.map((row, i) => {
      const cComp = row.crane ? Number(row.crane.companyUnitPrice || 0) : null;
      const cDriv = row.crane ? Number(row.crane.truckSalaryUnitPrice || 0) : null;
      const cMargin = cComp !== null ? cComp - cDriv : null;
      const nComp = row.noCrane ? Number(row.noCrane.companyUnitPrice || 0) : null;
      const nDriv = row.noCrane ? Number(row.noCrane.truckSalaryUnitPrice || 0) : null;
      const nMargin = nComp !== null ? nComp - nDriv : null;
      const hasNegative = (cMargin !== null && cMargin < 0) || (nMargin !== null && nMargin < 0);
      return {
        no: i + 1,
        location: row.canonicalName,
        craneComp: cComp !== null ? `$ ${unitMoney(cComp)}` : "—",
        craneDriv: cDriv !== null ? `$ ${unitMoney(cDriv)}` : "—",
        craneMargin: cMargin !== null ? `$ ${unitMoney(cMargin)}` : "—",
        ncComp: nComp !== null ? `$ ${unitMoney(nComp)}` : "—",
        ncDriv: nDriv !== null ? `$ ${unitMoney(nDriv)}` : "—",
        ncMargin: nMargin !== null ? `$ ${unitMoney(nMargin)}` : "—",
        _highlighted: hasNegative
      };
    }),
    footer: false
  });
}

export function dashboardExport(rows, month) {
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

export function buildZip(files) {
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

export function drawRect(x, y, width, height, fill, stroke = null) {
  const commands = [];
  if (fill) commands.push(`q ${pdfRgb(fill)} rg ${x} ${y} ${width} ${height} re f Q`);
  if (stroke) commands.push(`q ${pdfRgb(stroke)} RG ${x} ${y} ${width} ${height} re S Q`);
  return commands.join("\n");
}

function drawLine(x1, y1, x2, y2, lineWidth = 0.5, color = [0.6, 0.6, 0.6]) {
  return `q ${pdfRgb(color)} RG ${lineWidth} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S Q`;
}

export function drawText(value, x, y, options = {}) {
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

export function readJpegInfo(buffer) {
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

export function buildPdf(pages, images = []) {
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

export function tablePdf({ title, subtitle, columns, rows, totals, totalsLabel, extraTotals, footer, header, preparedBy, signatureImage, headerFirstPageOnly }) {
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
    } else if (!headerFirstPageOnly || pageIndex === 0) {
      commands.push(drawText(title, margin, titleY, { size: 12, bold: true, width: tableWidth }));
      if (subtitle) commands.push(drawText(subtitle, margin, subtitleY, { size: 7.5, bold: true, color: [0.39, 0.46, 0.56], width: tableWidth }));
    }
    commands.push(drawRect(tableX, tableTop - headerHeight, tableWidth, headerHeight, [0.35, 0.40, 0.47], [0.35, 0.40, 0.47]));
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

export function statementPdf(data, rows, signatureImage) {
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
      commands.push(drawRect(0, y, leftWidth, rowHeight, null, [0.35, 0.40, 0.47]));
      commands.push(drawRect(leftWidth, y, labelWidth, rowHeight, null, [0.35, 0.40, 0.47]));
      commands.push(drawRect(leftWidth + labelWidth, y, valueWidth, rowHeight, null, [0.35, 0.40, 0.47]));
    }
    commands.push(drawText(data.settings.companyName || "N&M LOGISTIC", 0, rowsY[0] + 4, { size: 11, bold: true, width: leftWidth, align: "center" }));
    commands.push(drawText("Invoice No:", leftWidth + 3, rowsY[0] + 4, { size: 7, bold: true, width: labelWidth - 6 }));
    commands.push(drawText(statement?.statementNumber || "", leftWidth + labelWidth + 3, rowsY[0] + 4, { size: 7, bold: true, width: valueWidth - 6, align: "right" }));
    commands.push(drawText(`From: ${data.settings.fromName || "Nhep Manith"}`, 3, rowsY[1] + 4, { size: 7, bold: true, width: leftWidth - 6 }));
    commands.push(drawText("Statement Date:", leftWidth + 3, rowsY[1] + 4, { size: 7, bold: true, width: labelWidth - 6 }));
    commands.push(drawText(formatDotDate(statement?.statementDate || ""), leftWidth + labelWidth + 3, rowsY[1] + 4, { size: 7, bold: true, width: valueWidth - 6, align: "right" }));
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
    subtitle: `${truckTypeLabel(statement?.truckType) || ""} | ${statement?.status || ""} | ${rows.length}/30 rows | From: ${data.settings.fromName || "Nhep Manith"} | To: ${data.settings.toName || "SLP"} | Date: ${formatDotDate(statement?.statementDate || "")}`,
    columns,
    header: statementHeader,
    rows: rows.map((row, index) => ({
      no: index + 1,
      date: formatDotDate(row.deliveryDate),
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
    preparedBy: { name: "Nhep Manith", date: formatDotDate(statement?.statementDate || "") },
    signatureImage
  });
}

export function dashboardPdf(rows, month) {
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

