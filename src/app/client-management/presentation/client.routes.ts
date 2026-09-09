import {Routes} from '@angular/router';

const clientList = () => import('./views/client-list/client-list').then(m => m.ClientList);
const clientForm = () => import('./views/client-form/client-form').then(m => m.ClientForm);

const baseTitle = 'Compra Inteligente';

export const clientRoutes: Routes = [
  {path: '', loadComponent: clientList, title: `${baseTitle} - Clientes`},
  {path: 'new', loadComponent: clientForm, title: `${baseTitle} - Nuevo Cliente`},
  {path: ':id/edit', loadComponent: clientForm, title: `${baseTitle} - Editar Cliente`}
];
