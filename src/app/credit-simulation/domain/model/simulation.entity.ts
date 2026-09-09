import { BaseEntity } from '../../../shared/domain/model/base-entity';
import { CapitalizationType, GraceType, RateType } from './credit-simulation.types';

export type CurrencyCode = 'PEN' | 'USD';

export interface SimulationProps {
  id: string;
  clientId: string;
  vehicleId: string;
  userId: string;

  vehiclePrice: number;
  currency: CurrencyCode;
  currencyCatalogId?: string | null;
  exchangeRateUsdPen?: number | null;

  initialFeePercentage: number;
  initialFeeAmount: number;

  /**
   * Legacy field.
   * In the new model this should usually match loanAmount.
   */
  financedAmount: number;

  /**
   * New Excel-aligned fields.
   */
  loanAmount?: number | null;
  initialCostsFinanced?: number | null;

  termMonths: number;

  /**
   * Legacy fields.
   */
  futureValuePercentage: number;
  futureValueAmount: number;

  /**
   * New names for the balloon/final quota.
   */
  finalQuotaPercentage?: number | null;
  finalQuotaAmount?: number | null;
  presentValueFinalQuota?: number | null;
  regularFinancedBalance?: number | null;

  rateType: RateType;
  interestRate: number;
  capitalization: CapitalizationType | null;

  /**
   * Legacy name.
   * In this project it represents the effective rate of the payment period.
   */
  monthlyEffectiveRate: number;

  annualEffectiveRate?: number | null;

  /**
   * Legacy grace fields.
   */
  graceType: GraceType;
  gracePeriod: number;

  /**
   * New model: total grace first, partial grace after that.
   */
  totalGracePeriods?: number | null;
  partialGracePeriods?: number | null;

  portes: number;

  /**
   * Legacy field.
   */
  baseQuota?: number | null;

  regularQuota?: number | null;

  opportunityRate?: number | null;
  opportunityPeriodRate?: number | null;
  paymentFrequencyDays?: number | null;
  daysPerYear?: number | null;
  installmentsPerYear?: number | null;

  tcea: number;
  van: number;
  tir: number;

  disbursementDate: string;
  registrationDate: string;
}

/**
 * Aggregate root for a Compra Inteligente credit simulation.
 *
 * It stores both:
 * - Input snapshot: vehicle price, rate, grace periods, final quota, expenses.
 * - Calculated indicators: regular quota, VAN, TIR, TCEA.
 */
export class Simulation implements BaseEntity {
  private readonly _id: string;
  private readonly _clientId: string;
  private readonly _vehicleId: string;
  private readonly _userId: string;

  private readonly _vehiclePrice: number;
  private readonly _currency: CurrencyCode;
  private readonly _currencyCatalogId: string | null;
  private readonly _exchangeRateUsdPen: number;

  private readonly _initialFeePercentage: number;
  private readonly _initialFeeAmount: number;

  private readonly _financedAmount: number;
  private readonly _loanAmount: number;
  private readonly _initialCostsFinanced: number;

  private readonly _termMonths: number;

  private readonly _futureValuePercentage: number;
  private readonly _futureValueAmount: number;

  private readonly _finalQuotaPercentage: number;
  private readonly _finalQuotaAmount: number;
  private readonly _presentValueFinalQuota: number;
  private readonly _regularFinancedBalance: number;

  private readonly _rateType: RateType;
  private readonly _interestRate: number;
  private readonly _capitalization: CapitalizationType | null;

  private readonly _monthlyEffectiveRate: number;
  private readonly _annualEffectiveRate: number;

  private readonly _graceType: GraceType;
  private readonly _gracePeriod: number;
  private readonly _totalGracePeriods: number;
  private readonly _partialGracePeriods: number;

  private readonly _portes: number;

  private readonly _baseQuota: number;
  private readonly _regularQuota: number;

  private readonly _opportunityRate: number;
  private readonly _opportunityPeriodRate: number;
  private readonly _paymentFrequencyDays: number;
  private readonly _daysPerYear: number;
  private readonly _installmentsPerYear: number;

  private readonly _tcea: number;
  private readonly _van: number;
  private readonly _tir: number;

  private readonly _disbursementDate: string;
  private readonly _registrationDate: string;

  constructor(props: SimulationProps) {
    this._id = props.id;
    this._clientId = props.clientId;
    this._vehicleId = props.vehicleId;
    this._userId = props.userId;

    this._vehiclePrice = props.vehiclePrice;
    this._currency = props.currency;
    this._currencyCatalogId = props.currencyCatalogId ?? null;
    this._exchangeRateUsdPen = props.exchangeRateUsdPen ?? 1;

    this._initialFeePercentage = props.initialFeePercentage;
    this._initialFeeAmount = props.initialFeeAmount;

    this._financedAmount = props.financedAmount;
    this._loanAmount = props.loanAmount ?? props.financedAmount;
    this._initialCostsFinanced = props.initialCostsFinanced ?? 0;

    this._termMonths = props.termMonths;

    this._futureValuePercentage = props.futureValuePercentage;
    this._futureValueAmount = props.futureValueAmount;

    this._finalQuotaPercentage = props.finalQuotaPercentage ?? props.futureValuePercentage;
    this._finalQuotaAmount = props.finalQuotaAmount ?? props.futureValueAmount;
    this._presentValueFinalQuota = props.presentValueFinalQuota ?? 0;
    this._regularFinancedBalance = props.regularFinancedBalance ?? 0;

    this._rateType = props.rateType;
    this._interestRate = props.interestRate;
    this._capitalization = props.capitalization;

    this._monthlyEffectiveRate = props.monthlyEffectiveRate;
    this._annualEffectiveRate = props.annualEffectiveRate ?? 0;

    this._graceType = props.graceType;
    this._gracePeriod = props.gracePeriod;

    this._totalGracePeriods =
      props.totalGracePeriods ?? (props.graceType === 'TOTAL' ? props.gracePeriod : 0);

    this._partialGracePeriods =
      props.partialGracePeriods ?? (props.graceType === 'PARCIAL' ? props.gracePeriod : 0);

    this._portes = props.portes;

    this._baseQuota = props.baseQuota ?? props.regularQuota ?? 0;
    this._regularQuota = props.regularQuota ?? props.baseQuota ?? 0;

    this._opportunityRate = props.opportunityRate ?? 0;
    this._opportunityPeriodRate = props.opportunityPeriodRate ?? 0;
    this._paymentFrequencyDays = props.paymentFrequencyDays ?? 30;
    this._daysPerYear = props.daysPerYear ?? 360;
    this._installmentsPerYear = props.installmentsPerYear ?? 12;

    this._tcea = props.tcea;
    this._van = props.van;
    this._tir = props.tir;

    this._disbursementDate = props.disbursementDate;
    this._registrationDate = props.registrationDate;
  }

  get id(): string {
    return this._id;
  }

  get clientId(): string {
    return this._clientId;
  }

  get vehicleId(): string {
    return this._vehicleId;
  }

  get userId(): string {
    return this._userId;
  }

  get vehiclePrice(): number {
    return this._vehiclePrice;
  }

  get currency(): CurrencyCode {
    return this._currency;
  }

  get currencyCatalogId(): string | null {
    return this._currencyCatalogId;
  }

  get exchangeRateUsdPen(): number {
    return this._exchangeRateUsdPen;
  }

  get initialFeePercentage(): number {
    return this._initialFeePercentage;
  }

  get initialFeeAmount(): number {
    return this._initialFeeAmount;
  }

  get financedAmount(): number {
    return this._financedAmount;
  }

  get loanAmount(): number {
    return this._loanAmount;
  }

  get initialCostsFinanced(): number {
    return this._initialCostsFinanced;
  }

  get termMonths(): number {
    return this._termMonths;
  }

  get futureValuePercentage(): number {
    return this._futureValuePercentage;
  }

  get futureValueAmount(): number {
    return this._futureValueAmount;
  }

  get finalQuotaPercentage(): number {
    return this._finalQuotaPercentage;
  }

  get finalQuotaAmount(): number {
    return this._finalQuotaAmount;
  }

  get presentValueFinalQuota(): number {
    return this._presentValueFinalQuota;
  }

  get regularFinancedBalance(): number {
    return this._regularFinancedBalance;
  }

  get rateType(): RateType {
    return this._rateType;
  }

  get interestRate(): number {
    return this._interestRate;
  }

  get capitalization(): CapitalizationType | null {
    return this._capitalization;
  }

  get monthlyEffectiveRate(): number {
    return this._monthlyEffectiveRate;
  }

  get annualEffectiveRate(): number {
    return this._annualEffectiveRate;
  }

  get graceType(): GraceType {
    return this._graceType;
  }

  get gracePeriod(): number {
    return this._gracePeriod;
  }

  get totalGracePeriods(): number {
    return this._totalGracePeriods;
  }

  get partialGracePeriods(): number {
    return this._partialGracePeriods;
  }

  get portes(): number {
    return this._portes;
  }

  get baseQuota(): number {
    return this._baseQuota;
  }

  get regularQuota(): number {
    return this._regularQuota;
  }

  get opportunityRate(): number {
    return this._opportunityRate;
  }

  get opportunityPeriodRate(): number {
    return this._opportunityPeriodRate;
  }

  get paymentFrequencyDays(): number {
    return this._paymentFrequencyDays;
  }

  get daysPerYear(): number {
    return this._daysPerYear;
  }

  get installmentsPerYear(): number {
    return this._installmentsPerYear;
  }

  get tcea(): number {
    return this._tcea;
  }

  get van(): number {
    return this._van;
  }

  get tir(): number {
    return this._tir;
  }

  get disbursementDate(): string {
    return this._disbursementDate;
  }

  get registrationDate(): string {
    return this._registrationDate;
  }
}
