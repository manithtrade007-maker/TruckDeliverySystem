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

### 2. Money precision is inconsistent
- **Problem:** `roundMoney()` (`backend/server.js:812`) is used on statement totals, but per-truck driver sums and the Compare Pay / earnings aggregations use raw float addition — hence display artifacts like `$850.5399999999998`. Errors accumulate; the `0.01` reconciliation tolerance is a band-aid.
- **Fix (near-term, pragmatic):** wrap every aggregation boundary in `roundMoney()` — driver-amount totals, Compare Pay `systemAmount`, earnings `kept`/`overpaid`/`net`. Removes both the display artifacts and practical accumulation.
- **Fix (robust, if volume grows):** store money as **integer cents** in the DB, format to dollars only on display.
- **Effort:** consistent `roundMoney` ~2-3 hrs; cents migration ~1-2 days.

---

## 🟠 P1 — Do soon (safety net)

### 3. No automated tests on financial math
- **Problem:** No tests anywhere. Prior calc bugs (`locationBaseKey`, dead recalculate code) prove these happen and stay invisible until a paycheck is wrong.
- **Fix:**
  1. Add Node's built-in `node --test` and a `"test"` script (no new dependencies).
  2. Cover money-critical pure functions: price matching / `findEffectivePrice`, driver-amount calc, `roundMoney`, reconciliation + earnings aggregation.
  3. Aim for ~15-20 focused tests — enough to catch regressions.
- **Effort:** ~1 day.

### 4. Workflow footguns / silent data loss
- **Problem:** Editing a delivery row then clicking **Finish** discards the unsaved edit with no warning (`finishStatement()` calls `resetDeliveryForm()` before saving). Changing Truck No also silently clears To Location, which can strand the user with a disabled "Update Row".
- **Fix:**
  1. Guard `finishStatement()` — warn or auto-save when a row edit is unsaved.
  2. Audit delete/overwrite paths for "are you sure / unsaved changes" prompts.
  3. Only clear `toLocation` on Truck No change when the truck type actually changes.
- **Effort:** ~half day.

---

## 🟡 P2 — Do when resuming feature work (velocity)

### 5. `main.jsx` is a 4,632-line monolith
- **Problem:** One component holds all state, handlers, and every page. Every change means navigating a giant file; risky to modify.
- **Fix (incremental, low-risk):**
  1. Extract each page (Dashboard, DataEntry, Reports, ComparePay, Payments, Prices, Setup) into its own file — one at a time, verifying after each.
  2. Pull shared data/state into a `useAppData()` hook.
  3. No big-bang rewrite — migrate page by page.
- **Effort:** ~2-3 days total, splittable into safe chunks.

### 6. `dist/` is hand-built and committed
- **Problem:** Every change needs a manual `vite build` + commit; a forgotten rebuild ships stale UI.
- **Fix:** move the build into Render's deploy step (build command runs `vite build`), then git-ignore `dist/`.
- **Effort:** ~1-2 hrs.

---

## Suggested sequence

| When | Items |
|------|-------|
| **Today** | #1 Auth guard |
| **This week** | #2 Money precision · #4 Workflow guards |
| **Next** | #3 Tests → #6 Build automation → #5 Split `main.jsx` (as you touch each page) |
