// Unit tests for the money-critical / bug-prone pure functions.
// Run with `npm test` (node --test). These import server.js without booting it.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  roundMoney,
  toNumber,
  locationBaseKey,
  locationMatchKey,
  findEffectivePrice,
} from "../lib/calc.js";

test("roundMoney snaps floating-point crumbs to clean cents", () => {
  assert.equal(roundMoney(0.1 + 0.2), 0.3);              // classic float artifact
  assert.equal(roundMoney(850.5399999999998), 850.54);  // the real Compare Pay artifact
  assert.equal(roundMoney(147.87), 147.87);             // already clean stays clean
  assert.equal(roundMoney(0), 0);
});

test("roundMoney handles negatives and numeric strings", () => {
  assert.equal(roundMoney(-10.355), -10.35);
  assert.equal(roundMoney("15.005"), 15.01);
});

test("toNumber parses currency-formatted strings", () => {
  assert.equal(toNumber("$1,234.50"), 1234.5);
  assert.equal(toNumber("  72.14 "), 72.14);
  assert.equal(toNumber(15.01), 15.01);
  assert.equal(toNumber(""), 0);
  assert.equal(toNumber("abc"), 0);
  assert.equal(toNumber(null), 0);
});

test("locationBaseKey treats prefixes and parentheses as equivalent", () => {
  // These should all collapse to the same key so price matching works.
  const a = locationBaseKey("D. Koh Thom (Kandal)");
  const b = locationBaseKey("Koh Thom");
  const c = locationBaseKey("KH. Koh Thom");
  assert.equal(a, b);
  assert.equal(b, c);
  assert.equal(a, "kohthom");
});

test("locationBaseKey ignores casing and punctuation differences", () => {
  assert.equal(locationBaseKey("d.khsach kandal (kandal)"), locationBaseKey("Khsach Kandal"));
});

test("locationMatchKey normalizes the 'kh.' abbreviation and spacing for search", () => {
  // "KH.Kambol" and "kh kambol" should search-match (both -> khankambol).
  assert.equal(locationMatchKey("KH.Kambol"), "khankambol");
  assert.equal(locationMatchKey("kh kambol"), "khankambol");
  assert.equal(locationMatchKey("KH.Kambol"), locationMatchKey("kh kambol"));
  // NOTE (known quirk): typing the already-expanded "Khan Kambol" yields
  // "khanankambol" (the regex re-expands the "kh" inside "khan"), so it will
  // NOT match "KH.Kambol". Search-only, low impact — candidate future fix.
});

test("findEffectivePrice returns the most recent active price on or before the delivery date", () => {
  const data = {
    prices: [
      { fromLocation: "Warehouse-09", toLocation: "Koh Thom", truckType: "Without Crane", companyUnitPrice: 14.0, effectiveDate: "2026-01-01", active: true },
      { fromLocation: "Warehouse-09", toLocation: "Koh Thom", truckType: "Without Crane", companyUnitPrice: 15.01, effectiveDate: "2026-05-01", active: true },
      { fromLocation: "Warehouse-09", toLocation: "Koh Thom", truckType: "Without Crane", companyUnitPrice: 99.0, effectiveDate: "2026-09-01", active: true }, // future
    ],
  };
  const match = findEffectivePrice(data, { fromLocation: "Warehouse-09", toLocation: "D. Koh Thom (Kandal)", truckType: "Without Crane", deliveryDate: "2026-05-15" });
  assert.equal(match.companyUnitPrice, 15.01); // picks May price, not Jan, not future Sep
});

test("findEffectivePrice skips inactive prices", () => {
  const data = {
    prices: [
      { fromLocation: "Warehouse-09", toLocation: "Koh Thom", truckType: "Without Crane", companyUnitPrice: 15.01, effectiveDate: "2026-05-01", active: false },
      { fromLocation: "Warehouse-09", toLocation: "Koh Thom", truckType: "Without Crane", companyUnitPrice: 14.0, effectiveDate: "2026-01-01", active: true },
    ],
  };
  const match = findEffectivePrice(data, { fromLocation: "Warehouse-09", toLocation: "Koh Thom", truckType: "Without Crane", deliveryDate: "2026-05-15" });
  assert.equal(match.companyUnitPrice, 14.0); // active Jan price, inactive May skipped
});

test("findEffectivePrice returns undefined when nothing matches", () => {
  const data = { prices: [] };
  const match = findEffectivePrice(data, { fromLocation: "X", toLocation: "Y", truckType: "Without Crane", deliveryDate: "2026-05-15" });
  assert.equal(match, undefined);
});
