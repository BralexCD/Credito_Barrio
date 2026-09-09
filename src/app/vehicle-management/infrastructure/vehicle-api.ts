import { Injectable } from '@angular/core';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { Vehicle } from '../domain/model/vehicle.entity';
import { VehicleImage } from '../domain/model/vehicle-image.entity';
import { SupabaseService } from '../../shared/infrastructure/supabase.service';
import { VehiclesApiEndpoint } from './vehicles-api-endpoint';
import { VehicleImagesApiEndpoint } from './vehicle-images-api-endpoint';
import { CurrencyCatalogsApiEndpoint } from './currency-catalogs-api-endpoint';
import { VehicleAssembler } from './vehicle-assembler';
import { VehicleImageAssembler } from './vehicle-image-assembler';
import { CurrencyCatalogAssembler } from './currency-catalog-assembler';

@Injectable({ providedIn: 'root' })
export class VehicleApi extends BaseApi {
  private readonly vehiclesEndpoint: VehiclesApiEndpoint;
  private readonly vehicleImagesEndpoint: VehicleImagesApiEndpoint;
  private readonly currencyCatalogsEndpoint: CurrencyCatalogsApiEndpoint;

  constructor(supabaseService: SupabaseService) {
    super();

    this.vehiclesEndpoint = new VehiclesApiEndpoint(supabaseService, new VehicleAssembler());

    this.vehicleImagesEndpoint = new VehicleImagesApiEndpoint(
      supabaseService,
      new VehicleImageAssembler(),
    );

    this.currencyCatalogsEndpoint = new CurrencyCatalogsApiEndpoint(
      supabaseService,
      new CurrencyCatalogAssembler(),
    );
  }

  getVehiclesForUser(userId: string, roleName: string) {
    return this.vehiclesEndpoint.getAllForUser(userId, roleName);
  }

  getVehicleById(id: string) {
    return this.vehiclesEndpoint.getById(id);
  }

  createVehicle(vehicle: Vehicle) {
    return this.vehiclesEndpoint.create(vehicle);
  }

  updateVehicle(vehicle: Vehicle) {
    return this.vehiclesEndpoint.update(vehicle, vehicle.id);
  }

  deleteVehicle(id: string) {
    return this.vehiclesEndpoint.delete(id);
  }

  getVehicleImages() {
    return this.vehicleImagesEndpoint.getAll();
  }

  createVehicleImage(image: VehicleImage) {
    return this.vehicleImagesEndpoint.create(image);
  }

  updateVehicleImage(image: VehicleImage) {
    return this.vehicleImagesEndpoint.update(image, image.id);
  }

  deleteVehicleImage(id: string) {
    return this.vehicleImagesEndpoint.delete(id);
  }

  getCurrencyCatalogs() {
    return this.currencyCatalogsEndpoint.getAll();
  }
}
