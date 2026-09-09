import {BaseEntity} from '../../../shared/domain/model/base-entity';

export interface CurrencyCatalogProps {
  id: string;
  currency: string;
  symbol: string;
}

export class CurrencyCatalog implements BaseEntity {
  private readonly _id: string;
  private readonly _currency: string;
  private readonly _symbol: string;

  constructor(props: CurrencyCatalogProps) {
    this._id = props.id;
    this._currency = props.currency;
    this._symbol = props.symbol;
  }

  get id(): string {
    return this._id;
  }

  get currency(): string {
    return this._currency;
  }

  get symbol(): string {
    return this._symbol;
  }
}
