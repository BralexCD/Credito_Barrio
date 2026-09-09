import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

type HelpCard = 'faq' | 'contact' | 'guide';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-help',
  imports: [RouterLink, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './help.html',
  styleUrl: './help.css',
})
export class Help {
  readonly activeCard = signal<HelpCard | null>(null);

  readonly faqItems: FaqItem[] = [
    {
      question: '¿Qué es Compra Inteligente?',
      answer:
        'Es una herramienta para simular créditos vehiculares con cuota inicial, cuota regular, seguros, gastos asociados y cuota final.',
    },
    {
      question: '¿Qué significa el cuotón final?',
      answer:
        'Es un pago final pactado al cierre del cronograma. En la simulación se calcula como un porcentaje del precio del vehículo.',
    },
    {
      question: '¿Puedo cambiar la moneda de la simulación?',
      answer:
        'Sí. Puedes simular en PEN o USD usando un tipo de cambio manual definido en el formulario.',
    },
    {
      question: '¿Puedo descargar el cronograma?',
      answer:
        'Sí. Desde el detalle de una simulación puedes exportar el cronograma de pagos en formato Excel.',
    },
  ];

  readonly whatsappUrl = 'https://web.whatsapp.com';

  toggleCard(card: HelpCard): void {
    this.activeCard.update((current) => (current === card ? null : card));
  }

  isOpen(card: HelpCard): boolean {
    return this.activeCard() === card;
  }
}
