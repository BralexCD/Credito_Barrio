import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrentAccountStoreService } from '../../services/current-account-store.service';
import { AuthService } from '../../services/auth.service';
import { Purchase } from '../../models/current-account.models';

@Component({
  selector: 'app-customer-purchases',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customer-purchases.component.html',
  styleUrl: './customer-purchases.component.css'
})
export class CustomerPurchasesComponent {
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(CurrentAccountStoreService);

  protected readonly viewingPurchase = signal<Purchase | null>(null);

  protected readonly myPurchases = computed<Purchase[]>(() => {
    const user = this.auth.currentUser();
    if (!user || !user.clientId) return this.store.purchases();
    return this.store.purchases().filter(p => p.clientId === user.clientId);
  });

  viewSchedule(p: Purchase): void {
    this.viewingPurchase.set(p);
  }

  closeSchedule(): void {
    this.viewingPurchase.set(null);
  }
}
