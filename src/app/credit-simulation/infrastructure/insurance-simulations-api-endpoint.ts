import { from, map, Observable, of } from 'rxjs';
import { SupabaseService } from '../../shared/infrastructure/supabase.service';
import { InsuranceSimulation } from '../domain/model/insurance-simulation.entity';
import { InsuranceSimulationAssembler } from './insurance-simulation-assembler';
import { InsuranceSimulationResource } from './insurance-simulations-response';

export class InsuranceSimulationsApiEndpoint {
  private readonly tableName = 'insurance_simulations';
  private readonly assembler = new InsuranceSimulationAssembler();

  constructor(private readonly supabaseService: SupabaseService) {}

  getBySimulationIds(simulationIds: string[]): Observable<InsuranceSimulation[]> {
    if (simulationIds.length === 0) {
      return of([]);
    }

    return from(
      this.supabaseService.client
        .from(this.tableName)
        .select('*')
        .in('simulation_id', simulationIds),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }

        return (data ?? []).map((resource) =>
          this.assembler.toEntityFromResource(resource as InsuranceSimulationResource),
        );
      }),
    );
  }

  getBySimulationId(simulationId: string): Observable<InsuranceSimulation[]> {
    return this.getBySimulationIds([simulationId]);
  }

  create(insuranceSimulation: InsuranceSimulation): Observable<InsuranceSimulation> {
    const payload = this.toInsertPayload(insuranceSimulation);

    return from(
      this.supabaseService.client.from(this.tableName).insert(payload).select().single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }

        return this.assembler.toEntityFromResource(data as InsuranceSimulationResource);
      }),
    );
  }

  createMany(lines: InsuranceSimulation[]): Observable<InsuranceSimulation[]> {
    if (lines.length === 0) {
      return of([]);
    }

    const payload = lines.map((line) => this.toInsertPayload(line));

    return from(this.supabaseService.client.from(this.tableName).insert(payload).select()).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }

        return (data ?? []).map((resource) =>
          this.assembler.toEntityFromResource(resource as InsuranceSimulationResource),
        );
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

  deleteBySimulationId(simulationId: string): Observable<void> {
    return from(
      this.supabaseService.client.from(this.tableName).delete().eq('simulation_id', simulationId),
    ).pipe(
      map(({ error }) => {
        if (error) {
          throw new Error(error.message);
        }
      }),
    );
  }

  private toInsertPayload(entity: InsuranceSimulation): Partial<InsuranceSimulationResource> {
    const resource = this.assembler.toResourceFromEntity(entity);
    const payload: Partial<InsuranceSimulationResource> = { ...resource };

    if (!payload.id) {
      delete payload.id;
    }

    return payload;
  }
}
