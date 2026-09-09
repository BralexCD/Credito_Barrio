export class ResetPasswordCommand {
  private readonly _email: string;
  private readonly _newPassword: string;

  constructor(props: { email: string; newPassword: string }) {
    this._email = props.email;
    this._newPassword = props.newPassword;
  }

  get email(): string {
    return this._email;
  }

  get newPassword(): string {
    return this._newPassword;
  }
}
