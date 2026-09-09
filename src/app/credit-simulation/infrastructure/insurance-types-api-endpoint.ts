import { from, map, Observable } from 'rxjs';
import { SupabaseService } from '../../shared/infrastructure/supabase.service';
import { InsuranceType } from '../domain/model/insurance-type.entity';
import { InsuranceTypeAssembler } from './insurance-type-assembler';
import { InsuranceTypeResource } from './insurance-types-response';

export class InsuranceTypesApiEndpoint {
  private readonly tableName = 'insurance_types';
  private readonly assembler = new InsuranceTypeAssembler();

  constructor(private readonly supabaseService: SupabaseService) {}

  getAll(): Observable<InsuranceType[]> {
    return from(
      this.supabaseService.client
        .from(this.tableName)
        .select('*')
        .order('name', { ascending: true }),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }

        return (data ?? []).map((resource) =>
          this.assembler.toEntityFromResource(resource as InsuranceTypeResource),
        );
      }),
    );
  }

  getActive(): Observable<InsuranceType[]> {
    return from(
      this.supabaseService.client
        .from(this.tableName)
        .select('*')
        .eq('status', true)
        .order('name', { ascending: true }),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }

        return (data ?? []).map((resource) =>
          this.assembler.toEntityFromResource(resource as InsuranceTypeResource),
        );
      }),
    );
  }
}
