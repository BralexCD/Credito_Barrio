export class SignUpCommand {
  private readonly _name: string;
  private readonly _lastName: string;
  private readonly _username: string;
  private readonly _email: string;
  private readonly _password: string;

  constructor(props: {
    name: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
  }) {
    this._name = props.name;
    this._lastName = props.lastName;
    this._username = props.username;
    this._email = props.email;
    this._password = props.password;
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

  get email(): string {
    return this._email;
  }

  get password(): string {
    return this._password;
  }
}
