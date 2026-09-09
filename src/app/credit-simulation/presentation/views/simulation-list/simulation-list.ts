import { AfterViewChecked, Component, computed, inject, signal, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import { CreditSimulationStore } from '../../../application/credit-simulation.store';
import { ClientStore } from '../../../../client-management/application/client.store';
import { VehicleStore } from '../../../../vehicle-management/application/vehicle.store';

/**
 * Displays saved Compra Inteligente simulations with filters,
 * export, view and delete actions.
 */
@Component({
  selector: 'app-simulation-list',
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    DecimalPipe,
    PercentPipe,
    TranslatePipe,
  ],
  templateUrl: './simulation-list.html',
  styleUrl: './simulation-list.css',
})
export class SimulationList implements AfterViewChecked {
  protected readonly store = inject(CreditSimulationStore);
  protected readonly clientStore = inject(ClientStore);
  private readonly vehicleStore = inject(VehicleStore);
  private readonly router = inject(Router);

  readonly displayedColumns = [
    'client',
    'vehicle',
    'loanAmount',
    'regularQuota',
    'tcea',
    'disbursementDate',
    'actions',
  ];

  protected readonly clientFilter = signal('all');
  protected readonly dateFilter = signal('all');
  protected readonly amountFilter = signal('all');

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  readonly filteredSimulations = computed(() => {
    const now = new Date();

    return this.store.simulations().filter((simulation) => {
      const date = new Date(`${simulation.disbursementDate}T00:00:00`);

      const matchesClient =
        this.clientFilter() === 'all' || simulation.clientId === this.clientFilter();

      const matchesDate =
        this.dateFilter() === 'all' ||
        (this.dateFilter() === 'month' &&
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()) ||
        (this.dateFilter() === 'year' && date.getFullYear() === now.getFullYear());

      const amount = simulation.loanAmount;

      const matchesAmount =
        this.amountFilter() === 'all' ||
        (this.amountFilter() === 'low' && amount < 20000) ||
        (this.amountFilter() === 'mid' && amount >= 20000 && amount <= 50000) ||
        (this.amountFilter() === 'high' && amount > 50000);

      return matchesClient && matchesDate && matchesAmount;
    });
  });

  readonly dataSource = computed(() => {
    const source = new MatTableDataSource(this.filteredSimulations());

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

  clientName(clientId: string): string {
    return this.clientStore.clients().find((client) => client.id === clientId)?.fullName ?? '';
  }

  clientInitials(clientId: string): string {
    return (
      this.clientName(clientId)
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || 'CI'
    );
  }

  vehicleName(vehicleId: string): string {
    return (
      this.vehicleStore.vehicles().find((vehicle) => vehicle.id === vehicleId)?.displayName ?? ''
    );
  }

  totalLoanAmount(): number {
    return this.filteredSimulations().reduce(
      (total, simulation) => total + simulation.loanAmount,
      0,
    );
  }

  averageTcea(): number {
    const simulations = this.filteredSimulations();

    if (simulations.length === 0) {
      return 0;
    }

    return (
      simulations.reduce((total, simulation) => total + simulation.tcea, 0) / simulations.length
    );
  }

  updateClientFilter(value: string): void {
    this.clientFilter.set(value);
  }

  updateDateFilter(value: string): void {
    this.dateFilter.set(value);
  }

  updateAmountFilter(value: string): void {
    this.amountFilter.set(value);
  }

  resetFilters(): void {
    this.clientFilter.set('all');
    this.dateFilter.set('all');
    this.amountFilter.set('all');
  }

  exportReport(): void {
    const rows = this.filteredSimulations().map((simulation) => [
      this.clientName(simulation.clientId),
      this.vehicleName(simulation.vehicleId),
      simulation.currency,
      simulation.vehiclePrice,
      simulation.initialFeeAmount,
      simulation.loanAmount,
      simulation.finalQuotaAmount,
      simulation.regularQuota,
      simulation.tcea,
      simulation.van,
      simulation.tir,
      simulation.disbursementDate,
    ]);

    const csv = [
      [
        'Cliente',
        'Vehículo',
        'Moneda',
        'Precio vehículo',
        'Cuota inicial',
        'Préstamo',
        'Cuotón final',
        'Cuota regular',
        'TCEA',
        'VAN',
        'TIR',
        'Fecha desembolso',
      ],
      ...rows,
    ]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'simulaciones-compra-inteligente.csv';
    link.click();

    URL.revokeObjectURL(url);
  }

  navigateToNew(): void {
    this.router.navigate(['/simulator']);
  }

  viewSimulation(id: string): void {
    this.router.navigate(['/simulations', id]);
  }

  deleteSimulation(id: string): void {
    this.store.deleteSimulation(id);
  }
}
