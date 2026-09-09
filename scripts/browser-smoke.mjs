import { chromium } from '@playwright/test';
import { createApp } from '../local-server/app.mjs';
import { resolve } from 'node:path';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';

/**
 * Script de verificación E2E en navegador real con Playwright.
 * Inicia una instancia efímera de la API en memoria con seed,
 * sirve el build estático de Angular y ejecuta los flujos clave
 * para todos los roles, validando UI, responsividad y aislamiento.
 */
async function runSmokeTests() {
  console.log('=== Iniciando verificación E2E en navegador real ===');

  const testResultsDir = resolve(process.cwd(), 'test-results');
  if (!existsSync(testResultsDir)) {
    mkdirSync(testResultsDir, { recursive: true });
  }

  const distDir = resolve(process.cwd(), 'dist/credit-drive/browser');
  if (!existsSync(distDir)) {
    throw new Error(`El directorio de distribución no existe en ${distDir}. El líder debe ejecutar npm run build antes.`);
  }

  const app = createApp({
    dbPath: ':memory:',
    seed: true,
    distDir
  });

  let port = 0;
  await new Promise((resolvePromise, rejectPromise) => {
    app.server.listen(0, '127.0.0.1', (err) => {
      if (err) return rejectPromise(err);
      port = app.server.address().port;
      resolvePromise();
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Servidor local efímero escuchando en ${baseUrl}`);

  let browser = null;
  let page = null;
  const unexpectedErrors = [];

  try {
    try {
      browser = await chromium.launch({
        channel: 'msedge',
        headless: true
      });
      console.log('Navegador: Microsoft Edge (msedge) iniciado correctamente.');
    } catch (e) {
      console.log('Microsoft Edge no disponible. Utilizando Chromium estándar...', e.message);
      browser = await chromium.launch({
        headless: true
      });
      console.log('Navegador: Chromium estándar iniciado correctamente.');
    }

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });

    page = await context.newPage();

    page.on('pageerror', (err) => {
      console.error('[Page Error]:', err.message);
      unexpectedErrors.push(err.message);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('ProfilePic')) {
          console.error('[Console Error]:', text);
          unexpectedErrors.push(text);
        }
      }
    });

    async function loginAs(username, password) {
      await page.goto(`${baseUrl}/login`);
      await page.waitForSelector('#username');
      await page.fill('#username', username);
      await page.fill('#password', password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/current-account/**');
    }

    async function logout() {
      if (await page.locator('.sidebar.open').isVisible()) {
        await page.locator('.close-sidebar-btn').click();
        await page.locator('.mobile-backdrop').waitFor({ state: 'detached' });
      }
      await page.click('.logout-btn');
      await page.waitForURL('**/login');
    }

    // ==========================================
    // TEST 1: PLATFORM ADMIN
    // ==========================================
    console.log('\n[1/7] Probando autenticación y gestión como PLATFORM_ADMIN...');
    await loginAs('plataforma', 'Barrio2026!');
    await page.waitForSelector('.page-title');
    const platTitle = await page.textContent('.page-title');
    if (!platTitle.includes('Administración Central')) {
      throw new Error(`Título inesperado en plataforma: ${platTitle}`);
    }
    await page.screenshot({ path: resolve(testResultsDir, '01-platform-dashboard.png') });

    await page.click('a[href="/current-account/stores"]');
    await page.waitForSelector('.page-title');
    await page.click('button:has-text("Dar de Alta Tienda")');
    await page.waitForSelector('#name');
    await page.fill('#name', 'Bodega San Martín (E2E)');
    await page.fill('#businessType', 'Minimarket y Abarrotes');
    await page.fill('#taxId', '20888999111');
    await page.fill('#address', 'Av. San Martín 789, Lima');
    await page.fill('#adminName', 'Martín Quispe');
    await page.fill('#adminUsername', 'martinqu');
    await page.fill('#adminPassword', 'Barrio2026!');
    await page.click('button:has-text("Registrar Tienda")');

    await page.waitForSelector('text=Bodega San Martín (E2E)');
    await page.screenshot({ path: resolve(testResultsDir, '02-platform-store-created.png') });

    const toggleBtn = page.locator('tr:has-text("Bodega San Martín (E2E)") .toggle-btn');
    await toggleBtn.click();
    await page.waitForSelector('tr:has-text("Bodega San Martín (E2E)") .status-badge.inactive');
    await toggleBtn.click();
    await page.waitForSelector('tr:has-text("Bodega San Martín (E2E)") .status-badge.active');

    await logout();
    console.log('✓ PLATFORM_ADMIN validado exitosamente.');

    // ==========================================
    // TEST 2: STORE ADMIN (BODEGA) - PRODUCTOS Y CLIENTES
    // ==========================================
    console.log('\n[2/7] Probando gestión comercial como STORE_ADMIN (bodega)...');
    await loginAs('bodega', 'Barrio2026!');
    await page.waitForSelector('.page-title');
    await page.screenshot({ path: resolve(testResultsDir, '03-bodega-dashboard.png') });

    // Regresión de recarga dura de página autenticada (DI circular check)
    console.log('Probando recarga dura (page.reload) autenticada...');
    await page.reload();
    await page.waitForSelector('.navbar');
    await page.waitForSelector('.page-title');
    const roleBadge = await page.textContent('.user-role-badge');
    if (!roleBadge.includes('Comercio')) {
      throw new Error(`Sesión perdida tras page.reload(): ${roleBadge}`);
    }
    console.log('✓ Recarga dura autenticada exitosa sin dependencias circulares.');

    // 2.1 Alta de producto
    await page.click('a[href="/current-account/products"]');
    await page.waitForSelector('.page-title');
    await page.click('button:has-text("Nuevo Producto")');
    await page.waitForSelector('input[formControlName="name"]');
    await page.fill('input[formControlName="name"]', 'Fideos Tallarín Don Vittorio 500g');
    await page.fill('input[formControlName="brand"]', 'Don Vittorio');
    await page.fill('input[formControlName="supplier"]', 'Alicorp S.A.A.');
    await page.fill('input[formControlName="cashPrice"]', '4.20');
    await page.fill('input[formControlName="creditPrice"]', '4.80');
    await page.click('button:has-text("Guardar Producto")');
    await page.waitForSelector('text=Fideos Tallarín Don Vittorio 500g');
    await page.screenshot({ path: resolve(testResultsDir, '04-product-created.png') });

    // 2.2 Alta de cliente Carlos Mendoza
    await page.click('a[href="/current-account/clients"]');
    await page.waitForSelector('.page-title');
    await page.click('button:has-text("Dar de Alta Cliente")');
    await page.waitForSelector('input[formControlName="name"]');
    await page.fill('input[formControlName="name"]', 'Carlos Alberto Mendoza');
    await page.fill('input[formControlName="document"]', '45889911');
    await page.fill('input[formControlName="phone"]', '987112233');
    await page.fill('input[formControlName="email"]', 'carlos.mendoza@test.local');
    await page.fill('input[formControlName="address"]', 'Calle Las Magnolias 345');
    await page.fill('input[formControlName="username"]', 'cmendoza');
    await page.fill('input[formControlName="password"]', 'Barrio2026!');
    await page.fill('input[formControlName="creditLimit"]', '1200');
    await page.fill('input[formControlName="cutoffDay"]', '20');
    await page.fill('input[formControlName="paymentDay"]', '26');
    await page.click('button:has-text("Guardar Parámetros de Cuenta")');
    await page.waitForSelector('text=Carlos Alberto Mendoza');
    await page.screenshot({ path: resolve(testResultsDir, '05-client-created.png') });
    console.log('✓ CRUD de catálogo y clientes validado.');

    // ==========================================
    // TEST 3: VENTAS A CRÉDITO Y CRONOGRAMA FRANCÉS
    // ==========================================
    console.log('\n[3/7] Probando venta a crédito con vista previa y cronograma 30E/360...');
    await page.click('a[href="/current-account/purchases"]');
    await page.waitForSelector('.purchase-form');

    // Selección por etiqueta del cliente Carlos Alberto Mendoza recién creado
    const clientOption = page.locator('select[formControlName="clientId"] option').filter({ hasText: 'Carlos Alberto Mendoza' });
    await page.selectOption('select[formControlName="clientId"]', await clientOption.getAttribute('value'));
    // Selección por etiqueta del producto recién creado
    const productOption = page.locator('select[formControlName="productId"] option').filter({ hasText: 'Fideos Tallarín' });
    await page.selectOption('select[formControlName="productId"]', await productOption.getAttribute('value'));

    await page.fill('input[formControlName="quantity"]', '2');
    await page.selectOption('select[formControlName="mode"]', 'INSTALLMENTS');
    await page.fill('input[formControlName="months"]', '3');
    await page.fill('input[formControlName="purchasedAt"]', '2026-09-15T10:30');

    // Calcular vista previa
    await page.click('button:has-text("Calcular Vista Previa")');
    await page.waitForSelector('.preview-box');
    const prevText = await page.textContent('.preview-box');
    if (!prevText.includes('Resultado Financiero del Servidor') || !prevText.includes('Cuota 1')) {
      throw new Error('La vista previa del financiamiento no mostró el cronograma esperado');
    }
    await page.screenshot({ path: resolve(testResultsDir, '06-purchase-preview.png') });

    // Confirmar venta
    await page.click('button:has-text("Confirmar y Guardar Venta")');
    await page.waitForSelector('.banner-success');
    await page.screenshot({ path: resolve(testResultsDir, '07-purchase-registered.png') });
    console.log('✓ Venta a crédito y cronograma francés validado.');

    // ==========================================
    // TEST 4: CIERRE, AS-OF, EXPORTACIÓN CSV Y PAGO EXACTO
    // ==========================================
    console.log('\n[4/7] Probando estados de cuenta (corte 2026-10-20), liquidación asOf, CSV y pago exacto...');
    await page.click('a[href="/current-account/statements"]');
    await page.waitForSelector('#cutoffDateInput');
    // Para cuotas con compra 2026-09-15 y corte 20, la primera cuota vence en oct y corta el 2026-10-20
    await page.fill('#cutoffDateInput', '2026-10-20');

    const generateResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/statements/generate') && res.status() === 200
    );
    await page.click('button:has-text("Generar Cierres Pendientes")');
    await generateResponsePromise;

    // Esperar explícitamente el botón real "Ver Detalle" del estado de cuenta de Carlos o del listado
    await page.waitForSelector('button:has-text("Ver Detalle")');
    await page.screenshot({ path: resolve(testResultsDir, '08-statements-list.png') });

    // Filtrar o abrir estado de cuenta
    await page.locator('tr').filter({ hasText: 'Carlos Alberto Mendoza' }).getByRole('button', { name: 'Ver Detalle' }).click();
    await page.waitForSelector('.as-of-bar');

    // Validar que asOf >= 2026-10-20
    const asOfVal = await page.inputValue('#asOfInput');
    if (asOfVal < '2026-10-20') {
      throw new Error(`asOf inválido por debajo del corte: ${asOfVal}`);
    }

    // Descarga y verificación real de contenido CSV
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Exportar CSV")');
    const download = await downloadPromise;
    const downloadName = download.suggestedFilename();
    if (!downloadName.endsWith('.csv')) {
      throw new Error(`Nombre de archivo CSV inesperado: ${downloadName}`);
    }
    const downloadPath = await download.path();
    const csvContent = readFileSync(downloadPath, 'utf-8');
    if (!csvContent.includes('CRÉDITO BARRIO') || !csvContent.includes('Carlos Alberto Mendoza') || !csvContent.includes('Interés Moratorio')) {
      throw new Error(`El archivo CSV descargado está vacío o corrupto: longitud ${csvContent?.length}`);
    }
    console.log(`✓ Archivo CSV descargado y verificado correctamente (${csvContent.length} bytes).`);

    await page.screenshot({ path: resolve(testResultsDir, '09-statement-detail.png') });

    // Registrar pago exacto
    await page.click('button:has-text("Registrar Pago Exacto")');
    await page.waitForSelector('.pay-amount-box');
    await page.click('button:has-text("Confirmar Pago de")');
    await page.waitForSelector('text=Estado Cancelado el');
    await page.screenshot({ path: resolve(testResultsDir, '10-statement-paid.png') });
    await page.click('button:has-text("Cerrar")');

    await logout();
    console.log('✓ Estados de cuenta, exportación y cobranza exacta validados.');

    // ==========================================
    // TEST 5: AISLAMIENTO MULTI-TENANT (SALÓN)
    // ==========================================
    console.log('\n[5/7] Probando aislamiento estricto multi-tienda con comercio 2 (salon)...');
    await loginAs('salon', 'Barrio2026!');
    await page.click('a[href="/current-account/products"]');
    await page.waitForSelector('.page-title');

    const salonProds = await page.textContent('.products-grid');
    if (!salonProds.includes('Corte y Lavado Unisex')) {
      throw new Error('El salón no tiene listados sus servicios');
    }
    if (salonProds.includes('Costeño') || salonProds.includes('Don Vittorio')) {
      throw new Error('Fallo de aislamiento: El salón visualiza productos de la bodega');
    }

    await page.click('a[href="/current-account/clients"]');
    await page.waitForSelector('.data-table');
    const salonClients = await page.textContent('.data-table');
    if (!salonClients.includes('María Rodríguez')) {
      throw new Error('El salón no visualiza a su cliente María');
    }
    if (salonClients.includes('Juan Pérez') || salonClients.includes('Carlos Alberto')) {
      throw new Error('Fallo de aislamiento: El salón visualiza clientes de la bodega');
    }
    await page.screenshot({ path: resolve(testResultsDir, '11-salon-isolation.png') });

    await logout();
    console.log('✓ Aislamiento multi-tenant comprobado.');

    // ==========================================
    // TEST 6: CUSTOMER SOLO LECTURA
    // ==========================================
    console.log('\n[6/7] Probando interfaz de cliente titular (solo lectura)...');
    await loginAs('cliente', 'Barrio2026!');
    await page.waitForSelector('.customer-overview-card');
    await page.screenshot({ path: resolve(testResultsDir, '12-customer-dashboard.png') });

    await page.click('a[href="/current-account/my-statements"]');
    await page.waitForSelector('.data-table');

    await page.click('a[href="/current-account/catalog"]');
    await page.waitForSelector('.catalog-grid');
    const editBtns = await page.$$('button:has-text("Editar")');
    if (editBtns.length > 0) {
      throw new Error('El cliente no debe contar con controles de edición en catálogo');
    }
    await page.screenshot({ path: resolve(testResultsDir, '13-customer-catalog.png') });

    await logout();
    console.log('✓ Rol cliente validado.');

    // ==========================================
    // TEST 7: RESPONSIVIDAD MÓVIL SIN OVERFLOW
    // ==========================================
    console.log('\n[7/7] Probando vista móvil (375x667) y ausencia de desbordamiento horizontal...');
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAs('bodega', 'Barrio2026!');
    await page.waitForSelector('.mobile-toggle-btn');

    // Medición de scrollWidth vs clientWidth
    const overflowMetrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      isOverflowing: document.documentElement.scrollWidth > document.documentElement.clientWidth
    }));

    if (overflowMetrics.isOverflowing) {
      await page.screenshot({ path: resolve(testResultsDir, 'error-mobile-overflow.png') });
      throw new Error(
        `Fallo de responsividad móvil: Scroll horizontal detectado (scrollWidth: ${overflowMetrics.scrollWidth}px > clientWidth: ${overflowMetrics.clientWidth}px)`
      );
    }
    console.log(`✓ Sin desbordamiento horizontal en móvil (${overflowMetrics.scrollWidth}px <= ${overflowMetrics.clientWidth}px).`);

    await page.click('.mobile-toggle-btn');
    await page.waitForSelector('.sidebar.open');
    await page.screenshot({ path: resolve(testResultsDir, '14-mobile-menu-open.png') });

    await logout();
    console.log('✓ Comprobación móvil finalizada.');

    if (unexpectedErrors.length > 0) {
      throw new Error(`Se presentaron ${unexpectedErrors.length} errores inesperados en consola de navegador: ${unexpectedErrors.join('; ')}`);
    }

    console.log('\n======================================================');
    console.log('SMOKE E2E COMPLETADO SATISFACTORIAMENTE');
    console.log(`Capturas guardadas en: ${testResultsDir}`);
    console.log('======================================================\n');
  } catch (err) {
    if (page) {
      await page.screenshot({ path: resolve(testResultsDir, 'error-failure.png') }).catch(() => {});
      const currentUrl = page.url();
      console.error(`[Contexto de error] URL actual: ${currentUrl}`);
    }
    throw err;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (app) {
      app.close();
    }
  }
}

runSmokeTests().catch((err) => {
  console.error('\n[FALLO EN SMOKE TEST]:', err);
  process.exitCode = 1;
});
