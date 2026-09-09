import { from, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { VehicleImage } from '../domain/model/vehicle-image.entity';
import { VehicleImageAssembler } from './vehicle-image-assembler';
import { VehicleImageResource } from './vehicle-images-response';
import { SupabaseService } from '../../shared/infrastructure/supabase.service';

type VehicleImagePayload = {
  vehicle_id: string;
  url: string;
  cloudinary_public_id: string | null;
  is_primary: boolean;
  order: number;
};

export class VehicleImagesApiEndpoint {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly assembler: VehicleImageAssembler,
  ) {}

  getAll(): Observable<VehicleImage[]> {
    return from(this.getAllFromSupabase()).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || 'No se pudieron cargar las imágenes.')),
      ),
    );
  }

  create(image: VehicleImage): Observable<VehicleImage> {
    return from(this.createInSupabase(image)).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || 'No se pudo crear la imagen.')),
      ),
    );
  }

  update(image: VehicleImage, id: string): Observable<VehicleImage> {
    return from(this.updateInSupabase(image, id)).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || `No se pudo actualizar la imagen ${id}.`)),
      ),
    );
  }

  delete(id: string): Observable<void> {
    return from(this.deleteFromSupabase(id)).pipe(
      catchError((error: Error) =>
        throwError(() => new Error(error.message || `No se pudo eliminar la imagen ${id}.`)),
      ),
    );
  }

  private async getAllFromSupabase(): Promise<VehicleImage[]> {
    const { data, error } = await this.supabaseService.client
      .from('vehicle_images')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      throw new Error(`Error al consultar imágenes: ${error.message}`);
    }

    return (data as VehicleImageResource[]).map((resource) =>
      this.assembler.toEntityFromResource(resource),
    );
  }

  private async createInSupabase(image: VehicleImage): Promise<VehicleImage> {
    const { data, error } = await this.supabaseService.client
      .from('vehicle_images')
      .insert(this.toPayload(image))
      .select('*')
      .single();

    if (error) {
      throw new Error(`Error al crear imagen: ${error.message}`);
    }

    return this.assembler.toEntityFromResource(data as VehicleImageResource);
  }

  private async updateInSupabase(image: VehicleImage, id: string): Promise<VehicleImage> {
    const { data, error } = await this.supabaseService.client
      .from('vehicle_images')
      .update(this.toPayload(image))
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Error al actualizar imagen: ${error.message}`);
    }

    return this.assembler.toEntityFromResource(data as VehicleImageResource);
  }

  private async deleteFromSupabase(id: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('vehicle_images')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error al eliminar imagen: ${error.message}`);
    }
  }

  private toPayload(image: VehicleImage): VehicleImagePayload {
    return {
      vehicle_id: image.vehicleId,
      url: image.url,
      cloudinary_public_id: image.cloudinaryPublicId,
      is_primary: image.isPrimary,
      order: image.order,
    };
  }
}
