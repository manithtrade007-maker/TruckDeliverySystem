import assert from "node:assert/strict";
import test from "node:test";
import { nextMonthlyBundleSchedule, retryDelayMs, scheduledBundleMonth } from "../lib/monthly-automation.js";

test("monthly bundle becomes due at 9 AM Cambodia time on the fifth", () => {
  assert.equal(scheduledBundleMonth(new Date("2026-06-05T01:59:59Z")), null);
  assert.equal(scheduledBundleMonth(new Date("2026-06-05T02:00:00Z")), "2026-05");
});

test("monthly bundle catch-up remains due after the fifth", () => {
  assert.equal(scheduledBundleMonth(new Date("2026-06-18T04:00:00Z")), "2026-05");
});

test("January schedule correctly targets December of the previous year", () => {
  assert.equal(scheduledBundleMonth(new Date("2027-01-05T02:00:00Z")), "2026-12");
});

test("next schedule reports the next unscheduled calendar slot", () => {
  assert.deepEqual(nextMonthlyBundleSchedule(new Date("2026-06-04T02:00:00Z")), {
    bundleMonth: "2026-05",
    scheduledAt: "2026-06-05T09:00:00+07:00"
  });
});

test("automatic retry delay increases after repeated failures", () => {
  assert.equal(retryDelayMs(1), 60 * 60 * 1000);
  assert.equal(retryDelayMs(2), 3 * 60 * 60 * 1000);
  assert.equal(retryDelayMs(3), 12 * 60 * 60 * 1000);
});
