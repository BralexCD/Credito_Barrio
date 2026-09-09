import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrentAccountStoreService } from '../../services/current-account-store.service';
import { CurrentAccountApiService } from '../../services/current-account-api.service';
import {
  Purchase,
  PurchasePreviewRequest,
  PurchasePreviewResponse,
  Client,
  Product
} from '../../models/current-account.models';

@Component({
  selector: 'app-current-account-purchases',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './purchases.component.html',
  styleUrl: './purchases.component.css'
})
export class PurchasesComponent {
  protected readonly store = inject(CurrentAccountStoreService);
  private readonly api = inject(CurrentAccountApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly previewLoading = signal<boolean>(false);
  protected readonly saving = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly previewData = signal<PurchasePreviewResponse | null>(null);
  protected readonly viewingPurchase = signal<Purchase | null>(null);

  protected readonly purchaseForm = this.fb.group({
    clientId: ['', [Validators.required]],
    productId: ['', [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(0.001)]],
    mode: ['END_OF_MONTH', [Validators.required]],
    months: [1, [Validators.required, Validators.min(1), Validators.max(60)]],
    purchasedAt: [this.getDefaultLocalDateTime(), [Validators.required]]
  });

  // Clientes activos
  protected readonly activeClients = computed(() =>
    this.store.clients().filter(c => c.active)
  );

  // Productos activos
  protected readonly activeProducts = computed(() =>
    this.store.products().filter(p => p.active)
  );

  // Cliente seleccionado
  protected readonly selectedClient = computed<Client | null>(() => {
    const id = this.purchaseForm.get('clientId')?.value;
    return this.store.clients().find(c => c.id === id) ?? null;
  });

  // Producto seleccionado
  protected readonly selectedProduct = computed<Product | null>(() => {
    const id = this.purchaseForm.get('productId')?.value;
    return this.store.products().find(p => p.id === id) ?? null;
  });

  protected readonly clientMaxMonths = computed(() => this.selectedClient()?.maxMonths ?? 12);
  protected readonly clientCurrency = computed(() => this.selectedClient()?.currency ?? 'PEN');
  protected readonly productAllowsEndOfMonth = computed(() => this.selectedProduct()?.allowEndOfMonth ?? true);
  protected readonly productAllowsInstallments = computed(() => this.selectedProduct()?.allowInstallments ?? true);

  private getDefaultLocalDateTime(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  setCurrentDateTime(): void {
    this.purchaseForm.patchValue({
      purchasedAt: this.getDefaultLocalDateTime()
    });
  }

  onClientChange(): void {
    this.previewData.set(null);
    this.errorMessage.set(null);
    const client = this.selectedClient();
    if (client) {
      const currentMonths = this.purchaseForm.get('months')?.value ?? 1;
      if (currentMonths > client.maxMonths) {
        this.purchaseForm.patchValue({ months: client.maxMonths });
      }
    }
  }

  onProductChange(): void {
    this.previewData.set(null);
    this.errorMessage.set(null);
    const product = this.selectedProduct();
    if (product) {
      if (!product.allowEndOfMonth && product.allowInstallments) {
        this.purchaseForm.patchValue({ mode: 'INSTALLMENTS', months: 3 });
      } else if (product.allowEndOfMonth && !product.allowInstallments) {
        this.purchaseForm.patchValue({ mode: 'END_OF_MONTH', months: 1 });
      }
    }
  }

  onModeChange(): void {
    this.previewData.set(null);
    const mode = this.purchaseForm.get('mode')?.value;
    if (mode === 'END_OF_MONTH') {
      this.purchaseForm.patchValue({ months: 1 });
    } else {
      const client = this.selectedClient();
      const defaultMonths = Math.min(3, client?.maxMonths ?? 3);
      this.purchaseForm.patchValue({ months: defaultMonths });
    }
  }

  calculatePreview(): void {
    if (this.purchaseForm.invalid) {
      this.purchaseForm.markAllAsTouched();
      return;
    }

    const formVal = this.purchaseForm.getRawValue();
    const dto: PurchasePreviewRequest = {
      clientId: formVal.clientId!,
      productId: formVal.productId!,
      quantity: Number(formVal.quantity),
      mode: formVal.mode as any,
      months: formVal.mode === 'END_OF_MONTH' ? 1 : Number(formVal.months),
      purchasedAt: formVal.purchasedAt!
    };

    this.previewLoading.set(true);
    this.errorMessage.set(null);

    this.api.previewPurchase(dto).subscribe({
      next: (res) => {
        this.previewLoading.set(false);
        this.previewData.set(res);
      },
      error: (err) => {
        this.previewLoading.set(false);
        this.previewData.set(null);
        this.errorMessage.set(err?.error?.error || 'Error al calcular la vista previa del financiamiento.');
      }
    });
  }

  confirmPurchase(): void {
    if (this.purchaseForm.invalid) {
      this.purchaseForm.markAllAsTouched();
      return;
    }

    const formVal = this.purchaseForm.getRawValue();
    const dto: PurchasePreviewRequest = {
      clientId: formVal.clientId!,
      productId: formVal.productId!,
      quantity: Number(formVal.quantity),
      mode: formVal.mode as any,
      months: formVal.mode === 'END_OF_MONTH' ? 1 : Number(formVal.months),
      purchasedAt: formVal.purchasedAt!
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    this.api.createPurchase(dto).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.previewData.set(null);
        this.store.notifySuccess(`Venta a crédito de "${res.productName}" registrada con éxito.`);
        this.purchaseForm.patchValue({
          quantity: 1,
          purchasedAt: this.getDefaultLocalDateTime()
        });
        this.store.loadBootstrap().subscribe();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.error || 'No se pudo confirmar la compra en el servidor.');
      }
    });
  }

  viewSchedule(p: Purchase): void {
    this.viewingPurchase.set(p);
  }

  closeViewSchedule(): void {
    this.viewingPurchase.set(null);
  }
}
