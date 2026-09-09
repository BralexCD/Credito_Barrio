import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, of } from 'rxjs';
import { UserRole } from '../models/current-account.models';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  if (auth.getToken()) {
    return auth.fetchCurrentUser().pipe(
      map(user => {
        if (user) {
          return true;
        }
        router.navigate(['/login']);
        return false;
      })
    );
  }

  router.navigate(['/login']);
  return false;
};

export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const user = auth.currentUser();
    if (!user) {
      if (auth.getToken()) {
        return auth.fetchCurrentUser().pipe(
          map(u => {
            if (u && allowedRoles.includes(u.role)) {
              return true;
            }
            router.navigate(['/current-account/dashboard']);
            return false;
          })
        );
      }
      router.navigate(['/login']);
      return of(false);
    }

    if (allowedRoles.includes(user.role)) {
      return of(true);
    }

    router.navigate(['/current-account/dashboard']);
    return of(false);
  };
};
