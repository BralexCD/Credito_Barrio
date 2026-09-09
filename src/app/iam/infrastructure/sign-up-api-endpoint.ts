import { from, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SupabaseService } from '../../shared/infrastructure/supabase.service';
import { SignUpCommand } from '../domain/model/sign-up.command';

export class SignUpApiEndpoint {
  constructor(private readonly supabaseService: SupabaseService) {}

  signUp(command: SignUpCommand): Observable<void> {
    return from(this.signUpWithSupabase(command)).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || 'No se pudo registrar el usuario.')),
      ),
    );
  }

  private async signUpWithSupabase(command: SignUpCommand): Promise<void> {
    const supabase = this.supabaseService.client;

    const email = command.email.trim().toLowerCase();
    const username = command.username.trim();

    const { data: existingUsers, error: existingError } = await supabase
      .from('users')
      .select('id')
      .or(`email.ilike.${email},username.eq.${username}`)
      .limit(1);

    if (existingError) {
      throw new Error(`Error al validar usuario existente: ${existingError.message}`);
    }

    if (existingUsers && existingUsers.length > 0) {
      throw new Error('Ya existe una cuenta registrada con ese correo o nombre de usuario.');
    }

    const { data: roles, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'ADVISOR')
      .limit(1);

    if (roleError) {
      throw new Error(`Error al obtener rol por defecto: ${roleError.message}`);
    }

    const advisorRoleId = roles?.[0]?.id;

    if (!advisorRoleId) {
      throw new Error('No existe el rol ADVISOR en la base de datos.');
    }

    const { data: createdUsers, error: insertError } = await supabase
      .from('users')
      .insert({
        role_id: advisorRoleId,
        username,
        password: command.password,
        enabled: true,
        name: command.name.trim(),
        last_name: command.lastName.trim(),
        email,
        registration_date: new Date().toISOString(),
      })
      .select('id');

    if (insertError) {
      throw new Error(`Error al registrar usuario: ${insertError.message}`);
    }

    const createdUserId = createdUsers?.[0]?.id;

    if (!createdUserId) {
      throw new Error('El usuario fue registrado, pero no se obtuvo su identificador.');
    }

    await this.createDefaultSettings(createdUserId);
  }

  private async createDefaultSettings(userId: string): Promise<void> {
    const supabase = this.supabaseService.client;

    const { data: currencies, error: currencyError } = await supabase
      .from('currency_catalogs')
      .select('id')
      .eq('currency', 'PEN')
      .limit(1);

    if (currencyError) {
      throw new Error(`Error al obtener moneda por defecto: ${currencyError.message}`);
    }

    const defaultCurrencyId = currencies?.[0]?.id;

    if (!defaultCurrencyId) {
      return;
    }

    const { error: settingsError } = await supabase.from('settings').insert({
      user_id: userId,
      default_currency_catalog_id: defaultCurrencyId,
      default_interest_type: 'EFECTIVA',
      default_grace_period: 'NINGUNA',
      default_opportunity_tea: 10,
      default_change_usd_pen: 3.75,
    });

    if (settingsError) {
      throw new Error(
        `Usuario creado, pero no se pudo crear su configuración: ${settingsError.message}`,
      );
    }
  }
}
