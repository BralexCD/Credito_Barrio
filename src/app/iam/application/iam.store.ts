import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IamApi } from '../infrastructure/iam-api';
import { SignInCommand } from '../domain/model/sign-in.command';
import { SignUpCommand } from '../domain/model/sign-up.command';
import { ResetPasswordCommand } from '../domain/model/reset-password.command';
import { UpdateProfileCommand } from '../domain/model/update-profile.command';
import { UpdateEmailCommand } from '../domain/model/update-email.command';
import { UpdatePasswordCommand } from '../domain/model/update-password.command';
import { User, UserProps } from '../domain/model/user.entity';

const SESSION_STORAGE_KEY = 'compra-inteligente.session';

interface StoredSession {
  token: string;
  user: UserProps;
}

@Injectable({ providedIn: 'root' })
export class IamStore {
  private readonly iamApi = inject(IamApi);

  private readonly currentUserSignal = signal<User | null>(null);
  private readonly tokenSignal = signal<string | null>(null);
  private readonly errorSignal = signal<string | null>(null);
  private readonly loadingSignal = signal(false);

  private readonly signUpErrorSignal = signal<string | null>(null);
  private readonly signUpSuccessSignal = signal<string | null>(null);

  private readonly resetPasswordErrorSignal = signal<string | null>(null);
  private readonly resetPasswordSuccessSignal = signal<string | null>(null);

  private readonly settingsLoadingSignal = signal(false);
  private readonly updateProfileErrorSignal = signal<string | null>(null);
  private readonly updateProfileSuccessSignal = signal<string | null>(null);
  private readonly updateEmailErrorSignal = signal<string | null>(null);
  private readonly updateEmailSuccessSignal = signal<string | null>(null);
  private readonly updatePasswordErrorSignal = signal<string | null>(null);
  private readonly updatePasswordSuccessSignal = signal<string | null>(null);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly currentToken = this.tokenSignal.asReadonly();
  readonly signInError = this.errorSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly isSignedIn = computed(() => this.currentUserSignal() !== null);

  readonly signUpError = this.signUpErrorSignal.asReadonly();
  readonly signUpSuccess = this.signUpSuccessSignal.asReadonly();

  readonly resetPasswordError = this.resetPasswordErrorSignal.asReadonly();
  readonly resetPasswordSuccess = this.resetPasswordSuccessSignal.asReadonly();

  readonly isSettingsSaving = this.settingsLoadingSignal.asReadonly();
  readonly updateProfileError = this.updateProfileErrorSignal.asReadonly();
  readonly updateProfileSuccess = this.updateProfileSuccessSignal.asReadonly();
  readonly updateEmailError = this.updateEmailErrorSignal.asReadonly();
  readonly updateEmailSuccess = this.updateEmailSuccessSignal.asReadonly();
  readonly updatePasswordError = this.updatePasswordErrorSignal.asReadonly();
  readonly updatePasswordSuccess = this.updatePasswordSuccessSignal.asReadonly();

  constructor() {
    this.restoreSession();
  }

  private restoreSession(): void {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);

    if (!raw) return;

    try {
      const stored = JSON.parse(raw) as StoredSession;
      this.currentUserSignal.set(new User(stored.user));
      this.tokenSignal.set(stored.token);
    } catch {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  private persistSession(user: User, token: string): void {
    const stored: StoredSession = {
      token,
      user: user.toProps(),
    };

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stored));
  }

  private clearSession(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    this.currentUserSignal.set(null);
    this.tokenSignal.set(null);
  }

  signIn(command: SignInCommand, router: Router): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.iamApi.signIn(command).subscribe({
      next: (user) => {
        const token = btoa(`${user.id}:${user.email}:${Date.now()}`);

        this.currentUserSignal.set(user);
        this.tokenSignal.set(token);
        this.persistSession(user, token);

        this.loadingSignal.set(false);
        router.navigate(['/dashboard']).then();
      },
      error: (err: Error) => {
        this.clearSession();
        this.errorSignal.set(err.message || 'No se pudo iniciar sesión.');
        this.loadingSignal.set(false);
      },
    });
  }

  signUp(command: SignUpCommand): void {
    this.loadingSignal.set(true);
    this.signUpErrorSignal.set(null);
    this.signUpSuccessSignal.set(null);

    this.iamApi.signUp(command).subscribe({
      next: () => {
        this.signUpSuccessSignal.set('Cuenta creada correctamente. Ahora puedes iniciar sesión.');
        this.loadingSignal.set(false);
      },
      error: (err: Error) => {
        this.signUpErrorSignal.set(err.message || 'No se pudo registrar el usuario.');
        this.loadingSignal.set(false);
      },
    });
  }

  resetPassword(command: ResetPasswordCommand): void {
    this.loadingSignal.set(true);
    this.resetPasswordErrorSignal.set(null);
    this.resetPasswordSuccessSignal.set(null);

    this.iamApi.resetPassword(command).subscribe({
      next: () => {
        this.resetPasswordSuccessSignal.set(
          'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
        );
        this.loadingSignal.set(false);
      },
      error: (err: Error) => {
        this.resetPasswordErrorSignal.set(err.message || 'No se pudo cambiar la contraseña.');
        this.loadingSignal.set(false);
      },
    });
  }

  signOut(router: Router): void {
    this.clearSession();
    router.navigate(['/iam/sign-in']).then();
  }

  /** Updates the current user's name, last name and username. */
  updateProfile(command: UpdateProfileCommand): void {
    const current = this.currentUserSignal();
    if (!current) return;

    this.settingsLoadingSignal.set(true);
    this.updateProfileErrorSignal.set(null);
    this.updateProfileSuccessSignal.set(null);

    this.iamApi.updateProfile(current.id, command).subscribe({
      next: () => {
        const updated = new User({
          ...current.toProps(),
          name: command.name,
          lastName: command.lastName,
          username: command.username,
        });
        this.setCurrentUser(updated);
        this.updateProfileSuccessSignal.set('Perfil actualizado correctamente.');
        this.settingsLoadingSignal.set(false);
      },
      error: (err: Error) => {
        this.updateProfileErrorSignal.set(err.message || 'No se pudo actualizar el perfil.');
        this.settingsLoadingSignal.set(false);
      },
    });
  }

  /** Updates the current user's email address. */
  updateEmail(command: UpdateEmailCommand): void {
    const current = this.currentUserSignal();
    if (!current) return;

    this.settingsLoadingSignal.set(true);
    this.updateEmailErrorSignal.set(null);
    this.updateEmailSuccessSignal.set(null);

    this.iamApi.updateEmail(current.id, command).subscribe({
      next: () => {
        const updated = new User({ ...current.toProps(), email: command.email.trim().toLowerCase() });
        this.setCurrentUser(updated);
        this.updateEmailSuccessSignal.set('Correo actualizado correctamente.');
        this.settingsLoadingSignal.set(false);
      },
      error: (err: Error) => {
        this.updateEmailErrorSignal.set(err.message || 'No se pudo actualizar el correo.');
        this.settingsLoadingSignal.set(false);
      },
    });
  }

  /** Updates the current user's password after verifying the current one. */
  updatePassword(command: UpdatePasswordCommand): void {
    const current = this.currentUserSignal();
    if (!current) return;

    this.settingsLoadingSignal.set(true);
    this.updatePasswordErrorSignal.set(null);
    this.updatePasswordSuccessSignal.set(null);

    this.iamApi.updatePassword(current.id, command).subscribe({
      next: () => {
        this.updatePasswordSuccessSignal.set('Contraseña actualizada correctamente.');
        this.settingsLoadingSignal.set(false);
      },
      error: (err: Error) => {
        this.updatePasswordErrorSignal.set(err.message || 'No se pudo actualizar la contraseña.');
        this.settingsLoadingSignal.set(false);
      },
    });
  }

  /** Clears any leftover Settings feedback messages, e.g. when the page is (re)entered. */
  clearSettingsMessages(): void {
    this.updateProfileErrorSignal.set(null);
    this.updateProfileSuccessSignal.set(null);
    this.updateEmailErrorSignal.set(null);
    this.updateEmailSuccessSignal.set(null);
    this.updatePasswordErrorSignal.set(null);
    this.updatePasswordSuccessSignal.set(null);
  }

  /** Updates the held user and re-persists the session under the existing token. */
  private setCurrentUser(user: User): void {
    this.currentUserSignal.set(user);
    const token = this.tokenSignal();
    if (token) {
      this.persistSession(user, token);
    }
  }
}
