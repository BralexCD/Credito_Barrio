import { from, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CurrencyCatalog } from '../domain/model/currency-catalog.entity';
import { CurrencyCatalogAssembler } from './currency-catalog-assembler';
import { CurrencyCatalogResource } from './currency-catalogs-response';
import { SupabaseService } from '../../shared/infrastructure/supabase.service';

export class CurrencyCatalogsApiEndpoint {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly assembler: CurrencyCatalogAssembler,
  ) {}

  getAll(): Observable<CurrencyCatalog[]> {
    return from(this.getAllFromSupabase()).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || 'No se pudieron cargar las monedas.')),
      ),
    );
  }

  private async getAllFromSupabase(): Promise<CurrencyCatalog[]> {
    const { data, error } = await this.supabaseService.client
      .from('currency_catalogs')
      .select('*')
      .order('currency', { ascending: true });

    if (error) {
      throw new Error(`Error al consultar monedas: ${error.message}`);
    }

    return (data as CurrencyCatalogResource[]).map((resource) =>
      this.assembler.toEntityFromResource(resource),
    );
  }
}
