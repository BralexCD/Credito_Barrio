import {BaseResource, BaseResponse} from '../../shared/infrastructure/base-response';

export interface CurrencyCatalogResource extends BaseResource {
  id: string;
  currency: string;
  symbol: string;
}

export interface CurrencyCatalogsResponse extends BaseResponse {
  currency_catalogs: CurrencyCatalogResource[];
}
