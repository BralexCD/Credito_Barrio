import { BaseEntity } from '../../../shared/domain/model/base-entity';
import { CapitalizationType, GraceType, RateType } from './credit-simulation.types';

export interface SettingProps {
  id: string;
  userId: string;
  defaultCurrencyCatalogId: string;
  defaultInterestType: RateType;
  defaultGracePeriod: GraceType;
  defaultOpportunityTea: number;
  defaultChangeUsdPen: number;

  defaultCapitalization?: CapitalizationType | null;
  defaultTotalGracePeriods?: number | null;
  defaultPartialGracePeriods?: number | null;
  defaultPaymentFrequencyDays?: number | null;
  defaultDaysPerYear?: number | null;

  defaultDesgravamenRate?: number | null;
  defaultRiskInsuranceRate?: number | null;
  defaultGps?: number | null;
  defaultPortes?: number | null;
  defaultAdministrativeExpense?: number | null;
}

/**
 * Per-advisor default values used to pre-fill the simulation form.
 */
export class Setting implements BaseEntity {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _defaultCurrencyCatalogId: string;
  private readonly _defaultInterestType: RateType;
  private readonly _defaultGracePeriod: GraceType;
  private readonly _defaultOpportunityTea: number;
  private readonly _defaultChangeUsdPen: number;

  private readonly _defaultCapitalization: CapitalizationType;
  private readonly _defaultTotalGracePeriods: number;
  private readonly _defaultPartialGracePeriods: number;
  private readonly _defaultPaymentFrequencyDays: number;
  private readonly _defaultDaysPerYear: number;

  private readonly _defaultDesgravamenRate: number;
  private readonly _defaultRiskInsuranceRate: number;
  private readonly _defaultGps: number;
  private readonly _defaultPortes: number;
  private readonly _defaultAdministrativeExpense: number;

  constructor(props: SettingProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._defaultCurrencyCatalogId = props.defaultCurrencyCatalogId;
    this._defaultInterestType = props.defaultInterestType;
    this._defaultGracePeriod = props.defaultGracePeriod;
    this._defaultOpportunityTea = props.defaultOpportunityTea;
    this._defaultChangeUsdPen = props.defaultChangeUsdPen;

    this._defaultCapitalization = props.defaultCapitalization ?? 'MENSUAL';
    this._defaultTotalGracePeriods = props.defaultTotalGracePeriods ?? 0;
    this._defaultPartialGracePeriods = props.defaultPartialGracePeriods ?? 0;
    this._defaultPaymentFrequencyDays = props.defaultPaymentFrequencyDays ?? 30;
    this._defaultDaysPerYear = props.defaultDaysPerYear ?? 360;

    this._defaultDesgravamenRate = props.defaultDesgravamenRate ?? 0;
    this._defaultRiskInsuranceRate = props.defaultRiskInsuranceRate ?? 0;
    this._defaultGps = props.defaultGps ?? 0;
    this._defaultPortes = props.defaultPortes ?? 0;
    this._defaultAdministrativeExpense = props.defaultAdministrativeExpense ?? 0;
  }

  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get defaultCurrencyCatalogId(): string {
    return this._defaultCurrencyCatalogId;
  }

  get defaultInterestType(): RateType {
    return this._defaultInterestType;
  }

  get defaultGracePeriod(): GraceType {
    return this._defaultGracePeriod;
  }

  get defaultOpportunityTea(): number {
    return this._defaultOpportunityTea;
  }

  get defaultChangeUsdPen(): number {
    return this._defaultChangeUsdPen;
  }

  get defaultCapitalization(): CapitalizationType {
    return this._defaultCapitalization;
  }

  get defaultTotalGracePeriods(): number {
    return this._defaultTotalGracePeriods;
  }

  get defaultPartialGracePeriods(): number {
    return this._defaultPartialGracePeriods;
  }

  get defaultPaymentFrequencyDays(): number {
    return this._defaultPaymentFrequencyDays;
  }

  get defaultDaysPerYear(): number {
    return this._defaultDaysPerYear;
  }

  get defaultDesgravamenRate(): number {
    return this._defaultDesgravamenRate;
  }

  get defaultRiskInsuranceRate(): number {
    return this._defaultRiskInsuranceRate;
  }

  get defaultGps(): number {
    return this._defaultGps;
  }

  get defaultPortes(): number {
    return this._defaultPortes;
  }

  get defaultAdministrativeExpense(): number {
    return this._defaultAdministrativeExpense;
  }
}
