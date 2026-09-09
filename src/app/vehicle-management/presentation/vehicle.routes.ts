import {Routes} from '@angular/router';

const vehicleList = () => import('./views/vehicle-list/vehicle-list').then(m => m.VehicleList);
const vehicleDetail = () => import('./views/vehicle-detail/vehicle-detail').then(m => m.VehicleDetail);
const vehicleForm = () => import('./views/vehicle-form/vehicle-form').then(m => m.VehicleForm);

const baseTitle = 'Compra Inteligente';

export const vehicleRoutes: Routes = [
  {path: '', loadComponent: vehicleList, title: `${baseTitle} - Vehículos`},
  {path: 'new', loadComponent: vehicleForm, title: `${baseTitle} - Nuevo Vehículo`},
  {path: ':id/edit', loadComponent: vehicleForm, title: `${baseTitle} - Editar Vehículo`},
  {path: ':id', loadComponent: vehicleDetail, title: `${baseTitle} - Vehículo`}
];
