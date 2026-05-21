# Changes Log

## Bug Fix: Without Crane Driver Price Not Calculating (2026-05-20)

### Problem

On production, Without Crane delivery rows showed **$0 driver payment** on the Dashboard and Reports pages even after driver prices had been set up in the price list.

**Root cause:** Two helper functions — `recalculateDeliveriesForPriceRoutes` and `recalculateAllDeliveries` — were defined in `backend/server.js` but never called anywhere (dead code). This meant:

1. When a price was saved via the **single price form** (`POST /api/prices`), existing delivery rows were never updated to reflect the new driver price.
2. There was no way to manually force a recalculation of existing deliveries that had been saved with $0 driver amounts.

The bulk import (`POST /api/prices/bulk`) had its own inline recalculation logic and worked, but only for routes and dates that matched exactly. Any mismatch silently skipped the update.

### Files Changed

#### `backend/server.js`

**1. Single price endpoint now recalculates existing deliveries**

After a price is saved via the individual price form, `recalculateDeliveriesForPriceRoutes` is called for that specific route. Any existing delivery rows that fall within the new price's effective date are automatically updated.

Location: `POST /api/prices` handler (around the `addActivity` call).

**2. New endpoint: `POST /api/recalculate`**

Force-recalculates ALL delivery rows against the current price list. Used by the new frontend button. Returns `{ recalculatedDeliveries: number }`.

#### `frontend/src/main.jsx`

**1. New function: `recalculateAllPrices()`**

Calls `POST /api/recalculate`, reloads data, and shows a flash notification with the count of rows updated.

**2. New UI panel: "Recalculate Driver Prices"**

Added to the **Setup** page between the Data Backup and Location Price Reset panels. Provides a button to trigger a full driver price recalculation. Use this once on production to fix existing delivery rows showing $0 driver payment.

### How to Fix Production

1. Deploy this update to production (Render).
2. Go to **Setup** page.
3. Click **"Recalculate Driver Prices"**.
4. Confirm the dialog.
5. Check the Dashboard — driver payment amounts should now be correct for all Without Crane deliveries.

### What Does Not Change

- Delivery row data (dates, locations, quantities, company amounts) is not touched.
- Only `truckSalaryUnitPrice` and `truckSalaryAmount` fields are updated on affected rows.
- Rows whose delivery date falls before the driver price effective date are not changed (correct behavior — the price was not yet effective on that date).
- Finished and exported statements are recalculated in-place (their status does not change).

---

## Bug Fix: Location Name Mismatch Causing $0 Driver Price (2026-05-20)

### Problem

After the first fix, 5 delivery rows still showed $0 driver payment. The diagnose tool revealed **"No prices exist for this route at all"** — meaning `findEffectivePrice` could not match the delivery's `toLocation` to any entry in the price list.

**Root cause — two bugs in `locationBaseKey()` in `backend/server.js`:**

1. **Wrong stripping order**: `d.` prefix was stripped *after* `kh`/`khan`, so `"D.Khsach Kandal"` had `d.` stripped correctly but then the remaining `"khsach"` never had `kh` stripped (the `kh` pass had already run). Result: `"D.Khsach Kandal"` → `"khsachkandal"` but `"Khsach Kandal"` → `"sachkandal"` — no match.

2. **Wrong alternation order**: The regex used `kh|khan`, so JavaScript tried `kh` first. `"Khan Kambol"` matched only `"kh"` (first 2 chars), leaving `"an kambol"` → `"ankambol"`. But `"KH.Kambol"` correctly stripped `"kh."` → `"kambol"`. No match.

Affected deliveries:
| Delivery `toLocation` | Price list `toLocation` | Old key (delivery) | Old key (price) |
|---|---|---|---|
| Khan Kambol (PP) | KH.Kambol (PP) | `ankambol` | `kambol` |
| Khan Chba Ampeou (PP) | KH.Chba Ampeou (PP) | `anchbaampeou` | `chbaampeou` |
| Khsach Kandal (Kandal) | D.Khsach Kandal (Kandal) | `sachkandal` | `khsachkandal` |

### Files Changed

#### `backend/server.js`

**1. Fixed `locationBaseKey()` — strip order and alternation order**

```js
// Before (buggy)
.replace(/^\s*(kh|khan)\s*[.]?\s*/i, "")
.replace(/^\s*d\s*\.\s*/i, "")

// After (fixed)
.replace(/^\s*d\s*\.\s*/i, "")           // d. stripped first
.replace(/^\s*(khan|kh)\s*[.]?\s*/i, "") // khan before kh
```

**2. New endpoint: `GET /api/diagnose-driver`**

Returns all delivery rows that still have `truckSalaryUnitPrice = 0`, with the exact reason for each: price not found, price is $0, or no prices for this route at all.

**3. New endpoint: `POST /api/fix-location-names`**

Scans all delivery rows and corrects any `toLocation` that doesn't exactly match the price list canonical name (but does match via `locationBaseKey`). Runs a full recalculate after fixing names.

**4. New endpoint: `POST /api/prices/cleanup-zero-driver`**

Deletes old Without Crane price entries that have `truckSalaryUnitPrice = 0` where a newer entry with a real driver price exists for the same route. Reports which locations still have no driver price set.

#### `frontend/src/main.jsx`

**New Setup page buttons:**
- **"Diagnose $0 Prices"** — shows a popup listing every delivery still at $0 and exactly why
- **"Fix Location Names"** — runs `POST /api/fix-location-names` and shows count fixed
- **"Clean Up Old Prices"** — runs `POST /api/prices/cleanup-zero-driver`

### How to Verify

1. Setup → **"Diagnose $0 Prices"** → should show "All delivery rows have a non-zero driver price."
2. Dashboard and Reports → all Without Crane driver payment amounts should be non-zero.
