/**
 * Domain command capturing the intent to authenticate with the system.
 */
export class SignInCommand {
  private readonly _email: string;
  private readonly _password: string;

  constructor(props: {email: string, password: string}) {
    this._email = props.email;
    this._password = props.password;
  }

  get email(): string {
    return this._email;
  }

  get password(): string {
    return this._password;
  }
}
