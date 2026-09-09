import { BaseEntity } from '../../../shared/domain/model/base-entity';
import { CashFlowType, PeriodType } from './credit-simulation.types';

export interface PaymentScheduleEntryProps {
  id: string;
  simulationId: string;
  installmentNumber: number;
  paymentDate: string;
  periodType: PeriodType;

  /**
   * Legacy summary fields.
   */
  initialBalance: number;
  interest: number;
  amortization: number;
  totalInsurance: number;
  portes: number;
  otherExpenses: number;
  totalPayment: number;
  finalBalance: number;
  cashFlow: number;

  /**
   * New Excel-aligned fields.
   */
  cashFlowType?: CashFlowType;

  initialFinalQuotaBalance?: number;
  finalQuotaInterest?: number;
  finalQuotaAmortization?: number;
  finalQuotaDesgravamen?: number;
  finalFinalQuotaBalance?: number;

  initialRegularBalance?: number;
  regularInterest?: number;
  regularQuota?: number;
  regularAmortization?: number;
  regularDesgravamen?: number;
  finalRegularBalance?: number;

  riskInsurance?: number;
  gps?: number;
  administrativeExpenses?: number;
  balloonPayment?: number;
}

/**
 * Single row of the payment schedule.
 *
 * Important:
 * The current DB does not store installment 0.
 * The initial positive cash flow is represented by simulations.loan_amount.
 */
export class PaymentScheduleEntry implements BaseEntity {
  private readonly _id: string;
  private readonly _simulationId: string;
  private readonly _installmentNumber: number;
  private readonly _paymentDate: string;
  private readonly _periodType: PeriodType;

  private readonly _initialBalance: number;
  private readonly _interest: number;
  private readonly _amortization: number;
  private readonly _totalInsurance: number;
  private readonly _portes: number;
  private readonly _otherExpenses: number;
  private readonly _totalPayment: number;
  private readonly _finalBalance: number;
  private readonly _cashFlow: number;

  private readonly _cashFlowType: CashFlowType;

  private readonly _initialFinalQuotaBalance: number;
  private readonly _finalQuotaInterest: number;
  private readonly _finalQuotaAmortization: number;
  private readonly _finalQuotaDesgravamen: number;
  private readonly _finalFinalQuotaBalance: number;

  private readonly _initialRegularBalance: number;
  private readonly _regularInterest: number;
  private readonly _regularQuota: number;
  private readonly _regularAmortization: number;
  private readonly _regularDesgravamen: number;
  private readonly _finalRegularBalance: number;

  private readonly _riskInsurance: number;
  private readonly _gps: number;
  private readonly _administrativeExpenses: number;
  private readonly _balloonPayment: number;

  constructor(props: PaymentScheduleEntryProps) {
    this._id = props.id;
    this._simulationId = props.simulationId;
    this._installmentNumber = props.installmentNumber;
    this._paymentDate = props.paymentDate;
    this._periodType = props.periodType;

    this._initialBalance = props.initialBalance;
    this._interest = props.interest;
    this._amortization = props.amortization;
    this._totalInsurance = props.totalInsurance;
    this._portes = props.portes;
    this._otherExpenses = props.otherExpenses;
    this._totalPayment = props.totalPayment;
    this._finalBalance = props.finalBalance;
    this._cashFlow = props.cashFlow;

    this._cashFlowType = props.cashFlowType ?? 'INSTALLMENT';

    this._initialFinalQuotaBalance = props.initialFinalQuotaBalance ?? 0;
    this._finalQuotaInterest = props.finalQuotaInterest ?? 0;
    this._finalQuotaAmortization = props.finalQuotaAmortization ?? 0;
    this._finalQuotaDesgravamen = props.finalQuotaDesgravamen ?? 0;
    this._finalFinalQuotaBalance = props.finalFinalQuotaBalance ?? 0;

    this._initialRegularBalance = props.initialRegularBalance ?? props.initialBalance;
    this._regularInterest = props.regularInterest ?? props.interest;
    this._regularQuota = props.regularQuota ?? props.interest + props.amortization;
    this._regularAmortization = props.regularAmortization ?? props.amortization;
    this._regularDesgravamen = props.regularDesgravamen ?? props.totalInsurance;
    this._finalRegularBalance = props.finalRegularBalance ?? props.finalBalance;

    this._riskInsurance = props.riskInsurance ?? 0;
    this._gps = props.gps ?? 0;
    this._administrativeExpenses = props.administrativeExpenses ?? 0;
    this._balloonPayment = props.balloonPayment ?? 0;
  }

  get id(): string {
    return this._id;
  }

  get simulationId(): string {
    return this._simulationId;
  }

  get installmentNumber(): number {
    return this._installmentNumber;
  }

  get paymentDate(): string {
    return this._paymentDate;
  }

  get periodType(): PeriodType {
    return this._periodType;
  }

  get initialBalance(): number {
    return this._initialBalance;
  }

  get interest(): number {
    return this._interest;
  }

  get amortization(): number {
    return this._amortization;
  }

  get totalInsurance(): number {
    return this._totalInsurance;
  }

  get portes(): number {
    return this._portes;
  }

  get otherExpenses(): number {
    return this._otherExpenses;
  }

  get totalPayment(): number {
    return this._totalPayment;
  }

  get finalBalance(): number {
    return this._finalBalance;
  }

  get cashFlow(): number {
    return this._cashFlow;
  }

  get cashFlowType(): CashFlowType {
    return this._cashFlowType;
  }

  get initialFinalQuotaBalance(): number {
    return this._initialFinalQuotaBalance;
  }

  get finalQuotaInterest(): number {
    return this._finalQuotaInterest;
  }

  get finalQuotaAmortization(): number {
    return this._finalQuotaAmortization;
  }

  get finalQuotaDesgravamen(): number {
    return this._finalQuotaDesgravamen;
  }

  get finalFinalQuotaBalance(): number {
    return this._finalFinalQuotaBalance;
  }

  get initialRegularBalance(): number {
    return this._initialRegularBalance;
  }

  get regularInterest(): number {
    return this._regularInterest;
  }

  get regularQuota(): number {
    return this._regularQuota;
  }

  get regularAmortization(): number {
    return this._regularAmortization;
  }

  get regularDesgravamen(): number {
    return this._regularDesgravamen;
  }

  get finalRegularBalance(): number {
    return this._finalRegularBalance;
  }

  get riskInsurance(): number {
    return this._riskInsurance;
  }

  get gps(): number {
    return this._gps;
  }

  get administrativeExpenses(): number {
    return this._administrativeExpenses;
  }

  get balloonPayment(): number {
    return this._balloonPayment;
  }

  get isBalloonPayment(): boolean {
    return this._cashFlowType === 'BALLOON';
  }
}
