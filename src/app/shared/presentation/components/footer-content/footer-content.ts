import {Component} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';

/**
 * Application footer shown at the bottom of the shell.
 */
@Component({
  selector: 'app-footer-content',
  imports: [TranslatePipe],
  templateUrl: './footer-content.html',
  styleUrl: './footer-content.css'
})
export class FooterContent {
  /** Current year for the copyright line. */
  protected readonly year = new Date().getFullYear();
}
