import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { authInterceptor } from './current-account/services/auth.interceptor';

/**
 * Configuración raíz de la aplicación.
 *
 * Utiliza HttpClient con el interceptor de autorización Bearer para /api,
 * el enrutador con el contexto activo de Cuenta Corriente,
 * y sin dependencias de Supabase ni interceptores antiguos.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideTranslateService({
      loader: provideTranslateHttpLoader({ prefix: './i18n/', suffix: '.json' }),
      fallbackLang: 'es'
    }),
    provideRouter(routes)
  ]
};
