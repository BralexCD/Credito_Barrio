import {BaseEntity} from '../../../shared/domain/model/base-entity';

/**
 * Plain data shape of a {@link User}, used for session persistence.
 */
export interface UserProps {
  id: string;
  email: string;
  username: string;
  name: string;
  lastName: string;
  roleId: string;
  roleName: string;
  enabled: boolean;
}

/**
 * Authenticated user account in the IAM bounded context.
 *
 * @remarks
 * Represents an advisor or admin of the financial entity. The role is kept on
 * the entity (not just the id) so presentation components can show it without
 * an extra lookup, and so future role-based UI restrictions (e.g. settings
 * only for `ADMIN`) don't require a refactor.
 */
export class User implements BaseEntity {
  private readonly _id: string;
  private readonly _email: string;
  private readonly _username: string;
  private readonly _name: string;
  private readonly _lastName: string;
  private readonly _roleId: string;
  private readonly _roleName: string;
  private readonly _enabled: boolean;

  constructor(props: UserProps) {
    this._id = props.id;
    this._email = props.email;
    this._username = props.username;
    this._name = props.name;
    this._lastName = props.lastName;
    this._roleId = props.roleId;
    this._roleName = props.roleName;
    this._enabled = props.enabled;
  }

  get id(): string {
    return this._id;
  }

  get email(): string {
    return this._email;
  }

  get username(): string {
    return this._username;
  }

  get name(): string {
    return this._name;
  }

  get lastName(): string {
    return this._lastName;
  }

  get fullName(): string {
    return `${this._name} ${this._lastName}`;
  }

  get roleId(): string {
    return this._roleId;
  }

  get roleName(): string {
    return this._roleName;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /** Serializes the user for storage in `localStorage`. */
  toProps(): UserProps {
    return {
      id: this._id,
      email: this._email,
      username: this._username,
      name: this._name,
      lastName: this._lastName,
      roleId: this._roleId,
      roleName: this._roleName,
      enabled: this._enabled
    };
  }
}