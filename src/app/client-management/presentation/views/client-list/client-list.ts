import {AfterViewChecked, Component, computed, inject, ViewChild} from '@angular/core';
import {Router} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import {MatIconModule} from '@angular/material/icon';
import {MatPaginator, MatPaginatorModule} from '@angular/material/paginator';
import {MatSort, MatSortModule} from '@angular/material/sort';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {TranslatePipe} from '@ngx-translate/core';
import {ClientStore} from '../../../application/client.store';

/**
 * Displays the registered clients with table actions.
 */
@Component({
  selector: 'app-client-list',
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    TranslatePipe
  ],
  templateUrl: './client-list.html',
  styleUrl: './client-list.css'
})
export class ClientList implements AfterViewChecked {
  protected readonly store = inject(ClientStore);
  private readonly router = inject(Router);

  readonly displayedColumns = ['name', 'dni', 'email', 'phone', 'address', 'actions'];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  readonly dataSource = computed(() => {
    const source = new MatTableDataSource(this.store.clients());
    source.sort = this.sort;
    source.paginator = this.paginator;
    return source;
  });

  ngAfterViewChecked(): void {
    if (this.dataSource().paginator !== this.paginator) {
      this.dataSource().paginator = this.paginator;
    }
    if (this.dataSource().sort !== this.sort) {
      this.dataSource().sort = this.sort;
    }
  }

  navigateToNew(): void {
    this.router.navigate(['/clients/new']);
  }

  editClient(id: string): void {
    this.router.navigate(['/clients', id, 'edit']);
  }

  deleteClient(id: string): void {
    this.store.deleteClient(id);
  }
}
