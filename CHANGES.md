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
