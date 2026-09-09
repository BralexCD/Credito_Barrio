import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrentAccountStoreService } from '../../services/current-account-store.service';

@Component({
  selector: 'app-current-account-payments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.css'
})
export class PaymentsComponent {
  protected readonly store = inject(CurrentAccountStoreService);

  getClientName(clientId: string): string {
    const client = this.store.clients().find(c => c.id === clientId);
    return client ? client.name : clientId;
  }
}
