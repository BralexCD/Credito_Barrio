import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrentAccountStoreService } from '../../services/current-account-store.service';

@Component({
  selector: 'app-customer-catalog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customer-catalog.component.html',
  styleUrl: './customer-catalog.component.css'
})
export class CustomerCatalogComponent {
  protected readonly store = inject(CurrentAccountStoreService);
}
