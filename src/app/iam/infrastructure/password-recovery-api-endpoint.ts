import { from, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SupabaseService } from '../../shared/infrastructure/supabase.service';
import { ResetPasswordCommand } from '../domain/model/reset-password.command';

export class PasswordRecoveryApiEndpoint {
  constructor(private readonly supabaseService: SupabaseService) {}

  resetPassword(command: ResetPasswordCommand): Observable<void> {
    return from(this.resetPasswordWithSupabase(command)).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || 'No se pudo cambiar la contraseña.')),
      ),
    );
  }

  private async resetPasswordWithSupabase(command: ResetPasswordCommand): Promise<void> {
    const supabase = this.supabaseService.client;
    const email = command.email.trim().toLowerCase();

    const { data: users, error: findError } = await supabase
      .from('users')
      .select('id')
      .ilike('email', email)
      .limit(1);

    if (findError) {
      throw new Error(`Error al buscar usuario: ${findError.message}`);
    }

    const userId = users?.[0]?.id;

    if (!userId) {
      throw new Error('No existe una cuenta registrada con ese correo.');
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
