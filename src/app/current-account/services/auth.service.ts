import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, shareReplay } from 'rxjs';
import { User, LoginResponse } from '../models/current-account.models';
import { CurrentAccountStoreService } from './current-account-store.service';

const TOKEN_KEY = 'cb_session_token';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly store = inject(CurrentAccountStoreService);

  readonly currentUser = signal<User | null>(null);
  readonly token = signal<string | null>(this.getInitialToken());
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly userRole = computed(() => this.currentUser()?.role ?? null);

  private requestGeneration = 0;
  private inFlightMe$: Observable<User | null> | null = null;

  constructor() {
    if (this.token()) {
      this.fetchCurrentUser().subscribe();
    }
  }

  private getInitialToken(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return this.token();
  }

  login(credentials: { username: string; password: string }): Observable<LoginResponse> {
    const currentGen = ++this.requestGeneration;
    return this.http.post<LoginResponse>('/api/auth/login', credentials).pipe(
      tap((res) => {
        if (currentGen !== this.requestGeneration) return;
        if (res?.token) {
          try {
            sessionStorage.setItem(TOKEN_KEY, res.token);
          } catch (e) {
            console.error('No se pudo guardar en sessionStorage', e);
          }
          this.store.clearState();
          this.token.set(res.token);
          this.currentUser.set(res.user);
          this.store.loadBootstrap().subscribe();
        }
      })
    );
  }

  logout(): void {
    ++this.requestGeneration;
    this.inFlightMe$ = null;
    this.http.post('/api/auth/logout', {}).pipe(
      catchError(() => of({ ok: true }))
    ).subscribe(() => {
      this.clearSession();
      this.router.navigate(['/login']);
    });
  }

  clearSession(): void {
    ++this.requestGeneration;
    this.inFlightMe$ = null;
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {}
    this.token.set(null);
    this.currentUser.set(null);
    this.store.clearState();
  }

  fetchCurrentUser(): Observable<User | null> {
    if (this.inFlightMe$) {
      return this.inFlightMe$;
    }

    const currentGen = ++this.requestGeneration;
    this.inFlightMe$ = this.http.get<User>('/api/auth/me').pipe(
      tap((user) => {
        if (currentGen === this.requestGeneration) {
          this.currentUser.set(user);
          this.store.loadBootstrap().subscribe();
        }
      }),
      catchError(() => {
        if (currentGen === this.requestGeneration) {
          this.clearSession();
        }
        return of(null);
      }),
      shareReplay(1)
    );

    return this.inFlightMe$;
  }

  hasRole(...roles: string[]): boolean {
    const r = this.userRole();
    return !!r && roles.includes(r);
  }
}
