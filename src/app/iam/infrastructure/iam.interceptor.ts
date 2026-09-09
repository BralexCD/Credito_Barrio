import {inject} from '@angular/core';
import {HttpInterceptorFn} from '@angular/common/http';
import {IamStore} from '../application/iam.store';

/**
 * Attaches the session token (if any) to outgoing requests as a Bearer token.
 *
 * @remarks
 * The token is a mock value (see {@link IamStore.signIn}); json-server does
 * not validate it. The interceptor exists so the request pipeline matches a
 * real backend's auth flow, easing a future swap to a real API.
 */
export const iamInterceptor: HttpInterceptorFn = (request, next) => {
  const store = inject(IamStore);
  const token = store.currentToken();

  const handledRequest = token
    ? request.clone({headers: request.headers.set('Authorization', `Bearer ${token}`)})
    : request;

  return next(handledRequest);
};
