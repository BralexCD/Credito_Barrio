import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { CapitalizationType, GraceType, RateType } from '../domain/model/credit-simulation.types';
import { Setting } from '../domain/model/setting.entity';
import { SettingResource, SettingsResponse } from './settings-response';

export class SettingAssembler implements BaseAssembler<Setting, SettingResource, SettingsResponse> {
  toEntityFromResource(resource: SettingResource): Setting {
    return new Setting({
      id: resource.id,
      userId: resource.user_id,
      defaultCurrencyCatalogId: resource.default_currency_catalog_id,
      defaultInterestType: resource.default_interest_type as RateType,
      defaultGracePeriod: resource.default_grace_period as GraceType,
      defaultOpportunityTea: resource.default_opportunity_tea,
      defaultChangeUsdPen: resource.default_change_usd_pen,

      defaultCapitalization: (resource.default_capitalization ?? 'MENSUAL') as CapitalizationType,
      defaultTotalGracePeriods: resource.default_total_grace_periods ?? 0,
      defaultPartialGracePeriods: resource.default_partial_grace_periods ?? 0,
      defaultPaymentFrequencyDays: resource.default_payment_frequency_days ?? 30,
      defaultDaysPerYear: resource.default_days_per_year ?? 360,

      defaultDesgravamenRate: resource.default_desgravamen_rate ?? 0,
      defaultRiskInsuranceRate: resource.default_risk_insurance_rate ?? 0,
      defaultGps: resource.default_gps ?? 0,
      defaultPortes: resource.default_portes ?? 0,
      defaultAdministrativeExpense: resource.default_administrative_expense ?? 0,
    });
  }

  toResourceFromEntity(entity: Setting): SettingResource {
    return {
      id: entity.id,
      user_id: entity.userId,
      default_currency_catalog_id: entity.defaultCurrencyCatalogId,
      default_interest_type: entity.defaultInterestType,
      default_grace_period: entity.defaultGracePeriod,
      default_opportunity_tea: entity.defaultOpportunityTea,
      default_change_usd_pen: entity.defaultChangeUsdPen,

      default_capitalization: entity.defaultCapitalization,
      default_total_grace_periods: entity.defaultTotalGracePeriods,
      default_partial_grace_periods: entity.defaultPartialGracePeriods,
      default_payment_frequency_days: entity.defaultPaymentFrequencyDays,
      default_days_per_year: entity.defaultDaysPerYear,

      default_desgravamen_rate: entity.defaultDesgravamenRate,
      default_risk_insurance_rate: entity.defaultRiskInsuranceRate,
      default_gps: entity.defaultGps,
      default_portes: entity.defaultPortes,
      default_administrative_expense: entity.defaultAdministrativeExpense,
    };
  }

  toEntitiesFromResponse(response: SettingsResponse): Setting[] {
    return response.settings.map((resource) => this.toEntityFromResource(resource));
  }
}
