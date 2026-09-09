import { BaseEntity } from '../../../shared/domain/model/base-entity';
import { VehicleImage } from './vehicle-image.entity';

export interface VehicleProps {
  id: string;
  userId: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  price: number;
  currencyCatalogId: string;
  stock: number;
  status: boolean;
  images?: VehicleImage[];
}

export class Vehicle implements BaseEntity {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _brand: string;
  private readonly _model: string;
  private readonly _year: number;
  private readonly _color: string;
  private readonly _price: number;
  private readonly _currencyCatalogId: string;
  private readonly _stock: number;
  private readonly _status: boolean;
  private readonly _images: VehicleImage[];

  constructor(props: VehicleProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._brand = props.brand;
    this._model = props.model;
    this._year = props.year;
    this._color = props.color;
    this._price = props.price;
    this._currencyCatalogId = props.currencyCatalogId;
    this._stock = props.stock;
    this._status = props.status;
    this._images = props.images ?? [];
  }

  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get brand(): string {
    return this._brand;
  }

  get model(): string {
    return this._model;
  }

  get year(): number {
    return this._year;
  }

  get color(): string {
    return this._color;
  }

  get price(): number {
    return this._price;
  }

  get currencyCatalogId(): string {
    return this._currencyCatalogId;
  }

  get stock(): number {
    return this._stock;
  }

  get status(): boolean {
    return this._status;
  }

  get images(): VehicleImage[] {
    return this._images;
  }

  get displayName(): string {
    return `${this._brand} ${this._model} (${this._year})`;
  }

  get primaryImage(): VehicleImage | undefined {
    return this._images.find((image) => image.isPrimary) ?? this._images[0];
  }

  withImages(images: VehicleImage[]): Vehicle {
    return new Vehicle({
      id: this._id,
      userId: this._userId,
      brand: this._brand,
      model: this._model,
      year: this._year,
      color: this._color,
      price: this._price,
      currencyCatalogId: this._currencyCatalogId,
      stock: this._stock,
      status: this._status,
      images,
    });
  }
}
