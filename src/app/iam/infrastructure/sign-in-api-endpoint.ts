import { from, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SupabaseService } from '../../shared/infrastructure/supabase.service';
import { SignInCommand } from '../domain/model/sign-in.command';
import { User } from '../domain/model/user.entity';
import { SignInAssembler } from './sign-in-assembler';
import { RoleResource, UserResource } from './users-response';

export class SignInApiEndpoint {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly assembler: SignInAssembler,
  ) {}

  signIn(command: SignInCommand): Observable<User> {
    return from(this.signInWithSupabase(command)).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || 'No se pudo iniciar sesión.')),
      ),
    );
  }

  private async signInWithSupabase(command: SignInCommand): Promise<User> {
    const supabase = this.supabaseService.client;

    const email = command.email.trim().toLowerCase();
    const password = command.password;

    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email)
      .eq('password', password)
      .limit(1);

    if (userError) {
      throw new Error(`Error al consultar usuario: ${userError.message}`);
    }

    const userResource = users?.[0] as UserResource | undefined;

    if (!userResource) {
      throw new Error('Correo o contraseña incorrectos.');
    }

    if (!userResource.enabled) {
      throw new Error('Esta cuenta se encuentra deshabilitada.');
    }

    const { data: roles, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', userResource.role_id)
      .limit(1);

    if (roleError) {
      throw new Error(`Error al consultar rol: ${roleError.message}`);
    }

    const roleResource = roles?.[0] as RoleResource | undefined;

    if (!roleResource) {
      throw new Error('El usuario no tiene un rol válido asignado.');
    }

    return this.assembler.toEntity(userResource, roleResource);
  }
}
