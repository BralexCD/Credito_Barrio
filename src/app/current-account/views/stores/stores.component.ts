import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrentAccountStoreService } from '../../services/current-account-store.service';
import { CurrentAccountApiService } from '../../services/current-account-api.service';
import { Store, CreateStoreDto, UpdateStoreDto } from '../../models/current-account.models';

@Component({
  selector: 'app-current-account-stores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './stores.component.html',
  styleUrl: './stores.component.css'
})
export class StoresComponent {
  protected readonly store = inject(CurrentAccountStoreService);
  private readonly api = inject(CurrentAccountApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly showCreateModal = signal<boolean>(false);
  protected readonly editingStore = signal<Store | null>(null);
  protected readonly saving = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly createForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    businessType: ['', [Validators.required]],
    address: ['', [Validators.required]],
    taxId: ['', [Validators.required, Validators.pattern(/^[0-9]{8,11}$/)]],
    adminName: ['', [Validators.required]],
    adminUsername: ['', [Validators.required, Validators.minLength(3)]],
    adminPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  protected readonly editForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    businessType: ['', [Validators.required]],
    address: ['', [Validators.required]],
    taxId: ['', [Validators.required]],
    active: [true]
  });

  openCreate(): void {
    this.createForm.reset({
      businessType: 'Bodega de Abarrotes',
      adminPassword: 'Barrio2026!'
    });
    this.errorMessage.set(null);
    this.showCreateModal.set(true);
  }

  closeCreate(): void {
    this.showCreateModal.set(false);
    this.errorMessage.set(null);
  }

  openEdit(s: Store): void {
    this.editingStore.set(s);
    this.editForm.patchValue({
      name: s.name,
      businessType: s.businessType,
      address: s.address,
      taxId: s.taxId,
      active: s.active
    });
    this.errorMessage.set(null);
  }

  closeEdit(): void {
    this.editingStore.set(null);
    this.errorMessage.set(null);
  }

  saveCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const dto = this.createForm.getRawValue() as CreateStoreDto;

    this.api.createStore(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeCreate();
        this.store.notifySuccess(`Tienda "${dto.name}" creada exitosamente con su administrador.`);
        this.store.loadBootstrap().subscribe();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.error || 'No se pudo crear la tienda en el servidor.');
      }
    });
  }

  saveEdit(): void {
    const s = this.editingStore();
    if (!s || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const dto = this.editForm.getRawValue() as UpdateStoreDto;

    this.api.updateStore(s.id, dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeEdit();
        this.store.notifySuccess(`Tienda "${s.name}" actualizada con éxito.`);
        this.store.loadBootstrap().subscribe();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.error || 'Error al actualizar la tienda en el servidor.');
      }
    });
  }

  toggleActive(s: Store): void {
    this.saving.set(true);
    this.api.updateStore(s.id, { active: !s.active }).subscribe({
      next: () => {
        this.saving.set(false);
        this.store.notifySuccess(`Estado de "${s.name}" cambiado a ${!s.active ? 'Activo' : 'Inactivo'}.`);
        this.store.loadBootstrap().subscribe();
      },
      error: (err) => {
        this.saving.set(false);
        this.store.notifyError(err?.error?.error || 'No se pudo cambiar el estado de la tienda.');
      }
    });
  }
}
