# Testing & Checks

Two commands keep the money-critical logic (price + location matching, company
& driver amounts) correct. Run them from the project root.

---

## `npm test` — automated logic tests

Runs the unit tests (Node's built-in test runner, no extra tools).

```bash
npm test
```

**What it protects** (19 tests in `backend/test/`):

- **Money math** — `roundMoney` (clean cents, no floating-point crumbs), `toNumber`.
- **Location matching** — `"Koh Thom"` = `"D.Koh Thom (Kandal)"` = `"KOH THOM"` all resolve to the same price (`locationBaseKey`).
- **Price + location + truck type** (`backend/test/pricing.test.js`):
  - Company **and** driver unit prices/amounts computed from one price row.
  - Correct price **version** picked by effective date (no time-travel).
  - Crane vs No Crane kept separate (never borrow each other's price).
  - Danger cases: **no match → flagged, not faked**, inactive prices ignored,
    wrong truck type rejected, out-of-range dates.

Run this before committing changes. If it fails, the pricing logic broke.

---

## `npm run audit-prices` — real-data price check

Checks **every delivery currently in the database** against the price list,
using the exact same logic the app uses to price deliveries.

```bash
npm run audit-prices
```

**When to run it:**

- **Before month-end**, before sending reports / paying drivers.
- **After editing the price list** — confirm nothing was left unmatched.
- **After adding a new delivery location** — make sure it has a price.

**What the output means:**

```
=== PRICE AUDIT — 90 deliveries ===
  fully correct (company + driver): 85
  no matching price:                0     <- 0 is good; any >0 = a location with no price
  company amount off:               4
  driver amount off:                1
```

- **no matching price > 0** — a delivery's location/truck-type/date has **no
  price in the list**. This is the one to fix (add or correct the price).
- **amount off** — the stored amount differs from `qty × current price`. Usually
  harmless: the delivery kept the price it was billed at before the price list
  was later edited (the system preserves historical prices on purpose). Small
  cent differences here are expected; large ones are worth a look.

Exit code is `0` when everything is correct, `1` when issues are found (so it can
be wired into automation later).

---

## Also available: in-app diagnostics

The web app (Setup / advanced tools) has buttons that do similar checks from the
UI: **diagnose empty prices** and **diagnose driver prices**. The commands above
are the terminal equivalent — handy for a quick full check without opening the app.
