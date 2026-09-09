import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

export interface AdditionalExpenseResource extends BaseResource {
  id: string;
  simulation_id: string;
  concept: string;
  type: string;
  amount: number;
  installment_start: number | null;
  installment_end: number | null;
  description: string | null;

  expense_stage?: string | null;
  payment_behavior?: string | null;
  amount_type?: string | null;
  rate_value?: number | null;
  base_calculation?: string | null;
}

export interface AdditionalExpensesResponse extends BaseResponse {
  additional_expenses: AdditionalExpenseResource[];
}
