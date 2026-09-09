import { from, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SupabaseService } from '../../shared/infrastructure/supabase.service';
import { UpdateProfileCommand } from '../domain/model/update-profile.command';
import { UpdateEmailCommand } from '../domain/model/update-email.command';
import { UpdatePasswordCommand } from '../domain/model/update-password.command';

/**
 * Updates the currently authenticated user's profile, email and password.
 *
 * @remarks
 * Mirrors {@link SignUpApiEndpoint} and {@link PasswordRecoveryApiEndpoint}: this app has no
 * Supabase Auth session, so account fields are updated directly on the custom `users` table.
 */
export class ProfileApiEndpoint {
  constructor(private readonly supabaseService: SupabaseService) {}

  updateProfile(userId: string, command: UpdateProfileCommand): Observable<void> {
    return from(this.updateProfileWithSupabase(userId, command)).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || 'No se pudo actualizar el perfil.')),
      ),
    );
  }

  updateEmail(userId: string, command: UpdateEmailCommand): Observable<void> {
    return from(this.updateEmailWithSupabase(userId, command)).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || 'No se pudo actualizar el correo.')),
      ),
    );
  }

  updatePassword(userId: string, command: UpdatePasswordCommand): Observable<void> {
    return from(this.updatePasswordWithSupabase(userId, command)).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || 'No se pudo actualizar la contraseña.')),
      ),
    );
  }

  private async updateProfileWithSupabase(userId: string, command: UpdateProfileCommand): Promise<void> {
    const supabase = this.supabaseService.client;
    const username = command.username.trim();

    const { data: existingUsers, error: existingError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .neq('id', userId)
      .limit(1);

    if (existingError) {
      throw new Error(`Error al validar usuario existente: ${existingError.message}`);
    }

    if (existingUsers && existingUsers.length > 0) {
      throw new Error('Ya existe una cuenta registrada con ese nombre de usuario.');
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        name: command.name.trim(),
        last_name: command.lastName.trim(),
        username,
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Error al actualizar perfil: ${updateError.message}`);
    }
  }

  private async updateEmailWithSupabase(userId: string, command: UpdateEmailCommand): Promise<void> {
    const supabase = this.supabaseService.client;
    const email = command.email.trim().toLowerCase();

    const { data: existingUsers, error: existingError } = await supabase
      .from('users')
      .select('id')
      .ilike('email', email)
      .neq('id', userId)
      .limit(1);

    if (existingError) {
      throw new Error(`Error al validar correo existente: ${existingError.message}`);
    }

    if (existingUsers && existingUsers.length > 0) {
      throw new Error('Ya existe una cuenta registrada con ese correo.');
    }

    const { error: updateError } = await supabase.from('users').update({ email }).eq('id', userId);

    if (updateError) {
      throw new Error(`Error al actualizar correo: ${updateError.message}`);
    }
  }

  private async updatePasswordWithSupabase(userId: string, command: UpdatePasswordCommand): Promise<void> {
    const supabase = this.supabaseService.client;

    const { data: users, error: findError } = await supabase
      .from('users')
      .select('password')
      .eq('id', userId)
      .limit(1);

    if (findError) {
      throw new Error(`Error al verificar la contraseña: ${findError.message}`);
    }

    const storedPassword = users?.[0]?.password;

    if (storedPassword === undefined) {
      throw new Error('No se pudo encontrar el usuario.');
    }

    if (storedPassword !== command.currentPassword) {
      throw new Error('La contraseña actual no es correcta.');
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ password: command.newPassword })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Error al actualizar contraseña: ${updateError.message}`);
    }
  }
}
