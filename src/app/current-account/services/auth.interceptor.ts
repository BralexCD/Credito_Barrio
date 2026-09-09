import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

const TOKEN_KEY = 'cb_session_token';

/**
 * Interceptor de autenticación Bearer para rutas /api.
 * Lee el token directamente de sessionStorage para evitar dependencias
 * circulares entre AuthService y HttpClient durante la inicialización
 * y recarga completa de la página (page.reload).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  let token: string | null = null;
  try {
    token = sessionStorage.getItem(TOKEN_KEY);
  } catch {}

  let authReq = req;
  if (token && req.url.startsWith('/api') && !req.url.includes('/api/auth/login')) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/api/auth/login')) {
        try {
          sessionStorage.removeItem(TOKEN_KEY);
        } catch {}
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
