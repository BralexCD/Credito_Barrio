import {Component, EventEmitter, Input, inject, Output, signal} from '@angular/core';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {MatListModule} from '@angular/material/list';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatTooltipModule} from '@angular/material/tooltip';
import {IamStore} from '../../../../iam/application/iam.store';

interface NavOption {
  link: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  host: { '[class.collapsed]': 'collapsed' },
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  /** Whether the desktop rail is collapsed to icon-only mode. */
  @Input() collapsed = false;
  @Output() readonly menuToggle = new EventEmitter<void>();
  /** Emitted whenever a navigation action is taken, so the host can close a mobile drawer. */
  @Output() readonly navigate = new EventEmitter<void>();
  private readonly router = inject(Router);
  protected readonly iamStore = inject(IamStore);

  readonly options = signal<NavOption[]>([
    { link: '/dashboard', label: 'sidebar.dashboard', icon: 'dashboard' },
    { link: '/clients', label: 'sidebar.clients', icon: 'groups' },
    { link: '/vehicles', label: 'sidebar.vehicles', icon: 'directions_car' },
    { link: '/simulator', label: 'sidebar.simulator', icon: 'calculate' },
    { link: '/simulations', label: 'sidebar.simulations', icon: 'insert_chart' },
    { link: '/help', label: 'sidebar.help', icon: 'help_outline' },
    { link: '/guide', label: 'sidebar.guide', icon: 'menu_book' },
  ]);

  performSignOut(): void {
    this.iamStore.signOut(this.router);
  }
}
