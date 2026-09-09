import {BaseAssembler} from '../../shared/infrastructure/base-assembler';
import {CurrencyCatalog} from '../domain/model/currency-catalog.entity';
import {CurrencyCatalogResource, CurrencyCatalogsResponse} from './currency-catalogs-response';

export class CurrencyCatalogAssembler implements BaseAssembler<CurrencyCatalog, CurrencyCatalogResource, CurrencyCatalogsResponse> {
  toEntityFromResource(resource: CurrencyCatalogResource): CurrencyCatalog {
    return new CurrencyCatalog({
      id: resource.id,
      currency: resource.currency,
      symbol: resource.symbol
    });
  }

  toResourceFromEntity(entity: CurrencyCatalog): CurrencyCatalogResource {
    return {
      id: entity.id,
      currency: entity.currency,
      symbol: entity.symbol
    };
  }

  toEntitiesFromResponse(response: CurrencyCatalogsResponse): CurrencyCatalog[] {
    return response.currency_catalogs.map(resource => this.toEntityFromResource(resource));
  }
}
