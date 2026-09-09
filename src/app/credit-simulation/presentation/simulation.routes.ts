import { Routes } from '@angular/router';

const simulationForm = () =>
  import('./views/simulation-form/simulation-form').then((m) => m.SimulationForm);
const simulationList = () =>
  import('./views/simulation-list/simulation-list').then((m) => m.SimulationList);
const simulationDetail = () =>
  import('./views/simulation-detail/simulation-detail').then((m) => m.SimulationDetail);

const baseTitle = 'Compra Inteligente';

/** Routes mounted at `/simulator`: the simulation form. */
export const simulatorRoutes: Routes = [
  { path: '', loadComponent: simulationForm, title: `${baseTitle} - Simulador de Crédito` },
];

/** Routes mounted at `/simulations`: saved simulations list and detail. */
export const simulationsRoutes: Routes = [
  { path: '', loadComponent: simulationList, title: `${baseTitle} - Simulaciones` },
  { path: ':id', loadComponent: simulationDetail, title: `${baseTitle} - Detalle de Simulación` },
];
