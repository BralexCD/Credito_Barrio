import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrentAccountStoreService } from '../../services/current-account-store.service';
import { AuditEntry } from '../../models/current-account.models';

@Component({
  selector: 'app-current-account-audit',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.css'
})
export class AuditComponent {
  protected readonly store = inject(CurrentAccountStoreService);
  protected readonly searchTerm = signal<string>('');

  protected readonly filteredAudit = computed<AuditEntry[]>(() => {
    const list = this.store.audit();
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      a =>
        a.action.toLowerCase().includes(term) ||
        a.actorId.toLowerCase().includes(term) ||
        a.entityId.toLowerCase().includes(term)
    );
  });
}
