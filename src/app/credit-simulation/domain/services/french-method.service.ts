import {GraceType, PeriodType} from '../model/credit-simulation.types';
// Calendario
export interface SchedulePeriod {
  installmentNumber: number;
  periodType: PeriodType;
  initialBalance: number;
  interest: number;
  amortization: number;
  insuranceDesgravamen: number;
  insuranceVehicular: number;
  portes: number;
  totalPayment: number;
  finalBalance: number;
  isBalloonPayment: boolean;
}

export interface ScheduleParams {
  financedAmount: number;
  futureValue: number;
  termMonths: number;
  graceType: GraceType;
  gracePeriods: number;
  monthlyEffectiveRate: number;
  vehiclePrice: number;
  desgravamenMonthlyRatePercent: number;
  vehicularMonthlyRatePercent: number;
  portes: number;
}

export interface ScheduleResult {
  baseQuota: number;
  periods: SchedulePeriod[];
}

/**
 * French method with balloon payment ("Compra Inteligente"), including
 * partial/total grace periods. Mirrors the report's PSeInt algorithm exactly.
 */
export class FrenchMethodService {
  /** Cuota = [P - VF/(1+i)^n] * [i*(1+i)^n] / [(1+i)^n - 1] */
  static computeBaseQuota(balance: number, futureValue: number, tem: number, effectivePeriods: number): number {
    if (effectivePeriods <= 0) {
      return 0;
    }
    const factor = Math.pow(1 + tem, effectivePeriods);
    return (balance - futureValue / factor) * (tem * factor) / (factor - 1);
  }

  static buildSchedule(params: ScheduleParams): ScheduleResult {
    const {
      financedAmount,
      futureValue,
      termMonths,
      graceType,
      gracePeriods,
      monthlyEffectiveRate: tem,
      vehiclePrice,
      desgravamenMonthlyRatePercent,
      vehicularMonthlyRatePercent,
      portes
    } = params;

    const periods: SchedulePeriod[] = [];
    let balance = financedAmount;

    for (let installmentNumber = 1; installmentNumber <= gracePeriods; installmentNumber++) {
      const initialBalance = balance;
      const interest = initialBalance * tem;
      const insuranceDesgravamen = initialBalance * (desgravamenMonthlyRatePercent / 100);
      const insuranceVehicular = vehiclePrice * (vehicularMonthlyRatePercent / 100);

      let totalPayment: number;
      let finalBalance: number;
      let periodType: PeriodType;

      if (graceType === 'TOTAL') {
        periodType = 'GRACIA_TOTAL';
        totalPayment = 0;
        finalBalance = initialBalance + interest;
      } else {
        periodType = 'GRACIA_PARCIAL';
        totalPayment = interest + insuranceDesgravamen + insuranceVehicular + portes;
        finalBalance = initialBalance;
      }

      periods.push({
        installmentNumber,
        periodType,
        initialBalance,
        interest,
        amortization: 0,
        insuranceDesgravamen,
        insuranceVehicular,
        portes,
        totalPayment,
        finalBalance,
        isBalloonPayment: false
      });

      balance = finalBalance;
    }

    const effectivePeriods = termMonths - gracePeriods;
    const baseQuota = this.computeBaseQuota(balance, futureValue, tem, effectivePeriods);

    for (let installmentNumber = gracePeriods + 1; installmentNumber <= termMonths; installmentNumber++) {
      const initialBalance = balance;
      const interest = initialBalance * tem;
      const insuranceDesgravamen = initialBalance * (desgravamenMonthlyRatePercent / 100);
      const insuranceVehicular = vehiclePrice * (vehicularMonthlyRatePercent / 100);
      const totalPayment = baseQuota + insuranceDesgravamen + insuranceVehicular + portes;

      let amortization = baseQuota - interest;
      let finalBalance = initialBalance - amortization;

      const isBalloonPayment = installmentNumber === termMonths;
      if (isBalloonPayment) {
        amortization = amortization + finalBalance - futureValue;
        finalBalance = futureValue;
      }

      periods.push({
        installmentNumber,
        periodType: 'NORMAL',
        initialBalance,
        interest,
        amortization,
        insuranceDesgravamen,
        insuranceVehicular,
        portes,
        totalPayment,
        finalBalance,
        isBalloonPayment
      });

      balance = finalBalance;
    }

    return {baseQuota, periods};
  }
}
