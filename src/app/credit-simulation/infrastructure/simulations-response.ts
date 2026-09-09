import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

export interface SimulationResource extends BaseResource {
  id: string;
  client_id: string;
  vehicle_id: string;
  user_id: string;

  vehicle_price: number;
  currency: string;
  currency_catalog_id?: string | null;
  exchange_rate_usd_pen?: number | null;

  initial_fee_percentage: number;
  initial_fee_amount: number;

  financed_amount: number;
  loan_amount?: number | null;
  initial_costs_financed?: number | null;

  term_months: number;

  future_value_percentage: number;
  future_value_amount: number;

  final_quota_percentage?: number | null;
  final_quota_amount?: number | null;
  present_value_final_quota?: number | null;
  regular_financed_balance?: number | null;

  rate_type: string;
  interest_rate: number;
  capitalization: string | null;

  monthly_effective_rate: number;
  annual_effective_rate?: number | null;

  grace_type: string;
  grace_period: number;

  total_grace_periods?: number | null;
  partial_grace_periods?: number | null;

  portes: number;

  /**
   * Legacy optional field. It may not exist in Supabase anymore.
   */
  cuota_base?: number | null;

  regular_quota?: number | null;

  opportunity_rate?: number | null;
  opportunity_period_rate?: number | null;
  payment_frequency_days?: number | null;
  days_per_year?: number | null;
  installments_per_year?: number | null;

  tcea: number | null;
  van: number | null;
  tir: number | null;

  disbursement_date: string;
  registration_date: string;
}

export interface SimulationsResponse extends BaseResponse {
  simulations: SimulationResource[];
}
