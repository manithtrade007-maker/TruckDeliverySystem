// Fixed monthly garage fees per truck, applied to every report month from FIXED_GARAGE_FEE_FROM onward.
// Shared by the backend exports and the frontend Reports page.
export const FIXED_GARAGE_FEE_FROM = "2026-09";

export const FIXED_GARAGE_FEES = {
  "3F-5239": 136.5,
  "3B-4693": 136.5,
  "3E-0096": 91,
  "3E-5987": 91,
  "3F-6390": 45.5
};

export function fixedGarageFee(truckNo, month) {
  if (!month || month < FIXED_GARAGE_FEE_FROM) return null;
  return FIXED_GARAGE_FEES[truckNo] ?? null;
}

export function resolveGarageFee(truckNo, month, storedFee) {
  return fixedGarageFee(truckNo, month) ?? (Number(storedFee) || 0);
}
