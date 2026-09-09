export class UpdatePasswordCommand {
  private readonly _currentPassword: string;
  private readonly _newPassword: string;

  constructor(props: { currentPassword: string; newPassword: string }) {
    this._currentPassword = props.currentPassword;
    this._newPassword = props.newPassword;
  }

  get currentPassword(): string {
    return this._currentPassword;
  }

  get newPassword(): string {
    return this._newPassword;
  }
}
