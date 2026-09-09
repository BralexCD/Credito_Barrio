import { from, map, Observable } from 'rxjs';
import { SupabaseService } from '../../shared/infrastructure/supabase.service';
import { Simulation } from '../domain/model/simulation.entity';
import { SimulationAssembler } from './simulation-assembler';
import { SimulationResource } from './simulations-response';

export class SimulationsApiEndpoint {
  private readonly tableName = 'simulations';
  private readonly assembler = new SimulationAssembler();

  constructor(private readonly supabaseService: SupabaseService) {}

  getAllForUser(userId: string, roleName: string): Observable<Simulation[]> {
    const normalizedRole = roleName.trim().toUpperCase();

    let query = this.supabaseService.client
      .from(this.tableName)
      .select('*')
      .order('registration_date', { ascending: false });

    if (normalizedRole !== 'ADMIN') {
      query = query.eq('user_id', userId);
    }

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }

        return (data ?? []).map((resource) =>
          this.assembler.toEntityFromResource(resource as SimulationResource),
        );
      }),
    );
  }

  getById(id: string): Observable<Simulation> {
    return from(
      this.supabaseService.client.from(this.tableName).select('*').eq('id', id).single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }

        return this.assembler.toEntityFromResource(data as SimulationResource);
      }),
    );
  }

  create(simulation: Simulation): Observable<Simulation> {
    const payload = this.toInsertPayload(simulation);

    return from(
      this.supabaseService.client.from(this.tableName).insert(payload).select().single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }

        return this.assembler.toEntityFromResource(data as SimulationResource);
      }),
    );
  }

  delete(id: string): Observable<void> {
    return from(this.supabaseService.client.from(this.tableName).delete().eq('id', id)).pipe(
      map(({ error }) => {
        if (error) {
          throw new Error(error.message);
        }
      }),
    );
  }

  private toInsertPayload(simulation: Simulation): Partial<SimulationResource> {
    const resource = this.assembler.toResourceFromEntity(simulation);
    const payload: Partial<SimulationResource> = { ...resource };

    if (!payload.id) {
      delete payload.id;
    }

    return payload;
  }
}
