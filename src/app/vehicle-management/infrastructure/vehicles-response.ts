import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

export interface VehicleResource extends BaseResource {
  id: string;
  user_id: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  price: number;
  currency_catalog_id: string;
  stock: number;
  status: boolean;
}

export interface VehiclesResponse extends BaseResponse {
  vehicles: VehicleResource[];
}
