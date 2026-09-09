import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrentAccountStoreService } from '../../services/current-account-store.service';
import { CurrentAccountApiService } from '../../services/current-account-api.service';
import { Statement, StatementDetail } from '../../models/current-account.models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-customer-statements',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customer-statements.component.html',
  styleUrl: './customer-statements.component.css'
})
export class CustomerStatementsComponent {
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(CurrentAccountStoreService);
  private readonly api = inject(CurrentAccountApiService);

  protected readonly selectedStatementId = signal<string | null>(null);
  protected readonly statementDetail = signal<StatementDetail | null>(null);
  protected readonly detailLoading = signal<boolean>(false);
  protected readonly asOfDate = signal<string>(this.getTodayIsoDate());

  private getTodayIsoDate(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  getEffectiveAsOf(cutoffDate: string): string {
    const today = this.getTodayIsoDate();
    return today >= cutoffDate ? today : cutoffDate;
  }

  protected readonly myStatements = computed<Statement[]>(() => {
    const user = this.auth.currentUser();
    if (!user || !user.clientId) return this.store.statements();
    return this.store.statements().filter(s => s.clientId === user.clientId);
  });

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
        a.download = `mi_estado_cuenta_${id.substring(0, 8)}_${this.asOfDate()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.store.notifyError(err?.error?.error || 'Error al descargar el archivo CSV.');
      }
    });
  }
}
