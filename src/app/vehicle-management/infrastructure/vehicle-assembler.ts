import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Vehicle } from '../domain/model/vehicle.entity';
import { VehicleResource, VehiclesResponse } from './vehicles-response';

export class VehicleAssembler implements BaseAssembler<Vehicle, VehicleResource, VehiclesResponse> {
  toEntityFromResource(resource: VehicleResource): Vehicle {
    return new Vehicle({
      id: resource.id,
      userId: resource.user_id,
      brand: resource.brand,
      model: resource.model,
      year: resource.year,
      color: resource.color,
      price: resource.price,
      currencyCatalogId: resource.currency_catalog_id,
      stock: resource.stock,
      status: resource.status,
    });
  }

  toResourceFromEntity(entity: Vehicle): VehicleResource {
    return {
      id: entity.id,
      user_id: entity.userId,
      brand: entity.brand,
      model: entity.model,
      year: entity.year,
      color: entity.color,
      price: entity.price,
      currency_catalog_id: entity.currencyCatalogId,
      stock: entity.stock,
      status: entity.status,
    };
  }

  toEntitiesFromResponse(response: VehiclesResponse): Vehicle[] {
    return response.vehicles.map((resource) => this.toEntityFromResource(resource));
  }
}
