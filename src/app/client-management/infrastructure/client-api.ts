import { Injectable } from '@angular/core';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { Client } from '../domain/model/client.entity';
import { SupabaseService } from '../../shared/infrastructure/supabase.service';
import { ClientsApiEndpoint } from './clients-api-endpoint';
import { ClientAssembler } from './client-assembler';

@Injectable({ providedIn: 'root' })
export class ClientApi extends BaseApi {
  private readonly clientsEndpoint: ClientsApiEndpoint;

  constructor(supabaseService: SupabaseService) {
    super();

    this.clientsEndpoint = new ClientsApiEndpoint(supabaseService, new ClientAssembler());
  }

  getClientsForUser(userId: string, roleName: string) {
    return this.clientsEndpoint.getAllForUser(userId, roleName);
  }

  getClientById(id: string) {
    return this.clientsEndpoint.getById(id);
  }

  createClient(client: Client) {
    return this.clientsEndpoint.create(client);
  }

  updateClient(client: Client) {
    return this.clientsEndpoint.update(client, client.id);
  }

  deleteClient(id: string) {
    return this.clientsEndpoint.delete(id);
  }
}
