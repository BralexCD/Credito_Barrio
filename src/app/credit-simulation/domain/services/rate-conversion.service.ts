import {
  CapitalizationType,
  CAPITALIZATION_PERIOD_DAYS,
  CAPITALIZATION_PERIODS_PER_YEAR,
  RatePeriodType,
  RATE_PERIOD_DAYS,
  RateType,
} from '../model/credit-simulation.types';

/**
 * Conversor general de tasas.
 *
 * Convención:
 * - Entradas porcentuales: 5 significa 5%.
 * - Salidas decimales: 0.05 significa 5%.
 *
 * Soporta:
 * - TEA, TEM, TET, TEC, TES
 * - TNA, TNM, TNT, TNC, TNS
 * - Capitalización diaria, quincenal, mensual, bimestral, trimestral,
 *   cuatrimestral, semestral y anual.
 */
export class RateConversionService {
  static percentToDecimal(percent: number): number {
    return percent / 100;
  }

  static decimalToPercent(decimal: number): number {
    return decimal * 100;
  }

  static convertToEffectiveRates(params: {
    rateType: RateType;
    rateValuePercent: number;
    ratePeriod: RatePeriodType;
    capitalization?: CapitalizationType | null;
    paymentFrequencyDays?: number;
    daysPerYear?: number;
  }): {
    periodEffectiveRate: number;
    annualEffectiveRate: number;
  } {
    const paymentFrequencyDays = params.paymentFrequencyDays ?? 30;
    const daysPerYear = params.daysPerYear ?? 360;

    if (params.rateType === 'NOMINAL') {
      const periodEffectiveRate = this.nominalRateToEffectivePeriod({
        nominalRatePercent: params.rateValuePercent,
        nominalRatePeriod: params.ratePeriod,
        capitalization: params.capitalization ?? 'MENSUAL',
        targetPeriodDays: paymentFrequencyDays,
        daysPerYear,
      });

      return {
        periodEffectiveRate,
        annualEffectiveRate: this.periodToEffectiveAnnual(
          periodEffectiveRate,
          paymentFrequencyDays,
          daysPerYear,
        ),
      };
    }

    const periodEffectiveRate = this.effectiveRateToEffectivePeriod({
      effectiveRatePercent: params.rateValuePercent,
      effectiveRatePeriod: params.ratePeriod,
      targetPeriodDays: paymentFrequencyDays,
      daysPerYear,
    });

    return {
      periodEffectiveRate,
      annualEffectiveRate: this.periodToEffectiveAnnual(
        periodEffectiveRate,
        paymentFrequencyDays,
        daysPerYear,
      ),
    };
  }

  static effectiveRateToEffectivePeriod(params: {
    effectiveRatePercent: number;
    effectiveRatePeriod: RatePeriodType;
    targetPeriodDays: number;
    daysPerYear?: number;
  }): number {
    const sourceRate = this.percentToDecimal(params.effectiveRatePercent);
    const sourceDays = this.getRatePeriodDays(
      params.effectiveRatePeriod,
      params.daysPerYear ?? 360,
    );

    return Math.pow(1 + sourceRate, params.targetPeriodDays / sourceDays) - 1;
  }

  static nominalRateToEffectivePeriod(params: {
    nominalRatePercent: number;
    nominalRatePeriod: RatePeriodType;
    capitalization: CapitalizationType;
    targetPeriodDays: number;
    daysPerYear?: number;
  }): number {
    const daysPerYear = params.daysPerYear ?? 360;
    const nominalRate = this.percentToDecimal(params.nominalRatePercent);

    const nominalPeriodDays = this.getRatePeriodDays(params.nominalRatePeriod, daysPerYear);
    const capitalizationDays = this.getCapitalizationPeriodDays(params.capitalization, daysPerYear);

    if (capitalizationDays > nominalPeriodDays) {
      throw new Error(
        'La capitalización no puede tener un periodo mayor al periodo de la tasa nominal.',
      );
    }

    const capitalizationPeriodsInNominalPeriod = nominalPeriodDays / capitalizationDays;

    if (capitalizationPeriodsInNominalPeriod <= 0) {
      throw new Error('La relación entre periodo nominal y capitalización es inválida.');
    }

    const effectiveRatePerCapitalization = nominalRate / capitalizationPeriodsInNominalPeriod;

    return (
      Math.pow(1 + effectiveRatePerCapitalization, params.targetPeriodDays / capitalizationDays) - 1
    );
  }

  static nominalRateToEffectiveAnnual(params: {
    nominalRatePercent: number;
    nominalRatePeriod: RatePeriodType;
    capitalization: CapitalizationType;
    daysPerYear?: number;
  }): number {
    return this.nominalRateToEffectivePeriod({
      nominalRatePercent: params.nominalRatePercent,
      nominalRatePeriod: params.nominalRatePeriod,
      capitalization: params.capitalization,
      targetPeriodDays: params.daysPerYear ?? 360,
      daysPerYear: params.daysPerYear ?? 360,
    });
  }

  static effectiveRateToEffectiveAnnual(params: {
    effectiveRatePercent: number;
    effectiveRatePeriod: RatePeriodType;
    daysPerYear?: number;
  }): number {
    return this.effectiveRateToEffectivePeriod({
      effectiveRatePercent: params.effectiveRatePercent,
      effectiveRatePeriod: params.effectiveRatePeriod,
      targetPeriodDays: params.daysPerYear ?? 360,
      daysPerYear: params.daysPerYear ?? 360,
    });
  }

  /**
   * TEA porcentual a tasa efectiva del periodo.
   * Se conserva para compatibilidad con tu código actual.
   */
  static effectiveAnnualToPeriod(
    teaPercent: number,
    paymentFrequencyDays = 30,
    daysPerYear = 360,
  ): number {
    return this.effectiveRateToEffectivePeriod({
      effectiveRatePercent: teaPercent,
      effectiveRatePeriod: 'ANUAL',
      targetPeriodDays: paymentFrequencyDays,
      daysPerYear,
    });
  }

  /**
   * TNA porcentual a TEA decimal.
   * Se conserva para compatibilidad.
   */
  static nominalAnnualToEffectiveAnnual(
    tnaPercent: number,
    capitalization: CapitalizationType = 'MENSUAL',
  ): number {
    return this.nominalRateToEffectiveAnnual({
      nominalRatePercent: tnaPercent,
      nominalRatePeriod: 'ANUAL',
      capitalization,
      daysPerYear: 360,
    });
  }

  /**
   * TNA porcentual a tasa efectiva del periodo.
   * Se conserva para compatibilidad.
   */
  static nominalAnnualToPeriod(
    tnaPercent: number,
    capitalization: CapitalizationType = 'MENSUAL',
    paymentFrequencyDays = 30,
    daysPerYear = 360,
  ): number {
    return this.nominalRateToEffectivePeriod({
      nominalRatePercent: tnaPercent,
      nominalRatePeriod: 'ANUAL',
      capitalization,
      targetPeriodDays: paymentFrequencyDays,
      daysPerYear,
    });
  }

  /**
   * Tasa efectiva del periodo a TEA decimal.
   */
  static periodToEffectiveAnnual(
    periodRate: number,
    paymentFrequencyDays = 30,
    daysPerYear = 360,
  ): number {
    return Math.pow(1 + periodRate, daysPerYear / paymentFrequencyDays) - 1;
  }

  static teaToTem(teaPercent: number): number {
    return this.effectiveAnnualToPeriod(teaPercent, 30, 360);
  }

  static tnaToTem(tnaPercent: number, capitalizationPeriodsPerYear: number): number {
    const nominalRate = this.percentToDecimal(tnaPercent);
    const teaDecimal =
      Math.pow(1 + nominalRate / capitalizationPeriodsPerYear, capitalizationPeriodsPerYear) - 1;

    return Math.pow(1 + teaDecimal, 30 / 360) - 1;
  }

  static temToTea(tem: number): number {
    return this.periodToEffectiveAnnual(tem, 30, 360);
  }

  static getRatePeriodDays(period: RatePeriodType, daysPerYear = 360): number {
    if (period === 'ANUAL') {
      return daysPerYear;
    }

    return RATE_PERIOD_DAYS[period];
  }

  static getCapitalizationPeriodDays(period: CapitalizationType, daysPerYear = 360): number {
    if (period === 'ANUAL') {
      return daysPerYear;
    }

    return CAPITALIZATION_PERIOD_DAYS[period];
  }

  static getCapitalizationPeriodsPerYear(period: CapitalizationType, daysPerYear = 360): number {
    if (period === 'ANUAL') {
      return 1;
    }

    if (daysPerYear === 360) {
      return CAPITALIZATION_PERIODS_PER_YEAR[period];
    }

    return daysPerYear / this.getCapitalizationPeriodDays(period, daysPerYear);
  }
}
