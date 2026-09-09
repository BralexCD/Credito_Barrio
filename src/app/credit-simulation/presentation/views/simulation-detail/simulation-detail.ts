import { Component, inject } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

import { CreditSimulationStore } from '../../../application/credit-simulation.store';
import { ClientStore } from '../../../../client-management/application/client.store';
import { VehicleStore } from '../../../../vehicle-management/application/vehicle.store';
import { CashFlowType, PeriodType } from '../../../domain/model/credit-simulation.types';
import { PaymentScheduleEntry } from '../../../domain/model/payment-schedule-entry.entity';

import * as XLSX from 'xlsx'

/**
 * Read-only detail screen for a saved Compra Inteligente simulation:
 * KPIs, vehicle/client data and payment schedule.
 */
@Component({
  selector: 'app-simulation-detail',
  imports: [
    RouterLink,
    TranslatePipe,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    DecimalPipe,
    PercentPipe,
  ],
  templateUrl: './simulation-detail.html',
  styleUrl: './simulation-detail.css',
})
export class SimulationDetail {
  private readonly route = inject(ActivatedRoute);

  protected readonly store = inject(CreditSimulationStore);
  private readonly clientStore = inject(ClientStore);
  private readonly vehicleStore = inject(VehicleStore);

  protected readonly simulationId = this.route.snapshot.paramMap.get('id')!;
  protected readonly simulation = this.store.getSimulationById(this.simulationId);
  protected readonly schedule = this.store.getScheduleBySimulationId(this.simulationId);

  clientName(clientId: string): string {
    return this.clientStore.clients().find((client) => client.id === clientId)?.fullName ?? '';
  }

  vehicleName(vehicleId: string): string {
    return (
      this.vehicleStore.vehicles().find((vehicle) => vehicle.id === vehicleId)?.displayName ?? ''
    );
  }

  vehicleImageUrl(vehicleId: string): string | null {
    return (
      this.vehicleStore.vehicles().find((vehicle) => vehicle.id === vehicleId)?.primaryImage?.url ??
      null
    );
  }

  totalInterest(): number {
    return this.schedule().reduce((total, entry) => total + entry.interest, 0);
  }

  totalRegularInterest(): number {
    return this.schedule().reduce((total, entry) => total + entry.regularInterest, 0);
  }

  totalFinalQuotaInterest(): number {
    return this.schedule().reduce((total, entry) => total + entry.finalQuotaInterest, 0);
  }

  totalInsurance(): number {
    return this.schedule().reduce((total, entry) => total + entry.totalInsurance, 0);
  }

  totalRiskInsurance(): number {
    return this.schedule().reduce((total, entry) => total + entry.riskInsurance, 0);
  }

  totalPortes(): number {
    return this.schedule().reduce((total, entry) => total + entry.portes, 0);
  }

  totalGps(): number {
    return this.schedule().reduce((total, entry) => total + entry.gps, 0);
  }

  totalAdministrativeExpenses(): number {
    return this.schedule().reduce((total, entry) => total + entry.administrativeExpenses, 0);
  }

  totalOtherExpenses(): number {
    return this.schedule().reduce((total, entry) => total + entry.otherExpenses, 0);
  }

  totalBalloonPayment(): number {
    return this.schedule().reduce((total, entry) => total + entry.balloonPayment, 0);
  }

  totalPayments(): number {
    return this.schedule().reduce((total, entry) => total + entry.totalPayment, 0);
  }

  vanLabelKey(van: number): string {
    return van >= 0 ? 'simulation.positive-value' : 'simulation.negative-value';
  }

  exportPdf(): void {
    window.print();
  }

  periodLabelKey(periodType: PeriodType): string {
    switch (periodType) {
      case 'GRACIA_PARCIAL':
        return 'simulation.period-gracia-parcial';
      case 'GRACIA_TOTAL':
        return 'simulation.period-gracia-total';
      default:
        return 'simulation.period-normal';
    }
  }

  cashFlowTypeLabel(cashFlowType: CashFlowType): string {
    return cashFlowType === 'BALLOON' ? 'Cuotón final' : 'Cuota';
  }

  pgLabel(periodType: PeriodType, cashFlowType: CashFlowType): string {
    if (cashFlowType === 'BALLOON') {
      return 'S';
    }

    switch (periodType) {
      case 'GRACIA_TOTAL':
        return 'T';
      case 'GRACIA_PARCIAL':
        return 'P';
      default:
        return 'S';
    }
  }
  exportScheduleExcel(): void {
    const simulation = this.simulation();

    if (!simulation) {
      return;
    }

    const rows = this.schedule().map((entry) => ({
      'N°': entry.installmentNumber,
      Fecha: entry.paymentDate,
      PG: this.pgLabel(entry.periodType, entry.cashFlowType),
      'Tipo flujo': this.cashFlowTypeLabel(entry.cashFlowType),

      SICF: this.roundMoney(entry.initialFinalQuotaBalance),
      ICF: this.roundMoney(entry.finalQuotaInterest),
      ACF: this.roundMoney(entry.finalQuotaAmortization),
      'Seg. Des. CF': this.roundMoney(entry.finalQuotaDesgravamen),
      SFCF: this.roundMoney(entry.finalFinalQuotaBalance),

      SI: this.roundMoney(entry.initialRegularBalance),
      I: this.roundMoney(entry.regularInterest),
      Cuota: this.roundMoney(entry.regularQuota),
      A: this.roundMoney(entry.regularAmortization),
      'Seg. Des.': this.roundMoney(entry.regularDesgravamen),
      SF: this.roundMoney(entry.finalRegularBalance),

      'Seg. Riesgo': this.roundMoney(entry.riskInsurance),
      GPS: this.roundMoney(entry.gps),
      Portes: this.roundMoney(entry.portes),
      'Gastos adm.': this.roundMoney(entry.administrativeExpenses),
      'Otros gastos': this.roundMoney(entry.otherExpenses),
      'Cuota final': this.roundMoney(entry.balloonPayment),
      'Pago total': this.roundMoney(entry.totalPayment),
      'Flujo caja': this.roundMoney(entry.cashFlow),
    }));

    const summaryRows = [
      ['Cronograma de pagos - Compra Inteligente'],
      ['Cliente', this.clientName(simulation.clientId)],
      ['Vehículo', this.vehicleName(simulation.vehicleId)],
      ['Moneda', simulation.currency],
      ['Precio vehículo', this.roundMoney(simulation.vehiclePrice)],
      ['Préstamo', this.roundMoney(simulation.loanAmount)],
      ['Cuota inicial', this.roundMoney(simulation.initialFeeAmount)],
      ['Cuotón final', this.roundMoney(simulation.finalQuotaAmount)],
      ['TCEA', simulation.tcea],
      ['VAN', this.roundMoney(simulation.van)],
      ['TIR periodo', simulation.tir],
      [],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.sheet_add_json(worksheet, rows, {
      origin: `A${summaryRows.length + 1}`,
    });

    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 14 },
      { wch: 8 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cronograma');

    const fileName = `cronograma-${simulation.id}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  excelInitialBalance(entry: PaymentScheduleEntry): number {
    return entry.initialRegularBalance + entry.initialFinalQuotaBalance;
  }

  excelInterest(entry: PaymentScheduleEntry): number {
    return entry.regularInterest + entry.finalQuotaInterest;
  }

  excelDesgravamen(entry: PaymentScheduleEntry): number {
    return entry.regularDesgravamen + entry.finalQuotaDesgravamen;
  }

  excelQuota(entry: PaymentScheduleEntry): number {
    if (entry.cashFlowType === 'BALLOON') {
      return 0;
    }

    return entry.regularQuota;
  }

  excelAmortization(entry: PaymentScheduleEntry): number {
    return entry.regularAmortization + entry.finalQuotaAmortization;
  }

  excelFinalBalance(entry: PaymentScheduleEntry): number {
    return entry.finalRegularBalance + entry.finalFinalQuotaBalance;
  }

  discountRateAnnual(): number {
    const simulation = this.simulation();

    if (!simulation) {
      return 0;
    }

    const opportunityRate = simulation.opportunityRate ?? 0;

    /**
     * Si viene como 50, lo convertimos a 0.50.
     * Si ya viene como 0.50, lo dejamos igual.
     */
    return opportunityRate > 1 ? opportunityRate / 100 : opportunityRate;
  }

  discountRatePeriod(): number {
    const simulation = this.simulation();

    if (!simulation) {
      return 0;
    }

    const cok = this.discountRateAnnual();
    const paymentFrequencyDays = simulation.paymentFrequencyDays ?? 30;
    const daysPerYear = simulation.daysPerYear ?? 360;

    if (cok <= 0 || paymentFrequencyDays <= 0 || daysPerYear <= 0) {
      return 0;
    }

    return Math.pow(1 + cok, paymentFrequencyDays / daysPerYear) - 1;
  }
}
