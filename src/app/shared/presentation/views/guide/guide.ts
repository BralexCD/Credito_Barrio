import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface GuideStep {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-guide',
  imports: [RouterLink, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './guide.html',
  styleUrl: './guide.css',
})
export class Guide {
  readonly steps: GuideStep[] = [
    {
      icon: 'person_add',
      title: '1. Registra un cliente',
      description:
        'Ingresa los datos básicos del cliente que solicitará la simulación del crédito vehicular.',
    },
    {
      icon: 'directions_car',
      title: '2. Registra o selecciona un vehículo',
      description:
        'Elige el vehículo que será usado para la simulación. El precio y la moneda del vehículo serán la base del cálculo.',
    },
    {
      icon: 'calculate',
      title: '3. Configura la simulación',
      description:
        'Define cuota inicial, plazo, cuota final, tipo de tasa, periodo de tasa, seguros, gastos y moneda de simulación.',
    },
    {
      icon: 'receipt_long',
      title: '4. Revisa el cronograma',
      description:
        'Verifica las cuotas, intereses, seguros, gastos, saldo regular y saldo asociado al cuotón final.',
    },
    {
      icon: 'save',
      title: '5. Guarda la simulación',
      description:
        'Cuando los datos sean correctos, guarda la simulación para consultarla posteriormente desde el módulo de simulaciones.',
    },
    {
      icon: 'table_chart',
      title: '6. Exporta el cronograma',
      description:
        'Desde el detalle de la simulación puedes descargar el cronograma en Excel para revisarlo o compartirlo.',
    },
  ];
}
