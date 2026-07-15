// Real-data price audit — checks every delivery against the price list using
// the exact same logic the app uses to price deliveries. Run before month-end
// reports or after editing prices:  npm run audit-prices
//
// Exit code 0 = everything correct; 1 = issues found (usable in automation).
import { readData } from "../server.js";
import { findEffectivePrice, toNumber, roundMoney } from "../lib/calc.js";

const data = await readData();
const deliveries = data.deliveries || [];

let ok = 0, noPrice = 0, companyOff = 0, driverOff = 0;
const problems = [];

for (const d of deliveries) {
  const p = findEffectivePrice(data, {
    fromLocation: d.fromLocation,
    toLocation: d.toLocation,
    truckType: d.truckType,
    deliveryDate: d.deliveryDate,
  });
  if (!p) {
    noPrice++;
    problems.push(`NO PRICE   ${d.deliveryDate} ${d.truckNo}  ${d.fromLocation} -> ${d.toLocation} [${d.truckType}]  (invoice ${d.invoiceNo})`);
    continue;
  }
  const qty = toNumber(d.qtyTon);
  const expCompany = roundMoney(qty * toNumber(p.companyUnitPrice));
  const expDriver = roundMoney(qty * toNumber(p.truckSalaryUnitPrice));
  const cOk = expCompany === roundMoney(toNumber(d.companyTotalAmount));
  const dOk = expDriver === roundMoney(toNumber(d.truckSalaryAmount));
  if (!cOk) { companyOff++; problems.push(`COMPANY $  invoice ${d.invoiceNo} ${d.toLocation}: stored ${d.companyTotalAmount} vs price-list ${expCompany}`); }
  if (!dOk) { driverOff++; problems.push(`DRIVER $   invoice ${d.invoiceNo} ${d.toLocation}: stored ${d.truckSalaryAmount} vs price-list ${expDriver}`); }
  if (cOk && dOk) ok++;
}

console.log(`\n=== PRICE AUDIT — ${deliveries.length} deliveries ===`);
console.log(`  fully correct (company + driver): ${ok}`);
console.log(`  no matching price:                ${noPrice}`);
console.log(`  company amount off:               ${companyOff}`);
console.log(`  driver amount off:                ${driverOff}`);

if (problems.length) {
  console.log(`\n--- ${problems.length} issue(s) ---`);
  console.log(problems.join("\n"));
  console.log("\nNote: small cent differences are usually deliveries that kept the");
  console.log("price they were saved with before the price list was later edited.");
  process.exit(1);
} else {
  console.log("\n✅ Every delivery resolves to a correct company + driver price.");
  process.exit(0);
}
