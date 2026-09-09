/**
 * Financial calculation engine for Crédito Barrio.
 * Implements 30E/360 day count convention, French amortization schedules,
 * capitalization during grace period, effective/nominal interest rates,
 * numerically robust compound interest using expm1/log1p,
 * and mixed-rate late payment interest calculation.
 */

export const ALLOWED_CAPITALIZATION_DAYS = [1, 15, 30, 60, 90, 180, 360];

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function getDaysInMonth(year, month) {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1];
}

/**
 * Parses YYYY-MM-DD string into year, month, day components with strict Gregorian validation.
 * Rejects invalid months, invalid days (e.g. Feb 30), suffixes, and years outside 1900..2199.
 */
export function parseISODate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    const err = new Error(`Invalid date string: ${dateStr}`);
    err.statusCode = 400;
    throw err;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {
    const err = new Error(`Date does not match ISO YYYY-MM-DD: ${dateStr}`);
    err.statusCode = 400;
    throw err;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1900 || year > 2199) {
    const err = new Error(`Year out of allowable range (1900-2199): ${year}`);
    err.statusCode = 400;
    throw err;
  }
  if (month < 1 || month > 12) {
    const err = new Error(`Month out of range (1-12): ${month}`);
    err.statusCode = 400;
    throw err;
  }
  const maxDays = getDaysInMonth(year, month);
  if (day < 1 || day > maxDays) {
    const err = new Error(`Day out of range (1-${maxDays}) for month ${month}/${year}: ${day}`);
    err.statusCode = 400;
    throw err;
  }

  return { year, month, day };
}

/**
 * Parses YYYY-MM-DDTHH:mm string without timezone suffix and validates date/time.
 */
export function parseISODateTime(dateTimeStr) {
  if (!dateTimeStr || typeof dateTimeStr !== 'string') {
    const err = new Error(`Invalid datetime string: ${dateTimeStr}`);
    err.statusCode = 400;
    throw err;
  }
  const match = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)$/.exec(dateTimeStr);
  if (!match) {
    const err = new Error(`DateTime must be strictly YYYY-MM-DDTHH:mm without suffix: ${dateTimeStr}`);
    err.statusCode = 400;
    throw err;
  }
  const dateObj = parseISODate(match[1]);
  return {
    ...dateObj,
    dateStr: match[1],
    timeStr: `${match[2]}:${match[3]}`,
    hour: Number(match[2]),
    minute: Number(match[3]),
  };
}

/**
 * 30E/360 Day Count Convention (Base 360).
 * d = 360*(Y2-Y1) + 30*(M2-M1) + min(D2,30) - min(D1,30)
 */
export function days30E360(dateStr1, dateStr2) {
  const d1 = parseISODate(dateStr1);
  const d2 = parseISODate(dateStr2);
  const D1 = Math.min(d1.day, 30);
  const D2 = Math.min(d2.day, 30);
  return 360 * (d2.year - d1.year) + 30 * (d2.month - d1.month) + (D2 - D1);
}

/**
 * Rounds monetary amounts to 2 decimal places.
 */
export function roundMoney(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    const err = new Error(`Invalid monetary amount: ${amount}`);
    err.statusCode = 400;
    throw err;
  }
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Converts decimal currency to integer cents.
 */
export function toCents(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    const err = new Error(`Invalid monetary amount for cents: ${amount}`);
    err.statusCode = 400;
    throw err;
  }
  const cents = Math.round((amount + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(cents)) {
    const err = new Error('Monetary amount exceeds safe integer range');
    err.statusCode = 400;
    throw err;
  }
  return cents;
}

/**
 * Converts integer cents back to decimal currency.
 */
export function fromCents(cents) {
  return Number((cents / 100).toFixed(2));
}

/**
 * Adds n months to a given year and month (1-indexed).
 */
export function addMonths(year, month, n) {
  const totalMonths = year * 12 + (month - 1) + n;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;
  return { year: newYear, month: newMonth };
}

/**
 * Formats year, month, day into YYYY-MM-DD.
 */
export function formatDate(year, month, day) {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Validates cutoff / payment day (restricted to 1..28 to avoid calendar invalidities).
 */
export function validateDay(day, label = 'Day') {
  const n = Number(day);
  if (!Number.isInteger(n) || n < 1 || n > 28) {
    const err = new Error(`${label} must be an integer between 1 and 28`);
    err.statusCode = 400;
    throw err;
  }
  return n;
}

/**
 * Validates cutoff time in HH:mm format.
 */
export function validateTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    const err = new Error('Cutoff time must be a string');
    err.statusCode = 400;
    throw err;
  }
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeStr);
  if (!match) {
    const err = new Error(`Cutoff time must be HH:mm (00:00 to 23:59), got: ${timeStr}`);
    err.statusCode = 400;
    throw err;
  }
  return timeStr;
}

/**
 * Calculates cycle cutoff date and reference due date from purchasedAt.
 * purchasedAt: YYYY-MM-DDTHH:mm
 * If purchasedAt <= cutoff of month, belongs to that month's cycle.
 * Otherwise, belongs to next month's cycle.
 * Reference due date is in cutoff month if paymentDay > cutoffDay, else next month.
 */
export function calculateCycleCutoffAndRefDueDate(purchasedAt, cutoffDay, cutoffTime, paymentDay) {
  cutoffDay = validateDay(cutoffDay, 'cutoffDay');
  paymentDay = validateDay(paymentDay, 'paymentDay');
  cutoffTime = validateTime(cutoffTime);

  const parsed = parseISODateTime(purchasedAt);
  const pYear = parsed.year;
  const pMonth = parsed.month;

  const monthCutoffDateTime = `${formatDate(pYear, pMonth, cutoffDay)}T${cutoffTime}`;
  let cutoffYear = pYear;
  let cutoffMonth = pMonth;

  if (purchasedAt > monthCutoffDateTime) {
    const next = addMonths(pYear, pMonth, 1);
    cutoffYear = next.year;
    cutoffMonth = next.month;
  }

  const cutoffDate = formatDate(cutoffYear, cutoffMonth, cutoffDay);

  let dueYear = cutoffYear;
  let dueMonth = cutoffMonth;
  if (paymentDay <= cutoffDay) {
    const next = addMonths(cutoffYear, cutoffMonth, 1);
    dueYear = next.year;
    dueMonth = next.month;
  }
  const refDueDate = formatDate(dueYear, dueMonth, paymentDay);

  return { cutoffDate, refDueDate, cutoffYear, cutoffMonth, dueYear, dueMonth };
}

/**
 * Calculates interest rate for d days based on effective or nominal rate.
 * Uses expm1 and log1p to avoid precision loss on near-zero rates.
 * Effective: i_d = (1 + E/100)^(d/360) - 1
 * Nominal:   i_d = (1 + (J/100)/(360/k))^(d/k) - 1
 */
export function calculateInterestRate(rateType, annualRate, capitalizationDays, days) {
  if (typeof annualRate !== 'number' || !Number.isFinite(annualRate) || annualRate < 0) {
    const err = new Error(`Annual rate must be a non-negative finite number: ${annualRate}`);
    err.statusCode = 400;
    throw err;
  }
  if (annualRate === 0 || days === 0) {
    return 0;
  }

  if (rateType === 'EFFECTIVE') {
    return Math.expm1((days / 360) * Math.log1p(annualRate / 100));
  }

  if (rateType === 'NOMINAL') {
    const k = Number(capitalizationDays);
    if (!ALLOWED_CAPITALIZATION_DAYS.includes(k)) {
      const err = new Error(`Capitalization days must be one of [${ALLOWED_CAPITALIZATION_DAYS.join(', ')}]`);
      err.statusCode = 400;
      throw err;
    }
    const m = 360 / k;
    const ratePerPeriod = (annualRate / 100) / m;
    return Math.expm1((days / k) * Math.log1p(ratePerPeriod));
  }

  const err = new Error(`Unknown rate type: ${rateType}`);
  err.statusCode = 400;
  throw err;
}

/**
 * Calculates the growth factor (1 + i_d) for d days.
 */
export function calculateRateFactor(rateType, annualRate, capitalizationDays, days) {
  if (annualRate === 0 || days === 0) return 1;
  return 1 + calculateInterestRate(rateType, annualRate, capitalizationDays, days);
}

/**
 * Computes single payment (END_OF_MONTH) schedule and terms.
 * Capital C, interest C * ((1 + iDiaria)^d - 1) from purchase to reference due date.
 */
export function calculateSinglePaymentSchedule({
  principal,
  purchasedAt,
  cutoffDay,
  cutoffTime,
  paymentDay,
  rateType,
  annualRate,
  capitalizationDays,
}) {
  principal = roundMoney(principal);
  if (principal <= 0) {
    const err = new Error('Principal must be greater than zero');
    err.statusCode = 400;
    throw err;
  }

  const { cutoffDate, refDueDate } = calculateCycleCutoffAndRefDueDate(
    purchasedAt,
    cutoffDay,
    cutoffTime,
    paymentDay
  );

  const pDate = purchasedAt.slice(0, 10);
  const graceDays = days30E360(pDate, refDueDate);
  if (graceDays < 0) {
    const err = new Error(`Reference due date ${refDueDate} cannot be before purchase date ${pDate}`);
    err.statusCode = 400;
    throw err;
  }

  const rate = calculateInterestRate(rateType, annualRate, capitalizationDays, graceDays);
  const interest = roundMoney(principal * rate);
  const total = roundMoney(principal + interest);

  return {
    principal,
    graceDays,
    capitalizedPrincipal: principal,
    firstDueDate: refDueDate,
    cutoffDate,
    schedule: [
      {
        number: 1,
        dueDate: refDueDate,
        cutoffDate,
        capital: principal,
        interest,
        total,
      },
    ],
  };
}

/**
 * Determines the statement cutoff date for an installment due on dueDate.
 * Contract: "su fecha corte es el último día de corte anterior a ese vencimiento (por ejemplo cuota26-oct -> corte20-oct)."
 */
export function getStatementCutoffForDueDate(dueDate, cutoffDay, paymentDay) {
  const { year, month } = parseISODate(dueDate);
  if (paymentDay > cutoffDay) {
    // Cutoff is in the same month as dueDate
    return formatDate(year, month, cutoffDay);
  } else {
    // Cutoff is in previous month
    const prev = addMonths(year, month, -1);
    return formatDate(prev.year, prev.month, cutoffDay);
  }
}

/**
 * Computes French amortization installment schedule (INSTALLMENTS).
 * Capitalizes days between purchase and refDueDate: P = C * (1 + iDiaria)^d.
 * First installment due exactly ONE MONTH after refDueDate, exactly n monthly payments.
 * A = P * i30 / (1 - (1 + i30)^-n); if zero rate A = P / n.
 * Clamps capital amortization to remaining balance to prevent negative schedules on tiny credit.
 * Last amortization absorbs residual cents so sum(capital) === P.
 */
export function calculateInstallmentsSchedule({
  principal,
  purchasedAt,
  cutoffDay,
  cutoffTime,
  paymentDay,
  rateType,
  annualRate,
  capitalizationDays,
  months,
}) {
  principal = roundMoney(principal);
  if (principal <= 0) {
    const err = new Error('Principal must be greater than zero');
    err.statusCode = 400;
    throw err;
  }
  months = Number(months);
  if (!Number.isInteger(months) || months < 1 || months > 60) {
    const err = new Error('Months must be an integer between 1 and 60');
    err.statusCode = 400;
    throw err;
  }

  const { refDueDate, dueYear: refDueYear, dueMonth: refDueMonth } =
    calculateCycleCutoffAndRefDueDate(purchasedAt, cutoffDay, cutoffTime, paymentDay);

  const pDate = purchasedAt.slice(0, 10);
  const graceDays = days30E360(pDate, refDueDate);
  if (graceDays < 0) {
    const err = new Error(`Reference due date ${refDueDate} cannot be before purchase date ${pDate}`);
    err.statusCode = 400;
    throw err;
  }

  // Capitalize grace period
  const graceFactor = calculateRateFactor(rateType, annualRate, capitalizationDays, graceDays);
  const capitalizedPrincipal = roundMoney(principal * graceFactor);

  if (capitalizedPrincipal < months * 0.01) {
    const err = new Error(`Capitalized principal (${capitalizedPrincipal}) is too small for ${months} installments (minimum 0.01 per installment)`);
    err.statusCode = 400;
    throw err;
  }

  // 30-day monthly rate for French schedule
  const i30 = calculateInterestRate(rateType, annualRate, capitalizationDays, 30);

  let monthlyPayment;
  if (i30 === 0) {
    monthlyPayment = roundMoney(capitalizedPrincipal / months);
  } else {
    const denom = 1 - Math.pow(1 + i30, -months);
    monthlyPayment = roundMoney((capitalizedPrincipal * i30) / denom);
  }

  const schedule = [];
  let remainingCapital = capitalizedPrincipal;
  let firstDueDate = null;

  for (let k = 1; k <= months; k++) {
    // Due date is k months after refDueDate
    const { year: instYear, month: instMonth } = addMonths(refDueYear, refDueMonth, k);
    const instDueDate = formatDate(instYear, instMonth, paymentDay);
    if (k === 1) firstDueDate = instDueDate;

    const instCutoffDate = getStatementCutoffForDueDate(instDueDate, cutoffDay, paymentDay);

    let interestPart = roundMoney(remainingCapital * i30);
    let capitalPart;

    if (k < months) {
      capitalPart = roundMoney(monthlyPayment - interestPart);
      // Safe clamp to remaining capital and non-negative
      if (capitalPart < 0) capitalPart = 0;
      if (capitalPart > remainingCapital) capitalPart = remainingCapital;
      remainingCapital = roundMoney(remainingCapital - capitalPart);
      const totalPart = roundMoney(capitalPart + interestPart);
      schedule.push({
        number: k,
        dueDate: instDueDate,
        cutoffDate: instCutoffDate,
        capital: capitalPart,
        interest: interestPart,
        total: totalPart,
      });
    } else {
      // Last installment absorbs all remaining capital
      capitalPart = remainingCapital;
      remainingCapital = 0;
      const totalPart = roundMoney(capitalPart + interestPart);
      schedule.push({
        number: k,
        dueDate: instDueDate,
        cutoffDate: instCutoffDate,
        capital: capitalPart,
        interest: interestPart,
        total: totalPart,
      });
    }
  }

  return {
    principal,
    graceDays,
    capitalizedPrincipal,
    firstDueDate,
    schedule,
  };
}

/**
 * Calculates late payment interest (interés moratorio).
 * Applied to statement total (compensatory interest + capital).
 * Base: statement.total
 * If asOf <= dueDate: 0 late interest, 0 late days.
 * If asOf > dueDate: d = days30E360(dueDate, asOf)
 * i_late calculated using client's late rate terms.
 */
export function calculateLateFee({
  statementTotal,
  dueDate,
  asOf,
  lateRateType,
  lateAnnualRate,
  lateCapitalizationDays,
}) {
  statementTotal = roundMoney(statementTotal);
  if (asOf <= dueDate) {
    return {
      lateDays: 0,
      lateInterest: 0,
      payableTotal: statementTotal,
    };
  }

  const lateDays = Math.max(0, days30E360(dueDate, asOf));
  if (lateDays === 0) {
    return {
      lateDays: 0,
      lateInterest: 0,
      payableTotal: statementTotal,
    };
  }

  const rate = calculateInterestRate(
    lateRateType,
    lateAnnualRate,
    lateCapitalizationDays,
    lateDays
  );
  const lateInterest = roundMoney(statementTotal * rate);
  const payableTotal = roundMoney(statementTotal + lateInterest);

  return {
    lateDays,
    lateInterest,
    payableTotal,
  };
}

/**
 * Calculates late fees across multiple items/obligations with potentially mixed snapshot rates.
 * Groups by (dueDate, lateRateType, lateAnnualRate, lateCapitalizationDays),
 * computes late interest for each group rounded, and sums them.
 */
export function calculateMixedLateFee({ items, asOf, statementTotal = null }) {
  if (!items || items.length === 0) {
    return {
      lateDays: 0,
      lateInterest: 0,
      payableTotal: statementTotal !== null ? roundMoney(statementTotal) : 0,
    };
  }

  const groups = new Map();
  for (const it of items) {
    const key = `${it.dueDate}::${it.snapshotLateRateType}::${it.snapshotLateAnnualRate}::${it.snapshotLateCapitalizationDays}`;
    if (!groups.has(key)) {
      groups.set(key, {
        dueDate: it.dueDate,
        lateRateType: it.snapshotLateRateType,
        lateAnnualRate: it.snapshotLateAnnualRate,
        lateCapitalizationDays: it.snapshotLateCapitalizationDays,
        totalCents: 0,
      });
    }
    groups.get(key).totalCents += Number(it.totalCents !== undefined ? it.totalCents : toCents(it.total));
  }

  let totalLateInterest = 0;
  let maxLateDays = 0;
  let totalBaseCents = 0;

  for (const g of groups.values()) {
    totalBaseCents += g.totalCents;
    const subtotal = fromCents(g.totalCents);
    const lateCalc = calculateLateFee({
      statementTotal: subtotal,
      dueDate: g.dueDate,
      asOf,
      lateRateType: g.lateRateType,
      lateAnnualRate: g.lateAnnualRate,
      lateCapitalizationDays: g.lateCapitalizationDays,
    });
    totalLateInterest = roundMoney(totalLateInterest + lateCalc.lateInterest);
    if (lateCalc.lateDays > maxLateDays) {
      maxLateDays = lateCalc.lateDays;
    }
  }

  const baseAmount = statementTotal !== null ? roundMoney(statementTotal) : fromCents(totalBaseCents);
  const payableTotal = roundMoney(baseAmount + totalLateInterest);

  return {
    lateDays: maxLateDays,
    lateInterest: totalLateInterest,
    payableTotal,
  };
}
