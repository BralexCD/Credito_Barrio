import {Component} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {MatCardModule} from '@angular/material/card';

/**
 * Static "About" view describing the project.
 */
@Component({
  selector: 'app-about',
  imports: [TranslatePipe, MatCardModule],
  templateUrl: './about.html',
  styleUrl: './about.css'
})
export class About {
}
