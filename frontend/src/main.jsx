import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button, Input, Select, Field, Panel, KpiCard, MetricCard, PageHead } from "./components/ui.jsx";
import { localDate, today, currentMonth, money, roundMoney, unitMoney, parseMoney, locationMatchKey, locationBaseKey, priceEffectiveDate, routeKey, CRANE_LOCATION_ORDER, NO_CRANE_LOCATION_ORDER, makeLocationSort, craneLocationSort, noCraneLocationSort, deliverySort, truckTypeLabel, formatDate, formatDateTime, monthName, groupPriceHistory } from "./lib/format.js";
import { getToken, getRole, setToken, setRole, api, downloadFile } from "./lib/api.js";
import { LoginPage } from "./components/LoginPage.jsx";
import { AppCtx } from "./AppContext.js";
import { ComparePayPage } from "./pages/ComparePayPage.jsx";
import { PaymentsPage } from "./pages/PaymentsPage.jsx";
import { SetupPage } from "./pages/SetupPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { DataEntryPage } from "./pages/DataEntryPage.jsx";
import { PricesPage } from "./pages/PricesPage.jsx";
import { ReportsPage } from "./pages/ReportsPage.jsx";
import "./styles.css";

function App() {
  const [loggedIn, setLoggedIn] = useState(Boolean(getToken()));
  const [userRole, setUserRole] = useState(getRole);
  const isAdmin = userRole === "admin";
  const [page, setPage] = useState("dashboard");
  const [data, setData] = useState({ settings: {}, trucks: [], prices: [], statements: [], deliveries: [] });
  const [selectedStatementId, setSelectedStatementId] = useState("");
  const [viewStatementId, setViewStatementId] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [reportMonth, setReportMonth] = useState(currentMonth());
  const [reconMonth, setReconMonth] = useState(currentMonth());
  const [reconEdits, setReconEdits] = useState({});
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportTruckNo, setReportTruckNo] = useState("");
  const [deductionEdits, setDeductionEdits] = useState({});
  const [assignModal, setAssignModal] = useState(null);
  const [activityPage, setActivityPage] = useState(0);
  const [deleteModal, setDeleteModal] = useState({ statement: null, password: "", error: "" });
  const [assignMonth, setAssignMonth] = useState(currentMonth());
  const [paymentsViewMonth, setPaymentsViewMonth] = useState(currentMonth());
  const [quickForm, setQuickForm] = useState({ statementNumber: "", month: currentMonth(), manualAmount: "" });
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [entryTruckType, setEntryTruckType] = useState("With Crane");
  const [entryActionTruckType, setEntryActionTruckType] = useState("");
  const [showStatementWorkspace, setShowStatementWorkspace] = useState(false);
  const [expandStatementEdit, setExpandStatementEdit] = useState(false);
  const [statementForm, setStatementForm] = useState({
    id: "",
    month: currentMonth(),
    truckType: "With Crane",
    statementNumber: "",
    statementDate: today()
  });
  const [deliveryForm, setDeliveryForm] = useState({
    id: "",
    deliveryDate: today(),
    invoiceNo: "",
    truckNo: "",
    fromLocation: "",
    toLocation: "",
    qtyTon: ""
  });
  const invoiceInputRef = useRef(null);
  const truckInputRef = useRef(null);
  const deliveryFormRef = useRef(null);
  const [activeField, setActiveField] = useState("");
  const [filters, setFilters] = useState({ statementNumber: "" });
  const [setupSection, setSetupSection] = useState("trucks");
  const [setupLocationSearch, setSetupLocationSearch] = useState("");
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [truckForm, setTruckForm] = useState({ truckNo: "", truckType: "With Crane", driverName: "", phone: "" });
  const [priceForm, setPriceForm] = useState({
    id: "",
    fromLocation: "",
    toLocation: "",
    truckType: "With Crane",
    distanceKm: "",
    companyUnitPrice: "",
    truckSalaryUnitPrice: "",
    effectiveDate: today()
  });
  const [driverPriceForm, setDriverPriceForm] = useState({
    id: "",
    fromLocation: "",
    toLocation: "",
    truckType: "With Crane",
    distanceKm: "",
    truckSalaryUnitPrice: "",
    effectiveDate: today()
  });
  const [bulkPriceForm, setBulkPriceForm] = useState({
    priceType: "company",
    truckType: "With Crane",
    fromLocation: "",
    effectiveDate: today(),
    locationsText: "",
    pricesText: "",
    driverPricesText: "",
    rowsText: ""
  });
  const [settingsForm, setSettingsForm] = useState({ companyName: "", defaultFromLocation: "" });
  const [staffUsers, setStaffUsers] = useState([]);
  const [newUserForm, setNewUserForm] = useState({ username: "", password: "", role: "staff" });
  const [editPasswordId, setEditPasswordId] = useState(null);
  const [editPasswordValue, setEditPasswordValue] = useState("");
  const [backupFiles, setBackupFiles] = useState([]);
  const [telegramConfigured, setTelegramConfigured] = useState(null);
  const [emptyPriceResult, setEmptyPriceResult] = useState(null);
  const [bulkLocationFilter, setBulkLocationFilter] = useState("");
  const [priceCompareDate, setPriceCompareDate] = useState(() => today());
  const [priceCompareProvince, setPriceCompareProvince] = useState("");
  const [pricePeriodsMonth, setPricePeriodsMonth] = useState(today().slice(0, 7));

  const selectedStatement = useMemo(
    () => data.statements.find((statement) => statement.id === selectedStatementId),
    [data.statements, selectedStatementId]
  );

  const selectedViewStatement = useMemo(
    () => data.statements.find((statement) => statement.id === viewStatementId),
    [data.statements, viewStatementId]
  );

  const statementRows = useMemo(
    () =>
      data.deliveries
        .filter((row) => row.statementId === selectedStatementId)
        .sort(deliverySort),
    [data.deliveries, selectedStatementId]
  );

  const viewStatementRows = useMemo(
    () =>
      data.deliveries
        .filter((row) => row.statementId === viewStatementId)
        .sort(deliverySort),
    [data.deliveries, viewStatementId]
  );

  const visibleStatements = useMemo(
    () => data.statements.filter((statement) => !(statement.status === "Draft" && Number(statement.rowCount || 0) === 0)),
    [data.statements]
  );

  const filteredStatements = useMemo(() => {
    const statementNumber = String(filters.statementNumber || "").trim();
    return visibleStatements
      .filter((statement) => statementNumber || !reportMonth || statement.month === reportMonth)
      .filter((statement) => !statementNumber || String(statement.statementNumber).includes(statementNumber))
      .sort((a, b) => b.month.localeCompare(a.month) || Number(b.statementNumber) - Number(a.statementNumber));
  }, [visibleStatements, filters, reportMonth]);

  const statementCounts = useMemo(() => {
    const month = reportMonth || statementForm.month || currentMonth();
    const rows = visibleStatements.filter((statement) => statement.month === month);
    const craneRows = rows.filter((statement) => statement.truckType === "With Crane");
    const noCraneRows = rows.filter((statement) => statement.truckType === "Without Crane");
    return {
      month,
      withCrane: craneRows.length,
      withoutCrane: noCraneRows.length,
      total: rows.length,
      craneAmount: craneRows.reduce((sum, s) => sum + Number(s.companyTotalAmount || 0), 0),
      noCraneAmount: noCraneRows.reduce((sum, s) => sum + Number(s.companyTotalAmount || 0), 0),
      totalAmount: rows.reduce((sum, s) => sum + Number(s.companyTotalAmount || 0), 0),
    };
  }, [visibleStatements, reportMonth, statementForm.month]);

  const truckOptions = useMemo(
    () => data.trucks.filter((truck) => selectedStatement && truck.active !== false && truck.truckType === selectedStatement.truckType),
    [data.trucks, selectedStatement]
  );

  const selectedTruck = data.trucks.find((truck) => truck.truckNo === deliveryForm.truckNo);
  const activeDeliveryTruckType = selectedTruck?.truckType || selectedStatement?.truckType || "";
  const locations = useMemo(
    () =>
      [
        ...new Set(
          data.prices
            .filter((price) => price.active !== false)
            .filter((price) => !activeDeliveryTruckType || price.truckType === activeDeliveryTruckType)
            .map((price) => price.toLocation)
            .filter(Boolean)
        )
      ].sort(),
    [data.prices, activeDeliveryTruckType]
  );

  const fromLocations = useMemo(
    () => [...new Set(data.prices.filter((p) => p.active !== false).map((p) => p.fromLocation).filter(Boolean))].sort(),
    [data.prices]
  );

  const selectedPrice = selectedTruck
    ? data.prices
        .filter((price) => price.active !== false)
        .filter((price) => price.fromLocation === data.settings.defaultFromLocation)
        .filter((price) => price.toLocation === deliveryForm.toLocation)
        .filter((price) => price.truckType === selectedTruck.truckType)
        .filter((price) => priceEffectiveDate(price) <= (deliveryForm.deliveryDate || today()))
        .sort((a, b) => priceEffectiveDate(b).localeCompare(priceEffectiveDate(a)))[0]
    : null;

  const totals = statementRows.reduce(
    (sum, row) => ({
      qty: sum.qty + Number(row.qtyTon || 0),
      amount: sum.amount + Number(row.companyTotalAmount || 0)
    }),
    { qty: 0, amount: 0 }
  );

  const viewTotals = viewStatementRows.reduce(
    (sum, row) => ({
      qty: sum.qty + Number(row.qtyTon || 0),
      amount: sum.amount + Number(row.companyTotalAmount || 0)
    }),
    { qty: 0, amount: 0 }
  );

  const monthlyRows = useMemo(
    () => {
      const activeTruckNos = new Set(data.trucks.map((truck) => truck.truckNo));
      return data.deliveries
        .filter((row) => !reportMonth || row.deliveryDate?.slice(0, 7) === reportMonth)
        .filter((row) => activeTruckNos.has(row.truckNo));
    },
    [data.deliveries, data.trucks, reportMonth]
  );

  const monthlyTotals = useMemo(
    () =>
      monthlyRows.reduce(
        (sum, row) => {
          const companyAmount = Number(row.companyTotalAmount || 0);
          const driverAmount = Number(row.truckSalaryAmount || 0);
          return {
            trips: sum.trips + 1,
            qty: sum.qty + Number(row.qtyTon || 0),
            companyAmount: sum.companyAmount + companyAmount,
            driverAmount: sum.driverAmount + driverAmount,
            margin: sum.margin + companyAmount - driverAmount
          };
        },
        { trips: 0, qty: 0, companyAmount: 0, driverAmount: 0, margin: 0 }
      ),
    [monthlyRows]
  );

  const truckPerformance = useMemo(() => {
    const byTruck = new Map();
    for (const truck of data.trucks) {
      byTruck.set(truck.truckNo, {
        truckNo: truck.truckNo,
        truckType: truck.truckType,
        driverName: truck.driverName,
        trips: 0,
        days: new Set(),
        qty: 0,
        companyAmount: 0,
        driverAmount: 0,
        margin: 0
      });
    }
    for (const row of monthlyRows) {
      if (!byTruck.has(row.truckNo)) continue;
      const item = byTruck.get(row.truckNo);
      const companyAmount = Number(row.companyTotalAmount || 0);
      const driverAmount = Number(row.truckSalaryAmount || 0);
      item.trips += 1;
      if (row.deliveryDate) item.days.add(row.deliveryDate);
      item.qty += Number(row.qtyTon || 0);
      item.companyAmount += companyAmount;
      item.driverAmount += driverAmount;
      item.margin += companyAmount - driverAmount;
    }
    return [...byTruck.values()]
      .map((item) => ({ ...item, workingDays: item.days.size }))
      .sort((a, b) => b.companyAmount - a.companyAmount || a.truckNo.localeCompare(b.truckNo));
  }, [data.trucks, monthlyRows]);

  const driverPaymentSections = useMemo(
    () =>
      truckPerformance
        .filter((truck) => truck.trips > 0)
        .map((truck) => ({
          ...truck,
          rows: monthlyRows
            .filter((row) => row.truckNo === truck.truckNo)
            .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
        })),
    [truckPerformance, monthlyRows]
  );

  const activeTruckCount = truckPerformance.filter((truck) => truck.trips > 0).length;

  const statementSummaries = useMemo(() => {
    const stmts = data.statements
      .filter((s) => s.month === reportMonth && !(s.status === "Draft" && Number(s.rowCount || 0) === 0))
      .sort((a, b) => Number(a.statementNumber) - Number(b.statementNumber));
    const driverByStatement = {};
    for (const row of data.deliveries) {
      if (row.deliveryDate?.slice(0, 7) === reportMonth) {
        driverByStatement[row.statementId] = (driverByStatement[row.statementId] || 0) + Number(row.truckSalaryAmount || 0);
      }
    }
    return stmts.map((s) => ({
      statementNumber: s.statementNumber,
      truckType: s.truckType,
      status: s.status,
      companyRevenue: Number(s.companyTotalAmount || 0),
      driverPayment: driverByStatement[s.id] || 0,
    }));
  }, [data.statements, data.deliveries, reportMonth]);

  const availableYears = useMemo(() => {
    const years = new Set();
    for (const row of data.deliveries) {
      const y = row.deliveryDate?.slice(0, 4);
      if (y) years.add(Number(y));
    }
    if (years.size === 0) years.add(new Date().getFullYear());
    return [...years].sort((a, b) => b - a);
  }, [data.deliveries]);

  const yearSummary = useMemo(() => {
    const year = String(reportYear);
    const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const months = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, "0");
      return { month: `${year}-${m}`, label: MONTH_LABELS[i], revenue: 0, driverCost: 0, net: 0 };
    });
    const monthMap = new Map(months.map(m => [m.month, m]));
    const byTruck = new Map();
    for (const row of data.deliveries) {
      const rowMonth = row.deliveryDate?.slice(0, 7);
      if (!rowMonth?.startsWith(year)) continue;
      const company = Number(row.companyTotalAmount || 0);
      const driver = Number(row.truckSalaryAmount || 0);
      if (monthMap.has(rowMonth)) {
        const mo = monthMap.get(rowMonth);
        mo.revenue += company;
        mo.driverCost += driver;
        mo.net += company - driver;
      }
      if (!byTruck.has(row.truckNo)) {
        const truck = data.trucks.find(t => t.truckNo === row.truckNo);
        byTruck.set(row.truckNo, { truckNo: row.truckNo, truckType: truck?.truckType || "", revenue: 0, driverCost: 0, net: 0, trips: 0 });
      }
      const t = byTruck.get(row.truckNo);
      t.revenue += company;
      t.driverCost += driver;
      t.net += company - driver;
      t.trips += 1;
    }
    const totalRevenue = months.reduce((s, m) => s + m.revenue, 0);
    const totalDriverCost = months.reduce((s, m) => s + m.driverCost, 0);
    const totalNet = totalRevenue - totalDriverCost;
    const activeMonths = months.filter(m => m.revenue > 0);
    const bestMonth = activeMonths.length ? activeMonths.reduce((best, m) => m.net > best.net ? m : best, activeMonths[0]) : null;
    const trucks = [...byTruck.values()].sort((a, b) => b.net - a.net);
    const maxMonthAbs = activeMonths.reduce((mx, m) => Math.max(mx, Math.abs(m.net)), 0);
    const maxTruckAbs = trucks.reduce((mx, t) => Math.max(mx, Math.abs(t.net)), 0);
    return { months, activeMonths, trucks, totalRevenue, totalDriverCost, totalNet, bestMonth, maxMonthAbs, maxTruckAbs };
  }, [data.deliveries, data.trucks, reportYear]);

  // Driver payment reconciliation — self-contained: reads deliveries only,
  // computes the system's gross driver amount per truck for the selected month.
  const reconciliation = useMemo(() => {
    const byTruck = new Map();
    for (const row of data.deliveries) {
      if (row.deliveryDate?.slice(0, 7) !== reconMonth) continue;
      if (!byTruck.has(row.truckNo)) {
        const truck = data.trucks.find((t) => t.truckNo === row.truckNo);
        byTruck.set(row.truckNo, { truckNo: row.truckNo, truckType: truck?.truckType || "", driverName: truck?.driverName || "", systemAmount: 0, trips: 0 });
      }
      const t = byTruck.get(row.truckNo);
      t.systemAmount += Number(row.truckSalaryAmount || 0);
      t.trips += 1;
    }
    return [...byTruck.values()]
      .map((t) => ({ ...t, systemAmount: roundMoney(t.systemAmount) }))
      .sort((a, b) => String(a.truckNo).localeCompare(String(b.truckNo)));
  }, [data.deliveries, data.trucks, reconMonth]);

  // Month-by-month earnings from the driver-payment discrepancies.
  // "kept" = money drivers under-counted (owner's gain); "overpaid" = over-counts.
  const earningsHistory = useMemo(() => {
    const TOL = 0.01;
    const reported = data.driverReportedPayments || [];
    if (reported.length === 0) return [];
    const sysByKey = new Map();
    for (const row of data.deliveries) {
      const m = row.deliveryDate?.slice(0, 7);
      if (!m) continue;
      const key = `${m}|${row.truckNo}`;
      sysByKey.set(key, (sysByKey.get(key) || 0) + Number(row.truckSalaryAmount || 0));
    }
    const byMonth = new Map();
    for (const r of reported) {
      const system = roundMoney(sysByKey.get(`${r.month}|${r.truckNo}`) || 0);
      const diff = roundMoney(system - Number(r.amount || 0));
      if (!byMonth.has(r.month)) byMonth.set(r.month, { month: r.month, checked: 0, mismatches: 0, kept: 0, overpaid: 0, net: 0 });
      const mo = byMonth.get(r.month);
      mo.checked += 1;
      if (Math.abs(diff) >= TOL) mo.mismatches += 1;
      if (diff > 0) mo.kept += diff;
      else if (diff < 0) mo.overpaid += -diff;
      mo.net += diff;
    }
    return [...byMonth.values()]
      .map((mo) => ({ ...mo, kept: roundMoney(mo.kept), overpaid: roundMoney(mo.overpaid), net: roundMoney(mo.net) }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [data.deliveries, data.driverReportedPayments]);

  const dashOutstanding = useMemo(() => {
    const allStatements = data.statements || [];
    const allPaymentMonths = data.paymentMonths || [];
    const thisMonth = currentMonth();
    const list = allStatements.filter((s) =>
      (s.paymentMonth && !allPaymentMonths.find((pm) => pm.month === s.paymentMonth && pm.received)) ||
      (!s.paymentMonth && s.month === thisMonth)
    );
    return { count: list.length, amount: list.reduce((sum, s) => sum + Number(s.companyTotalAmount || 0), 0) };
  }, [data.statements, data.paymentMonths]);

  const selectedDriverPaymentSection = driverPaymentSections.find((truck) => truck.truckNo === reportTruckNo);
  const isEditingTruck = data.trucks.some((truck) => truck.truckNo === truckForm.truckNo);
  const setupLocationSearchKey = locationMatchKey(setupLocationSearch);
  const matchesSetupLocationSearch = (value) => !setupLocationSearchKey || locationMatchKey(value).includes(setupLocationSearchKey);
  const filteredCompanyPrices = data.prices
    .filter((price) => price.truckType === priceForm.truckType)
    .filter((price) => matchesSetupLocationSearch(price.toLocation));
  const filteredDriverPrices = data.prices
    .filter((price) => price.truckType === driverPriceForm.truckType)
    .filter((price) => matchesSetupLocationSearch(price.toLocation));
  const companyPriceGroups = useMemo(() => groupPriceHistory(filteredCompanyPrices), [filteredCompanyPrices]);
  const driverPriceGroups = useMemo(() => groupPriceHistory(filteredDriverPrices), [filteredDriverPrices]);
  const activeCompanyPriceRows = useMemo(() => {
    const groups = new Map();
    data.prices
      .filter((price) => price.active !== false)
      .filter((price) => priceEffectiveDate(price) <= today())
      .forEach((price) => {
        const key = routeKey(price);
        const current = groups.get(key);
        if (!current || priceEffectiveDate(price) > priceEffectiveDate(current)) {
          groups.set(key, price);
        }
      });
    return [...groups.values()]
      .filter((price) => matchesSetupLocationSearch(price.toLocation))
      .sort((a, b) => a.truckType.localeCompare(b.truckType) || a.toLocation.localeCompare(b.toLocation));
  }, [data.prices, setupLocationSearchKey]);
  const activeCompanyPriceCounts = useMemo(() => ({
    withCrane: activeCompanyPriceRows.filter((price) => price.truckType === "With Crane").length,
    withoutCrane: activeCompanyPriceRows.filter((price) => price.truckType === "Without Crane").length,
    total: activeCompanyPriceRows.length
  }), [activeCompanyPriceRows]);
  const priceCompareRows = useMemo(() => {
    const craneMap = new Map();
    const noCraneMap = new Map();
    for (const price of data.prices) {
      if (price.active === false) continue;
      if (priceEffectiveDate(price) > priceCompareDate) continue;
      const key = locationBaseKey(price.toLocation);
      if (price.truckType === "With Crane") {
        const ex = craneMap.get(key);
        if (!ex || priceEffectiveDate(price) > priceEffectiveDate(ex)) craneMap.set(key, price);
      } else if (price.truckType === "Without Crane") {
        const ex = noCraneMap.get(key);
        if (!ex || priceEffectiveDate(price) > priceEffectiveDate(ex)) noCraneMap.set(key, price);
      }
    }
    const allKeys = new Set([...craneMap.keys(), ...noCraneMap.keys()]);
    const combinedOrder = [
      ...NO_CRANE_LOCATION_ORDER,
      ...CRANE_LOCATION_ORDER.filter((loc) => !NO_CRANE_LOCATION_ORDER.includes(loc))
    ];
    const rows = [...allKeys].map((key) => {
      const crane = craneMap.get(key) || null;
      const noCrane = noCraneMap.get(key) || null;
      return { key, canonicalName: (crane || noCrane).toLocation, crane, noCrane };
    });
    rows.sort((a, b) => {
      const ai = combinedOrder.indexOf(a.canonicalName);
      const bi = combinedOrder.indexOf(b.canonicalName);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.canonicalName.localeCompare(b.canonicalName);
    });
    return rows;
  }, [data.prices, priceCompareDate]);

  const priceCompareDates = useMemo(() => {
    const seen = new Set();
    const todayStr = today();
    for (const p of data.prices) {
      if (p.active === false) continue;
      const d = priceEffectiveDate(p);
      if (d <= todayStr) seen.add(d);
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [data.prices]);

  const priceCompareProvinces = useMemo(() => {
    const seen = [];
    const seenSet = new Set();
    for (const row of priceCompareRows) {
      const m = row.canonicalName.match(/\(([^)]+)\)$/);
      if (m && !seenSet.has(m[1])) { seenSet.add(m[1]); seen.push(m[1]); }
    }
    return seen;
  }, [priceCompareRows]);

  const pricePeriods = useMemo(() => {
    const monthStart = `${pricePeriodsMonth}-01`;
    const [y, m] = pricePeriodsMonth.split("-").map(Number);
    const monthEnd = `${pricePeriodsMonth}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
    const deliveriesInMonth = data.deliveries.filter(
      (d) => d.deliveryDate >= monthStart && d.deliveryDate <= monthEnd
    );
    if (deliveriesInMonth.length === 0) return [];
    // Group deliveries by the effective price date applied to them
    const periodMap = new Map();
    for (const d of deliveriesInMonth) {
      const price = data.prices
        .filter((p) => p.active !== false && p.fromLocation === (data.settings.defaultFromLocation || d.fromLocation) && locationBaseKey(p.toLocation) === locationBaseKey(d.toLocation) && p.truckType === d.truckType)
        .filter((p) => priceEffectiveDate(p) <= d.deliveryDate)
        .sort((a, b) => priceEffectiveDate(b).localeCompare(priceEffectiveDate(a)))[0];
      const effectiveKey = price ? priceEffectiveDate(price) : "unknown";
      if (!periodMap.has(effectiveKey)) periodMap.set(effectiveKey, { effectiveDate: effectiveKey, deliveries: [] });
      periodMap.get(effectiveKey).deliveries.push(d);
    }
    const knownPeriods = [...periodMap.values()]
      .filter((p) => p.effectiveDate !== "unknown" && /^\d{4}-\d{2}-\d{2}$/.test(p.effectiveDate))
      .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
    const unknownPeriod = periodMap.get("unknown");
    // Calculate date ranges: each period ends the day before the next period starts
    const result = knownPeriods.map((p, i) => {
      const next = knownPeriods[i + 1];
      let rangeEnd = monthEnd;
      if (next) {
        const d = new Date(next.effectiveDate);
        d.setDate(d.getDate() - 1);
        if (!isNaN(d.getTime())) rangeEnd = d.toISOString().slice(0, 10);
      }
      const stmtIds = [...new Set(p.deliveries.map((d) => d.statementId))];
      const stmts = stmtIds.map((id) => data.statements.find((s) => s.id === id)).filter(Boolean);
      return { effectiveDate: p.effectiveDate, rangeStart: p.effectiveDate, rangeEnd, deliveryCount: p.deliveries.length, statements: stmts };
    });
    if (unknownPeriod) {
      const stmtIds = [...new Set(unknownPeriod.deliveries.map((d) => d.statementId))];
      const stmts = stmtIds.map((id) => data.statements.find((s) => s.id === id)).filter(Boolean);
      result.push({ effectiveDate: "unknown", rangeStart: null, rangeEnd: null, deliveryCount: unknownPeriod.deliveries.length, statements: stmts });
    }
    return result;
  }, [data.deliveries, data.prices, data.statements, data.settings.defaultFromLocation, pricePeriodsMonth]);

  const bulkPriceRows = useMemo(() => {
    const priceType = bulkPriceForm.priceType;
    const fromLocation = bulkPriceForm.fromLocation || data.settings.defaultFromLocation;
    const routeMap = new Map();
    data.prices
      .filter((price) => price.fromLocation === fromLocation)
      .filter((price) => price.truckType === bulkPriceForm.truckType)
      .forEach((price) => {
        const key = locationBaseKey(price.toLocation);
        const existing = routeMap.get(key);
        if (!existing || priceEffectiveDate(price) > priceEffectiveDate(existing)) routeMap.set(key, price);
      });
    const seenPastedLocations = new Map();
    const locationLines = (bulkPriceForm.locationsText || bulkPriceForm.rowsText)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const priceLines = bulkPriceForm.pricesText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const driverPriceLines = bulkPriceForm.driverPricesText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    return locationLines.map((locationText, index) => {
        const locationKey = locationBaseKey(locationText);
        const matchedRoute = routeMap.get(locationKey);
        const isValidFormat = /^\s*(KH\.|D\.)/i.test(locationText.trim());
        const matchedLocation = matchedRoute?.toLocation || (isValidFormat ? locationText.trim() : "");
        const duplicateLine = seenPastedLocations.get(locationKey);
        if (!duplicateLine) seenPastedLocations.set(locationKey, index + 1);
        const companyPriceText = priceLines[index] || "";
        const driverPriceText = priceType === "both" ? driverPriceLines[index] || "" : companyPriceText;
        const companyUnitPrice = priceType === "driver" ? "" : parseMoney(companyPriceText);
        const truckSalaryUnitPrice = priceType === "company" ? "" : parseMoney(driverPriceText);
        const currentPrice = data.prices
          .filter((price) => price.active !== false)
          .filter((price) => price.fromLocation === fromLocation)
          .filter((price) => price.toLocation === matchedLocation)
          .filter((price) => price.truckType === bulkPriceForm.truckType)
          .filter((price) => priceEffectiveDate(price) <= bulkPriceForm.effectiveDate)
          .sort((a, b) => priceEffectiveDate(b).localeCompare(priceEffectiveDate(a)))[0];
        const distanceKm = currentPrice?.distanceKm || "";
        const hasRequiredPrices = (priceType === "driver" || companyUnitPrice !== "") && (priceType === "company" || truckSalaryUnitPrice !== "");
        const oldPrice = priceType === "driver" ? currentPrice?.truckSalaryUnitPrice : currentPrice?.companyUnitPrice;
        const newPrice = priceType === "driver" ? truckSalaryUnitPrice : companyUnitPrice;
        const samePrice =
          priceType === "both"
            ? Number(currentPrice?.companyUnitPrice || 0) === Number(companyUnitPrice || 0) &&
              Number(currentPrice?.truckSalaryUnitPrice || 0) === Number(truckSalaryUnitPrice || 0)
            : Number(oldPrice || 0) === Number(newPrice || 0);
        const oldComparePrice = priceType === "both" ? currentPrice?.companyUnitPrice : oldPrice;
        const newComparePrice = priceType === "both" ? companyUnitPrice : newPrice;
        const difference = Number(newComparePrice || 0) - Number(oldComparePrice || 0);
        const compareText = !matchedLocation
          ? "Location not found"
          : !hasRequiredPrices
            ? "Missing price"
            : samePrice
              ? "Same price"
              : difference > 0
            ? `Up $${money(difference)}`
            : `Down $${money(Math.abs(difference))}`;
        const statusText = duplicateLine
          ? `Duplicate of line ${duplicateLine}`
          : !matchedLocation
            ? "Check location"
            : !hasRequiredPrices
              ? "Check price"
              : "Approve";
        return {
          line: index + 1,
          rawLocation: locationText || "",
          toLocation: matchedLocation || "",
          distanceKm: distanceKm || currentPrice?.distanceKm || "",
          companyUnitPrice,
          truckSalaryUnitPrice,
          currentCompanyUnitPrice: currentPrice?.companyUnitPrice || 0,
          currentTruckSalaryUnitPrice: currentPrice?.truckSalaryUnitPrice || 0,
          oldPrice: oldPrice || 0,
          newPrice: newPrice === "" ? "" : newPrice,
          compareText,
          statusText,
          valid: Boolean(!duplicateLine && matchedLocation && hasRequiredPrices)
        };
      });
  }, [bulkPriceForm, data.prices, data.settings.defaultFromLocation]);

  const bulkExistingDates = useMemo(() => {
    const fromLocation = bulkPriceForm.fromLocation || data.settings.defaultFromLocation;
    const seen = new Set();
    data.prices
      .filter((p) => p.fromLocation === fromLocation && p.truckType === bulkPriceForm.truckType && p.active !== false)
      .forEach((p) => seen.add(priceEffectiveDate(p)));
    return [...seen].sort((a, b) => b.localeCompare(a));
  }, [bulkPriceForm.fromLocation, bulkPriceForm.truckType, data.prices, data.settings.defaultFromLocation]);

  const bulkLocationChoices = useMemo(() => {
    const fromLocation = bulkPriceForm.fromLocation || data.settings.defaultFromLocation;
    const seen = new Set();
    const result = [];
    data.prices
      .filter((p) => p.fromLocation === fromLocation && p.truckType === bulkPriceForm.truckType && p.active !== false)
      .forEach((p) => {
        const key = locationBaseKey(p.toLocation);
        if (!seen.has(key)) { seen.add(key); result.push(p.toLocation); }
      });
    result.sort(bulkPriceForm.truckType === "With Crane" ? craneLocationSort : noCraneLocationSort);
    if (!bulkLocationFilter.trim()) return result;
    const fk = locationMatchKey(bulkLocationFilter);
    return result.filter((loc) => locationMatchKey(loc).includes(fk));
  }, [bulkPriceForm.fromLocation, bulkPriceForm.truckType, data.prices, data.settings.defaultFromLocation, bulkLocationFilter]);

  const isDraft = selectedStatement?.status === "Draft";
  const isEditingDelivery = Boolean(deliveryForm.id);
  const canEditRows = Boolean(selectedStatement) && isDraft;
  // Are there unsaved changes to the row currently open in the edit form?
  // Used to stop Finish from silently discarding an in-progress edit.
  const editingSavedRow = isEditingDelivery ? data.deliveries.find((row) => row.id === deliveryForm.id) : null;
  const deliveryFormDirty = Boolean(editingSavedRow) && (
    ["deliveryDate", "invoiceNo", "truckNo", "toLocation"].some(
      (key) => String(deliveryForm[key] ?? "") !== String(editingSavedRow[key] ?? "")
    ) || Number(deliveryForm.qtyTon || 0) !== Number(editingSavedRow.qtyTon || 0)
  );
  const duplicateInvoiceRow = Boolean(deliveryForm.invoiceNo)
    ? data.deliveries.find((row) => row.invoiceNo === deliveryForm.invoiceNo && row.id !== deliveryForm.id)
    : null;
  const duplicateInvoice = Boolean(duplicateInvoiceRow);
  const duplicateInvoiceStatement = duplicateInvoiceRow
    ? data.statements.find((s) => s.id === duplicateInvoiceRow.statementId)
    : null;
  const typedTruck = Boolean(deliveryForm.truckNo);
  const truckMissing = typedTruck && !selectedTruck;
  const truckTypeMismatch = Boolean(selectedTruck && selectedStatement && selectedTruck.truckType !== selectedStatement.truckType);
  const priceLookupReady = Boolean(deliveryForm.deliveryDate && selectedTruck && deliveryForm.toLocation);
  const missingPrice = priceLookupReady && !selectedPrice;
  const deliveryFormReady = Boolean(
    deliveryForm.deliveryDate &&
    deliveryForm.invoiceNo.length === 10 &&
    selectedTruck &&
    deliveryForm.toLocation &&
    Number(deliveryForm.qtyTon || 0) > 0
  );
  const canFinishStatement = Boolean(selectedStatement && isDraft && statementRows.length > 0);
  const canSaveDelivery =
    canEditRows &&
    deliveryFormReady &&
    (isEditingDelivery || statementRows.length < 30) &&
    !duplicateInvoice &&
    !truckMissing &&
    !truckTypeMismatch &&
    !missingPrice;

  function flash(text, type = "success") {
    setNotice({ text, type });
    setTimeout(() => setNotice({ text: "", type: "" }), 5000);
  }

  async function loadData() {
    const next = await api("/api/data");
    setData(next);
    setSettingsForm({
      companyName: next.settings.companyName || "",
      defaultFromLocation: next.settings.defaultFromLocation || "",
      deletePassword: next.settings.deletePassword || ""
    });
    setPriceForm((current) => ({ ...current, fromLocation: current.fromLocation || next.settings.defaultFromLocation || "" }));
    setDeliveryForm((current) => ({ ...current, fromLocation: current.fromLocation || next.settings.defaultFromLocation || "" }));
    loadBackups().catch(() => {});
    checkTelegramStatus().catch(() => {});
  }

  async function loadBackups() {
    const result = await api("/api/backup/list");
    setBackupFiles(result.files || []);
  }

  useEffect(() => {
    const handleAuthLogout = () => setLoggedIn(false);
    window.addEventListener("auth-logout", handleAuthLogout);
    return () => window.removeEventListener("auth-logout", handleAuthLogout);
  }, []);


  useEffect(() => {
    if (loggedIn) loadData().catch((err) => flash(err.message, "error"));
  }, [loggedIn]);

  useEffect(() => {
    if (page === "setup") loadStaffUsers();
  }, [page]);

  useEffect(() => {
    if (setupSection === "users") loadStaffUsers();
  }, [setupSection]);

  useEffect(() => {
    const edits = {};
    for (const d of (data.truckDeductions || [])) {
      if (d.month === reportMonth) {
        edits[d.truckNo] = { loanDeduction: String(d.loanDeduction ?? 0), garageFee: String(d.garageFee ?? 0) };
      }
    }
    setDeductionEdits(edits);
  }, [data.truckDeductions, reportMonth]);

  useEffect(() => {
    const edits = {};
    for (const r of (data.driverReportedPayments || [])) {
      if (r.month === reconMonth) edits[r.truckNo] = String(r.amount ?? "");
    }
    setReconEdits(edits);
  }, [data.driverReportedPayments, reconMonth]);

  function openStatement(statement) {
    setViewStatementId("");
    setEntryTruckType(statement.truckType);
    setShowStatementWorkspace(true);
    setExpandStatementEdit(false);
    setSelectedStatementId(statement.id);
    setStatementForm({
      id: statement.id,
      month: statement.month,
      truckType: statement.truckType,
      statementNumber: statement.statementNumber,
      statementDate: statement.statementDate
    });
    resetDeliveryForm();
  }

  function viewStatement(statement) {
    setSelectedStatementId("");
    setViewStatementId(statement.id);
    setEntryTruckType(statement.truckType);
    setEntryActionTruckType("");
    setShowStatementWorkspace(false);
    setReportMonth(statement.month);
    resetDeliveryForm();
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  async function saveStatement(event) {
    event.preventDefault();
    try {
      const wasNew = !statementForm.id;
      const statement = await api("/api/statements", { method: "POST", body: JSON.stringify({ ...statementForm, truckType: entryTruckType }) });
      setSelectedStatementId(statement.id);
      setStatementForm({ ...statement, id: statement.id });
      await loadData();
      resetDeliveryForm();
      if (wasNew) {
        flash(`Statement ${statement.statementNumber} created. Add delivery rows until you finish this statement.`);
      } else {
        flash("Statement updated.");
      }
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function cleanupEmptyDraftStatements() {
    try {
      const result = await api("/api/statements/empty-drafts", { method: "DELETE" });
      if (result.deleted > 0) await loadData();
      return result.deleted || 0;
    } catch (err) {
      flash(err.message, "error");
      return 0;
    }
  }

  async function newStatement() {
    await cleanupEmptyDraftStatements();
    const month = statementForm.month || currentMonth();
    const truckType = entryTruckType;
    setSelectedStatementId("");
    setViewStatementId("");
    setShowStatementWorkspace(false);
    resetDeliveryForm();
    setStatementForm({ id: "", month, truckType, statementNumber: "", statementDate: today() });
  }

  async function backToStatementList() {
    const deleted = await cleanupEmptyDraftStatements();
    const month = statementForm.month || reportMonth || currentMonth();
    const truckType = entryTruckType;
    setSelectedStatementId("");
    setViewStatementId("");
    setShowStatementWorkspace(false);
    resetDeliveryForm();
    setStatementForm({ id: "", month, truckType, statementNumber: "", statementDate: today() });
    if (deleted > 0) flash("Empty draft statement removed.");
  }

  async function getNextStatementNumber(month) {
    const result = await api(`/api/next-statement-number?month=${encodeURIComponent(month)}`);
    return result.nextStatementNumber;
  }

  async function startEntryAction(truckType) {
    await switchEntryTruckType(truckType);
    setEntryActionTruckType(truckType);
  }

  async function createEntryStatement(truckType) {
    await cleanupEmptyDraftStatements();
    const month = statementForm.month || reportMonth || currentMonth();
    const statementNumber = await getNextStatementNumber(month);
    setEntryTruckType(truckType);
    setSelectedStatementId("");
    setViewStatementId("");
    resetDeliveryForm();
    setStatementForm({ id: "", month, truckType, statementNumber, statementDate: today() });
    setShowStatementWorkspace(true);
    setEntryActionTruckType("");
    requestAnimationFrame(() => document.getElementById("statement-form-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function switchEntryTruckType(truckType) {
    await cleanupEmptyDraftStatements();
    setEntryTruckType(truckType);
    setSelectedStatementId("");
    setViewStatementId("");
    setShowStatementWorkspace(false);
    resetDeliveryForm();
    const month = statementForm.month || reportMonth || currentMonth();
    setStatementForm({ id: "", month, truckType, statementNumber: "", statementDate: today() });
  }

  async function finishStatement() {
    if (!selectedStatement) return;
    if (statementRows.length < 1) {
      flash("Add at least one delivery row before finishing this statement.", "error");
      return;
    }
    // Don't silently throw away an in-progress row edit (the old edit -> Finish bug).
    if (deliveryFormDirty) {
      flash('You have unsaved changes to a row. Click "Update Row" to save them, or "Cancel" to discard, before finishing.', "error");
      deliveryFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const finishedStatementId = selectedStatement.id;
    const finishedMonth = selectedStatement.month;
    const finishedTruckType = selectedStatement.truckType;
    try {
      setPage("data-entry");
      setEntryTruckType(finishedTruckType);
      setEntryActionTruckType("");
      setSelectedStatementId("");
      setViewStatementId("");
      setShowStatementWorkspace(false);
      setReportMonth(finishedMonth);
      resetDeliveryForm();
      setStatementForm({
        id: "",
        month: finishedMonth,
        truckType: finishedTruckType,
        statementNumber: "",
        statementDate: today()
      });
      await api(`/api/statements/${finishedStatementId}/finish`, { method: "POST" });
      await loadData();
      setSelectedStatementId("");
      setShowStatementWorkspace(false);
      setStatementForm({
        id: "",
        month: finishedMonth,
        truckType: finishedTruckType,
        statementNumber: "",
        statementDate: today()
      });
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      flash("Statement finished and saved.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function reopenStatement() {
    if (!selectedStatement) return;
    try {
      await api(`/api/statements/${selectedStatement.id}/reopen`, { method: "POST" });
      await loadData();
      flash("Statement reopened. You can edit delivery rows now.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function deleteStatement(statement) {
    setDeleteModal({ statement, password: "", error: "" });
  }

  async function confirmDeleteStatement() {
    const { statement, password } = deleteModal;
    try {
      await api(`/api/statements/${statement.id}`, {
        method: "DELETE",
        headers: { "x-delete-password": password }
      });
      setDeleteModal({ statement: null, password: "", error: "" });
      if (selectedStatementId === statement.id) {
        setSelectedStatementId("");
        setStatementForm({ id: "", month: statement.month, truckType: "With Crane", statementNumber: "", statementDate: today() });
        resetDeliveryForm();
      }
      await loadData();
      flash("Statement deleted.");
    } catch (err) {
      setDeleteModal((prev) => ({ ...prev, error: err.message }));
    }
  }

  async function saveDelivery(event) {
    event.preventDefault();
    try {
      if (duplicateInvoice) throw new Error(`Invoice number already exists in Statement ${duplicateInvoiceStatement?.statementNumber ?? "unknown"}. Check before saving.`);
      if (truckMissing) throw new Error("Truck number does not exist or is inactive.");
      if (truckTypeMismatch) throw new Error(`Truck ${deliveryForm.truckNo} is not allowed in this ${truckTypeLabel(selectedStatement.truckType)} statement.`);
      if (missingPrice) throw new Error(`No active price found for ${deliveryForm.toLocation} on ${formatDate(deliveryForm.deliveryDate)}.`);
      await api("/api/deliveries", {
        method: "POST",
        body: JSON.stringify({ ...deliveryForm, statementId: selectedStatementId })
      });
      const wasEditing = isEditingDelivery;
      resetDeliveryForm(deliveryForm.deliveryDate);
      await loadData();
      flash(wasEditing ? "Delivery row updated." : statementRows.length + 1 >= 30 ? "Statement reached 30 rows. Create the next statement." : "Delivery saved.");
      requestAnimationFrame(() => invoiceInputRef.current?.focus());
    } catch (err) {
      flash(err.message, "error");
    }
  }

  function editDelivery(row) {
    setDeliveryForm({
      id: row.id,
      createdAt: row.createdAt,
      deliveryDate: row.deliveryDate,
      invoiceNo: row.invoiceNo,
      truckNo: row.truckNo,
      fromLocation: row.fromLocation || data.settings.defaultFromLocation || "",
      toLocation: row.toLocation,
      qtyTon: row.qtyTon
    });
    requestAnimationFrame(() => {
      deliveryFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      invoiceInputRef.current?.focus();
    });
  }

  function resetDeliveryForm(deliveryDate = today()) {
    setDeliveryForm({ id: "", deliveryDate, invoiceNo: "", truckNo: "", fromLocation: data.settings.defaultFromLocation || "", toLocation: "", qtyTon: "" });
    setActiveField("");
  }

  async function deleteDelivery(row) {
    const ok = window.confirm(`Delete invoice ${row.invoiceNo}?`);
    if (!ok) return;
    try {
      await api(`/api/deliveries/${row.id}`, { method: "DELETE" });
      if (deliveryForm.id === row.id) resetDeliveryForm();
      await loadData();
      flash("Delivery row deleted.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function saveDeduction(truckNo) {
    const edits = deductionEdits[truckNo] || {};
    try {
      await api("/api/truck-deductions", {
        method: "POST",
        body: JSON.stringify({
          truckNo,
          month: reportMonth,
          loanDeduction: Number(edits.loanDeduction) || 0,
          garageFee: Number(edits.garageFee) || 0
        })
      });
      await loadData();
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function saveReported(truckNo) {
    const raw = reconEdits[truckNo];
    const isBlank = raw === "" || raw == null;
    try {
      await api("/api/driver-reported-payments", {
        method: "POST",
        body: JSON.stringify({
          truckNo,
          month: reconMonth,
          amount: isBlank ? "" : Number(raw) || 0
        })
      });
      await loadData();
    } catch (err) {
      flash(err.message, "error");
    }
  }

  function getDeduction(truckNo) {
    const edits = deductionEdits[truckNo] || {};
    return {
      loanDeduction: edits.loanDeduction ?? "0",
      garageFee: edits.garageFee ?? "0"
    };
  }

  async function clearHighlights() {
    try {
      await api("/api/deliveries/clear-highlights", { method: "POST", body: JSON.stringify({ statementId: selectedStatementId }) });
      await loadData();
      flash("Highlights cleared.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function saveTruck(event) {
    event.preventDefault();
    try {
      await api("/api/trucks", { method: "POST", body: JSON.stringify(truckForm) });
      setTruckForm({ truckNo: "", truckType: "With Crane", driverName: "", phone: "" });
      await loadData();
      flash("Truck saved.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function deleteTruck(truck) {
    const ok = window.confirm(`Delete truck ${truck.truckNo}? If it has delivery history, it will be deactivated instead of permanently deleted.`);
    if (!ok) return;
    try {
      const result = await api(`/api/trucks/${encodeURIComponent(truck.truckNo)}`, { method: "DELETE" });
      if (truckForm.truckNo === truck.truckNo) setTruckForm({ truckNo: "", truckType: "With Crane", driverName: "", phone: "" });
      await loadData();
      flash(result.action === "deactivated" ? "Truck deactivated because it has delivery history." : "Truck deleted.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function savePrice(event) {
    event.preventDefault();
    try {
      const existingPrice = data.prices.find((price) => price.id === priceForm.id);
      await api("/api/prices", {
        method: "POST",
        body: JSON.stringify({
          ...priceForm,
          truckSalaryUnitPrice: priceForm.truckSalaryUnitPrice || existingPrice?.truckSalaryUnitPrice || 0
        })
      });
      setPriceForm({
        id: "",
        fromLocation: data.settings.defaultFromLocation || "",
        toLocation: "",
        truckType: "With Crane",
        distanceKm: "",
        companyUnitPrice: "",
        truckSalaryUnitPrice: "",
        effectiveDate: priceCompareDates[priceCompareDates.length - 1] || today()
      });
      await loadData();
      flash("Price saved.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function saveDriverPrice(event) {
    event.preventDefault();
    try {
      const existingPrice = data.prices.find((price) => price.id === driverPriceForm.id);
      await api("/api/prices", {
        method: "POST",
        body: JSON.stringify({
          id: driverPriceForm.id,
          fromLocation: driverPriceForm.fromLocation,
          toLocation: driverPriceForm.toLocation,
          truckType: driverPriceForm.truckType,
          distanceKm: driverPriceForm.distanceKm,
          effectiveDate: driverPriceForm.effectiveDate,
          companyUnitPrice: existingPrice?.companyUnitPrice || 0,
          truckSalaryUnitPrice: driverPriceForm.truckSalaryUnitPrice
        })
      });
      setDriverPriceForm({
        id: "",
        fromLocation: data.settings.defaultFromLocation || "",
        toLocation: "",
        truckType: "With Crane",
        distanceKm: "",
        truckSalaryUnitPrice: "",
        effectiveDate: priceCompareDates[priceCompareDates.length - 1] || today()
      });
      await loadData();
      flash("Driver price saved.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function applyBulkPriceUpdate() {
    try {
      const invalidRows = bulkPriceRows.filter((row) => !row.valid);
      if (invalidRows.length > 0) {
        throw new Error(`Please fix ${invalidRows.length} row${invalidRows.length > 1 ? "s" : ""} before applying bulk prices.`);
      }
      const rows = bulkPriceRows.filter((row) => row.valid);
      if (rows.length < 1) throw new Error("Paste at least one valid price row.");
      const ok = window.confirm(`Apply ${rows.length} price row${rows.length > 1 ? "s" : ""} effective ${formatDate(bulkPriceForm.effectiveDate)}?`);
      if (!ok) return;
      const result = await api("/api/prices/bulk", {
        method: "POST",
        body: JSON.stringify({
          priceType: bulkPriceForm.priceType,
          truckType: bulkPriceForm.truckType,
          fromLocation: bulkPriceForm.fromLocation || data.settings.defaultFromLocation,
          effectiveDate: bulkPriceForm.effectiveDate,
          rows
        })
      });
      await loadData();
      setBulkPriceForm((current) => ({ ...current, locationsText: "", pricesText: "", driverPricesText: "", rowsText: "" }));
      flash(`Bulk price update saved: ${result.added} added, ${result.updated} updated${result.recalculatedDeliveries ? `, ${result.recalculatedDeliveries} delivery rows recalculated` : ""}.`);
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function deleteNonstandardFormatPrices() {
    const ok = window.confirm('Delete ALL price entries where location does NOT start with "KH." or "D."? Only standard-format entries are kept. A backup is created automatically.');
    if (!ok) return;
    try {
      const result = await api("/api/prices/delete-nonstandard-format", { method: "POST" });
      await loadData();
      setBulkLocationFilter("");
      flash(`Deleted ${result.deleted} non-standard format price entries.`);
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function deletePricesByDate() {
    const truckLabel = bulkPriceForm.truckType === "With Crane" ? "Crane" : "No Crane";
    const dateLabel = formatDate(bulkPriceForm.effectiveDate);
    const ok = window.confirm(`Delete ALL ${truckLabel} price entries effective ${dateLabel}? This cannot be undone (a backup is created automatically).`);
    if (!ok) return;
    try {
      const result = await api("/api/prices/delete-by-date", {
        method: "POST",
        body: JSON.stringify({ truckType: bulkPriceForm.truckType, effectiveDate: bulkPriceForm.effectiveDate })
      });
      await loadData();
      flash(`Deleted ${result.deleted} ${truckLabel} price entries for ${dateLabel}.`);
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function deletePrice(price) {
    const ok = window.confirm(`Delete price for ${price.toLocation} (${truckTypeLabel(price.truckType)})? If it has delivery history, it will be deactivated instead of permanently deleted.`);
    if (!ok) return;
    try {
      const result = await api(`/api/prices/${encodeURIComponent(price.id)}`, { method: "DELETE" });
      if (priceForm.id === price.id) {
        setPriceForm({ id: "", fromLocation: data.settings.defaultFromLocation || "", toLocation: "", truckType: "With Crane", distanceKm: "", companyUnitPrice: "", truckSalaryUnitPrice: "", effectiveDate: priceCompareDates[priceCompareDates.length - 1] || today() });
      }
      if (driverPriceForm.id === price.id) {
        setDriverPriceForm({ id: "", fromLocation: data.settings.defaultFromLocation || "", toLocation: "", truckType: "With Crane", distanceKm: "", truckSalaryUnitPrice: "", effectiveDate: priceCompareDates[priceCompareDates.length - 1] || today() });
      }
      await loadData();
      flash(result.action === "deactivated" ? "Price deactivated and kept for history." : "Price deleted.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function loadStaffUsers() {
    if (!isAdmin) return;
    try { setStaffUsers(await api("/api/users")); } catch {}
  }

  async function createStaffUser(e) {
    e.preventDefault();
    try {
      await api("/api/users", { method: "POST", body: JSON.stringify(newUserForm) });
      setNewUserForm({ username: "", password: "", role: "staff" });
      await loadStaffUsers();
      flash("User created.");
    } catch (err) { flash(err.message, "error"); }
  }

  async function deleteStaffUser(id) {
    if (!window.confirm("Delete this user? They will be logged out immediately.")) return;
    try {
      await api(`/api/users/${id}`, { method: "DELETE" });
      await loadStaffUsers();
      flash("User deleted.");
    } catch (err) { flash(err.message, "error"); }
  }

  async function saveStaffPassword(id) {
    try {
      await api(`/api/users/${id}/password`, { method: "PUT", body: JSON.stringify({ password: editPasswordValue }) });
      setEditPasswordId(null);
      setEditPasswordValue("");
      flash("Password updated.");
    } catch (err) { flash(err.message, "error"); }
  }

  async function saveSettings(event) {
    event.preventDefault();
    try {
      await api("/api/settings", { method: "POST", body: JSON.stringify(settingsForm) });
      await loadData();
      flash("Settings saved.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function createManualBackup() {
    try {
      const result = await api("/api/backup/create", { method: "POST" });
      await loadBackups();
      flash(`Backup created: ${result.fileName}`);
    } catch (err) {
      flash(err.message, "error");
    }
  }

  function downloadBackup() {
    downloadFile("/api/backup/download").catch((err) => flash(err.message, "error"));
  }

  async function sendToTelegram() {
    try {
      await api("/api/backup/send-telegram", { method: "POST" });
      flash("Backup sent to Telegram successfully.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function checkTelegramStatus() {
    try {
      const result = await api("/api/telegram/status");
      setTelegramConfigured(result.configured);
    } catch {
      setTelegramConfigured(false);
    }
  }

  async function recalculateAllPrices() {
    const ok = window.confirm("Recalculate driver prices for all delivery rows? This updates driver payment amounts based on the current price list.");
    if (!ok) return;
    try {
      const result = await api("/api/recalculate", { method: "POST" });
      await loadData();
      flash(`Recalculated ${result.recalculatedDeliveries} delivery row${result.recalculatedDeliveries !== 1 ? "s" : ""}.`);
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function diagnoseEmptyPrices() {
    try {
      const result = await api("/api/diagnose-empty-prices");
      const dCrane = (result.missingDriver || {})["With Crane"] || [];
      const dNoCrane = (result.missingDriver || {})["Without Crane"] || [];
      const cCrane = (result.missingCompany || {})["With Crane"] || [];
      const cNoCrane = (result.missingCompany || {})["Without Crane"] || [];
      const total = dCrane.length + dNoCrane.length + cCrane.length + cNoCrane.length;
      if (total === 0) {
        flash("All locations have both company and driver prices set. Nothing missing.");
        return;
      }
      setEmptyPriceResult({ dCrane, dNoCrane, cCrane, cNoCrane });
    } catch (err) {
      flash(err.message, "error");
    }
  }

  function goToEmptyPrice(location, section) {
    setEmptyPriceResult(null);
    setPage("setup");
    setSetupSection(section);
    setSetupLocationSearch(location);
  }

  async function normalizeLocationSpacing() {
    const ok = window.confirm('Fix location names that have an extra space after "KH." or "D." prefix (e.g. "KH. Kambol" → "KH.Kambol")? This updates both the price list and delivery records.');
    if (!ok) return;
    try {
      const result = await api("/api/prices/normalize-location-spacing", { method: "POST" });
      await loadData();
      const total = result.fixedPrices + result.fixedDeliveries;
      if (total === 0) flash("All location names already have correct spacing. Nothing to fix.");
      else flash(`Fixed spacing in ${result.fixedPrices} price entr${result.fixedPrices !== 1 ? "ies" : "y"} and ${result.fixedDeliveries} deliver${result.fixedDeliveries !== 1 ? "ies" : "y"}.`);
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function fixLocationNames() {
    const ok = window.confirm("Fix delivery location names that don't match the price list, then recalculate driver prices? This corrects name mismatches (e.g. 'Khan Kambol' → 'KH.Kambol').");
    if (!ok) return;
    try {
      const result = await api("/api/fix-location-names", { method: "POST" });
      await loadData();
      flash(`Fixed ${result.fixed} location name${result.fixed !== 1 ? "s" : ""}, recalculated ${result.recalculated} driver price${result.recalculated !== 1 ? "s" : ""}.`);
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function diagnoseDriverPrices() {
    try {
      const result = await api("/api/diagnose-driver");
      if (result.zeroPriceDeliveries === 0) {
        alert("All delivery rows have a non-zero driver price. Nothing to fix.");
        return;
      }
      const lines = [`${result.zeroPriceDeliveries} delivery row(s) still have $0 driver price:\n`];
      for (const p of result.problems) {
        lines.push(`• ${p.toLocation} (${p.truckType}) on ${p.deliveryDate}`);
        if (p.effectivePriceFound !== null && p.effectivePriceFound > 0) {
          lines.push(`  → Price found: $${p.effectivePriceFound} (effective ${p.effectivePriceDate}) but not applied`);
        } else if (p.effectivePriceFound !== null) {
          lines.push(`  → Price found but is $0 (effective ${p.effectivePriceDate})`);
        } else {
          lines.push(`  → NO price found for this delivery date`);
          if (p.allPricesForRoute.length > 0) {
            lines.push(`  → Available prices: ${p.allPricesForRoute.map(x => `$${x.driver} from ${x.effectiveDate} (active:${x.active})`).join(", ")}`);
          } else {
            lines.push(`  → No prices exist for this route at all`);
          }
        }
      }
      alert(lines.join("\n"));
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function cleanupZeroDriverPrices() {
    const ok = window.confirm("Delete old Without Crane price entries that have $0 driver price and a newer entry exists? This cleans up duplicate entries.");
    if (!ok) return;
    try {
      const result = await api("/api/prices/cleanup-zero-driver", { method: "POST" });
      await loadData();
      const msg = result.stillMissing.length
        ? `Deleted ${result.deleted} old entr${result.deleted !== 1 ? "ies" : "y"}. ${result.stillMissing.length} location${result.stillMissing.length !== 1 ? "s" : ""} still missing driver price: ${result.stillMissing.join(", ")}`
        : `Deleted ${result.deleted} old entr${result.deleted !== 1 ? "ies" : "y"}. All locations have driver prices.`;
      flash(msg, result.stillMissing.length ? "error" : "success");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  function restoreBackup() {
    const ok = window.confirm("Restore from a backup file? This will replace the current system data. A safety backup will be created first.");
    if (!ok) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const restoredData = JSON.parse(text);
        await api("/api/backup/restore", { method: "POST", body: JSON.stringify(restoredData) });
        await loadData();
        flash("Backup restored.");
      } catch (err) {
        flash(err.message, "error");
      }
    };
    input.click();
  }

  async function clearLocationPriceList() {
    const ok = window.confirm("Clear all location price records? This will not delete trucks, statements, or delivery rows. A safety backup will be created first.");
    if (!ok) return;
    const typed = window.prompt('Type "CLEAR PRICES" to confirm.');
    if (typed !== "CLEAR PRICES") return;
    try {
      const result = await api("/api/prices", { method: "DELETE" });
      await loadData();
      await loadBackups();
      flash(`Cleared ${result.deletedCount} location price records.`);
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function saveQuickStatement(e) {
    e.preventDefault();
    try {
      await api("/api/statements/quick", {
        method: "POST",
        body: JSON.stringify(quickForm)
      });
      setQuickForm({ statementNumber: "", month: quickForm.month, manualAmount: "" });
      await loadData();
      flash(`Statement ${quickForm.statementNumber} added.`);
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function assignPayment(statementId, paymentMonth) {
    try {
      await api(`/api/statements/${encodeURIComponent(statementId)}/assign-payment`, {
        method: "POST",
        body: JSON.stringify({ paymentMonth })
      });
      await loadData();
      setAssignModal(null);
      flash(paymentMonth ? `Statement assigned to ${monthName(paymentMonth)} payment.` : "Statement removed from payment.");
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function togglePaymentReceived(month) {
    try {
      await api("/api/payment-months/toggle", { method: "POST", body: JSON.stringify({ month }) });
      await loadData();
    } catch (err) {
      flash(err.message, "error");
    }
  }

  function exportSalary(truck, format = "xls") {
    const d = getDeduction(truck.truckNo);
    const params = new URLSearchParams({
      month: reportMonth,
      truckNo: truck.truckNo,
      format,
      loanDeduction: d.loanDeduction,
      garageFee: d.garageFee
    });
    downloadFile(`/api/export/salary?${params}`).catch((err) => flash(err.message, "error"));
  }

  function exportStatement() {
    if (!selectedStatement) return;
    downloadFile(`/api/export/accounting?statementId=${encodeURIComponent(selectedStatement.id)}&truckType=${encodeURIComponent(selectedStatement.truckType)}`).catch((err) => flash(err.message, "error"));
  }

  function exportStatementFile(statement, format = "xls") {
    downloadFile(`/api/export/accounting?statementId=${encodeURIComponent(statement.id)}&truckType=${encodeURIComponent(statement.truckType)}&format=${encodeURIComponent(format)}`).catch((err) => flash(err.message, "error"));
  }

  const navItems = [
    ["dashboard", "Dashboard"],
    ["data-entry", "Data Entry"],
    ["reports", "Reports"],
    ...(isAdmin ? [["payments", "Payments"], ["prices", "Prices"], ["reconciliation", "Compare Pay"], ["setup", "Setup"]] : []),
  ];

  async function logout() {
    try { await api("/api/auth/logout", { method: "POST" }); } catch {}
    setToken("");
    setLoggedIn(false);
  }

  if (!loggedIn) return <LoginPage onLogin={(role) => { setLoggedIn(true); setUserRole(role); }} />;

  const ctxValue = {
    activeCompanyPriceCounts, activeCompanyPriceRows, activeDeliveryTruckType, activeField, activeTruckCount, activityPage, applyBulkPriceUpdate, assignModal, assignMonth, assignPayment, availableYears, backToStatementList,
    backupFiles, bulkExistingDates, bulkLocationChoices, bulkLocationFilter, bulkPriceForm, bulkPriceRows, canEditRows, canFinishStatement, canSaveDelivery, checkTelegramStatus, cleanupEmptyDraftStatements, cleanupZeroDriverPrices,
    clearHighlights, clearLocationPriceList, companyPriceGroups, confirmDeleteStatement, createEntryStatement, createManualBackup, createStaffUser, dashOutstanding, data, deductionEdits, deleteDelivery, deleteModal,
    deleteNonstandardFormatPrices, deletePrice, deletePricesByDate, deleteStaffUser, deleteStatement, deleteTruck, deliveryForm, deliveryFormDirty, deliveryFormReady, deliveryFormRef, diagnoseDriverPrices, diagnoseEmptyPrices,
    downloadBackup, driverPaymentSections, driverPriceForm, driverPriceGroups, duplicateInvoice, duplicateInvoiceRow, duplicateInvoiceStatement, earningsHistory, editDelivery, editPasswordId, editPasswordValue, editingSavedRow,
    emptyPriceResult, entryActionTruckType, entryTruckType, expandStatementEdit, exportSalary, exportStatement, exportStatementFile, filteredCompanyPrices, filteredDriverPrices, filteredStatements, filters, finishStatement,
    fixLocationNames, flash, fromLocations, getDeduction, getNextStatementNumber, goToEmptyPrice, invoiceInputRef, isAdmin, isDraft, isEditingDelivery, isEditingTruck, loadBackups,
    loadData, loadStaffUsers, locations, loggedIn, logout, matchesSetupLocationSearch, missingPrice, monthlyRows, monthlyTotals, navItems, newStatement, newUserForm,
    normalizeLocationSpacing, notice, openStatement, page, paymentsViewMonth, priceCompareDate, priceCompareDates, priceCompareProvince, priceCompareProvinces, priceCompareRows, priceForm, priceLookupReady,
    pricePeriods, pricePeriodsMonth, quickForm, recalculateAllPrices, reconEdits, reconMonth, reconciliation, reopenStatement, reportMonth, reportTruckNo, reportYear, resetDeliveryForm,
    restoreBackup, saveDeduction, saveDelivery, saveDriverPrice, savePrice, saveQuickStatement, saveReported, saveSettings, saveStaffPassword, saveStatement, saveTruck, selectedDriverPaymentSection,
    selectedPrice, selectedStatement, selectedStatementId, selectedTruck, selectedViewStatement, sendToTelegram, setActiveField, setActivityPage, setAssignModal, setAssignMonth, setBackupFiles, setBulkLocationFilter,
    setBulkPriceForm, setData, setDeductionEdits, setDeleteModal, setDeliveryForm, setDriverPriceForm, setEditPasswordId, setEditPasswordValue, setEmptyPriceResult, setEntryActionTruckType, setEntryTruckType, setExpandStatementEdit,
    setFilters, setLoggedIn, setNewUserForm, setNotice, setPage, setPaymentsViewMonth, setPriceCompareDate, setPriceCompareProvince, setPriceForm, setPricePeriodsMonth, setQuickForm, setReconEdits,
    setReconMonth, setReportMonth, setReportTruckNo, setReportYear, setSelectedStatementId, setSettingsForm, setSetupLocationSearch, setSetupSection, setShowAdvancedTools, setShowQuickEntry, setShowStatementWorkspace, setStaffUsers,
    setStatementForm, setTelegramConfigured, setTruckForm, setUserRole, setViewStatementId, settingsForm, setupLocationSearch, setupLocationSearchKey, setupSection, showAdvancedTools, showQuickEntry, showStatementWorkspace,
    staffUsers, startEntryAction, statementCounts, statementForm, statementRows, statementSummaries, switchEntryTruckType, telegramConfigured, togglePaymentReceived, totals, truckForm, truckInputRef,
    truckMissing, truckOptions, truckPerformance, truckTypeMismatch, typedTruck, userRole, viewStatement, viewStatementId, viewStatementRows, viewTotals, visibleStatements, yearSummary,
  };
  return (
    <AppCtx.Provider value={ctxValue}>
    <div className="min-h-screen text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 shadow-sm shadow-slate-900/5 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/api/logo" alt="N&M" className="h-11 w-11 rounded-2xl object-cover" onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "grid"; }} />
            <div className="hidden h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white">NM</div>
            <div>
              <h1 className="text-lg font-black tracking-tight">Truck Delivery</h1>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">{data.settings.companyName || "N&M LOGISTIC"}</p>
            </div>
          </div>
          <nav className="hidden lg:flex w-full gap-1 overflow-auto rounded-2xl border border-slate-200 bg-slate-100 p-1 lg:w-auto">
            {navItems.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPage(key)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-black transition ${
                  page === key
                    ? "bg-teal-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-slate-950"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-500 lg:inline">
              {isAdmin ? "Admin" : "Staff"}
            </span>
            <button
              type="button" onClick={logout} title="Sign out"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {notice.text && (
        <div className={`mx-auto mt-4 max-w-[1500px] rounded-xl border px-4 py-3 text-sm font-bold shadow-sm ${notice.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-teal-200 bg-teal-50 text-teal-800"}`}>
          {notice.text}
        </div>
      )}

      {page === "dashboard" ? (
        <DashboardPage />
      ) : page === "data-entry" ? (
        <DataEntryPage />
      ) : page === "reports" ? (
        <ReportsPage />
      ) : page === "payments" ? (
        <PaymentsPage />
      ) : page === "reconciliation" ? (
        <ComparePayPage />
      ) : page === "prices" ? (
        <PricesPage />
      ) : (
        <SetupPage />
      )}

      {emptyPriceResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEmptyPriceResult(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-lg font-bold">Missing Prices</h2>
              <button className="text-slate-400 hover:text-slate-700 text-2xl leading-none" onClick={() => setEmptyPriceResult(null)}>×</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
              {(emptyPriceResult.dCrane.length > 0 || emptyPriceResult.dNoCrane.length > 0) && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-sm text-red-600">Missing Driver Price</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{emptyPriceResult.dCrane.length + emptyPriceResult.dNoCrane.length} location{emptyPriceResult.dCrane.length + emptyPriceResult.dNoCrane.length !== 1 ? "s" : ""}</span>
                    <span className="text-xs text-slate-400">→ Driver Price tab</span>
                  </div>
                  {emptyPriceResult.dCrane.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-slate-500 mb-1">Crane ({emptyPriceResult.dCrane.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {emptyPriceResult.dCrane.map((loc) => (
                          <button key={loc} onClick={() => goToEmptyPrice(loc, "driver")} className="text-sm px-3 py-1 rounded-full bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1.5">
                            {loc}
                            <span className="text-xs bg-red-200 text-red-800 px-1.5 py-0.5 rounded-full font-medium">Driver</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {emptyPriceResult.dNoCrane.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">No Crane ({emptyPriceResult.dNoCrane.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {emptyPriceResult.dNoCrane.map((loc) => (
                          <button key={loc} onClick={() => goToEmptyPrice(loc, "driver")} className="text-sm px-3 py-1 rounded-full bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1.5">
                            {loc}
                            <span className="text-xs bg-red-200 text-red-800 px-1.5 py-0.5 rounded-full font-medium">Driver</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {(emptyPriceResult.cCrane.length > 0 || emptyPriceResult.cNoCrane.length > 0) && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-sm text-amber-600">Missing Company Price</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{emptyPriceResult.cCrane.length + emptyPriceResult.cNoCrane.length} location{emptyPriceResult.cCrane.length + emptyPriceResult.cNoCrane.length !== 1 ? "s" : ""}</span>
                    <span className="text-xs text-slate-400">→ Company Price tab</span>
                  </div>
                  {emptyPriceResult.cCrane.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-slate-500 mb-1">Crane ({emptyPriceResult.cCrane.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {emptyPriceResult.cCrane.map((loc) => (
                          <button key={loc} onClick={() => goToEmptyPrice(loc, "company")} className="text-sm px-3 py-1 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1.5">
                            {loc}
                            <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-medium">Company</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {emptyPriceResult.cNoCrane.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">No Crane ({emptyPriceResult.cNoCrane.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {emptyPriceResult.cNoCrane.map((loc) => (
                          <button key={loc} onClick={() => goToEmptyPrice(loc, "company")} className="text-sm px-3 py-1 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1.5">
                            {loc}
                            <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-medium">Company</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t text-right">
              <button className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium" onClick={() => setEmptyPriceResult(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {deleteModal.statement && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4">
          <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
            <div className="px-6 py-5 border-b border-red-100 bg-red-50 rounded-t-2xl">
              <h3 className="text-base font-black text-red-700">Delete Statement</h3>
              <p className="mt-1 text-sm text-slate-600">
                Statement <strong>{deleteModal.statement.statementNumber}</strong> — {monthName(deleteModal.statement.month)}
                <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">{deleteModal.statement.status}</span>
              </p>
              <p className="mt-2 text-xs font-bold text-red-600">This will permanently delete the statement and all its delivery rows.</p>
            </div>
            <div className="px-6 py-5 grid gap-3">
              {data.settings?.deletePassword ? (
                <Field label="VIP Password">
                  <Input
                    type="password"
                    placeholder="Enter password…"
                    value={deleteModal.password}
                    autoFocus
                    onChange={(e) => setDeleteModal((prev) => ({ ...prev, password: e.target.value, error: "" }))}
                    onKeyDown={(e) => e.key === "Enter" && confirmDeleteStatement()}
                  />
                </Field>
              ) : (
                <p className="text-sm font-bold text-slate-500">No delete password is set. Confirm to proceed.</p>
              )}
              {deleteModal.error && <p className="text-xs font-black text-red-600">{deleteModal.error}</p>}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setDeleteModal({ statement: null, password: "", error: "" })}>Cancel</Button>
              <Button type="button" variant="danger" onClick={confirmDeleteStatement}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4">
          <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-base font-black">Assign Statement to Payment Month</h3>
              <p className="mt-1 text-sm text-slate-500">Statement <strong>{assignModal.statementNumber}</strong> — {monthName(assignModal.month)}</p>
            </div>
            <div className="px-6 py-5 grid gap-4">
              <Field label="Payment Month">
                <Input type="month" value={assignMonth} onChange={(e) => setAssignMonth(e.target.value)} />
              </Field>
              <p className="text-xs text-slate-500">The statement will be listed under this payment month in the Payments page.</p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-between gap-2">
              {assignModal.paymentMonth && (
                <Button type="button" variant="danger" onClick={() => assignPayment(assignModal.id, null)}>Remove Assignment</Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="secondary" onClick={() => setAssignModal(null)}>Cancel</Button>
                <Button type="button" onClick={() => assignPayment(assignModal.id, assignMonth)}>Assign</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation — mobile only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm pb-safe">
        <div className="flex items-center justify-around mx-auto px-1 h-16">
          {navItems.map(([key, label]) => {
            const isActive = page === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPage(key)}
                className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 px-1 rounded-xl transition min-w-0 ${
                  isActive ? "text-teal-700" : "text-slate-400 active:text-slate-700"
                }`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
                  {key === "dashboard" && <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>}
                  {key === "data-entry" && <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>}
                  {key === "reports" && <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>}
                  {key === "payments" && <><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>}
                  {key === "prices" && <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>}
                  {key === "setup" && <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>}
                </svg>
                <span className="text-[10px] font-black leading-none truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
    </AppCtx.Provider>
  );
}

createRoot(document.getElementById("root")).render(<App />);
