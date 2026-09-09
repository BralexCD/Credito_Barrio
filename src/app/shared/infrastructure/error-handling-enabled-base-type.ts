import {HttpErrorResponse} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';

/**
 * Provides reusable HTTP error translation for infrastructure services.
 *
 * @remarks
 * Subclasses inherit {@link handleError} to convert raw {@link HttpErrorResponse}
 * objects into domain-friendly error messages, keeping error handling consistent
 * across every endpoint client.
 */
export abstract class ErrorHandlingEnabledBaseType {
  /**
   * Creates an operation-specific HTTP error handler.
   *
   * @param operation - Human-readable name of the failed operation.
   * @returns A function that transforms an {@link HttpErrorResponse} into a
   *          failed observable carrying a descriptive {@link Error}.
   */
  protected handleError(operation: string) {
    return (error: HttpErrorResponse): Observable<never> => {
      let errorMessage: string;
      if (error.status === 404) {
        errorMessage = `${operation}: Resource not found`;
      } else if (error.error instanceof ErrorEvent) {
        errorMessage = `${operation}: ${error.error.message}`;
      } else {
        errorMessage = `${operation}: ${error.status || 'Unexpected error'}`;
      }
      return throwError(() => new Error(errorMessage));
    };
  }
}
