import { BaseResource } from '../../shared/infrastructure/base-response';

export interface UserResource extends BaseResource {
  id: string;
  role_id: string;
  username: string;
  password: string;
  enabled: boolean;
  name: string;
  last_name: string;
  email: string;
  registration_date: string;
}

export interface RoleResource extends BaseResource {
  id: string;
  name: string;
  description: string;
}
