import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { CurrentAccountStoreService } from '../../services/current-account-store.service';

@Component({
  selector: 'app-current-account-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css'
})
export class ShellComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(CurrentAccountStoreService);
  private readonly router = inject(Router);

  protected readonly mobileMenuOpen = signal<boolean>(false);

  ngOnInit(): void {
    this.store.loadBootstrap().subscribe();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  refreshData(): void {
    this.store.loadBootstrap().subscribe();
  }

  logout(): void {
    this.auth.logout();
  }

  getRoleLabel(role?: string | null): string {
    switch (role) {
      case 'PLATFORM_ADMIN':
        return 'Admin Plataforma';
      case 'STORE_ADMIN':
        return 'Comercio Administrador';
      case 'CUSTOMER':
        return 'Cliente Titular';
      default:
        return 'Usuario';
    }
  }
}
