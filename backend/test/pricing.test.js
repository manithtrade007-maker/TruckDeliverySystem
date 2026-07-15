// Real-money protection: verifies price + location + truck-type matching and
// the company/driver amount calculations that feed the reports. If any of
// these break, someone's pay or the company revenue is wrong — so they are
// covered thoroughly here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEffectivePriceToDelivery, findEffectivePrice, roundMoney } from "../lib/calc.js";

// One price row carries BOTH company (companyUnitPrice) and driver
// (truckSalaryUnitPrice) unit prices for a route/truck-type/effective-date.
const prices = [
  // Koh Thom · No Crane — price rose on 2026-05-01
  { fromLocation: "Warehouse-09", toLocation: "D.Koh Thom (Kandal)", truckType: "Without Crane", companyUnitPrice: 14.16, truckSalaryUnitPrice: 13.16, distanceKm: 40, effectiveDate: "2026-01-01", active: true },
  { fromLocation: "Warehouse-09", toLocation: "D.Koh Thom (Kandal)", truckType: "Without Crane", companyUnitPrice: 15.01, truckSalaryUnitPrice: 14.01, distanceKm: 40, effectiveDate: "2026-05-01", active: true },
  // Koh Thom · With Crane — different (crane) prices
  { fromLocation: "Warehouse-09", toLocation: "D.Koh Thom (Kandal)", truckType: "With Crane", companyUnitPrice: 12.73, truckSalaryUnitPrice: 11.53, distanceKm: 40, effectiveDate: "2026-01-01", active: true },
  // Kambol PP · No Crane
  { fromLocation: "Warehouse-09", toLocation: "KH.Kambol (PP)", truckType: "Without Crane", companyUnitPrice: 10.64, truckSalaryUnitPrice: 9.94, distanceKm: 15, effectiveDate: "2026-01-01", active: true },
  // An inactive price that must never be used
  { fromLocation: "Warehouse-09", toLocation: "D.Bati (Takeo)", truckType: "Without Crane", companyUnitPrice: 99, truckSalaryUnitPrice: 99, effectiveDate: "2026-01-01", active: false },
];
const data = { prices };

function makeDelivery(over = {}) {
  return { fromLocation: "Warehouse-09", toLocation: "D.Koh Thom (Kandal)", truckType: "Without Crane", deliveryDate: "2026-05-15", qtyTon: 4.806, ...over };
}

test("company AND driver prices/amounts are both computed from one price row", () => {
  const d = makeDelivery();
  const changed = applyEffectivePriceToDelivery(data, d);
  assert.equal(changed, true);
  assert.equal(d.companyUnitPrice, 15.01);                       // company unit price
  assert.equal(d.truckSalaryUnitPrice, 14.01);                   // driver unit price
  assert.equal(d.companyTotalAmount, roundMoney(4.806 * 15.01)); // company money
  assert.equal(d.truckSalaryAmount, roundMoney(4.806 * 14.01));  // driver money
});

test("location matches regardless of prefix/parentheses/spacing formatting", () => {
  // Delivery entered as plain "Koh Thom" must still match the stored "D.Koh Thom (Kandal)".
  const variants = ["Koh Thom", "d. koh thom", "D.Koh Thom (Kandal)", "KOH THOM"];
  for (const toLocation of variants) {
    const d = makeDelivery({ toLocation });
    assert.equal(applyEffectivePriceToDelivery(data, d), true, `should match: ${toLocation}`);
    assert.equal(d.companyUnitPrice, 15.01, `company for: ${toLocation}`);
    assert.equal(d.truckSalaryUnitPrice, 14.01, `driver for: ${toLocation}`);
  }
});

test("effective date picks the correct price version (no time-travel)", () => {
  const jan = makeDelivery({ deliveryDate: "2026-03-10" }); // before May increase
  applyEffectivePriceToDelivery(data, jan);
  assert.equal(jan.companyUnitPrice, 14.16);
  assert.equal(jan.truckSalaryUnitPrice, 13.16);

  const may = makeDelivery({ deliveryDate: "2026-05-01" }); // exactly on increase date
  applyEffectivePriceToDelivery(data, may);
  assert.equal(may.companyUnitPrice, 15.01);
  assert.equal(may.truckSalaryUnitPrice, 14.01);
});

test("truck type selects the right price (Crane vs No Crane are separate)", () => {
  const crane = makeDelivery({ truckType: "With Crane", deliveryDate: "2026-06-01" });
  applyEffectivePriceToDelivery(data, crane);
  assert.equal(crane.companyUnitPrice, 12.73);      // crane price, not the 15.01 no-crane one
  assert.equal(crane.truckSalaryUnitPrice, 11.53);
});

test("amounts round to clean cents", () => {
  const d = makeDelivery({ toLocation: "KH.Kambol (PP)", qtyTon: 4.806, deliveryDate: "2026-02-01" });
  applyEffectivePriceToDelivery(data, d);
  assert.equal(d.companyTotalAmount, roundMoney(4.806 * 10.64)); // 51.14 not 51.13984
  assert.equal(d.truckSalaryAmount, roundMoney(4.806 * 9.94));
  assert.equal(Number.isInteger(d.companyTotalAmount * 100), true, "company amount is whole cents");
  assert.equal(Number.isInteger(d.truckSalaryAmount * 100), true, "driver amount is whole cents");
});

test("no matching price leaves the delivery unpriced (detectable, not silently wrong)", () => {
  const d = makeDelivery({ toLocation: "Nowhere Village" });
  const changed = applyEffectivePriceToDelivery(data, d);
  assert.equal(changed, false);                 // signals "no price applied"
  assert.equal(d.companyTotalAmount, undefined); // nothing fabricated
  assert.equal(d.truckSalaryAmount, undefined);
});

test("inactive prices are never used", () => {
  const d = makeDelivery({ toLocation: "D.Bati (Takeo)" });
  assert.equal(applyEffectivePriceToDelivery(data, d), false);
  assert.equal(findEffectivePrice(data, d), undefined);
});

test("a truck type with no price for that route does not borrow another type's price", () => {
  // Kambol only has a No Crane price; a Crane delivery there must NOT match.
  const d = makeDelivery({ toLocation: "KH.Kambol (PP)", truckType: "With Crane", deliveryDate: "2026-06-01" });
  assert.equal(applyEffectivePriceToDelivery(data, d), false);
});

test("a future-dated delivery still uses the latest available price", () => {
  const d = makeDelivery({ deliveryDate: "2027-01-01" });
  applyEffectivePriceToDelivery(data, d);
  assert.equal(d.companyUnitPrice, 15.01);        // most recent version
  assert.equal(d.truckSalaryUnitPrice, 14.01);
});

test("a delivery dated before any price has no match", () => {
  const d = makeDelivery({ deliveryDate: "2025-12-01" }); // before earliest 2026-01-01
  assert.equal(applyEffectivePriceToDelivery(data, d), false);
});
