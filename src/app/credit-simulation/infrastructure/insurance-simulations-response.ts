import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

export interface InsuranceSimulationResource extends BaseResource {
  id: string;
  simulation_id: string;

  /**
   * Legacy columns.
   */
  tipo_seguro_id: string;
  tasa_mensual: number;
  base_calculo: string;

  applies: boolean;

  /**
   * New columns.
   */
  insurance_type_id?: string | null;
  name_snapshot?: string | null;
  rate_value?: number | null;
  rate_period?: string | null;
  base_calculation?: string | null;
}

export interface InsuranceSimulationsResponse extends BaseResponse {
  insurance_simulations: InsuranceSimulationResource[];
}
