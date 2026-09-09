import {Component, inject} from '@angular/core';
import { IamStore } from '../../../../iam/application/iam.store';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatIconModule} from '@angular/material/icon';
import {Client} from '../../../domain/model/client.entity';
import {ClientStore} from '../../../application/client.store';

/**
 * Create/edit screen for a Client. Route param `id` switches the form to edit mode.
 */
@Component({
  selector: 'app-client-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './client-form.html',
  styleUrl: './client-form.css',
})
export class ClientForm {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly store = inject(ClientStore);

  private readonly iamStore = inject(IamStore);
  protected clientId: string | null = null;
  protected isEdit = false;

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    dni: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{8}$/)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{9}$/)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    address: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.clientId = id;
      this.isEdit = true;
      const client = this.store.getClientById(id)();
      if (client) {
        this.form.patchValue({
          name: client.name,
          lastName: client.lastName,
          dni: client.dni,
          phone: client.phone,
          email: client.email,
          address: client.address,
        });
      }
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const currentUser = this.iamStore.currentUser();

    if (!currentUser) {
      return;
    }

    const value = this.form.getRawValue();
    const previous = this.clientId ? this.store.getClientById(this.clientId)() : undefined;

    const client = new Client({
      id: this.clientId ?? '',
      userId: previous?.userId ?? currentUser.id,
      name: value.name,
      lastName: value.lastName,
      dni: value.dni,
      phone: value.phone,
      email: value.email,
      address: value.address,
      registrationDate: previous?.registrationDate ?? new Date().toISOString(),
    });

    if (this.isEdit) {
      this.store.updateClient(client);
    } else {
      this.store.addClient(client);
    }

    this.router.navigate(['/clients']);
  }
}
