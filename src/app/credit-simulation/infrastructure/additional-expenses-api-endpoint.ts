import { from, map, Observable, of } from 'rxjs';
import { SupabaseService } from '../../shared/infrastructure/supabase.service';
import { AdditionalExpense } from '../domain/model/additional-expense.entity';
import { AdditionalExpenseAssembler } from './additional-expense-assembler';
import { AdditionalExpenseResource } from './additional-expenses-response';

export class AdditionalExpensesApiEndpoint {
  private readonly tableName = 'additional_expenses';
  private readonly assembler = new AdditionalExpenseAssembler();

  constructor(private readonly supabaseService: SupabaseService) {}

  getBySimulationIds(simulationIds: string[]): Observable<AdditionalExpense[]> {
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
          this.assembler.toEntityFromResource(resource as AdditionalExpenseResource),
        );
      }),
    );
  }

  getBySimulationId(simulationId: string): Observable<AdditionalExpense[]> {
    return this.getBySimulationIds([simulationId]);
  }

  create(expense: AdditionalExpense): Observable<AdditionalExpense> {
    const payload = this.toInsertPayload(expense);

    return from(
      this.supabaseService.client.from(this.tableName).insert(payload).select().single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }

        return this.assembler.toEntityFromResource(data as AdditionalExpenseResource);
      }),
    );
  }

  createMany(expenses: AdditionalExpense[]): Observable<AdditionalExpense[]> {
    if (expenses.length === 0) {
      return of([]);
    }

    const payload = expenses.map((expense) => this.toInsertPayload(expense));

    return from(this.supabaseService.client.from(this.tableName).insert(payload).select()).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }

        return (data ?? []).map((resource) =>
          this.assembler.toEntityFromResource(resource as AdditionalExpenseResource),
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

  private toInsertPayload(expense: AdditionalExpense): Partial<AdditionalExpenseResource> {
    const resource = this.assembler.toResourceFromEntity(expense);
    const payload: Partial<AdditionalExpenseResource> = { ...resource };

    if (!payload.id) {
      delete payload.id;
    }

    return payload;
  }
}
