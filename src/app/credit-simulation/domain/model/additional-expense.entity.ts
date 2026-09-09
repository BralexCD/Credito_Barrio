import { BaseEntity } from '../../../shared/domain/model/base-entity';
import {
  ExpenseAmountType,
  ExpenseBaseCalculation,
  ExpensePaymentBehavior,
  ExpenseStage,
} from './credit-simulation.types';

export type AdditionalExpenseType = 'UNICO' | 'PERIODICO';

export interface AdditionalExpenseProps {
  id: string;
  simulationId: string;
  concept: string;
  type: AdditionalExpenseType;
  amount: number;
  installmentStart?: number | null;
  installmentEnd?: number | null;
  description?: string | null;

  expenseStage?: ExpenseStage;
  paymentBehavior?: ExpensePaymentBehavior;
  amountType?: ExpenseAmountType;
  rateValue?: number | null;
  baseCalculation?: ExpenseBaseCalculation | null;
}

/**
 * Extra cost attached to a simulation.
 *
 * Supports both:
 * - Initial financed expenses: notarial costs, registration costs, etc.
 * - Periodic expenses: GPS, administrative expenses, portes, etc.
 */
export class AdditionalExpense implements BaseEntity {
  private readonly _id: string;
  private readonly _simulationId: string;
  private readonly _concept: string;
  private readonly _type: AdditionalExpenseType;
  private readonly _amount: number;
  private readonly _installmentStart: number | null;
  private readonly _installmentEnd: number | null;
  private readonly _description: string | null;

  private readonly _expenseStage: ExpenseStage;
  private readonly _paymentBehavior: ExpensePaymentBehavior;
  private readonly _amountType: ExpenseAmountType;
  private readonly _rateValue: number | null;
  private readonly _baseCalculation: ExpenseBaseCalculation | null;

  constructor(props: AdditionalExpenseProps) {
    this._id = props.id;
    this._simulationId = props.simulationId;
    this._concept = props.concept;
    this._type = props.type;
    this._amount = props.amount;
    this._installmentStart = props.installmentStart ?? null;
    this._installmentEnd = props.installmentEnd ?? null;
    this._description = props.description ?? null;

    this._expenseStage = props.expenseStage ?? 'PERIODIC';
    this._paymentBehavior = props.paymentBehavior ?? 'PAID_IN_INSTALLMENT';
    this._amountType = props.amountType ?? 'FIXED';
    this._rateValue = props.rateValue ?? null;
    this._baseCalculation = props.baseCalculation ?? 'FIXED_AMOUNT';
  }

  get id(): string {
    return this._id;
  }

  get simulationId(): string {
    return this._simulationId;
  }

  get concept(): string {
    return this._concept;
  }

  get type(): AdditionalExpenseType {
    return this._type;
  }

  get amount(): number {
    return this._amount;
  }

  get installmentStart(): number | null {
    return this._installmentStart;
  }

  get installmentEnd(): number | null {
    return this._installmentEnd;
  }

  get description(): string | null {
    return this._description;
  }

  get expenseStage(): ExpenseStage {
    return this._expenseStage;
  }

  get paymentBehavior(): ExpensePaymentBehavior {
    return this._paymentBehavior;
  }

  get amountType(): ExpenseAmountType {
    return this._amountType;
  }

  get rateValue(): number | null {
    return this._rateValue;
  }

  get baseCalculation(): ExpenseBaseCalculation | null {
    return this._baseCalculation;
  }

  get isInitialFinanced(): boolean {
    return this._expenseStage === 'INITIAL' && this._paymentBehavior === 'FINANCED';
  }

  get isPeriodicPaidInInstallment(): boolean {
    return this._expenseStage === 'PERIODIC' && this._paymentBehavior === 'PAID_IN_INSTALLMENT';
  }

  appliesToInstallment(installmentNumber: number): boolean {
    if (!this.isPeriodicPaidInInstallment) {
      return false;
    }

    const start = this._installmentStart ?? 1;
    const end = this._installmentEnd ?? installmentNumber;

    return installmentNumber >= start && installmentNumber <= end;
  }
}
