import {AfterViewChecked, Component, computed, inject, ViewChild} from '@angular/core';
import {DecimalPipe} from '@angular/common';
import {Router} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import {MatIconModule} from '@angular/material/icon';
import {MatPaginator, MatPaginatorModule} from '@angular/material/paginator';
import {MatSort, MatSortModule} from '@angular/material/sort';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {TranslatePipe} from '@ngx-translate/core';
import {VehicleStore} from '../../../application/vehicle.store';
import {Vehicle} from '../../../domain/model/vehicle.entity';

/**
 * Displays the vehicle catalog with table actions (view/edit/delete).
 */
@Component({
  selector: 'app-vehicle-list',
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    DecimalPipe
  ],
  templateUrl: './vehicle-list.html',
  styleUrl: './vehicle-list.css'
})
export class VehicleList implements AfterViewChecked {
  protected readonly store = inject(VehicleStore);
  private readonly router = inject(Router);

  readonly displayedColumns = ['image', 'vehicle', 'color', 'price', 'stock', 'status', 'actions'];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  readonly dataSource = computed(() => {
    const source = new MatTableDataSource(this.store.vehicles());
    source.sort = this.sort;
    source.paginator = this.paginator;
    return source;
  });

  ngAfterViewChecked(): void {
    if (this.dataSource().paginator !== this.paginator) {
      this.dataSource().paginator = this.paginator;
    }
    if (this.dataSource().sort !== this.sort) {
      this.dataSource().sort = this.sort;
    }
  }

  currencySymbol(vehicle: Vehicle): string {
    return this.store.getCurrencyCatalogById(vehicle.currencyCatalogId)()?.symbol ?? '';
  }

  navigateToNew(): void {
    this.router.navigate(['/vehicles/new']);
  }

  viewVehicle(id: string): void {
    this.router.navigate(['/vehicles', id]);
  }

  editVehicle(id: string): void {
    this.router.navigate(['/vehicles', id, 'edit']);
  }

  deleteVehicle(id: string): void {
    this.store.deleteVehicle(id);
  }
}
