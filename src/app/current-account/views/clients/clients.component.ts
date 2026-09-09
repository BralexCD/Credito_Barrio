import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrentAccountStoreService } from '../../services/current-account-store.service';
import { CurrentAccountApiService } from '../../services/current-account-api.service';
import { Client, CreateClientDto, UpdateClientDto } from '../../models/current-account.models';

@Component({
  selector: 'app-current-account-clients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.css'
})
export class ClientsComponent {
  protected readonly store = inject(CurrentAccountStoreService);
  private readonly api = inject(CurrentAccountApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly showModal = signal<boolean>(false);
  protected readonly editingClient = signal<Client | null>(null);
  protected readonly saving = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly clientForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    document: ['', [Validators.required, Validators.pattern(/^[0-9A-Za-z-]{8,15}$/)]],
    phone: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    address: ['', [Validators.required]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    currency: ['PEN', [Validators.required]],
    creditLimit: [1000, [Validators.required, Validators.min(10)]],
    maxMonths: [12, [Validators.required, Validators.min(1), Validators.max(60)]],
    cutoffDay: [20, [Validators.required, Validators.min(1), Validators.max(28)]],
    cutoffTime: ['18:00', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
    paymentDay: [26, [Validators.required, Validators.min(1), Validators.max(28)]],
    rateType: ['EFFECTIVE', [Validators.required]],
    annualRate: [24.5, [Validators.required, Validators.min(0)]],
    capitalizationDays: [30, [Validators.required]],
    lateRateType: ['EFFECTIVE', [Validators.required]],
    lateAnnualRate: [36.0, [Validators.required, Validators.min(0)]],
    lateCapitalizationDays: [30, [Validators.required]],
    active: [true]
  });

  protected readonly hasPurchaseHistory = signal<boolean>(false);

  openCreate(): void {
    this.editingClient.set(null);
    this.hasPurchaseHistory.set(false);
    this.clientForm.reset({
      name: '',
      document: '',
      phone: '',
      email: '',
      address: '',
      username: '',
      password: 'Barrio2026!',
      currency: 'PEN',
      creditLimit: 1000,
      maxMonths: 12,
      cutoffDay: 20,
      cutoffTime: '18:00',
      paymentDay: 26,
      rateType: 'EFFECTIVE',
      annualRate: 24.5,
      capitalizationDays: 30,
      lateRateType: 'EFFECTIVE',
      lateAnnualRate: 36.0,
      lateCapitalizationDays: 30,
      active: true
    });
    this.clientForm.get('username')?.enable();
    this.clientForm.get('password')?.enable();
    this.clientForm.get('currency')?.enable();
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  openEdit(c: Client): void {
    this.editingClient.set(c);
    const hasPurchases = (c.outstandingCapital ?? 0) > 0 || this.store.purchases().some(p => p.clientId === c.id);
    this.hasPurchaseHistory.set(hasPurchases);

    this.clientForm.patchValue({
      name: c.name,
      document: c.document,
      phone: c.phone,
      email: c.email,
      address: c.address,
      username: c.username,
      currency: c.currency,
      creditLimit: c.creditLimit,
      maxMonths: c.maxMonths,
      cutoffDay: c.cutoffDay,
      cutoffTime: c.cutoffTime,
      paymentDay: c.paymentDay,
      rateType: c.rateType,
      annualRate: c.annualRate,
      capitalizationDays: c.capitalizationDays,
      lateRateType: c.lateRateType,
      lateAnnualRate: c.lateAnnualRate,
      lateCapitalizationDays: c.lateCapitalizationDays,
      active: c.active
    });

    if (hasPurchases) {
      this.clientForm.get('currency')?.disable();
    } else {
      this.clientForm.get('currency')?.enable();
    }

    // Username y password no se editan via PATCH
    this.clientForm.get('username')?.disable();
    this.clientForm.get('password')?.disable();
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingClient.set(null);
    this.errorMessage.set(null);
  }

  saveClient(): void {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    const formVal = this.clientForm.getRawValue();
    const current = this.editingClient();

    // Regla de negocio: El límite nunca puede reducirse por debajo de la exposición vigente
    if (current && (current.outstandingCapital ?? 0) > Number(formVal.creditLimit)) {
      this.errorMessage.set(
        `El nuevo límite (${formVal.currency} ${formVal.creditLimit}) no puede ser menor a la exposición o capital vigente (${formVal.currency} ${current.outstandingCapital}).`
      );
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    if (current) {
      const dto: UpdateClientDto = {
        name: formVal.name!,
        document: formVal.document!,
        phone: formVal.phone!,
        email: formVal.email!,
        address: formVal.address!,
        currency: formVal.currency as any,
        creditLimit: Number(formVal.creditLimit),
        maxMonths: Number(formVal.maxMonths),
        cutoffDay: Number(formVal.cutoffDay),
        cutoffTime: formVal.cutoffTime!,
        paymentDay: Number(formVal.paymentDay),
        rateType: formVal.rateType as any,
        annualRate: Number(formVal.annualRate),
        capitalizationDays: Number(formVal.capitalizationDays),
        lateRateType: formVal.lateRateType as any,
        lateAnnualRate: Number(formVal.lateAnnualRate),
        lateCapitalizationDays: Number(formVal.lateCapitalizationDays),
        active: Boolean(formVal.active)
      };

      this.api.updateClient(current.id, dto).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.store.notifySuccess(`Cuenta del cliente "${dto.name}" actualizada.`);
          this.store.loadBootstrap().subscribe();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.error || 'Error al actualizar la cuenta del cliente.');
        }
      });
    } else {
      const dto: CreateClientDto = {
        name: formVal.name!,
        document: formVal.document!,
        phone: formVal.phone!,
        email: formVal.email!,
        address: formVal.address!,
        username: formVal.username!,
        password: formVal.password!,
        currency: formVal.currency as any,
        creditLimit: Number(formVal.creditLimit),
        maxMonths: Number(formVal.maxMonths),
        cutoffDay: Number(formVal.cutoffDay),
        cutoffTime: formVal.cutoffTime!,
        paymentDay: Number(formVal.paymentDay),
        rateType: formVal.rateType as any,
        annualRate: Number(formVal.annualRate),
        capitalizationDays: Number(formVal.capitalizationDays),
        lateRateType: formVal.lateRateType as any,
        lateAnnualRate: Number(formVal.lateAnnualRate),
        lateCapitalizationDays: Number(formVal.lateCapitalizationDays),
        active: Boolean(formVal.active)
      };

      this.api.createClient(dto).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.store.notifySuccess(`Cuenta de cliente creada para "${dto.name}".`);
          this.store.loadBootstrap().subscribe();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.error || 'Error al dar de alta la cuenta del cliente.');
        }
      });
    }
  }

  toggleActive(c: Client): void {
    const nextState = !c.active;
    const dto: UpdateClientDto = {
      name: c.name,
      document: c.document,
      phone: c.phone,
      email: c.email,
      address: c.address,
      currency: c.currency,
      creditLimit: c.creditLimit,
      maxMonths: c.maxMonths,
      cutoffDay: c.cutoffDay,
      cutoffTime: c.cutoffTime,
      paymentDay: c.paymentDay,
      rateType: c.rateType,
      annualRate: c.annualRate,
      capitalizationDays: c.capitalizationDays,
      lateRateType: c.lateRateType,
      lateAnnualRate: c.lateAnnualRate,
      lateCapitalizationDays: c.lateCapitalizationDays,
      active: nextState
    };

    this.api.updateClient(c.id, dto).subscribe({
      next: () => {
        this.store.notifySuccess(`Cliente "${c.name}" ${nextState ? 'activado' : 'desactivado'}.`);
        this.store.loadBootstrap().subscribe();
      },
      error: (err) => {
        this.store.notifyError(err?.error?.error || 'No se pudo cambiar el estado del cliente.');
      }
    });
  }
}
