import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

export interface ClientResource extends BaseResource {
  id: string;
  user_id: string;
  name: string;
  last_name: string;
  dni: string;
  phone: string;
  email: string;
  address: string;
  registration_date: string;
}

export interface ClientsResponse extends BaseResponse {
  clients: ClientResource[];
}
