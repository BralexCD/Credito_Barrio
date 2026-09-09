import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

export interface PaymentScheduleResource extends BaseResource {
  id: string;
  simulation_id: string;
  installment_number: number;
  payment_date: string;
  period_type: string;

  initial_balance: number;
  interest: number;
  amortization: number;
  total_insurance: number;
  portes: number;
  other_expenses: number;
  total_payment: number;
  final_balance: number;
  cash_flow: number;

  cash_flow_type?: string | null;

  initial_final_quota_balance?: number | null;
  final_quota_interest?: number | null;
  final_quota_amortization?: number | null;
  final_quota_desgravamen?: number | null;
  final_final_quota_balance?: number | null;

  initial_regular_balance?: number | null;
  regular_interest?: number | null;
  regular_quota?: number | null;
  regular_amortization?: number | null;
  regular_desgravamen?: number | null;
  final_regular_balance?: number | null;

  risk_insurance?: number | null;
  gps?: number | null;
  administrative_expenses?: number | null;
  balloon_payment?: number | null;
}

export interface PaymentScheduleResponse extends BaseResponse {
  payment_schedule: PaymentScheduleResource[];
}
