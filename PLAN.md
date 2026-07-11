# N&M Logistic — System Improvement Plan

_Drafted 2026-07-12. A prioritized list of current problems and suggested fixes.
None of this is a rewrite — it's hardening a system that already works and delivers real value._

## Snapshot (facts as of this draft)

- `frontend/src/main.jsx` — **4,632 lines** (single component holding all pages/state/handlers)
- `backend/server.js` — **3,906 lines** (raw Node HTTP, hand-rolled routing)
- **Zero automated tests**, no `test` script, no test directory
- `frontend/dist/` is **committed** and hand-built (`vite build` run manually each change)
- `roundMoney()` exists but is applied **inconsistently** across money aggregations
- When `APP_USERNAME`/`APP_PASSWORD` are unset, the server grants **everyone admin** (`backend/server.js:734`)

## What's already good (keep it)

- Sound domain model: statements → deliveries, effective-dated prices, driver salary denormalized at save time (historical pay stays correct when prices change later).
- Tech choices fit the scale (~2-3 users): raw Node + `node:sqlite` + one React file + Render with a persistent disk. Appropriate restraint, not under-built.
- Consistent, clean UI in a single design language.

---

## 🔴 P0 — Address first (risk / correctness)

### 1. Auth defaults to open admin when env vars are missing — ✅ DONE (2026-07-12)
- **Problem:** `getAuthorizedRole()` returns `"admin"` if `APP_USERNAME`/`APP_PASSWORD` are unset (`backend/server.js:734`). If production is ever deployed without those vars, the entire financial app is public with full admin access — no login required.
- **Fixed:** Added a production startup guard (`backend/server.js`) — if `NODE_ENV=production` or `RENDER` is set and credentials are missing, the server logs a FATAL error and refuses to start (`process.exit(1)`) instead of silently opening up. Localhost behavior unchanged (login stays optional). Render already has the credentials set, so normal deploys are unaffected.
- **Remaining (optional):** flip the unauthenticated default from `"admin"` to `"staff"` — never admin.

### 2. Money precision is inconsistent — ✅ PARTIALLY DONE (2026-07-12)
- **Problem:** `roundMoney()` (`backend/server.js:812`) is used on statement totals, but per-truck driver sums and the Compare Pay / earnings aggregations used raw float addition — hence display artifacts like `$850.5399999999998`.
- **Fixed:** Added a matching `roundMoney()` helper on the frontend (`frontend/src/main.jsx`) and applied it to every Compare Pay + Monthly Earnings aggregation (reconciliation `systemAmount`, per-row diffs, column totals, earnings `kept`/`overpaid`/`net` and their totals). The visible artifacts are gone.
- **Remaining (optional, robust):** for full safety at scale, store money as **integer cents** in the DB and format to dollars only on display (~1-2 days; only if volume grows).

---

## 🟠 P1 — Do soon (safety net)

### 3. No automated tests on financial math — ✅ STARTED (2026-07-12)
- **Problem:** No tests anywhere. Prior calc bugs (`locationBaseKey`, dead recalculate code) prove these happen and stay invisible until a paycheck is wrong.
- **Done:** Added `node --test` harness + `npm test` script (no new dependencies). `backend/server.js` now exports its pure functions and only boots the HTTP server when run directly (so tests can import it). `backend/test/calc.test.js` covers `roundMoney`, `toNumber`, `locationBaseKey`, `locationMatchKey`, and `findEffectivePrice` (9 tests, all passing).
- **Found:** a minor quirk — `locationMatchKey("Khan …")` double-expands `kh`→`khan` giving `khanan…`; search-only, documented in the test as a future fix.
- **Remaining:** extend coverage to driver-amount / statement-total calc and the reconciliation + earnings aggregation once those move into testable modules.

### 4. Workflow footguns / silent data loss — ✅ DONE (2026-07-12)
- **Problem:** Editing a delivery row then clicking **Finish** discarded the unsaved edit with no warning (`finishStatement()` reset the form before saving). Changing Truck No also silently cleared To Location, stranding the user with a disabled "Update Row".
- **Fixed:**
  1. Added `deliveryFormDirty` detection + a guard in `finishStatement()` — it now blocks and warns ("unsaved changes to a row… Update Row or Cancel") instead of silently discarding. Only fires on genuine changes, so no false alarms.
  2. Truck No change no longer clears To Location (the list isn't truck-dependent — it was a pure trap). Price re-looks-up automatically; a truck-type mismatch is still caught on save.
- **Remaining (optional):** broader audit of other delete/overwrite paths for confirm prompts.

---

## 🟡 P2 — Do when resuming feature work (velocity)

### 5. `main.jsx` is a 4,632-line monolith
- **Problem:** One component holds all state, handlers, and every page. Every change means navigating a giant file; risky to modify.
- **Fix (incremental, low-risk):**
  1. Extract each page (Dashboard, DataEntry, Reports, ComparePay, Payments, Prices, Setup) into its own file — one at a time, verifying after each.
  2. Pull shared data/state into a `useAppData()` hook.
  3. No big-bang rewrite — migrate page by page.
- **Effort:** ~2-3 days total, splittable into safe chunks.

### 6. `dist/` is hand-built and committed — ✅ DONE (2026-07-12)
- **Problem:** Every change needed a manual `vite build` + commit; a forgotten rebuild shipped stale UI.
- **Fixed:** `render.yaml` already builds on deploy (`npm install && npm run build`), so `frontend/dist/` is now git-ignored and removed from tracking. Render regenerates it every deploy — no more manual rebuild/commit dance. (Local dev uses `npm run dev`; run `npm run build` if serving the built app locally.)

---

## Suggested sequence

| When | Items |
|------|-------|
| **Today** | #1 Auth guard |
| **This week** | #2 Money precision · #4 Workflow guards |
| **Next** | #3 Tests → #6 Build automation → #5 Split `main.jsx` (as you touch each page) |
