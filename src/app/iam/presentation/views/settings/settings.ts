import {Component, effect, inject, signal} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {TranslatePipe} from '@ngx-translate/core';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {ErrorStateMatcher} from '@angular/material/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {IamStore} from '../../../application/iam.store';
import {UpdateProfileCommand} from '../../../domain/model/update-profile.command';
import {UpdateEmailCommand} from '../../../domain/model/update-email.command';
import {UpdatePasswordCommand} from '../../../domain/model/update-password.command';

/**
 * Angular Material's default {@link ErrorStateMatcher} only looks at a control's own validity,
 * so a mismatch error set on the parent `FormGroup` (not on `confirmPassword` itself) never
 * surfaces its `mat-error`. This matcher checks the parent group's error instead.
 */
class ConfirmPasswordErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null): boolean {
    const parent = control?.parent;
    return !!(parent?.hasError('passwordMismatch') && (control?.dirty || control?.touched));
  }
}

/**
 * Account settings screen: lets the authenticated user edit their profile, email and password.
 *
 * @remarks
 * Each section (profile / email / password) saves independently through {@link IamStore}, which
 * updates the custom `users` table directly - this app has no Supabase Auth session, so it
 * follows the same pattern already used by sign-up and the forgot-password flow.
 */
@Component({
  selector: 'app-settings',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  protected readonly store = inject(IamStore);

  protected readonly hideCurrentPassword = signal(true);
  protected readonly hideNewPassword = signal(true);
  protected readonly hideConfirmPassword = signal(true);
  protected readonly confirmPasswordMatcher = new ConfirmPasswordErrorStateMatcher();

  protected readonly profileForm = new FormGroup({
    name: new FormControl('', {nonNullable: true, validators: [Validators.required, Validators.minLength(2)]}),
    lastName: new FormControl('', {nonNullable: true, validators: [Validators.required, Validators.minLength(2)]}),
    username: new FormControl('', {nonNullable: true, validators: [Validators.required, Validators.minLength(4)]}),
  });

  protected readonly emailForm = new FormGroup({
    email: new FormControl('', {nonNullable: true, validators: [Validators.required, Validators.email]}),
  });

  protected readonly passwordForm = new FormGroup(
    {
      currentPassword: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6)],
      }),
      confirmPassword: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    },
    {validators: this.passwordsMatchValidator},
  );

  constructor() {
    this.store.clearSettingsMessages();
    this.loadCurrentUser();

    // Only clear the password fields once the change is actually confirmed - not optimistically
    // right after dispatch, which would also wipe what the user typed on a failed attempt (e.g.
    // a mistyped current password) and could re-touch the fields via a stray blur/reset race.
    effect(() => {
      if (this.store.updatePasswordSuccess()) {
        this.resetPasswordForm();
      }
    });
  }

  toggleCurrentPasswordVisibility(): void {
    this.hideCurrentPassword.update(value => !value);
  }

  toggleNewPasswordVisibility(): void {
    this.hideNewPassword.update(value => !value);
  }

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword.update(value => !value);
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const value = this.profileForm.getRawValue();
    this.store.updateProfile(
      new UpdateProfileCommand({
        name: value.name.trim(),
        lastName: value.lastName.trim(),
        username: value.username.trim(),
      }),
    );
  }

  cancelProfile(): void {
    this.loadCurrentUser();
    this.profileForm.markAsPristine();
  }

  saveEmail(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    const value = this.emailForm.getRawValue();
    this.store.updateEmail(new UpdateEmailCommand({email: value.email.trim()}));
  }

  cancelEmail(): void {
    this.loadCurrentUser();
    this.emailForm.markAsPristine();
  }

  savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const value = this.passwordForm.getRawValue();
    this.store.updatePassword(
      new UpdatePasswordCommand({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
      }),
    );
  }

  cancelPassword(): void {
    this.resetPasswordForm();
  }

  private loadCurrentUser(): void {
    const user = this.store.currentUser();
    if (!user) return;

    this.profileForm.reset({name: user.name, lastName: user.lastName, username: user.username});
    this.emailForm.reset({email: user.email});
  }

  private resetPasswordForm(): void {
    this.passwordForm.reset({currentPassword: '', newPassword: '', confirmPassword: ''});
    this.passwordForm.markAsPristine();
    this.passwordForm.markAsUntouched();
  }

  private passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    return newPassword && confirmPassword && newPassword !== confirmPassword
      ? {passwordMismatch: true}
      : null;
  }
}
