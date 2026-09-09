import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CurrentAccountStoreService } from '../../services/current-account-store.service';
import { CurrentAccountApiService } from '../../services/current-account-api.service';
import { Statement, StatementDetail } from '../../models/current-account.models';

@Component({
  selector: 'app-current-account-statements',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './statements.component.html',
  styleUrl: './statements.component.css'
})
export class StatementsComponent {
  protected readonly store = inject(CurrentAccountStoreService);
  private readonly api = inject(CurrentAccountApiService);
  private readonly fb = inject(FormBuilder);

  // Generación de cierres
  protected readonly generating = signal<boolean>(false);
  protected readonly generateMessage = signal<string | null>(null);
  protected readonly cutoffDate = signal<string>(this.getDefaultCutoffDate());

  // Filtros
  protected readonly filterStatus = signal<'ALL' | 'OPEN' | 'PAID'>('ALL');
  protected readonly filterClientId = signal<string>('ALL');

  // Detalle de estado
  protected readonly selectedStatementId = signal<string | null>(null);
  protected readonly statementDetail = signal<StatementDetail | null>(null);
  protected readonly detailLoading = signal<boolean>(false);
  protected readonly asOfDate = signal<string>(this.getTodayIsoDate());

  // Diálogo de Pago Exacto
  protected readonly showPayModal = signal<boolean>(false);
  protected readonly paying = signal<boolean>(false);
  protected readonly payErrorMessage = signal<string | null>(null);
  protected readonly payDate = signal<string>(this.getTodayIsoDate());

  private getDefaultCutoffDate(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-20`;
  }

  private getTodayIsoDate(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  getEffectiveAsOf(cutoffDate: string): string {
    const today = this.getTodayIsoDate();
    return today >= cutoffDate ? today : cutoffDate;
  }

  // Estados filtrados
  protected readonly filteredStatements = computed(() => {
    let list = this.store.statements();
    const status = this.filterStatus();
    if (status !== 'ALL') {
      list = list.filter(s => s.status === status);
    }
    const clientId = this.filterClientId();
    if (clientId !== 'ALL') {
      list = list.filter(s => s.clientId === clientId);
    }
    return list;
  });

  generateStatements(): void {
    const date = this.cutoffDate();
    if (!date) return;

    this.generating.set(true);
    this.generateMessage.set(null);

    this.api.generateStatements(date).subscribe({
      next: (res) => {
        this.generating.set(false);
        this.generateMessage.set(`Operación completada: se generaron ${res.created} nuevos estados de cuenta para el corte ${date}.`);
        this.store.loadBootstrap().subscribe();
      },
      error: (err) => {
        this.generating.set(false);
        this.store.notifyError(err?.error?.error || 'Error al generar estados de cuenta.');
      }
    });
  }

  openDetail(st: Statement): void {
    this.selectedStatementId.set(st.id);
    const initialAsOf = this.getEffectiveAsOf(st.cutoffDate);
    this.asOfDate.set(initialAsOf);
    this.loadDetail(st.id, initialAsOf);
  }

  closeDetail(): void {
    this.selectedStatementId.set(null);
    this.statementDetail.set(null);
  }

  onAsOfDateChange(newDate: string): void {
    const det = this.statementDetail();
    if (det && newDate < det.cutoffDate) {
      newDate = det.cutoffDate;
    }
    this.asOfDate.set(newDate);
    const id = this.selectedStatementId();
    if (id) {
      this.loadDetail(id, newDate);
    }
  }

  private loadDetail(id: string, asOf: string): void {
    this.detailLoading.set(true);
    this.api.getStatementDetail(id, asOf).subscribe({
      next: (data) => {
        this.detailLoading.set(false);
        this.statementDetail.set(data);
      },
      error: (err) => {
        this.detailLoading.set(false);
        this.store.notifyError(err?.error?.error || 'No se pudo cargar el detalle del estado de cuenta.');
      }
    });
  }

  downloadCsv(): void {
    const id = this.selectedStatementId();
    if (!id) return;

    this.api.exportStatementCsv(id, this.asOfDate()).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `liquidacion_estado_${id.substring(0, 8)}_${this.asOfDate()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.store.notifyError(err?.error?.error || 'Error al descargar archivo CSV.');
      }
    });
  }

  openPayDialog(): void {
    this.payDate.set(this.asOfDate());
    this.payErrorMessage.set(null);
    this.showPayModal.set(true);
  }

  closePayDialog(): void {
    this.showPayModal.set(false);
    this.payErrorMessage.set(null);
  }

  onPayDateChange(newDate: string): void {
    const det = this.statementDetail();
    if (det && newDate < det.cutoffDate) {
      newDate = det.cutoffDate;
    }
    this.payDate.set(newDate);
    const id = this.selectedStatementId();
    if (id) {
      this.asOfDate.set(newDate);
      this.loadDetail(id, newDate);
    }
  }

  confirmPayment(): void {
    const det = this.statementDetail();
    if (!det) return;

    this.paying.set(true);
    this.payErrorMessage.set(null);

    const dto = {
      paidAt: this.payDate(),
      amount: det.payableTotal
    };

    this.api.payStatement(det.id, dto).subscribe({
      next: (res) => {
        this.paying.set(false);
        this.closePayDialog();
        this.store.notifySuccess(
          `Pago exacto de ${det.currency} ${res.amount.toFixed(2)} registrado exitosamente.`
        );
        this.loadDetail(det.id, this.asOfDate());
        this.store.loadBootstrap().subscribe();
      },
      error: (err) => {
        this.paying.set(false);
        this.payErrorMessage.set(err?.error?.error || 'Error al procesar el pago en el servidor.');
      }
    });
  }
}
