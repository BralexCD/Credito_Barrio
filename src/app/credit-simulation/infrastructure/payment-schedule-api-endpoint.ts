import { from, map, Observable, of } from 'rxjs';
import { SupabaseService } from '../../shared/infrastructure/supabase.service';
import { PaymentScheduleEntry } from '../domain/model/payment-schedule-entry.entity';
import { PaymentScheduleAssembler } from './payment-schedule-assembler';
import { PaymentScheduleResource } from './payment-schedule-response';

export class PaymentScheduleApiEndpoint {
  private readonly tableName = 'payment_schedule';
  private readonly assembler = new PaymentScheduleAssembler();

  constructor(private readonly supabaseService: SupabaseService) {}

  getBySimulationIds(simulationIds: string[]): Observable<PaymentScheduleEntry[]> {
    if (simulationIds.length === 0) {
      return of([]);
    }

    return from(
      this.supabaseService.client
        .from(this.tableName)
        .select('*')
        .in('simulation_id', simulationIds)
        .order('installment_number', { ascending: true }),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }

        return (data ?? []).map((resource) =>
          this.assembler.toEntityFromResource(resource as PaymentScheduleResource),
        );
      }),
    );
  }

  getBySimulationId(simulationId: string): Observable<PaymentScheduleEntry[]> {
    return this.getBySimulationIds([simulationId]);
  }

  create(entry: PaymentScheduleEntry): Observable<PaymentScheduleEntry> {
    const payload = this.toInsertPayload(entry);

    return from(
      this.supabaseService.client.from(this.tableName).insert(payload).select().single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }

        return this.assembler.toEntityFromResource(data as PaymentScheduleResource);
      }),
    );
  }

  createMany(entries: PaymentScheduleEntry[]): Observable<PaymentScheduleEntry[]> {
    if (entries.length === 0) {
      return of([]);
    }

    const payload = entries.map((entry) => this.toInsertPayload(entry));

    return from(this.supabaseService.client.from(this.tableName).insert(payload).select()).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }

        return (data ?? []).map((resource) =>
          this.assembler.toEntityFromResource(resource as PaymentScheduleResource),
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

  private toInsertPayload(entry: PaymentScheduleEntry): Partial<PaymentScheduleResource> {
    const resource = this.assembler.toResourceFromEntity(entry);
    const payload: Partial<PaymentScheduleResource> = { ...resource };

    if (!payload.id) {
      delete payload.id;
    }

    return payload;
  }
}
