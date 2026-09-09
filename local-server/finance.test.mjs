import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  days30E360,
  parseISODate,
  parseISODateTime,
  calculateInterestRate,
  calculateSinglePaymentSchedule,
  calculateInstallmentsSchedule,
  calculateLateFee,
  calculateMixedLateFee,
  calculateCycleCutoffAndRefDueDate,
  roundMoney,
} from './finance.mjs';

describe('Financial Engine - 30E/360 Day Count Convention', () => {
  it('calculates mandatory 11-day grace period between 2026-09-15 and 2026-09-26', () => {
    const d = days30E360('2026-09-15', '2026-09-26');
    assert.equal(d, 11, 'Grace days must be exactly 11 according to contract');
  });

  it('calculates exactly 30 days between same day of consecutive months', () => {
    assert.equal(days30E360('2026-09-26', '2026-10-26'), 30);
    assert.equal(days30E360('2026-10-26', '2026-11-26'), 30);
    assert.equal(days30E360('2026-11-26', '2026-12-26'), 30);
  });

  it('calculates exactly 14 days between 2026-10-26 and 2026-11-10 under 30E/360', () => {
    // 360*0 + 30*(11-10) + (10 - 26) = 30 - 16 = 14
    const d = days30E360('2026-10-26', '2026-11-10');
    assert.equal(d, 14);
  });

  it('handles 31st day clamp to 30 under 30E/360', () => {
    assert.equal(days30E360('2026-01-31', '2026-02-28'), 28);
    assert.equal(days30E360('2026-03-31', '2026-04-30'), 30);
  });

  it('handles full year 360-day base', () => {
    assert.equal(days30E360('2026-01-01', '2027-01-01'), 360);
  });
});

describe('Financial Engine - Strict Gregorian Dates Validation', () => {
  it('rejects impossible dates like Feb 30 and month 13', () => {
    assert.throws(() => parseISODate('2026-02-30'), /Day out of range/);
    assert.throws(() => parseISODate('2026-02-29'), /Day out of range/); // 2026 not leap year
    assert.throws(() => parseISODate('2026-13-01'), /Month out of range/);
    assert.throws(() => parseISODate('2026-04-31'), /Day out of range/); // April has 30 days
  });

  it('accepts leap year Feb 29 (e.g. 2024 or 2028)', () => {
    const leap = parseISODate('2028-02-29');
    assert.equal(leap.day, 29);
  });

  it('rejects timezone suffixes and invalid formats in parseISODateTime', () => {
    assert.throws(() => parseISODateTime('2026-09-15T10:30Z'), /DateTime must be strictly YYYY-MM-DDTHH:mm without suffix/);
    assert.throws(() => parseISODateTime('2026-09-15T10:30:00'), /DateTime must be strictly YYYY-MM-DDTHH:mm without suffix/);
    assert.throws(() => parseISODateTime('2026-02-30T10:30'), /Day out of range/);
  });
});

describe('Financial Engine - Rate Formulas (Effective vs Nominal)', () => {
  it('handles zero rate (0%) correctly', () => {
    assert.equal(calculateInterestRate('EFFECTIVE', 0, 30, 45), 0);
    assert.equal(calculateInterestRate('NOMINAL', 0, 30, 45), 0);
  });

  it('calculates effective rate i_d = (1 + E/100)^(d/360) - 1', () => {
    const rate = calculateInterestRate('EFFECTIVE', 24.0, 30, 30);
    const expected = Math.pow(1 + 0.24, 30 / 360) - 1;
    assert.ok(Math.abs(rate - expected) < 1e-12);
  });

  it('calculates nominal rate with capitalization i_d = (1 + (J/100)/(360/k))^(d/k) - 1', () => {
    const rate = calculateInterestRate('NOMINAL', 18.0, 30, 30);
    assert.ok(Math.abs(rate - 0.015) < 1e-12);

    const rate60 = calculateInterestRate('NOMINAL', 18.0, 30, 60);
    const expected60 = Math.pow(1 + 0.015, 2) - 1;
    assert.ok(Math.abs(rate60 - expected60) < 1e-12);
  });
});

describe('Financial Engine - Numeric Reference Dataset 1 (Technical Report C=600, TEA=36%, n=3)', () => {
  // Report Dataset 1: C=600, TEA 36%, Sep 15, cut 20, pay 26, n=3
  // P=605.66, quotas 212.46, 212.46, 212.44, capital 196.74, 201.85, 207.07, interest 15.72, 10.61, 5.37
  const params = {
    principal: 600.00,
    purchasedAt: '2026-09-15T10:00',
    cutoffDay: 20,
    cutoffTime: '18:00',
    paymentDay: 26,
    rateType: 'EFFECTIVE',
    annualRate: 36.0,
    capitalizationDays: 30,
    months: 3,
  };

  it('matches exact literal reference figures from technical report', () => {
    const res = calculateInstallmentsSchedule(params);

    assert.equal(res.graceDays, 11);
    assert.equal(res.capitalizedPrincipal, 605.66);
    assert.equal(res.firstDueDate, '2026-10-26');
    assert.equal(res.schedule.length, 3);

    // Installment 1: 2026-10-26
    assert.equal(res.schedule[0].total, 212.46);
    assert.equal(res.schedule[0].capital, 196.74);
    assert.equal(res.schedule[0].interest, 15.72);
    assert.equal(res.schedule[0].dueDate, '2026-10-26');
    assert.equal(res.schedule[0].cutoffDate, '2026-10-20');

    // Installment 2: 2026-11-26
    assert.equal(res.schedule[1].total, 212.46);
    assert.equal(res.schedule[1].capital, 201.85);
    assert.equal(res.schedule[1].interest, 10.61);
    assert.equal(res.schedule[1].dueDate, '2026-11-26');
    assert.equal(res.schedule[1].cutoffDate, '2026-11-20');

    // Installment 3: 2026-12-26
    assert.equal(res.schedule[2].total, 212.44);
    assert.equal(res.schedule[2].capital, 207.07);
    assert.equal(res.schedule[2].interest, 5.37);
    assert.equal(res.schedule[2].dueDate, '2026-12-26');
    assert.equal(res.schedule[2].cutoffDate, '2026-12-20');

    // Centavos balance check
    const sumCapital = roundMoney(res.schedule[0].capital + res.schedule[1].capital + res.schedule[2].capital);
    assert.equal(sumCapital, 605.66);
  });
});

describe('Financial Engine - Numeric Reference Dataset 2 (Nominal 24%, k=30, C=200, Sep16->Sep26 & Late Mora)', () => {
  // Report Dataset 2: C=200, nominal 24%, k=30, Sep 16 -> Sep 26 (10 days)
  // Interest = 1.32, total = 201.32
  // Late payment Oct 6 (10 days mora, late nominal 36%, k=30): mora = 1.99, total = 203.31
  it('matches exact literal reference figures for nominal rate and late fee', () => {
    const single = calculateSinglePaymentSchedule({
      principal: 200.00,
      purchasedAt: '2026-09-16T10:00',
      cutoffDay: 20,
      cutoffTime: '18:00',
      paymentDay: 26,
      rateType: 'NOMINAL',
      annualRate: 24.0,
      capitalizationDays: 30,
    });

    assert.equal(single.graceDays, 10);
    assert.equal(single.schedule[0].capital, 200.00);
    assert.equal(single.schedule[0].interest, 1.32);
    assert.equal(single.schedule[0].total, 201.32);

    // Late payment on Oct 6 (due date Sep 26)
    const late = calculateLateFee({
      statementTotal: 201.32,
      dueDate: '2026-09-26',
      asOf: '2026-10-06',
      lateRateType: 'NOMINAL',
      lateAnnualRate: 36.0,
      lateCapitalizationDays: 30,
    });

    assert.equal(late.lateDays, 10);
    assert.equal(late.lateInterest, 1.99);
    assert.equal(late.payableTotal, 203.31);
  });
});

describe('Financial Engine - Boundary Cases (Zero Rate & Tiny Credit Protection)', () => {
  it('calculates zero-rate installment schedule dividing capital equally', () => {
    const res = calculateInstallmentsSchedule({
      principal: 100.00,
      purchasedAt: '2026-09-15T10:00',
      cutoffDay: 20,
      cutoffTime: '18:00',
      paymentDay: 26,
      rateType: 'EFFECTIVE',
      annualRate: 0.0,
      capitalizationDays: 30,
      months: 3,
    });

    assert.equal(res.capitalizedPrincipal, 100.00);
    assert.equal(res.schedule.length, 3);
    assert.equal(res.schedule[0].interest, 0);
    assert.equal(res.schedule[1].interest, 0);
    assert.equal(res.schedule[2].interest, 0);

    assert.equal(res.schedule[0].capital, 33.33);
    assert.equal(res.schedule[1].capital, 33.33);
    assert.equal(res.schedule[2].capital, 33.34);

    const totalAmortized = roundMoney(
      res.schedule[0].capital + res.schedule[1].capital + res.schedule[2].capital
    );
    assert.equal(totalAmortized, 100.00);
  });

  it('rejects tiny principal that cannot afford 1 cent per installment', () => {
    // Principal 0.30 with 60 months -> less than 0.60
    assert.throws(() => {
      calculateInstallmentsSchedule({
        principal: 0.30,
        purchasedAt: '2026-09-15T10:00',
        cutoffDay: 20,
        cutoffTime: '18:00',
        paymentDay: 26,
        rateType: 'EFFECTIVE',
        annualRate: 0.0,
        capitalizationDays: 30,
        months: 60,
      });
    }, /too small for 60 installments/);
  });
});

describe('Financial Engine - Late Payment Interest (Mora & Mixed Rates)', () => {
  it('charges 0 late fee when payment is on or before due date', () => {
    const late = calculateLateFee({
      statementTotal: 100.00,
      dueDate: '2026-10-26',
      asOf: '2026-10-26',
      lateRateType: 'EFFECTIVE',
      lateAnnualRate: 36.0,
      lateCapitalizationDays: 30,
    });
    assert.equal(late.lateDays, 0);
    assert.equal(late.lateInterest, 0);
    assert.equal(late.payableTotal, 100.00);
  });

  it('calculates late fee correctly for 14 days overdue (2026-10-26 to 2026-11-10)', () => {
    const late = calculateLateFee({
      statementTotal: 100.00,
      dueDate: '2026-10-26',
      asOf: '2026-11-10',
      lateRateType: 'EFFECTIVE',
      lateAnnualRate: 36.0,
      lateCapitalizationDays: 30,
    });

    assert.equal(late.lateDays, 14);
    const expectedRate = Math.expm1((14 / 360) * Math.log1p(0.36));
    const expectedLateInterest = roundMoney(100.00 * expectedRate);
    assert.equal(late.lateInterest, expectedLateInterest);
    assert.equal(late.payableTotal, roundMoney(100.00 + expectedLateInterest));
  });

  it('calculates mixed late fee across obligations with different snapshot late terms', () => {
    const items = [
      {
        dueDate: '2026-10-26',
        totalCents: 10000, // 100.00
        snapshotLateRateType: 'EFFECTIVE',
        snapshotLateAnnualRate: 36.0,
        snapshotLateCapitalizationDays: 30,
      },
      {
        dueDate: '2026-10-26',
        totalCents: 20000, // 200.00
        snapshotLateRateType: 'NOMINAL',
        snapshotLateAnnualRate: 24.0,
        snapshotLateCapitalizationDays: 30,
      },
    ];

    const mixed = calculateMixedLateFee({
      items,
      asOf: '2026-11-10', // 14 days
      statementTotal: 300.00,
    });

    assert.equal(mixed.lateDays, 14);

    const fee1 = calculateLateFee({
      statementTotal: 100.00,
      dueDate: '2026-10-26',
      asOf: '2026-11-10',
      lateRateType: 'EFFECTIVE',
      lateAnnualRate: 36.0,
      lateCapitalizationDays: 30,
    });

    const fee2 = calculateLateFee({
      statementTotal: 200.00,
      dueDate: '2026-10-26',
      asOf: '2026-11-10',
      lateRateType: 'NOMINAL',
      lateAnnualRate: 24.0,
      lateCapitalizationDays: 30,
    });

    assert.equal(mixed.lateInterest, roundMoney(fee1.lateInterest + fee2.lateInterest));
    assert.equal(mixed.payableTotal, roundMoney(300.00 + mixed.lateInterest));
  });
});
