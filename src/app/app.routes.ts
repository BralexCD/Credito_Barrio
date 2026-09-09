import { Routes } from '@angular/router';

/**
 * Configuración de rutas raíz de la aplicación activa Crédito Barrio.
 *
 * Los módulos antiguos de simulación vehicular quedan como referencia no enrutada.
 * La aplicación activa reside bajo el contexto `current-account`.
 */
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./current-account/views/login/login.component').then((m) => m.LoginComponent),
    title: 'Crédito Barrio - Iniciar Sesión'
  },
  {
    path: 'current-account',
    loadChildren: () =>
      import('./current-account/current-account.routes').then((m) => m.currentAccountRoutes)
  },
  {
    path: '',
    redirectTo: 'current-account/dashboard',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'current-account/dashboard'
  }
];
