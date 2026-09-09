export class UpdateEmailCommand {
  private readonly _email: string;

  constructor(props: { email: string }) {
    this._email = props.email;
  }

  get email(): string {
    return this._email;
  }
}
