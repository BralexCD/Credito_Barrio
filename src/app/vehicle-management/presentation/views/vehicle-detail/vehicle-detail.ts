import {Component, computed, inject, signal} from '@angular/core';
import {DecimalPipe} from '@angular/common';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatCardModule} from '@angular/material/card';
import {VehicleStore} from '../../../application/vehicle.store';

/**
 * Read-only vehicle detail screen with an image gallery.
 */
@Component({
  selector: 'app-vehicle-detail',
  imports: [RouterLink, TranslatePipe, MatButtonModule, MatIconModule, MatCardModule, DecimalPipe],
  templateUrl: './vehicle-detail.html',
  styleUrl: './vehicle-detail.css'
})
export class VehicleDetail {
  private readonly route = inject(ActivatedRoute);
  protected readonly store = inject(VehicleStore);

  protected readonly vehicleId = this.route.snapshot.paramMap.get('id')!;
  protected readonly vehicle = this.store.getVehicleById(this.vehicleId);

  private readonly selectedImageUrlSignal = signal<string | null>(null);

  protected readonly displayedImageUrl = computed(() =>
    this.selectedImageUrlSignal() ?? this.vehicle()?.primaryImage?.url ?? null
  );

  protected readonly currencySymbol = computed(() => {
    const vehicle = this.vehicle();
    return vehicle ? this.store.getCurrencyCatalogById(vehicle.currencyCatalogId)()?.symbol ?? '' : '';
  });

  selectImage(url: string): void {
    this.selectedImageUrlSignal.set(url);
  }
}
