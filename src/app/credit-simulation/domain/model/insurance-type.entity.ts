import { BaseEntity } from '../../../shared/domain/model/base-entity';

export type InsuranceRatePeriod = 'PERIODIC' | 'ANNUAL';

export type InsuranceBaseCalculation =
  | 'REGULAR_BALANCE'
  | 'FINAL_QUOTA_BALANCE'
  | 'VEHICLE_PRICE'
  | 'LOAN_AMOUNT'
  | 'FIXED_AMOUNT';

export interface InsuranceTypeProps {
  id: string;
  name: string;
  description?: string | null;

  /**
   * Legacy fields.
   */
  baseCalculo?: string | null;
  monthlyRate?: number | null;

  mandatory: boolean;
  status: boolean;

  /**
   * New fields aligned to Supabase and the Excel model.
   */
  rateValue?: number | null;
  ratePeriod?: InsuranceRatePeriod | null;
  baseCalculation?: InsuranceBaseCalculation | null;
}

/**
 * Insurance catalog entry.
 *
 * Examples:
 * - Seguro de desgravamen: periodic rate over balance.
 * - Seguro de riesgo vehicular: annual rate over vehicle price.
 */
export class InsuranceType implements BaseEntity {
  private readonly _id: string;
  private readonly _name: string;
  private readonly _description: string | null;

  private readonly _baseCalculo: string | null;
  private readonly _monthlyRate: number;

  private readonly _mandatory: boolean;
  private readonly _status: boolean;

  private readonly _rateValue: number;
  private readonly _ratePeriod: InsuranceRatePeriod;
  private readonly _baseCalculation: InsuranceBaseCalculation;

  constructor(props: InsuranceTypeProps) {
    this._id = props.id;
    this._name = props.name;
    this._description = props.description ?? null;

    this._baseCalculo = props.baseCalculo ?? null;
    this._monthlyRate = props.monthlyRate ?? props.rateValue ?? 0;

    this._mandatory = props.mandatory;
    this._status = props.status;

    this._rateValue = props.rateValue ?? props.monthlyRate ?? 0;
    this._ratePeriod = props.ratePeriod ?? 'PERIODIC';
    this._baseCalculation =
      props.baseCalculation ?? this.mapLegacyBaseCalculation(props.baseCalculo);
  }

  private mapLegacyBaseCalculation(baseCalculo?: string | null): InsuranceBaseCalculation {
    const normalized = (baseCalculo ?? '').trim().toUpperCase();

    if (normalized === 'VEHICULO') {
      return 'VEHICLE_PRICE';
    }

    if (normalized === 'MONTO_FINANCIADO') {
      return 'LOAN_AMOUNT';
    }

    if (normalized === 'FIJO') {
      return 'FIXED_AMOUNT';
    }

    return 'REGULAR_BALANCE';
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get description(): string | null {
    return this._description;
  }

  get baseCalculo(): string | null {
    return this._baseCalculo;
  }

  get monthlyRate(): number {
    return this._monthlyRate;
  }

  get mandatory(): boolean {
    return this._mandatory;
  }

  get status(): boolean {
    return this._status;
  }

  get rateValue(): number {
    return this._rateValue;
  }

  get ratePeriod(): InsuranceRatePeriod {
    return this._ratePeriod;
  }

  get baseCalculation(): InsuranceBaseCalculation {
    return this._baseCalculation;
  }
}
