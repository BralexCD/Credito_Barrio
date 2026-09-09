import { Injectable, inject, signal, computed } from '@angular/core';
import { CurrentAccountApiService } from './current-account-api.service';
import { BootstrapData, Store, Product, Client, Purchase, Statement, Payment, AuditEntry, User } from '../models/current-account.models';
import { catchError, finalize, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CurrentAccountStoreService {
  private readonly api = inject(CurrentAccountApiService);

  readonly bootstrapData = signal<BootstrapData | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  private bootstrapGeneration = 0;

  readonly user = computed<User | null>(() => this.bootstrapData()?.user ?? null);
  readonly stores = computed<Store[]>(() => this.bootstrapData()?.stores ?? []);
  readonly products = computed<Product[]>(() => this.bootstrapData()?.products ?? []);
  readonly clients = computed<Client[]>(() => this.bootstrapData()?.clients ?? []);
  readonly purchases = computed<Purchase[]>(() => this.bootstrapData()?.purchases ?? []);
  readonly statements = computed<Statement[]>(() => this.bootstrapData()?.statements ?? []);
  readonly payments = computed<Payment[]>(() => this.bootstrapData()?.payments ?? []);
  readonly audit = computed<AuditEntry[]>(() => this.bootstrapData()?.audit ?? []);

  // Métricas financieras estrictamente separadas por moneda (sin suma bimonetaria)
  readonly penMetrics = computed(() => {
    const clients = this.clients().filter(c => c.currency === 'PEN');
    const statements = this.statements().filter(s => s.currency === 'PEN');
    const openStatements = statements.filter(s => s.status === 'OPEN');

    const totalLimit = clients.reduce((acc, c) => acc + (Number(c.creditLimit) || 0), 0);
    const outstandingCapital = clients.reduce((acc, c) => acc + (Number(c.outstandingCapital) || 0), 0);
    const availableCredit = clients.reduce((acc, c) => acc + (Number(c.availableCredit) || 0), 0);
    const openPayableTotal = openStatements.reduce((acc, s) => acc + (Number(s.total) || 0), 0);

    return {
      currency: 'PEN' as const,
      symbol: 'S/',
      activeClientsCount: clients.filter(c => c.active).length,
      totalLimit: Number(totalLimit.toFixed(2)),
      outstandingCapital: Number(outstandingCapital.toFixed(2)),
      availableCredit: Number(availableCredit.toFixed(2)),
      openStatementsCount: openStatements.length,
      openPayableTotal: Number(openPayableTotal.toFixed(2))
    };
  });

  readonly usdMetrics = computed(() => {
    const clients = this.clients().filter(c => c.currency === 'USD');
    const statements = this.statements().filter(s => s.currency === 'USD');
    const openStatements = statements.filter(s => s.status === 'OPEN');

    const totalLimit = clients.reduce((acc, c) => acc + (Number(c.creditLimit) || 0), 0);
    const outstandingCapital = clients.reduce((acc, c) => acc + (Number(c.outstandingCapital) || 0), 0);
    const availableCredit = clients.reduce((acc, c) => acc + (Number(c.availableCredit) || 0), 0);
    const openPayableTotal = openStatements.reduce((acc, s) => acc + (Number(s.total) || 0), 0);

    return {
      currency: 'USD' as const,
      symbol: '$',
      activeClientsCount: clients.filter(c => c.active).length,
      totalLimit: Number(totalLimit.toFixed(2)),
      outstandingCapital: Number(outstandingCapital.toFixed(2)),
      availableCredit: Number(availableCredit.toFixed(2)),
      openStatementsCount: openStatements.length,
      openPayableTotal: Number(openPayableTotal.toFixed(2))
    };
  });

  clearState(): void {
    ++this.bootstrapGeneration;
    this.bootstrapData.set(null);
    this.error.set(null);
    this.successMessage.set(null);
    this.loading.set(false);
  }

  loadBootstrap() {
    const gen = ++this.bootstrapGeneration;
    this.loading.set(true);
    return this.api.getBootstrap().pipe(
      tap((data) => {
        if (gen === this.bootstrapGeneration) {
          this.bootstrapData.set(data);
          this.error.set(null);
        }
      }),
      catchError((err) => {
        if (gen === this.bootstrapGeneration) {
          const msg = err?.error?.error || 'No se pudo sincronizar el estado con el servidor.';
          this.error.set(msg);
        }
        return of(null);
      }),
      finalize(() => {
        if (gen === this.bootstrapGeneration) {
          this.loading.set(false);
        }
      })
    );
  }

  notifySuccess(message: string, durationMs = 5000) {
    this.successMessage.set(message);
    setTimeout(() => {
      if (this.successMessage() === message) {
        this.successMessage.set(null);
      }
    }, durationMs);
  }

  notifyError(message: string, durationMs = 7000) {
    this.error.set(message);
    setTimeout(() => {
      if (this.error() === message) {
        this.error.set(null);
      }
    }, durationMs);
  }

  clearMessages() {
    this.error.set(null);
    this.successMessage.set(null);
  }
}
