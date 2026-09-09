import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Client } from '../domain/model/client.entity';
import { ClientResource, ClientsResponse } from './clients-response';

export class ClientAssembler implements BaseAssembler<Client, ClientResource, ClientsResponse> {
  toEntityFromResource(resource: ClientResource): Client {
    return new Client({
      id: resource.id,
      userId: resource.user_id,
      name: resource.name,
      lastName: resource.last_name,
      dni: resource.dni,
      phone: resource.phone,
      email: resource.email,
      address: resource.address,
      registrationDate: resource.registration_date,
    });
  }

  toResourceFromEntity(entity: Client): ClientResource {
    return {
      id: entity.id,
      user_id: entity.userId,
      name: entity.name,
      last_name: entity.lastName,
      dni: entity.dni,
      phone: entity.phone,
      email: entity.email,
      address: entity.address,
      registration_date: entity.registrationDate,
    };
  }

  toEntitiesFromResponse(response: ClientsResponse): Client[] {
    return response.clients.map((resource) => this.toEntityFromResource(resource));
  }
}
