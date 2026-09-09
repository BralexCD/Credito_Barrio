import {Component, DestroyRef, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {RouterOutlet} from '@angular/router';
import {MatSidenavModule} from '@angular/material/sidenav';
import {BreakpointObserver} from '@angular/cdk/layout';
import {Sidebar} from '../sidebar/sidebar';
import {Header} from '../header/header';
import {FooterContent} from '../footer-content/footer-content';

/** Below this width the sidenav becomes an overlay drawer instead of a permanent rail. */
const MOBILE_QUERY = '(max-width: 820px)';

/**
 * Application shell hosting the sidebar, top bar, routed content and footer.
 */
@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, MatSidenavModule, Sidebar, Header, FooterContent],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class Layout {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  readonly isMobile = signal(this.breakpointObserver.isMatched(MOBILE_QUERY));
  /** Whether the desktop rail is expanded (icon+label) rather than collapsed to icons only. */
  private readonly desktopExpanded = signal(true);
  /** Whether the mobile overlay drawer is currently open. */
  private readonly mobileOpen = signal(false);

  readonly sidenavMode = computed<'side' | 'over'>(() => (this.isMobile() ? 'over' : 'side'));
  readonly sidenavOpened = computed(() => (this.isMobile() ? this.mobileOpen() : true));
  readonly sidebarCollapsed = computed(() => !this.isMobile() && !this.desktopExpanded());

  constructor() {
    this.breakpointObserver
      .observe(MOBILE_QUERY)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(state => {
        this.isMobile.set(state.matches);
        if (!state.matches) {
          this.mobileOpen.set(false);
        }
      });
  }

  /** Toggles the mobile drawer on small screens, or the desktop collapse state otherwise. */
  toggle(): void {
    if (this.isMobile()) {
      this.mobileOpen.update(value => !value);
    } else {
      this.desktopExpanded.update(value => !value);
    }
  }

  /** Closes the mobile drawer after a navigation action; no-op on desktop. */
  closeMobileDrawer(): void {
    if (this.isMobile()) {
      this.mobileOpen.set(false);
    }
  }

  /** Keeps state in sync when Material closes the drawer itself (backdrop click, Escape). */
  onSidenavOpenedChange(isOpen: boolean): void {
    if (this.isMobile()) {
      this.mobileOpen.set(isOpen);
    }
  }
}
