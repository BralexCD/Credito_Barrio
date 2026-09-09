import { from, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Client } from '../domain/model/client.entity';
import { ClientAssembler } from './client-assembler';
import { ClientResource } from './clients-response';
import { SupabaseService } from '../../shared/infrastructure/supabase.service';

type ClientPayload = {
  user_id: string;
  name: string;
  last_name: string;
  dni: string;
  phone: string;
  email: string;
  address: string;
  registration_date: string;
};

export class ClientsApiEndpoint {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly assembler: ClientAssembler,
  ) {}

  getAllForUser(userId: string, roleName: string): Observable<Client[]> {
    return from(this.getAllForUserFromSupabase(userId, roleName)).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || 'No se pudieron cargar los clientes.')),
      ),
    );
  }

  getById(id: string): Observable<Client> {
    return from(this.getByIdFromSupabase(id)).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || `No se pudo cargar el cliente ${id}.`)),
      ),
    );
  }

  create(client: Client): Observable<Client> {
    return from(this.createInSupabase(client)).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || 'No se pudo crear el cliente.')),
      ),
    );
  }

  update(client: Client, id: string): Observable<Client> {
    return from(this.updateInSupabase(client, id)).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || `No se pudo actualizar el cliente ${id}.`)),
      ),
    );
  }

  delete(id: string): Observable<void> {
    return from(this.deleteFromSupabase(id)).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || `No se pudo eliminar el cliente ${id}.`)),
      ),
    );
  }

  private async getAllForUserFromSupabase(userId: string, roleName: string): Promise<Client[]> {
    const roleNameNormalized = roleName.trim().toUpperCase();

    let query = this.supabaseService.client
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (roleNameNormalized !== 'ADMIN') {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error al consultar clientes: ${error.message}`);
    }

    return (data as ClientResource[]).map((resource) =>
      this.assembler.toEntityFromResource(resource),
    );
  }

  private async getByIdFromSupabase(id: string): Promise<Client> {
    const { data, error } = await this.supabaseService.client
      .from('clients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Error al consultar cliente: ${error.message}`);
    }

    if (!data) {
      throw new Error('Cliente no encontrado.');
    }

    return this.assembler.toEntityFromResource(data as ClientResource);
  }

  private async createInSupabase(client: Client): Promise<Client> {
    const payload = this.toPayload(client);

    const { data, error } = await this.supabaseService.client
      .from('clients')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Error al crear cliente: ${error.message}`);
    }

    return this.assembler.toEntityFromResource(data as ClientResource);
  }

  private async updateInSupabase(client: Client, id: string): Promise<Client> {
    const payload = this.toPayload(client);

    const { data, error } = await this.supabaseService.client
      .from('clients')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Error al actualizar cliente: ${error.message}`);
    }

    return this.assembler.toEntityFromResource(data as ClientResource);
  }

  private async deleteFromSupabase(id: string): Promise<void> {
    const { error } = await this.supabaseService.client.from('clients').delete().eq('id', id);

    if (error) {
      throw new Error(`Error al eliminar cliente: ${error.message}`);
    }
  }

  private toPayload(client: Client): ClientPayload {
    return {
      user_id: client.userId,
      name: client.name.trim(),
      last_name: client.lastName.trim(),
      dni: client.dni.trim(),
      phone: client.phone.trim(),
      email: client.email.trim().toLowerCase(),
      address: client.address.trim(),
      registration_date: client.registrationDate || new Date().toISOString(),
    };
  }
}
