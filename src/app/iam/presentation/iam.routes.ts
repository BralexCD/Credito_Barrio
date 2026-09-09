import { Routes } from '@angular/router';

const signInForm = () => import('./views/sign-in-form/sign-in-form').then((m) => m.SignInForm);
const signUpForm = () => import('./views/sign-up-form/sign-up-form').then((m) => m.SignUpForm);
const forgotPasswordForm = () =>
  import('./views/forgot-password-form/forgot-password-form').then((m) => m.ForgotPasswordForm);

const baseTitle = 'Compra Inteligente';

export const iamRoutes: Routes = [
  { path: 'sign-in', loadComponent: signInForm, title: `${baseTitle} - Ingresar` },
  { path: 'sign-up', loadComponent: signUpForm, title: `${baseTitle} - Crear cuenta` },
  {
    path: 'forgot-password',
    loadComponent: forgotPasswordForm,
    title: `${baseTitle} - Cambiar contraseña`,
  },
  { path: '', redirectTo: 'sign-in', pathMatch: 'full' },
];
