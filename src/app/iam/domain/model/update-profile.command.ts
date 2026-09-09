export class UpdateProfileCommand {
  private readonly _name: string;
  private readonly _lastName: string;
  private readonly _username: string;

  constructor(props: { name: string; lastName: string; username: string }) {
    this._name = props.name;
    this._lastName = props.lastName;
    this._username = props.username;
  }

  get name(): string {
    return this._name;
  }

  get lastName(): string {
    return this._lastName;
  }

  get username(): string {
    return this._username;
  }
}
