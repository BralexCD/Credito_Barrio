import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrentAccountStoreService } from '../../services/current-account-store.service';
import { CurrentAccountApiService } from '../../services/current-account-api.service';
import { Product, CreateProductDto } from '../../models/current-account.models';

@Component({
  selector: 'app-current-account-products',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent {
  protected readonly store = inject(CurrentAccountStoreService);
  private readonly api = inject(CurrentAccountApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly showModal = signal<boolean>(false);
  protected readonly editingProduct = signal<Product | null>(null);
  protected readonly saving = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly productForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    brand: ['', [Validators.required]],
    supplier: ['', [Validators.required]],
    unit: ['und', [Validators.required]],
    imageUrl: [''],
    cashPrice: [0, [Validators.required, Validators.min(0.01)]],
    creditPrice: [0, [Validators.required, Validators.min(0.01)]],
    allowEndOfMonth: [true],
    allowInstallments: [true],
    active: [true]
  });

  openCreate(): void {
    this.editingProduct.set(null);
    this.productForm.reset({
      unit: 'und',
      cashPrice: 10.00,
      creditPrice: 10.00,
      allowEndOfMonth: true,
      allowInstallments: true,
      active: true
    });
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  openEdit(p: Product): void {
    this.editingProduct.set(p);
    this.productForm.patchValue({
      name: p.name,
      description: p.description,
      brand: p.brand,
      supplier: p.supplier,
      unit: p.unit,
      imageUrl: p.imageUrl,
      cashPrice: p.cashPrice,
      creditPrice: p.creditPrice,
      allowEndOfMonth: p.allowEndOfMonth,
      allowInstallments: p.allowInstallments,
      active: p.active
    });
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingProduct.set(null);
    this.errorMessage.set(null);
  }

  saveProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    const formVal = this.productForm.getRawValue();
    if (!formVal.allowEndOfMonth && !formVal.allowInstallments) {
      this.errorMessage.set('Debe habilitar al menos una modalidad de crédito (Fin de mes o Cuotas).');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const dto: CreateProductDto = {
      name: formVal.name!,
      description: formVal.description || '',
      brand: formVal.brand!,
      supplier: formVal.supplier!,
      unit: formVal.unit!,
      imageUrl: formVal.imageUrl || '',
      cashPrice: Number(formVal.cashPrice),
      creditPrice: Number(formVal.creditPrice),
      allowEndOfMonth: Boolean(formVal.allowEndOfMonth),
      allowInstallments: Boolean(formVal.allowInstallments),
      active: Boolean(formVal.active)
    };

    const current = this.editingProduct();

    if (current) {
      this.api.updateProduct(current.id, dto).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.store.notifySuccess(`Producto "${dto.name}" actualizado.`);
          this.store.loadBootstrap().subscribe();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.error || 'Error al actualizar el producto.');
        }
      });
    } else {
      this.api.createProduct(dto).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.store.notifySuccess(`Producto "${dto.name}" agregado al catálogo.`);
          this.store.loadBootstrap().subscribe();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.error || 'Error al registrar el producto.');
        }
      });
    }
  }

  toggleActive(p: Product): void {
    this.api.updateProduct(p.id, { active: !p.active }).subscribe({
      next: () => {
        this.store.notifySuccess(`Producto "${p.name}" ${!p.active ? 'activado' : 'desactivado'}.`);
        this.store.loadBootstrap().subscribe();
      },
      error: (err) => {
        this.store.notifyError(err?.error?.error || 'Error al cambiar estado del producto.');
      }
    });
  }
}
