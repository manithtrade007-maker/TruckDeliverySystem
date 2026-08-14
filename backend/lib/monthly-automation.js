const TIME_ZONE = "Asia/Phnom_Penh";

export function cambodiaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day), hour: Number(values.hour), minute: Number(values.minute), weekday: values.weekday };
}

function shiftMonth(year, month, offset) {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function scheduledBundleMonth(date = new Date()) {
  const local = cambodiaDateParts(date);
  if (local.day < 5 || (local.day === 5 && local.hour < 9)) return null;
  return shiftMonth(local.year, local.month, -1);
}

export function nextMonthlyBundleSchedule(date = new Date()) {
  const local = cambodiaDateParts(date);
  const thisMonthPending = local.day < 5 || (local.day === 5 && local.hour < 9);
  const scheduleMonth = shiftMonth(local.year, local.month, thisMonthPending ? 0 : 1);
  const [year, month] = scheduleMonth.split("-");
  return {
    bundleMonth: shiftMonth(Number(year), Number(month), -1),
    scheduledAt: `${scheduleMonth}-05T09:00:00+07:00`
  };
}

export function retryDelayMs(attempts) {
  if (attempts <= 1) return 60 * 60 * 1000;
  if (attempts === 2) return 3 * 60 * 60 * 1000;
  return 12 * 60 * 60 * 1000;
}
