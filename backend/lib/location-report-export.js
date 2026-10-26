import ExcelJS from "exceljs";
import { locationReport } from "./location-report.js";

export async function locationReportWorkbook(deliveries, month) {
  const report = locationReport(deliveries, month);
  const workbook = new ExcelJS.Workbook();
  function sheet(name, headings, rows) {
    const ws = workbook.addWorksheet(name);
    ws.addRow(headings);
    ws.addRows(rows);
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
    ws.columns.forEach(column => { column.width = 24; });
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headings.length } };
    headings.forEach((heading, index) => { if (heading === "Tons") ws.getColumn(index + 1).numFmt = "0.00000"; });
  }
  sheet("Summary", ["Metric", "Value"], [["Month", month], ["Different To Locations", report.locations.length], ["Different trucks", report.trucks.length], ["Trips", report.trips], ["Tons", report.tons], ["Trips missing To Location", report.missingLocations], ["Trips missing truck", report.missingTrucks]]);
  sheet("By Location", ["To Location", "Different trucks", "Trips", "Tons"], report.locations.map(r => [r.name, r.trucks, r.trips, r.tons]));
  sheet("By Truck", ["Truck", "Different To Locations", "Trips", "Tons"], report.trucks.map(r => [r.name, r.locations, r.trips, r.tons]));
  sheet("Deliveries", ["Delivery date", "Truck", "To Location", "Invoice", "Tons"], [...report.rows].sort((a,b) => a.deliveryDate.localeCompare(b.deliveryDate)).map(r => [r.deliveryDate, r.truckNo, r.toLocation, r.invoiceNo, Number(r.qtyTon) || 0]));
  return workbook.xlsx.writeBuffer();
}
