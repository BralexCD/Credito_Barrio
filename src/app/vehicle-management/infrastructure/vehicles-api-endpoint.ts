import { from, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Vehicle } from '../domain/model/vehicle.entity';
import { VehicleAssembler } from './vehicle-assembler';
import { VehicleResource } from './vehicles-response';
import { SupabaseService } from '../../shared/infrastructure/supabase.service';

type VehiclePayload = {
  user_id: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  price: number;
  currency_catalog_id: string;
  stock: number;
  status: boolean;
};

export class VehiclesApiEndpoint {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly assembler: VehicleAssembler,
  ) {}

  getAllForUser(userId: string, roleName: string): Observable<Vehicle[]> {
    return from(this.getAllForUserFromSupabase(userId, roleName)).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || 'No se pudieron cargar los vehículos.')),
      ),
    );
  }

  getById(id: string): Observable<Vehicle> {
    return from(this.getByIdFromSupabase(id)).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || `No se pudo cargar el vehículo ${id}.`)),
      ),
    );
  }

  create(vehicle: Vehicle): Observable<Vehicle> {
    return from(this.createInSupabase(vehicle)).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || 'No se pudo crear el vehículo.')),
      ),
    );
  }

  update(vehicle: Vehicle, id: string): Observable<Vehicle> {
    return from(this.updateInSupabase(vehicle, id)).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || `No se pudo actualizar el vehículo ${id}.`)),
      ),
    );
  }

  delete(id: string): Observable<void> {
    return from(this.deleteFromSupabase(id)).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || `No se pudo eliminar el vehículo ${id}.`)),
      ),
    );
  }

  private async getAllForUserFromSupabase(userId: string, roleName: string): Promise<Vehicle[]> {
    const roleNameNormalized = roleName.trim().toUpperCase();

    let query = this.supabaseService.client
      .from('vehicles')
      .select('*')
      .order('brand', { ascending: true });

    if (roleNameNormalized !== 'ADMIN') {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error al consultar vehículos: ${error.message}`);
    }

    return (data as VehicleResource[]).map((resource) =>
      this.assembler.toEntityFromResource(resource),
    );
  }

  private async getByIdFromSupabase(id: string): Promise<Vehicle> {
    const { data, error } = await this.supabaseService.client
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Error al consultar vehículo: ${error.message}`);
    }

    if (!data) {
      throw new Error('Vehículo no encontrado.');
    }

    return this.assembler.toEntityFromResource(data as VehicleResource);
  }

  private async createInSupabase(vehicle: Vehicle): Promise<Vehicle> {
    const { data, error } = await this.supabaseService.client
      .from('vehicles')
      .insert(this.toPayload(vehicle))
      .select('*')
      .single();

    if (error) {
      throw new Error(`Error al crear vehículo: ${error.message}`);
    }

    return this.assembler.toEntityFromResource(data as VehicleResource);
  }

  private async updateInSupabase(vehicle: Vehicle, id: string): Promise<Vehicle> {
    const { data, error } = await this.supabaseService.client
      .from('vehicles')
      .update(this.toPayload(vehicle))
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Error al actualizar vehículo: ${error.message}`);
    }

    return this.assembler.toEntityFromResource(data as VehicleResource);
  }

  private async deleteFromSupabase(id: string): Promise<void> {
    const { error } = await this.supabaseService.client.from('vehicles').delete().eq('id', id);

    if (error) {
      throw new Error(`Error al eliminar vehículo: ${error.message}`);
    }
  }

  private toPayload(vehicle: Vehicle): VehiclePayload {
    return {
      user_id: vehicle.userId,
      brand: vehicle.brand.trim(),
      model: vehicle.model.trim(),
      year: vehicle.year,
      color: vehicle.color.trim(),
      price: vehicle.price,
      currency_catalog_id: vehicle.currencyCatalogId,
      stock: vehicle.stock,
      status: vehicle.status,
    };
  }
}
