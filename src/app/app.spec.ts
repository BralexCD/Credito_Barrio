import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { App } from './app';
import { AuthService } from './current-account/services/auth.service';
import { CurrentAccountStoreService } from './current-account/services/current-account-store.service';
import { BootstrapData, User } from './current-account/models/current-account.models';
import { LoginComponent } from './current-account/views/login/login.component';
import { HelpComponent } from './current-account/views/help/help.component';
import { StatementsComponent } from './current-account/views/statements/statements.component';

describe('Crédito Barrio — Pruebas Unitarias de Aplicación', () => {
  let mockTranslate: { addLangs: (langs: string[]) => void; use: (lang: string) => void };

  beforeEach(() => {
    mockTranslate = {
      addLangs: () => {},
      use: () => {}
    };

    TestBed.configureTestingModule({
      imports: [App, LoginComponent, HelpComponent, StatementsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: TranslateService, useValue: mockTranslate }
      ]
    });
  });

  it('1. debe inicializar el componente raíz App', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  describe('AuthService y Manejo de Sesión', () => {
    it('2. debe gestionar el token en sessionStorage sin almacenar contraseñas en texto plano', () => {
      const auth = TestBed.inject(AuthService);
      const httpTesting = TestBed.inject(HttpTestingController);

      const mockUser: User = {
        id: 'user-1',
        username: 'bodega',
        name: 'Bodega Don Lucho',
        role: 'STORE_ADMIN',
        storeId: 'store-1',
        clientId: null
      };

      auth.login({ username: 'bodega', password: 'SecretPassword123' }).subscribe((res) => {
        expect(res.token).toBe('test-token-jwt');
        expect(sessionStorage.getItem('cb_session_token')).toBe('test-token-jwt');
        expect(sessionStorage.getItem('password')).toBeNull();
        expect(sessionStorage.getItem('SecretPassword123')).toBeNull();
      });

      const req = httpTesting.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      req.flush({ token: 'test-token-jwt', user: mockUser });

      // Verificar que intenta cargar el bootstrap tras login exitoso
      const bootReq = httpTesting.expectOne('/api/bootstrap');
      bootReq.flush({ user: mockUser, stores: [], products: [], clients: [], purchases: [], statements: [], payments: [], audit: [] });

      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.userRole()).toBe('STORE_ADMIN');
      expect(auth.hasRole('STORE_ADMIN')).toBe(true);
      expect(auth.hasRole('CUSTOMER')).toBe(false);

      auth.clearSession();
      expect(auth.getToken()).toBeNull();
      expect(auth.isAuthenticated()).toBe(false);
      expect(sessionStorage.getItem('cb_session_token')).toBeNull();
    });

    it('3. debe limpiar el estado residual en memoria de CurrentAccountStoreService al cerrar sesión', () => {
      const auth = TestBed.inject(AuthService);
      const store = TestBed.inject(CurrentAccountStoreService);

      // Simular estado previo de un comercio
      store.bootstrapData.set({
        user: { id: 'u1', username: 'bodega', name: 'Bodega', role: 'STORE_ADMIN', storeId: 's1', clientId: null },
        stores: [{ id: 's1', name: 'Bodega 1', businessType: 'Tienda', address: 'Calle 1', taxId: '201', active: true }],
        products: [],
        clients: [],
        purchases: [],
        statements: [],
        payments: [],
        audit: []
      });

      expect(store.stores().length).toBe(1);

      // Cerrar sesión
      auth.clearSession();

      // El store debe haberse reseteado inmediatamente para evitar estado cruzado entre roles
      expect(store.bootstrapData()).toBeNull();
      expect(store.stores().length).toBe(0);
    });
  });

  describe('CurrentAccountStoreService — Métrica Segregada sin Suma Bimonetaria', () => {
    it('4. debe calcular métricas separadas para PEN y USD de manera independiente', () => {
      const store = TestBed.inject(CurrentAccountStoreService);

      const mockData: BootstrapData = {
        user: {
          id: 'admin-1',
          username: 'plataforma',
          name: 'Admin',
          role: 'PLATFORM_ADMIN',
          storeId: null,
          clientId: null
        },
        stores: [],
        products: [],
        clients: [
          {
            id: 'c-pen-1',
            storeId: 's-1',
            name: 'Cliente Soles',
            document: '11111111',
            phone: '999999999',
            email: 'pen@test.com',
            address: 'Lima',
            username: 'clipen',
            currency: 'PEN',
            creditLimit: 2000,
            maxMonths: 12,
            cutoffDay: 20,
            cutoffTime: '18:00',
            paymentDay: 26,
            rateType: 'EFFECTIVE',
            annualRate: 24,
            capitalizationDays: 30,
            lateRateType: 'EFFECTIVE',
            lateAnnualRate: 36,
            lateCapitalizationDays: 30,
            active: true,
            outstandingCapital: 500,
            availableCredit: 1500
          },
          {
            id: 'c-usd-1',
            storeId: 's-1',
            name: 'Cliente Dolares',
            document: '22222222',
            phone: '888888888',
            email: 'usd@test.com',
            address: 'Lima',
            username: 'cliusd',
            currency: 'USD',
            creditLimit: 1000,
            maxMonths: 6,
            cutoffDay: 15,
            cutoffTime: '18:00',
            paymentDay: 22,
            rateType: 'EFFECTIVE',
            annualRate: 18,
            capitalizationDays: 30,
            lateRateType: 'EFFECTIVE',
            lateAnnualRate: 25,
            lateCapitalizationDays: 30,
            active: true,
            outstandingCapital: 300,
            availableCredit: 700
          }
        ],
        purchases: [],
        statements: [
          {
            id: 'st-pen',
            clientId: 'c-pen-1',
            clientName: 'Cliente Soles',
            currency: 'PEN',
            cutoffDate: '2026-09-20',
            dueDate: '2026-09-26',
            status: 'OPEN',
            principal: 500,
            interest: 10,
            total: 510,
            paidAt: null
          },
          {
            id: 'st-usd',
            clientId: 'c-usd-1',
            clientName: 'Cliente Dolares',
            currency: 'USD',
            cutoffDate: '2026-09-15',
            dueDate: '2026-09-22',
            status: 'OPEN',
            principal: 300,
            interest: 6,
            total: 306,
            paidAt: null
          }
        ],
        payments: [],
        audit: []
      };

      store.bootstrapData.set(mockData);

      const pen = store.penMetrics();
      const usd = store.usdMetrics();

      expect(pen.currency).toBe('PEN');
      expect(pen.symbol).toBe('S/');
      expect(pen.totalLimit).toBe(2000);
      expect(pen.outstandingCapital).toBe(500);
      expect(pen.availableCredit).toBe(1500);
      expect(pen.openPayableTotal).toBe(510);

      expect(usd.currency).toBe('USD');
      expect(usd.symbol).toBe('$');
      expect(usd.totalLimit).toBe(1000);
      expect(usd.outstandingCapital).toBe(300);
      expect(usd.availableCredit).toBe(700);
      expect(usd.openPayableTotal).toBe(306);
    });
  });

  describe('Cálculo de asOf y Vistas', () => {
    it('5. debe seleccionar asOf como max(today, cutoffDate) para prevenir errores 400 antes del corte', () => {
      const fixture = TestBed.createComponent(StatementsComponent);
      const comp = fixture.componentInstance;

      // Si la fecha de corte es futura (ej. 2026-09-20) y hoy es anterior (ej. 2026-09-07),
      // debe seleccionar 2026-09-20 para evitar el error "asOf prior to cutoff"
      const futureCutoff = '2026-09-20';
      const effectiveAsOf = comp.getEffectiveAsOf(futureCutoff);
      expect(effectiveAsOf >= futureCutoff).toBe(true);

      // Si el corte fue en el pasado (ej. 2026-08-20), debe permitir la fecha actual o superior
      const pastCutoff = '2026-08-20';
      const effectivePast = comp.getEffectiveAsOf(pastCutoff);
      expect(effectivePast >= pastCutoff).toBe(true);
    });

    it('6. debe renderizar LoginComponent correctamente con controles reactivos y demo login', () => {
      const fixture = TestBed.createComponent(LoginComponent);
      const comp = fixture.componentInstance;
      fixture.detectChanges();

      expect(comp).toBeTruthy();
      expect(comp['loginForm'].get('username')).toBeDefined();
      expect(comp['loginForm'].get('password')).toBeDefined();

      comp.quickLogin('bodega', 'Barrio2026!');
      expect(comp['loginForm'].get('username')?.value).toBe('bodega');
      expect(comp['loginForm'].get('password')?.value).toBe('Barrio2026!');
    });

    it('7. debe renderizar HelpComponent con las 8 reglas financieras', () => {
      const fixture = TestBed.createComponent(HelpComponent);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('Convención de Conteo de Días 30E/360');
      expect(el.textContent).toContain('Días Configurables Restringidos a 1..28');
      expect(el.textContent).toContain('Gracia Capitalizada y Cronograma Francés');
    });
  });
});
