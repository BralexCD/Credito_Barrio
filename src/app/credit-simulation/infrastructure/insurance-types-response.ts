import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

export interface InsuranceTypeResource extends BaseResource {
  id: string;
  name: string;
  description: string | null;

  /**
   * Legacy columns.
   */
  base_calculo: string;
  tasa_mensual: number;

  mandatory: boolean;
  status: boolean;

  /**
   * New columns.
   */
  rate_value?: number | null;
  rate_period?: string | null;
  base_calculation?: string | null;
}

export interface InsuranceTypesResponse extends BaseResponse {
  insurance_types: InsuranceTypeResource[];
}
