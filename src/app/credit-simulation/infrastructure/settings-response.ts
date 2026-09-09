import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

export interface SettingResource extends BaseResource {
  id: string;
  user_id: string;
  default_currency_catalog_id: string;
  default_interest_type: string;
  default_grace_period: string;
  default_opportunity_tea: number;
  default_change_usd_pen: number;

  default_capitalization?: string | null;
  default_total_grace_periods?: number | null;
  default_partial_grace_periods?: number | null;
  default_payment_frequency_days?: number | null;
  default_days_per_year?: number | null;

  default_desgravamen_rate?: number | null;
  default_risk_insurance_rate?: number | null;
  default_gps?: number | null;
  default_portes?: number | null;
  default_administrative_expense?: number | null;
}

export interface SettingsResponse extends BaseResponse {
  settings: SettingResource[];
}
