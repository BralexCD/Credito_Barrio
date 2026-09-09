import { BaseEntity } from '../../../shared/domain/model/base-entity';

export interface VehicleImageProps {
  id: string;
  vehicleId: string;
  url: string;
  cloudinaryPublicId?: string | null;
  isPrimary: boolean;
  order: number;
}

export class VehicleImage implements BaseEntity {
  private readonly _id: string;
  private readonly _vehicleId: string;
  private readonly _url: string;
  private readonly _cloudinaryPublicId: string | null;
  private readonly _isPrimary: boolean;
  private readonly _order: number;

  constructor(props: VehicleImageProps) {
    this._id = props.id;
    this._vehicleId = props.vehicleId;
    this._url = props.url;
    this._cloudinaryPublicId = props.cloudinaryPublicId ?? null;
    this._isPrimary = props.isPrimary;
    this._order = props.order;
  }

  get id(): string {
    return this._id;
  }

  get vehicleId(): string {
    return this._vehicleId;
  }

  get url(): string {
    return this._url;
  }

  get cloudinaryPublicId(): string | null {
    return this._cloudinaryPublicId;
  }

  get isPrimary(): boolean {
    return this._isPrimary;
  }

  get order(): number {
    return this._order;
  }
}
