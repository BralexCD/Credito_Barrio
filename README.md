# Crédito Barrio — Prototipo Local de Crédito Vecinal

**Curso:** Finanzas e Ingeniería Económica (SI642 2026-20)

**Proyecto:** Prototipo Académico de Cuenta Corriente y Gestión de Líneas de Crédito Local

**Pila Tecnológica:** Angular 21 (`src/app/current-account/`) + Node.js >= 24.15 (`node:http`, `node:sqlite`, `node:crypto`)

---

## 1. Descripción del Proyecto

**Crédito Barrio** es un prototipo de software académico desarrollado para modelar y transparentar la cuenta corriente crediticia ("el fiado") en pequeños comercios minoristas. El sistema implementa los conceptos fundamentales de la ingeniería económica bajo convenciones locales:
- **Convención 30E/360:** Normalización homogénea del conteo de días.
- **Equivalencia de Tasas:** Tasa Efectiva Anual (TEA) y Tasa Nominal Anual (TNA con periodicidad de capitalización).
- **Amortización Francesa:** Capitalización de días de gracia previa y ajuste de residuos de centavos en la última cuota.
- **Mora con Snapshot Histórico:** Liquidación de recargos moratorios usando las tasas históricas pactadas en cada obligación.
- **Jerarquía de Imputación de Pagos:** Adopción del orden Mora $\rightarrow$ Interés Compensatorio $\rightarrow$ Capital por mandato de la rúbrica del curso SI642.
- **Entorno Local Autónomo:** Base de datos SQLite local sin dependencias en la nube.

---

## 2. Requisitos del Entorno (Windows)

- **Sistema Operativo:** Windows 10 / Windows 11 (64 bits).
- **Node.js:** Versión `>= 24.15.0` (requerido para soporte nativo de `node:sqlite` con `DatabaseSync`).
- **NPM:** Versión `>= 10.0.0` (incluido con Node.js).
- **Conexión a Internet:** Requerida para instalar paquetes. La base de datos y las operaciones financieras son locales; las fuentes, iconos de Google y fotografías remotas opcionales requieren conexión para verse como en las capturas. No se usa Supabase en el flujo activo.

---

## 3. Guía Rápida de Ejecución (Quickstart)

Abra una consola de comandos en la raíz del proyecto:

### 3.1 Instalación de Dependencias
```bash
npm ci
```

### 3.2 Modo de Desarrollo (Servidor Local + Frontend Angular)
```bash
npm run dev
```
- Frontend accesible en: [http://127.0.0.1:4200](http://127.0.0.1:4200)
- El proxy de Angular reenvía automáticamente `/api/*` al backend en el puerto `3000`.

### 3.3 Modo de Producción Local (Servidor Integrado)
```bash
npm run build
npm run serve
```
- Aplicación servida de forma autónoma en: [http://127.0.0.1:3000](http://127.0.0.1:3000). Mantenga abierta la consola; `Ctrl+C` detiene el servidor.

### 3.4 Ejecución de Pruebas Automatizadas
- **Pruebas de Backend y Motor Financiero:**
  ```bash
  npm run test:local
  ```
- **Pruebas del Frontend Angular:**
  ```bash
  npm test -- --watch=false
  ```
- **Flujos en navegador real:** `npm run build` y después `npm run test:e2e`. Usa Microsoft Edge instalado; si no existe, instalar Chromium con `npx playwright install chromium`. Genera capturas en `test-results/` y usa una DB en memoria, no la de demostración.

---

## 4. Base de Datos Local y Cuentas de Demostración

### 4.1 Ubicación de la Base de Datos SQLite
La base de datos se genera automáticamente en el primer arranque en:
```text
local-server/data/credit.sqlite
```
*(Archivo ignorado en `.gitignore` para no versionar datos de prueba).*

### 4.2 Credenciales Oficiales de Demostración (Seed)

| Rol / Perfil | Usuario | Contraseña | Tienda Asignada | Función en la Demostración |
| :--- | :--- | :--- | :--- | :--- |
| **Administrador Plataforma** | `plataforma` | `Barrio2026!` | *(Global)* | Alta de comercios y consulta de auditoría. |
| **Administrador Comercio 1** | `bodega` | `Barrio2026!` | Bodega Don Pepe (DEMO) | Gestión de clientes, ventas, estados de cuenta y cobranzas. |
| **Administrador Comercio 2** | `salon` | `Barrio2026!` | Salón Belleza Glamour (DEMO) | Verificación de aislamiento multi-tienda. |
| **Cliente Vecinal** | `cliente` | `Barrio2026!` | Bodega Don Pepe (DEMO) | Consulta de saldo disponible, compras y estados de cuenta. |

Para visualizar los estados de las compras precargadas: ingrese como `bodega`, abra **Estados de Cuenta**, seleccione corte **2026-10-20** y genere cierres. Las cuotas de la compra del 15 de septiembre empiezan el 26 de octubre; por eso no aparece un estado en septiembre. La generación manual representa el cierre del día seleccionado y admite fechas futuras para la demostración; los cierres automáticos usan la fecha/hora real de Lima con el servidor encendido.

---

## 5. Pruebas Aisladas, Copia de Seguridad y Restauración

### 5.1 Protocolo de Pruebas Aisladas
Las pruebas automatizadas (`npm run test:local`) se ejecutan sobre bases de datos SQLite temporales aisladas. La base de demostración `local-server/data/credit.sqlite` no es alterada durante la ejecución de los tests.

### 5.2 Copia de Seguridad (Backup)
1. Detener el servidor Node.js (`Ctrl + C`).
2. Copiar el archivo `credit.sqlite` y sus posibles archivos de registro:
   - `local-server/data/credit.sqlite`
   - `local-server/data/credit.sqlite-wal` (si existe modo WAL)
   - `local-server/data/credit.sqlite-shm` (si existe memoria compartida)
3. Almacenar la copia en un directorio seguro de respaldo.

### 5.3 Restauración
1. Detener el servidor.
2. Reemplazar `local-server/data/credit.sqlite` con la copia de respaldo deseada.
3. Reiniciar el servidor con `npm run dev` o `npm run serve`.

---

## 6. Limitaciones del Prototipo Académico

1. **Entorno Académico no Certificado:** Prototipo validado localmente para fines docentes del curso SI642. No constituye software comercial con certificación bancaria.
2. **Restricción de Calendario (Días 1 a 28):** Los días de corte y pago se restringen al intervalo $[1, 28]$ para prevenir desbordes en meses de menor duración.
3. **Moneda por Cuenta:** Sin conversión cambiaria (FX) simultánea en la compra.
4. **Credenciales de Demostración:** Claves locales de conocimiento público para facilitar la evaluación académica.
5. **Dependencias heredadas:** `npm audit` aún reporta avisos de seguridad. Mantener el servidor en `127.0.0.1`; no publicar esta copia ni usar datos personales reales sin revisar dependencias, seguridad y normativa. Véase [verificación](docs/VERIFICACION.md).
6. **Historial:** La moneda de una cuenta con compras no se modifica. Las tasas nuevas solo afectan compras futuras. El límite considera también la gracia capitalizada. Catálogo expresado en la moneda de la cuenta seleccionada, sin FX.

---

## 7. Divulgación de Asistencia de IA y Aportes del Equipo

- **Asistencia Sustancial por IA:** El backend, la adaptación de componentes de Angular, las pruebas automatizadas y la documentación fueron desarrollados sustancialmente con apoyo de herramientas de IA (OpenCode como lead/orquestador y Antigravity con Gemini 3.8 Flash como agente de trabajo), bajo supervisión técnica.
- **Reutilización de Código Previo:** El proyecto reutiliza código del repositorio público Angular CreditDrive. **La licencia original no fue localizada y la aprobación para su reutilización con fines didácticos debe ser confirmada por el grupo ante el docente**.
- **Validación del Grupo:** Cada estudiante del equipo debe completar la matriz de interacción con IA en el informe técnico, indicando solicitudes realizadas, resultados aceptados o corregidos, y el porcentaje de apoyo de IA frente al trabajo humano.

---

## 8. Documentación Académica Complementaria

- [INFORME_TECNICO_ACADEMICO.md](docs/INFORME_TECNICO_ACADEMICO.md): Marco teórico, delimitación normativa, diccionarios de datos, fórmulas matemáticas, pseudocódigo, matriz de requisitos y contrastación de casos de prueba con valores del lead.
- [MANUAL_USUARIO.md](docs/MANUAL_USUARIO.md): Guía operativa por perfiles, flujos de compras, cierres de ciclo y resolución de incidencias.
- [MATERIALES_PRESENTACION_Y_VIDEO.md](docs/MATERIALES_PRESENTACION_Y_VIDEO.md): Diapositivas para exposición oral, guion de video ($\le$ 20 min) y lista de chequeo de entrega.
- [VERIFICACION.md](docs/VERIFICACION.md): Evidencias finales, comandos, alcance de las pruebas y pendientes académicos.

Base original: [ZAICO21/credit-drive](https://github.com/ZAICO21/credit-drive), commit `571b839`. El código vehicular se conserva como referencia sin rutas activas; las nuevas funciones están en `src/app/current-account/` y `local-server/`.
