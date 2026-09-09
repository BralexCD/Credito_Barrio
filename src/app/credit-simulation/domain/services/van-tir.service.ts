const TIR_BISECTION_ITERATIONS = 80;
const TIR_TOLERANCE = 1e-10;

/**
 * VAN, TIR y TCEA sobre el flujo completo del deudor.
 *
 * Convención de flujo:
 * cashFlows[0] > 0  → préstamo recibido por el deudor
 * cashFlows[t] < 0  → pagos del deudor
 */
export class VanTirService {
  static computeVanFromCashFlows(cashFlows: number[], discountRate: number): number {
    if (cashFlows.length === 0) {
      return 0;
    }

    return cashFlows.reduce(
      (van, flow, index) => van + flow / Math.pow(1 + discountRate, index),
      0,
    );
  }

  static computeTirFromCashFlows(cashFlows: number[]): number {
    if (cashFlows.length < 2) {
      return 0;
    }

    let low = 0;
    let high = 1;

    let vanLow = this.computeVanFromCashFlows(cashFlows, low);
    let vanHigh = this.computeVanFromCashFlows(cashFlows, high);

    /**
     * Expandimos el rango superior si todavía no hay cambio de signo.
     * Esto evita devolver una TIR falsa cuando la raíz está por encima de 100%.
     */
    while (vanLow * vanHigh > 0 && high < 100) {
      high *= 2;
      vanHigh = this.computeVanFromCashFlows(cashFlows, high);
    }

    if (vanLow * vanHigh > 0) {
      return 0;
    }

    let mid = 0;

    for (let iteration = 0; iteration < TIR_BISECTION_ITERATIONS; iteration++) {
      mid = (low + high) / 2;

      const vanMid = this.computeVanFromCashFlows(cashFlows, mid);

      if (Math.abs(vanMid) < TIR_TOLERANCE) {
        return mid;
      }

      if (vanLow * vanMid < 0) {
        high = mid;
        vanHigh = vanMid;
      } else {
        low = mid;
        vanLow = vanMid;
      }
    }

    return mid;
  }

  static computeTcea(tirPeriod: number, paymentFrequencyDays = 30, daysPerYear = 360): number {
    return Math.pow(1 + tirPeriod, daysPerYear / paymentFrequencyDays) - 1;
  }

  /**
   * Compatibilidad con tu código anterior.
   * VAN = P - pagos descontados - valor futuro descontado.
   */
  static computeVan(
    financedAmountOrCashFlows: number | number[],
    totalPaymentsOrDiscountRate: number[] | number,
    futureValue?: number,
    discountRate?: number,
  ): number {
    if (Array.isArray(financedAmountOrCashFlows)) {
      return this.computeVanFromCashFlows(
        financedAmountOrCashFlows,
        totalPaymentsOrDiscountRate as number,
      );
    }

    const financedAmount = financedAmountOrCashFlows;
    const totalPayments = totalPaymentsOrDiscountRate as number[];
    const rate = discountRate ?? 0;

    const cashFlows = [financedAmount, ...totalPayments.map((payment) => -payment)];

    if (futureValue && futureValue > 0) {
      cashFlows[cashFlows.length - 1] -= futureValue;
    }

    return this.computeVanFromCashFlows(cashFlows, rate);
  }

  /**
   * Compatibilidad con tu código anterior.
   */
  static computeTir(
    financedAmountOrCashFlows: number | number[],
    totalPayments?: number[],
    futureValue?: number,
  ): number {
    if (Array.isArray(financedAmountOrCashFlows)) {
      return this.computeTirFromCashFlows(financedAmountOrCashFlows);
    }

    const financedAmount = financedAmountOrCashFlows;

    const cashFlows = [financedAmount, ...(totalPayments ?? []).map((payment) => -payment)];

    if (futureValue && futureValue > 0) {
      cashFlows[cashFlows.length - 1] -= futureValue;
    }

    return this.computeTirFromCashFlows(cashFlows);
  }
}
