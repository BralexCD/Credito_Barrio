import {Component, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';

/**
 * Fallback view rendered for unknown routes.
 */
@Component({
  selector: 'app-page-not-found',
  imports: [RouterLink, TranslatePipe, MatButtonModule, MatIconModule],
  templateUrl: './page-not-found.html',
  styleUrl: './page-not-found.css'
})
export class PageNotFound {
  /** The path the user tried to reach. */
  readonly invalidPath = signal(window.location.pathname);
}
