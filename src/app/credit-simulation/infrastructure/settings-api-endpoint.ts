import { from, map, Observable } from 'rxjs';
import { SupabaseService } from '../../shared/infrastructure/supabase.service';
import { Setting } from '../domain/model/setting.entity';
import { SettingAssembler } from './setting-assembler';
import { SettingResource } from './settings-response';

export class SettingsApiEndpoint {
  private readonly tableName = 'settings';
  private readonly assembler = new SettingAssembler();

  constructor(private readonly supabaseService: SupabaseService) {}

  getAll(): Observable<Setting[]> {
    return from(this.supabaseService.client.from(this.tableName).select('*')).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }

        return (data ?? []).map((resource) =>
          this.assembler.toEntityFromResource(resource as SettingResource),
        );
      }),
    );
  }

  getByUserId(userId: string): Observable<Setting | null> {
    return from(
      this.supabaseService.client
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }

        if (!data) {
          return null;
        }

        return this.assembler.toEntityFromResource(data as SettingResource);
      }),
    );
  }
}
