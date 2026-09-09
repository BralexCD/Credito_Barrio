import {Component} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {MatCardModule} from '@angular/material/card';

/**
 * Public landing view.
 */
@Component({
  selector: 'app-home',
  imports: [TranslatePipe, MatCardModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
}
