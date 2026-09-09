import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { SupabaseService } from '../../shared/infrastructure/supabase.service';
import { SignInCommand } from '../domain/model/sign-in.command';
import { SignUpCommand } from '../domain/model/sign-up.command';
import { ResetPasswordCommand } from '../domain/model/reset-password.command';
import { UpdateProfileCommand } from '../domain/model/update-profile.command';
import { UpdateEmailCommand } from '../domain/model/update-email.command';
import { UpdatePasswordCommand } from '../domain/model/update-password.command';
import { User } from '../domain/model/user.entity';
import { SignInApiEndpoint } from './sign-in-api-endpoint';
import { SignUpApiEndpoint } from './sign-up-api-endpoint';
import { PasswordRecoveryApiEndpoint } from './password-recovery-api-endpoint';
import { SignInAssembler } from './sign-in-assembler';
import { ProfileApiEndpoint } from './profile-api-endpoint';

@Injectable({ providedIn: 'root' })
export class IamApi extends BaseApi {
  private readonly signInEndpoint: SignInApiEndpoint;
  private readonly signUpEndpoint: SignUpApiEndpoint;
  private readonly passwordRecoveryEndpoint: PasswordRecoveryApiEndpoint;
  private readonly profileEndpoint: ProfileApiEndpoint;

  constructor(supabaseService: SupabaseService) {
    super();

    this.signInEndpoint = new SignInApiEndpoint(supabaseService, new SignInAssembler());

    this.signUpEndpoint = new SignUpApiEndpoint(supabaseService);
    this.passwordRecoveryEndpoint = new PasswordRecoveryApiEndpoint(supabaseService);
    this.profileEndpoint = new ProfileApiEndpoint(supabaseService);
  }

  signIn(command: SignInCommand): Observable<User> {
    return this.signInEndpoint.signIn(command);
  }

  signUp(command: SignUpCommand): Observable<void> {
    return this.signUpEndpoint.signUp(command);
  }

  resetPassword(command: ResetPasswordCommand): Observable<void> {
    return this.passwordRecoveryEndpoint.resetPassword(command);
  }

  updateProfile(userId: string, command: UpdateProfileCommand): Observable<void> {
    return this.profileEndpoint.updateProfile(userId, command);
  }

  updateEmail(userId: string, command: UpdateEmailCommand): Observable<void> {
    return this.profileEndpoint.updateEmail(userId, command);
  }

  updatePassword(userId: string, command: UpdatePasswordCommand): Observable<void> {
    return this.profileEndpoint.updatePassword(userId, command);
  }
}
