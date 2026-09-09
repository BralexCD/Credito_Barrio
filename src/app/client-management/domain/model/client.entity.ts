import { BaseEntity } from '../../../shared/domain/model/base-entity';

export interface ClientProps {
  id: string;
  userId: string;
  name: string;
  lastName: string;
  dni: string;
  phone: string;
  email: string;
  address: string;
  registrationDate: string;
}

export class Client implements BaseEntity {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _name: string;
  private readonly _lastName: string;
  private readonly _dni: string;
  private readonly _phone: string;
  private readonly _email: string;
  private readonly _address: string;
  private readonly _registrationDate: string;

  constructor(props: ClientProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._name = props.name;
    this._lastName = props.lastName;
    this._dni = props.dni;
    this._phone = props.phone;
    this._email = props.email;
    this._address = props.address;
    this._registrationDate = props.registrationDate;
  }

  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get name(): string {
    return this._name;
  }

  get lastName(): string {
    return this._lastName;
  }

  get dni(): string {
    return this._dni;
  }

  get phone(): string {
    return this._phone;
  }

  get email(): string {
    return this._email;
  }

  get address(): string {
    return this._address;
  }

  get registrationDate(): string {
    return this._registrationDate;
  }

  get fullName(): string {
    return `${this._name} ${this._lastName}`;
  }
}
