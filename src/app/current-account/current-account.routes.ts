import { Routes } from '@angular/router';
import { ShellComponent } from './components/shell/shell.component';
import { authGuard, roleGuard } from './guards/auth.guard';

export const currentAccountRoutes: Routes = [
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./views/dashboard/dashboard.component').then(m => m.DashboardComponent),
        title: 'Crédito Barrio - Tablero'
      },
      {
        path: 'stores',
        loadComponent: () => import('./views/stores/stores.component').then(m => m.StoresComponent),
        canActivate: [roleGuard(['PLATFORM_ADMIN'])],
        title: 'Crédito Barrio - Tiendas'
      },
      {
        path: 'products',
        loadComponent: () => import('./views/products/products.component').then(m => m.ProductsComponent),
        canActivate: [roleGuard(['STORE_ADMIN'])],
        title: 'Crédito Barrio - Catálogo'
      },
      {
        path: 'clients',
        loadComponent: () => import('./views/clients/clients.component').then(m => m.ClientsComponent),
        canActivate: [roleGuard(['STORE_ADMIN'])],
        title: 'Crédito Barrio - Clientes'
      },
      {
        path: 'purchases',
        loadComponent: () => import('./views/purchases/purchases.component').then(m => m.PurchasesComponent),
        canActivate: [roleGuard(['STORE_ADMIN'])],
        title: 'Crédito Barrio - Ventas a Crédito'
      },
      {
        path: 'statements',
        loadComponent: () => import('./views/statements/statements.component').then(m => m.StatementsComponent),
        canActivate: [roleGuard(['STORE_ADMIN'])],
        title: 'Crédito Barrio - Estados de Cuenta'
      },
      {
        path: 'payments',
        loadComponent: () => import('./views/payments/payments.component').then(m => m.PaymentsComponent),
        canActivate: [roleGuard(['STORE_ADMIN'])],
        title: 'Crédito Barrio - Historial de Pagos'
      },
      {
        path: 'my-statements',
        loadComponent: () => import('./views/customer-statements/customer-statements.component').then(m => m.CustomerStatementsComponent),
        canActivate: [roleGuard(['CUSTOMER'])],
        title: 'Crédito Barrio - Mis Estados de Cuenta'
      },
      {
        path: 'my-purchases',
        loadComponent: () => import('./views/customer-purchases/customer-purchases.component').then(m => m.CustomerPurchasesComponent),
        canActivate: [roleGuard(['CUSTOMER'])],
        title: 'Crédito Barrio - Mis Compras'
      },
      {
        path: 'catalog',
        loadComponent: () => import('./views/customer-catalog/customer-catalog.component').then(m => m.CustomerCatalogComponent),
        canActivate: [roleGuard(['CUSTOMER'])],
        title: 'Crédito Barrio - Catálogo de Productos'
      },
      {
        path: 'audit',
        loadComponent: () => import('./views/audit/audit.component').then(m => m.AuditComponent),
        canActivate: [roleGuard(['PLATFORM_ADMIN'])],
        title: 'Crédito Barrio - Registro de Auditoría'
      },
      {
        path: 'help',
        loadComponent: () => import('./views/help/help.component').then(m => m.HelpComponent),
        title: 'Crédito Barrio - Reglas Financieras'
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
