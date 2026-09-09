import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CurrentAccountStoreService } from '../../services/current-account-store.service';
import { Client, Statement } from '../../models/current-account.models';

@Component({
  selector: 'app-current-account-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(CurrentAccountStoreService);

  // Cliente si el rol es CUSTOMER
  protected readonly currentClient = computed<Client | null>(() => {
    const user = this.auth.currentUser();
    if (!user || user.role !== 'CUSTOMER' || !user.clientId) {
      return null;
    }
    return this.store.clients().find(c => c.id === user.clientId) ?? null;
  });

  // Estados pendientes para el cliente
  protected readonly customerOpenStatements = computed<Statement[]>(() => {
    const user = this.auth.currentUser();
    if (!user || user.role !== 'CUSTOMER' || !user.clientId) {
      return [];
    }
    return this.store.statements().filter(s => s.clientId === user.clientId && s.status === 'OPEN');
  });

  // Estadísticas del cliente
  protected readonly clientCreditUsagePct = computed<number>(() => {
    const client = this.currentClient();
    if (!client || !client.creditLimit || client.creditLimit <= 0) return 0;
    const used = client.outstandingCapital ?? 0;
    return Math.min(100, Math.round((used / client.creditLimit) * 100));
  });

  // Métricas de plataforma
  protected readonly platformMetrics = computed(() => {
    const stores = this.store.stores();
    const audit = this.store.audit();
    return {
      totalStores: stores.length,
      activeStores: stores.filter(s => s.active).length,
      inactiveStores: stores.filter(s => !s.active).length,
      totalAuditEntries: audit.length
    };
  });
}
