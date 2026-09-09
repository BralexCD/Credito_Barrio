import { BaseEntity } from '../../../shared/domain/model/base-entity';
import { InsuranceBaseCalculation, InsuranceRatePeriod } from './insurance-type.entity';

export interface InsuranceSimulationProps {
  id: string;
  simulationId: string;

  /**
   * Main insurance type id.
   * In DB it must be sent to both:
   * - tipo_seguro_id
   * - insurance_type_id
   */
  insuranceTypeId: string;

  /**
   * Legacy fields.
   */
  monthlyRate?: number | null;
  baseCalculo?: string | null;

  applies: boolean;

  /**
   * Snapshot fields.
   */
  nameSnapshot?: string | null;
  rateValue?: number | null;
  ratePeriod?: InsuranceRatePeriod | null;
  baseCalculation?: InsuranceBaseCalculation | null;
}

/**
 * Snapshot of an insurance applied to a simulation.
 */
export class InsuranceSimulation implements BaseEntity {
  private readonly _id: string;
  private readonly _simulationId: string;
  private readonly _insuranceTypeId: string;

  private readonly _monthlyRate: number;
  private readonly _baseCalculo: string | null;

  private readonly _applies: boolean;

  private readonly _nameSnapshot: string | null;
  private readonly _rateValue: number;
  private readonly _ratePeriod: InsuranceRatePeriod;
  private readonly _baseCalculation: InsuranceBaseCalculation;

  constructor(props: InsuranceSimulationProps) {
    this._id = props.id;
    this._simulationId = props.simulationId;
    this._insuranceTypeId = props.insuranceTypeId;

    this._monthlyRate = props.monthlyRate ?? props.rateValue ?? 0;
    this._baseCalculo = props.baseCalculo ?? null;

    this._applies = props.applies;

    this._nameSnapshot = props.nameSnapshot ?? null;
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

  get simulationId(): string {
    return this._simulationId;
  }

  get insuranceTypeId(): string {
    return this._insuranceTypeId;
  }

  get monthlyRate(): number {
    return this._monthlyRate;
  }

  get baseCalculo(): string | null {
    return this._baseCalculo;
  }

  get applies(): boolean {
    return this._applies;
  }

  get nameSnapshot(): string | null {
    return this._nameSnapshot;
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
