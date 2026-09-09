import {Component, inject, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {IamStore} from '../../../application/iam.store';
import {SignInCommand} from '../../../domain/model/sign-in.command';

/**
 * Sign-in screen: collects email/password and triggers IAM authentication.
 */
@Component({
  selector: 'app-sign-in-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './sign-in-form.html',
  styleUrl: './sign-in-form.css'
})
export class SignInForm {
  private readonly router = inject(Router);
  protected readonly store = inject(IamStore);

  protected readonly hidePassword = signal(true);

  readonly form = new FormGroup({
    email: new FormControl('', {nonNullable: true, validators: [Validators.required, Validators.email]}),
    password: new FormControl('', {nonNullable: true, validators: [Validators.required]})
  });

  togglePasswordVisibility(): void {
    this.hidePassword.update(value => !value);
  }

  performSignIn(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const command = new SignInCommand({
      email: this.form.value.email!,
      password: this.form.value.password!
    });
    this.store.signIn(command, this.router);
  }
}
