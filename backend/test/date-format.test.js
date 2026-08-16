import { test } from "node:test";
import assert from "node:assert/strict";
import { compareTrucksCraneFirst, formatCambodiaDateTime, formatDateInput, parseDateInput } from "../../frontend/src/lib/format.js";

test("delivery date displays as DD/MM/YYYY", () => {
  assert.equal(formatDateInput("2026-08-02"), "02/08/2026");
});

test("delivery date input converts back to ISO storage format", () => {
  assert.equal(parseDateInput("02/08/2026"), "2026-08-02");
});

test("delivery date input rejects impossible or incomplete dates", () => {
  assert.equal(parseDateInput("31/02/2026"), "");
  assert.equal(parseDateInput("02/08/26"), "");
  assert.equal(parseDateInput(""), "");
});

test("delivery date input accepts valid leap days only", () => {
  assert.equal(parseDateInput("29/02/2024"), "2024-02-29");
  assert.equal(parseDateInput("29/02/2026"), "");
});

test("backup timestamps always display in Cambodia time", () => {
  assert.equal(formatCambodiaDateTime("2026-08-15T16:45:06.000Z"), "15/08/2026, 11:45 pm");
});

test("truck lists keep Crane first, then No Crane, sorted by truck number", () => {
  const trucks = [
    { truckNo: "3A-2230", truckType: "Without Crane" },
    { truckNo: "3F-6390", truckType: "With Crane" },
    { truckNo: "3B-9369", truckType: "Without Crane" },
    { truckNo: "3B-4693", truckType: "With Crane" }
  ].sort(compareTrucksCraneFirst);
  assert.deepEqual(trucks.map((truck) => truck.truckNo), ["3B-4693", "3F-6390", "3A-2230", "3B-9369"]);
});
