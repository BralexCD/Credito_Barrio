import {
  CapitalizationType,
  CashFlowType,
  PeriodType,
  RatePeriodType,
  RateType,
  SimulationExpenseInput,
} from '../model/credit-simulation.types';
import { RateConversionService } from './rate-conversion.service';
import { VanTirService } from './van-tir.service';

export interface CreditSimulationInput {
  vehiclePrice: number;
  initialFeePercentage: number;

  /**
   * Plazo de cuotas regulares.
   * Según el Excel, el cuotón se paga en termMonths + 1.
   */
  termMonths: number;

  /**
   * Nuevo nombre recomendado.
   * Se calcula sobre el precio del vehículo.
   */
  finalQuotaPercentage?: number;

  /**
   * Alias legacy para no romper formularios antiguos.
   */
  futureValuePercentage?: number;

  rateType: RateType;
  interestRate: number;
  ratePeriod?: RatePeriodType | null;
  capitalization?: CapitalizationType | null;

  paymentFrequencyDays?: number;
  daysPerYear?: number;

  /**
   * Modelo nuevo:
   * primero gracia total, luego gracia parcial, luego periodos normales.
   */
  totalGracePeriods?: number;
  partialGracePeriods?: number;

  /**
   * Alias legacy.
   */
  graceType?: 'NINGUNA' | 'PARCIAL' | 'TOTAL';
  gracePeriods?: number;

  /**
   * Seguro desgravamen periódico.
   * En el Excel se incorpora junto con la tasa del crédito para calcular cuota.
   */
  desgravamenRatePercent?: number;

  /**
   * Alias legacy.
   */
  desgravamenMonthlyRatePercent?: number;

  /**
   * Seguro de riesgo vehicular anual.
   * En el Excel se prorratea por cuotas al año.
   */
  riskInsuranceAnnualRatePercent?: number;

  /**
   * Alias legacy. En el motor nuevo se interpretará como tasa anual.
   */
  vehicularMonthlyRatePercent?: number;

  gps?: number;
  portes?: number;
  administrativeExpenses?: number;

  /**
   * Gastos iniciales y periódicos.
   */
  expenses?: SimulationExpenseInput[];

  /**
   * Tasa de oportunidad anual efectiva porcentual para VAN.
   * Si no se envía, se usa la tasa del crédito como aproximación.
   */
  opportunityTeaPercent?: number;
}

export interface SmartPurchaseSchedulePeriod {
  installmentNumber: number;
  periodType: PeriodType;
  cashFlowType: CashFlowType;

  initialFinalQuotaBalance: number;
  finalQuotaInterest: number;
  finalQuotaAmortization: number;
  finalQuotaDesgravamen: number;
  finalFinalQuotaBalance: number;

  initialRegularBalance: number;
  regularInterest: number;
  regularQuota: number;
  regularAmortization: number;
  regularDesgravamen: number;
  finalRegularBalance: number;

  riskInsurance: number;
  gps: number;
  portes: number;
  administrativeExpenses: number;
  otherExpenses: number;
  balloonPayment: number;

  totalPayment: number;
  cashFlow: number;

  /**
   * Campos legacy para compatibilidad con el store actual.
   */
  initialBalance: number;
  interest: number;
  amortization: number;
  insuranceDesgravamen: number;
  insuranceVehicular: number;
  finalBalance: number;
  isBalloonPayment: boolean;
}

export interface CreditSimulationResult {
  initialFeeAmount: number;

  /**
   * Nombre legacy.
   * Para compatibilidad, será igual a loanAmount.
   */
  financedAmount: number;

  loanAmount: number;
  initialCostsFinanced: number;

  /**
   * Nombre legacy.
   * Para compatibilidad, será igual a finalQuotaAmount.
   */
  futureValueAmount: number;

  finalQuotaAmount: number;
  presentValueFinalQuota: number;
  regularFinancedBalance: number;

  annualEffectiveRate: number;
  monthlyEffectiveRate: number;
  periodEffectiveRate: number;
  opportunityPeriodRate: number;

  /**
   * Nombre legacy.
   * Para compatibilidad, será igual a regularQuota.
   */
  baseQuota: number;

  regularQuota: number;

  schedule: SmartPurchaseSchedulePeriod[];
  cashFlows: number[];

  van: number;
  tir: number;
  tcea: number;
}

interface NormalizedSimulationInput {
  vehiclePrice: number;
  initialFeePercentage: number;
  termMonths: number;
  finalQuotaPercentage: number;
  rateType: RateType;
  interestRate: number;
  ratePeriod: RatePeriodType;
  capitalization: CapitalizationType;
  paymentFrequencyDays: number;
  daysPerYear: number;
  installmentsPerYear: number;
  totalGracePeriods: number;
  partialGracePeriods: number;
  desgravamenRate: number;
  riskInsuranceAnnualRate: number;
  gps: number;
  portes: number;
  administrativeExpenses: number;
  expenses: SimulationExpenseInput[];
  opportunityTeaPercent: number;
}

/**
 * Motor financiero para Compra Inteligente según el Excel del curso.
 *
 * Decisiones para compatibilidad con la BD actual:
 * - No se guarda periodo 0 en payment_schedule.
 * - El flujo 0 positivo se guarda conceptualmente en simulations.loan_amount.
 * - El cuotón se devuelve como installmentNumber = termMonths + 1.
 * - El cuotón usa periodType = NORMAL y cashFlowType = BALLOON.
 */
export class CreditSimulationService {
  static simulate(input: CreditSimulationInput): CreditSimulationResult {
    const normalized = this.normalizeInput(input);
    this.validateInput(normalized);

    const creditRate = this.computeCreditRate(normalized);
    const periodEffectiveRate = creditRate.periodEffectiveRate;
    const annualEffectiveRate = creditRate.annualEffectiveRate;

    const opportunityPeriodRate = RateConversionService.effectiveAnnualToPeriod(
      normalized.opportunityTeaPercent,
      normalized.paymentFrequencyDays,
      normalized.daysPerYear,
    );

    const initialFeeAmount = normalized.vehiclePrice * (normalized.initialFeePercentage / 100);
    const initialCostsFinanced = this.computeInitialCostsFinanced(normalized.expenses);
    const loanAmount = normalized.vehiclePrice - initialFeeAmount + initialCostsFinanced;

    const finalQuotaAmount = normalized.vehiclePrice * (normalized.finalQuotaPercentage / 100);

    const quotaRate = periodEffectiveRate + normalized.desgravamenRate;

    /**
     * El Excel descuenta el cuotón hasta el periodo N + 1.
     */
    const presentValueFinalQuota =
      finalQuotaAmount / Math.pow(1 + quotaRate, normalized.termMonths + 1);
    const regularFinancedBalance = loanAmount - presentValueFinalQuota;

    const { schedule, regularQuota } = this.buildSchedule({
      input: normalized,
      periodEffectiveRate,
      quotaRate,
      loanAmount,
      finalQuotaAmount,
      presentValueFinalQuota,
      regularFinancedBalance,
    });

    const cashFlows = [loanAmount, ...schedule.map((period) => period.cashFlow)];

    const tir = VanTirService.computeTirFromCashFlows(cashFlows);
    const tcea = VanTirService.computeTcea(
      tir,
      normalized.paymentFrequencyDays,
      normalized.daysPerYear,
    );
    const van = VanTirService.computeVanFromCashFlows(cashFlows, opportunityPeriodRate);

    return {
      initialFeeAmount,
      financedAmount: loanAmount,
      loanAmount,
      initialCostsFinanced,
      futureValueAmount: finalQuotaAmount,
      finalQuotaAmount,
      presentValueFinalQuota,
      regularFinancedBalance,
      annualEffectiveRate,
      monthlyEffectiveRate: periodEffectiveRate,
      periodEffectiveRate,
      opportunityPeriodRate,
      baseQuota: regularQuota,
      regularQuota,
      schedule,
      cashFlows,
      van,
      tir,
      tcea,
    };
  }

  private static normalizeInput(input: CreditSimulationInput): NormalizedSimulationInput {
    const paymentFrequencyDays = input.paymentFrequencyDays ?? 30;
    const daysPerYear = input.daysPerYear ?? 360;
    const installmentsPerYear = daysPerYear / paymentFrequencyDays;

    const finalQuotaPercentage = input.finalQuotaPercentage ?? input.futureValuePercentage ?? 0;

    const totalGracePeriods =
      input.totalGracePeriods ?? (input.graceType === 'TOTAL' ? (input.gracePeriods ?? 0) : 0);

    const partialGracePeriods =
      input.partialGracePeriods ?? (input.graceType === 'PARCIAL' ? (input.gracePeriods ?? 0) : 0);

    const desgravamenRatePercent =
      input.desgravamenRatePercent ?? input.desgravamenMonthlyRatePercent ?? 0;

    const riskInsuranceAnnualRatePercent =
      input.riskInsuranceAnnualRatePercent ?? input.vehicularMonthlyRatePercent ?? 0;

    return {
      vehiclePrice: input.vehiclePrice,
      initialFeePercentage: input.initialFeePercentage,
      termMonths: input.termMonths,
      finalQuotaPercentage,
      rateType: input.rateType,
      interestRate: input.interestRate,
      ratePeriod: input.ratePeriod ?? 'ANUAL',
      capitalization: input.capitalization ?? 'MENSUAL',
      paymentFrequencyDays,
      daysPerYear,
      installmentsPerYear,
      totalGracePeriods,
      partialGracePeriods,
      desgravamenRate: desgravamenRatePercent / 100,
      riskInsuranceAnnualRate: riskInsuranceAnnualRatePercent / 100,
      gps: input.gps ?? 0,
      portes: input.portes ?? 0,
      administrativeExpenses: input.administrativeExpenses ?? 0,
      expenses: input.expenses ?? [],
      opportunityTeaPercent: input.opportunityTeaPercent ?? input.interestRate,
    };
  }

  private static validateInput(input: NormalizedSimulationInput): void {
    if (input.vehiclePrice <= 0) {
      throw new Error('El precio del vehículo debe ser mayor a cero.');
    }

    if (input.initialFeePercentage < 0 || input.initialFeePercentage > 100) {
      throw new Error('La cuota inicial debe estar entre 0% y 100%.');
    }

    if (input.finalQuotaPercentage < 0 || input.finalQuotaPercentage > 100) {
      throw new Error('La cuota final debe estar entre 0% y 100%.');
    }

    if (input.termMonths <= 0) {
      throw new Error('El plazo debe ser mayor a cero.');
    }

    if (input.totalGracePeriods < 0 || input.partialGracePeriods < 0) {
      throw new Error('Los periodos de gracia no pueden ser negativos.');
    }

    if (input.totalGracePeriods + input.partialGracePeriods >= input.termMonths) {
      throw new Error('La suma de periodos de gracia debe ser menor al plazo.');
    }

    if (input.paymentFrequencyDays <= 0) {
      throw new Error('La frecuencia de pago debe ser mayor a cero.');
    }

    if (input.daysPerYear <= 0) {
      throw new Error('Los días por año deben ser mayores a cero.');
    }

    if (input.interestRate < 0) {
      throw new Error('La tasa de interés no puede ser negativa.');
    }
  }

  private static computeCreditRate(input: NormalizedSimulationInput): {
    periodEffectiveRate: number;
    annualEffectiveRate: number;
  } {
    return RateConversionService.convertToEffectiveRates({
      rateType: input.rateType,
      rateValuePercent: input.interestRate,
      ratePeriod: input.ratePeriod,
      capitalization: input.rateType === 'NOMINAL' ? input.capitalization : null,
      paymentFrequencyDays: input.paymentFrequencyDays,
      daysPerYear: input.daysPerYear,
    });
  }

  private static computeInitialCostsFinanced(expenses: SimulationExpenseInput[]): number {
    return expenses
      .filter(
        (expense) => expense.expenseStage === 'INITIAL' && expense.paymentBehavior === 'FINANCED',
      )
      .reduce((sum, expense) => sum + expense.amount, 0);
  }

  private static buildSchedule(params: {
    input: NormalizedSimulationInput;
    periodEffectiveRate: number;
    quotaRate: number;
    loanAmount: number;
    finalQuotaAmount: number;
    presentValueFinalQuota: number;
    regularFinancedBalance: number;
  }): { schedule: SmartPurchaseSchedulePeriod[]; regularQuota: number } {
    const {
      input,
      periodEffectiveRate,
      quotaRate,
      finalQuotaAmount,
      presentValueFinalQuota,
      regularFinancedBalance,
    } = params;

    const schedule: SmartPurchaseSchedulePeriod[] = [];

    let finalQuotaBalance = presentValueFinalQuota;
    let regularBalance = regularFinancedBalance;
    let regularQuota = 0;

    for (let installmentNumber = 1; installmentNumber <= input.termMonths; installmentNumber++) {
      const periodType = this.resolvePeriodType(
        installmentNumber,
        input.totalGracePeriods,
        input.partialGracePeriods,
      );

      const finalQuotaPart = this.computeFinalQuotaAccrual({
        initialBalance: finalQuotaBalance,
        periodEffectiveRate,
        desgravamenRate: input.desgravamenRate,
        balloonPayment: 0,
      });

      finalQuotaBalance = finalQuotaPart.finalBalance;

      if (periodType === 'NORMAL' && regularQuota === 0) {
        const remainingNormalPeriods = input.termMonths - installmentNumber + 1;
        regularQuota = this.computeFrenchQuota(regularBalance, quotaRate, remainingNormalPeriods);
      }

      const regularPart = this.computeRegularPart({
        periodType,
        initialBalance: regularBalance,
        periodEffectiveRate,
        desgravamenRate: input.desgravamenRate,
        regularQuota,
        isLastRegularInstallment: installmentNumber === input.termMonths,
      });

      regularBalance = regularPart.finalBalance;

      const riskInsurance = this.computeRiskInsurance(input);
      const otherExpenses = this.computePeriodicExpenses(input.expenses, installmentNumber);

      const totalPayment =
        regularPart.payment +
        riskInsurance +
        input.gps +
        input.portes +
        input.administrativeExpenses +
        otherExpenses;

      schedule.push(
        this.buildPeriod({
          installmentNumber,
          periodType,
          cashFlowType: 'INSTALLMENT',
          finalQuotaPart,
          regularPart,
          riskInsurance,
          gps: input.gps,
          portes: input.portes,
          administrativeExpenses: input.administrativeExpenses,
          otherExpenses,
          balloonPayment: 0,
          totalPayment,
        }),
      );
    }

    /**
     * Fila adicional del cuotón.
     * La BD actual no acepta periodType = CUOTON, por eso usamos NORMAL.
     */
    const balloonInstallmentNumber = input.termMonths + 1;

    const finalQuotaPart = this.computeFinalQuotaAccrual({
      initialBalance: finalQuotaBalance,
      periodEffectiveRate,
      desgravamenRate: input.desgravamenRate,
      balloonPayment: finalQuotaAmount,
    });

    const riskInsurance = this.computeRiskInsurance(input);
    const otherExpenses = this.computePeriodicExpenses(input.expenses, balloonInstallmentNumber);

    const totalPayment =
      finalQuotaAmount +
      riskInsurance +
      input.gps +
      input.portes +
      input.administrativeExpenses +
      otherExpenses;

    schedule.push(
      this.buildPeriod({
        installmentNumber: balloonInstallmentNumber,
        periodType: 'NORMAL',
        cashFlowType: 'BALLOON',
        finalQuotaPart,
        regularPart: {
          initialBalance: 0,
          interest: 0,
          desgravamen: 0,
          quota: 0,
          amortization: 0,
          payment: 0,
          finalBalance: 0,
        },
        riskInsurance,
        gps: input.gps,
        portes: input.portes,
        administrativeExpenses: input.administrativeExpenses,
        otherExpenses,
        balloonPayment: finalQuotaAmount,
        totalPayment,
      }),
    );

    return { schedule, regularQuota };
  }

  private static resolvePeriodType(
    installmentNumber: number,
    totalGracePeriods: number,
    partialGracePeriods: number,
  ): PeriodType {
    if (installmentNumber <= totalGracePeriods) {
      return 'GRACIA_TOTAL';
    }

    if (installmentNumber <= totalGracePeriods + partialGracePeriods) {
      return 'GRACIA_PARCIAL';
    }

    return 'NORMAL';
  }

  private static computeFinalQuotaAccrual(params: {
    initialBalance: number;
    periodEffectiveRate: number;
    desgravamenRate: number;
    balloonPayment: number;
  }): {
    initialBalance: number;
    interest: number;
    desgravamen: number;
    amortization: number;
    finalBalance: number;
  } {
    const interest = params.initialBalance * params.periodEffectiveRate;
    const desgravamen = params.initialBalance * params.desgravamenRate;
    const balanceBeforePayment = params.initialBalance + interest + desgravamen;

    if (params.balloonPayment > 0) {
      return {
        initialBalance: params.initialBalance,
        interest,
        desgravamen,
        amortization: params.balloonPayment,
        finalBalance: 0,
      };
    }

    return {
      initialBalance: params.initialBalance,
      interest,
      desgravamen,
      amortization: 0,
      finalBalance: balanceBeforePayment,
    };
  }

  private static computeRegularPart(params: {
    periodType: PeriodType;
    initialBalance: number;
    periodEffectiveRate: number;
    desgravamenRate: number;
    regularQuota: number;
    isLastRegularInstallment: boolean;
  }): {
    initialBalance: number;
    interest: number;
    desgravamen: number;
    quota: number;
    amortization: number;
    payment: number;
    finalBalance: number;
  } {
    const interest = params.initialBalance * params.periodEffectiveRate;
    const desgravamen = params.initialBalance * params.desgravamenRate;

    if (params.periodType === 'GRACIA_TOTAL') {
      const finalBalance = params.initialBalance + interest; // ← solo interés capitaliza

      return {
        initialBalance: params.initialBalance,
        interest,
        desgravamen,
        quota: 0,
        amortization: 0,
        payment: desgravamen, // ← desgravamen sí se paga
        finalBalance,
      };
    }

    if (params.periodType === 'GRACIA_PARCIAL') {
      return {
        initialBalance: params.initialBalance,
        interest,
        desgravamen,
        quota: interest + desgravamen,
        amortization: 0,
        payment: interest + desgravamen,
        finalBalance: params.initialBalance,
      };
    }

    let amortization = params.regularQuota - interest - desgravamen;
    let finalBalance = params.initialBalance - amortization;

    if (params.isLastRegularInstallment) {
      amortization = params.initialBalance;
      finalBalance = 0;
    }

    return {
      initialBalance: params.initialBalance,
      interest,
      desgravamen,
      quota: params.regularQuota,
      amortization,
      payment: params.regularQuota,
      finalBalance,
    };
  }

  private static computeFrenchQuota(balance: number, rate: number, periods: number): number {
    if (periods <= 0) {
      return 0;
    }

    if (rate === 0) {
      return balance / periods;
    }

    const factor = Math.pow(1 + rate, periods);

    return balance * ((rate * factor) / (factor - 1));
  }

  private static computeRiskInsurance(input: NormalizedSimulationInput): number {
    return (input.riskInsuranceAnnualRate * input.vehiclePrice) / input.installmentsPerYear;
  }

  private static computePeriodicExpenses(
    expenses: SimulationExpenseInput[],
    installmentNumber: number,
  ): number {
    return expenses
      .filter(
        (expense) =>
          expense.expenseStage === 'PERIODIC' &&
          expense.paymentBehavior === 'PAID_IN_INSTALLMENT' &&
          (expense.installmentStart ?? 1) <= installmentNumber &&
          (expense.installmentEnd ?? installmentNumber) >= installmentNumber,
      )
      .reduce((sum, expense) => sum + expense.amount, 0);
  }

  private static buildPeriod(params: {
    installmentNumber: number;
    periodType: PeriodType;
    cashFlowType: CashFlowType;
    finalQuotaPart: {
      initialBalance: number;
      interest: number;
      desgravamen: number;
      amortization: number;
      finalBalance: number;
    };
    regularPart: {
      initialBalance: number;
      interest: number;
      desgravamen: number;
      quota: number;
      amortization: number;
      payment: number;
      finalBalance: number;
    };
    riskInsurance: number;
    gps: number;
    portes: number;
    administrativeExpenses: number;
    otherExpenses: number;
    balloonPayment: number;
    totalPayment: number;
  }): SmartPurchaseSchedulePeriod {
    const totalInsurance =
      params.regularPart.desgravamen + params.finalQuotaPart.desgravamen + params.riskInsurance;

    return {
      installmentNumber: params.installmentNumber,
      periodType: params.periodType,
      cashFlowType: params.cashFlowType,

      initialFinalQuotaBalance: params.finalQuotaPart.initialBalance,
      finalQuotaInterest: params.finalQuotaPart.interest,
      finalQuotaAmortization: params.finalQuotaPart.amortization,
      finalQuotaDesgravamen: params.finalQuotaPart.desgravamen,
      finalFinalQuotaBalance: params.finalQuotaPart.finalBalance,

      initialRegularBalance: params.regularPart.initialBalance,
      regularInterest: params.regularPart.interest,
      regularQuota: params.regularPart.quota,
      regularAmortization: params.regularPart.amortization,
      regularDesgravamen: params.regularPart.desgravamen,
      finalRegularBalance: params.regularPart.finalBalance,

      riskInsurance: params.riskInsurance,
      gps: params.gps,
      portes: params.portes,
      administrativeExpenses: params.administrativeExpenses,
      otherExpenses: params.otherExpenses,
      balloonPayment: params.balloonPayment,

      totalPayment: params.totalPayment,
      cashFlow: -params.totalPayment,

      initialBalance: params.regularPart.initialBalance,
      interest: params.regularPart.interest,
      amortization: params.regularPart.amortization,
      insuranceDesgravamen: params.regularPart.desgravamen + params.finalQuotaPart.desgravamen,
      insuranceVehicular: params.riskInsurance,
      finalBalance: params.regularPart.finalBalance,
      isBalloonPayment: params.cashFlowType === 'BALLOON',
    };
  }
}
