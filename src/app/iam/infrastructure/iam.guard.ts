import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {IamStore} from '../application/iam.store';

/**
 * Protects routes that require an authenticated session.
 *
 * @remarks
 * Redirects unauthenticated users to `/iam/sign-in`. Applied to the shell
 * route ({@link Layout}) so every page behind it requires sign-in.
 */
export const iamGuard: CanActivateFn = () => {
  const store = inject(IamStore);
  const router = inject(Router);

  if (store.isSignedIn()) {
    return true;
  }

  router.navigate(['/iam/sign-in']).then();
  return false;
};
