# Manual de Usuario por Roles — Sistema "Crédito Barrio"
**Aplicación:** Crédito Barrio (Contexto `src/app/current-account/`)  
**Curso:** Finanzas e Ingeniería Económica (SI642 2026-20)  
**Entorno:** Prototipo Local Monolítico (Angular 21 + Node.js >= 24.15 SQLite)  

---

## 1. Introducción y Acceso al Prototipo

Crédito Barrio es un prototipo académico de cuenta corriente crediticia vecinal diseñado para operar en un entorno local desconectado sin dependencias en la nube. Cuenta con tres perfiles de usuario diferenciados:
1. **Administrador de Plataforma (`PLATFORM_ADMIN`):** Alta de comercios participantes y consulta de la bitácora de auditoría.
2. **Administrador de Comercio (`STORE_ADMIN`):** Gestión de catálogo, otorgamiento de líneas de crédito a clientes, registro de ventas, emisión periódica de estados de cuenta y cobranza.
3. **Cliente Vecinal (`CUSTOMER`):** Consulta de línea disponible, catálogo de su tienda asignada, cronograma de cuotas y estados de cuenta mensuales.

### 1.1 Acceso al Sistema
1. Abra el navegador en [http://localhost:4200](http://localhost:4200) (desarrollo) o [http://localhost:3000](http://localhost:3000) (producción local integrada).
2. Introduzca sus credenciales de acceso en el formulario de login (`POST /api/auth/login`).
3. El sistema valida las credenciales contrastando el hash `scrypt` almacenado localmente en SQLite y genera un token `Bearer` de sesión.

---

## 2. Perfil 1: Administrador de Plataforma (`PLATFORM_ADMIN`)

### 2.1 Credenciales de Demostración
- **Usuario:** `plataforma`
- **Contraseña:** `Barrio2026!`

### 2.2 Operaciones Disponibles
- **Alta de Nuevo Comercio (`POST /api/stores`):**
  - Registra el nombre, giro (`businessType`), dirección física y RUC/DNI (`taxId`).
  - Requiere indicar el nombre del administrador del local, un nombre de usuario y una contraseña inicial de al menos 8 caracteres.
  - La tienda y el usuario administrador `STORE_ADMIN` se crean de manera transaccional.
- **Modificación y Bloqueo Lógico (`PATCH /api/stores/:id`):**
  - Permite actualizar los datos o cambiar `active` a `false`. Al desactivar una tienda, sus administradores y clientes no podrán iniciar sesión ni efectuar transacciones, pero los datos y deudas históricas no se borran.
- **Consulta de Auditoría (`GET /api/bootstrap` $\rightarrow$ `audit`):**
  - Visualización del registro inmutable de operaciones mutantes (creación de tiendas, cierres de estados de cuenta y cobros). Nunca expone contraseñas ni hashes.

---

## 3. Perfil 2: Administrador de Comercio (`STORE_ADMIN`)

### 3.1 Credenciales de Demostración
- **Comercio Principal (Bodega):** Usuario `bodega` | Clave: `Barrio2026!`
- **Comercio Secundario (Salón / Aislamiento):** Usuario `salon` | Clave: `Barrio2026!`

### 3.2 Catálogo de Productos (`/api/products`)
- **Alta de Producto (`POST /api/products`):**
  - Denominación, descripción, marca, proveedor y unidad de medida.
  - Precio al contado (`cashPrice`) y precio financiado (`creditPrice`) expresados en la moneda del comercio/cliente.
  - Modalidades admitidas: `allowEndOfMonth` (Fin de Mes) y `allowInstallments` (Cuotas).
- **Actualización (`PATCH /api/products/:id`):**
  - Modificación de precios o descontinuación (`active: false`).

### 3.3 Gestión de Clientes Vecinales (`/api/clients`)
- **Alta de Cliente (`POST /api/clients`):**
  - Datos de contacto y documento de identidad (DNI/CE).
  - Usuario y contraseña inicial para el portal del cliente.
  - Moneda: `PEN` (Soles) o `USD` (Dólares). *(Nota de prototipo: no existe conversión FX automática entre monedas)*.
  - Límite de crédito (`creditLimit`) y plazo máximo de cuotas (`maxMonths`, entre 1 y 60 meses).
  - Día de corte (`cutoffDay`) y día de pago (`paymentDay`): **restringidos al rango de 1 a 28** para evitar inconsistencias de calendario en meses cortos (ej. febrero).
  - Hora de corte (`cutoffTime`): formato `HH:mm` (hora local de Lima).
  - Configuración de tasas compensatorias (TEA o TNA con días de capitalización `1, 15, 30, 60, 90, 180, 360`) y moratorias.
- **Ajustes de Condiciones (`PATCH /api/clients/:id`):**
  - Modificación de tasas o límites para compras futuras.
  - *Restricción de seguridad:* El sistema rechaza cualquier intento de reducir el límite de crédito por debajo de la exposición de capital vigente.

### 3.4 Registro y Simulación de Ventas (`/api/purchases`)
- **Simulación Previa (`POST /api/purchases/preview`):**
  - Permite verificar antes de comprar los días de gracia transcurridos, el capital capitalizado con gracia ($P$) y el cronograma de amortización mensual francesa con cuotas constantes y ajuste de centavos en la última cuota.
- **Confirmación de Compra (`POST /api/purchases`):**
  - Valida que el cliente, la tienda y el producto estén activos.
  - Valida que la exposición vigente más el nuevo capital capitalizado no supere el límite de crédito del cliente.
  - Genera de inmediato las obligaciones correspondientes (`obligations`) con el snapshot histórico de las condiciones pactadas.

### 3.5 Generación de Estados de Cuenta (`POST /api/statements/generate`)
- Se indica la fecha de corte a procesar (`cutoffDate`).
- El sistema agrupa de forma idempotente todas las obligaciones no facturadas cuyo corte sea menor o igual a dicha fecha, consolidándolas por cliente y fecha de vencimiento.
- Si ya existe un estado generado para ese ciclo, no se duplica.

### 3.6 Cobro y Liquidación de Mora (`POST /api/statements/:id/pay`)
- Consulta el detalle del estado de cuenta con la fecha del cobro (`asOf`).
- Si la fecha de cobro excede la fecha de vencimiento ($asOf > dueDate$), liquida el interés moratorio empleando el **snapshot histórico pactado**.
- **Regla de Pago Exacto:** Exige que el abono coincida al 100% con `payableTotal` (mora + interés + capital). No se admiten pagos parciales ni sobrepagos.
- **Imputación conforme a la rúbrica del curso:** El dinero cobrado extingue en estricto orden: **1° Interés Moratorio, 2° Interés Compensatorio, 3° Capital Principal**.
- El estado pasa a `PAID` y se libera el cupo de crédito del cliente.

### 3.7 Exportación a CSV (`GET /api/statements/:id/export`)
- Descarga el reporte en CSV UTF-8. Para evitar riesgos de inyección en hojas de cálculo, cualquier celda que inicie con caracteres especiales (`=`, `+`, `-`, `@`) es neutralizada de forma automática.

---

## 4. Perfil 3: Cliente Vecinal (`CUSTOMER`)

### 4.1 Credenciales de Demostración
- **Usuario:** `cliente`
- **Contraseña:** `Barrio2026!`

### 4.2 Consultas en el Portal
- **Línea de Crédito:** Visualización de crédito total asignado, saldo expuesto y monto disponible en tiempo real.
- **Catálogo de su Tienda:** Productos disponibles exclusivamente en la bodega a la que el cliente pertenece.
- **Mis Compras y Cronogramas:** Historial de consumos y cronograma de cuotas futuras.
- **Mis Estados de Cuenta:** Consulta de estados abiertos (`OPEN`) y comprobantes pagados (`PAID`).

---

## 5. Códigos de Error Frecuentes

| Código HTTP | Causa Típica | Acción Correctiva |
| :---: | :--- | :--- |
| **400 Bad Request** | Día fuera del rango 1..28, fecha `asOf` previa al corte, o monto de pago no exacto. | Verifique los datos de entrada según las restricciones documentadas. |
| **401 Unauthorized** | Token ausente o credenciales inválidas. | Vuelva a iniciar sesión. |
| **403 Forbidden** | Intento de consultar datos de otra tienda o rol sin privilegios. | Ingrese con la cuenta autorizada de la tienda. |
| **404 Not Found** | Identificador inexistente en la base de datos local. | Compruebe la existencia del registro en SQLite. |
| **409 Conflict** | Nombre de usuario duplicado o intento de reducir límite bajo deuda expuesta. | Utilice un usuario distinto o mantenga el límite superior a la deuda. |
