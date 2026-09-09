# Materiales de Exposición: Diapositivas, Guion de Video y Lista de Entregables
**Curso:** Finanzas e Ingeniería Económica (SI642 2026-20)  
**Proyecto:** Crédito Barrio — Prototipo Académico de Cuenta Corriente Vecinal  
**Fecha:** Setiembre 2026  

---

## 1. Contenido de Diapositivas para la Sustentación Académica

---

### Lámina 1: Carátula y Presentación
- **Título:** Crédito Barrio: Prototipo Académico de Gestión de Líneas de Crédito Vecinal
- **Subtítulo:** Aplicación Práctica de la Ingeniería Económica en el Comercio Minorista Local
- **Curso:** Finanzas e Ingeniería Económica (SI642 2026-20)
- **Integrantes del Grupo:**
  - `[Completar: Alumno 1 - Código]`
  - `[Completar: Alumno 2 - Código]`
  - `[Completar: Alumno 3 - Código]`
  - `[Completar: Alumno 4 - Código]`
- **Docente:** `[Completar: Nombre del Profesor del Curso]`
- **Ciclo:** 2026-02

---

### Lámina 2: Problemática y Oportunidad
- **El Comercio Minorista y el "Fiado":**
  - Práctica informal de financiamiento directo para consumo básico.
  - Registro manual en cuadernos susceptible a extravíos, deterioro e inconsistencias.
- **Desafíos Financieros:**
  - Carencia de criterios técnicos y matemáticos para el cobro del costo del dinero en el tiempo.
  - Dificultad para estructurar cronogramas claros y liquidaciones justas ante impagos.
- **Objetivo del Prototipo:**
  - Modelar una herramienta de software autónoma y local que simule una cuenta corriente crediticia vecinal aplicando principios formales de ingeniería económica.

---

### Lámina 3: Marco Normativo y Fuente de la Jerarquía de Pagos
- **Marco Regulatorio como Referencia Conceptual:**
  - Directrices de conducta de mercado de la SBS y circulares de topes de tasas del BCRP.
- **Ámbito y Delimitación:**
  - Las normas de la SBS regulan a entidades financieras autorizadas y no son directamente aplicables de forma automática al comercio minorista no bancario.
  - **Fuente de la Jerarquía de Pagos:** La regla de imputación (**Mora $\rightarrow$ Interés Compensatorio $\rightarrow$ Capital**) se adopta en este proyecto por **mandato de la rúbrica y especificación académica del curso SI642**.

---

### Lámina 4: Fundamentos Matemáticos del Motor Financiero
- **Convención 30E/360:**
  - Homogenización de meses a 30 días y año base a 360 días para uniformizar periodos:
    $$d = 360(Y_2 - Y_1) + 30(M_2 - M_1) + \min(D_2, 30) - \min(D_1, 30)$$
- **Equivalencia de Tasas:**
  - Tasa Efectiva Anual (TEA): $i_d = (1 + \text{TEA})^{d/360} - 1$
  - Tasa Nominal Anual (TNA, capitalización cada $k$ días): $i_d = \left(1 + \frac{\text{TNA}}{360/k}\right)^{d/k} - 1$
- **Restricción de Calendario:** Días de corte y pago configurables exclusivamente entre **1 y 28** para evitar inconsistencias en febrero.

---

### Lámina 5: Modalidades de Crédito
- **1. Fin de Mes (`END_OF_MONTH`):**
  - Pago único en la fecha de pago del ciclo; cálculo de interés compensatorio según los días exactos transcurridos.
- **2. Cuotas Mensuales Francesas (`INSTALLMENTS`):**
  - **Capitalización de Gracia:** Los días entre compra y fecha de corte/referencia generan interés compensatorio que se capitaliza al principal: $P = \text{roundMoney}(C \cdot (1+i)^{d})$.
  - **Cuota Fija Mensual:** Calculada con el valor redondeado de $P$ a una tasa mensual $i_{30}$.
  - **Ajuste de Cierre:** Absorción de centavos residuales en la última cuota para garantizar saldo final cero.

---

### Lámina 6: Liquidación de Mora con Snapshot Histórico
- **Devengo de Mora:**
  - Aplica únicamente si la fecha de consulta excede la fecha de vencimiento ($asOf > dueDate$).
  - Se calcula sobre el total exigible impago (capital + compensatorio) utilizando el **snapshot histórico** de la tasa moratoria pactada en la obligación.
  - Si el pago es puntual o previo ($asOf \le dueDate$), la mora es exactamente **S/ 0.00**.
- **Orden de Imputación de Pagos (Rúbrica SI642):**
  1. Interés Moratorio.
  2. Interés Compensatorio regular.
  3. Capital Principal.

---

### Lámina 7: Caso de Validación 1 — Cuotas Francesas con Gracia
*(Valores contrastados directamente con la ejecución en Node.js del lead)*
- **Parámetros:** Compra 15/09/2026 | Corte: 20 | Pago: 26 | TEA: $36\%$ | Plazo: 3 meses | Capital: S/ 600.00.
- **Resultados de la Ejecución:**
  - Días de gracia: 11 días $\rightarrow i_{11} = 0.00943964082644277$.
  - Principal capitalizado: $P = \mathbf{S/\ 605.66}$.
  - Tasa mensual $i_{30} = 0.0259548346585463 \rightarrow$ Cuota base: $\mathbf{S/\ 212.46}$.
- **Cronograma Ejecutado:**
  - **Cuota 1 (26/10):** Cap. S/ 196.74 | Int. S/ 15.72 | Total **S/ 212.46** | Saldo S/ 408.92
  - **Cuota 2 (26/11):** Cap. S/ 201.85 | Int. S/ 10.61 | Total **S/ 212.46** | Saldo S/ 207.07
  - **Cuota 3 (26/12):** Cap. S/ 207.07 | Int. S/ 5.37 | Total **S/ 212.44\*** | Saldo S/ 0.00
  - **Totales:** Capital amortizado: S/ 605.66 | Interés total: S/ 31.70 | Total pagado: S/ 637.36.

---

### Lámina 8: Caso de Validación 2 — Fin de Mes y Mora
- **Compras en Setiembre 2026 (TNA 24% y TNA Mora 36%, k=30 días):**
  - **Compra A (16/09, antes de corte 20/09):** S/ 200.00 $\rightarrow$ Vence 26/09 con interés S/ 1.32. Total: **S/ 201.32**.
  - **Compra B (22/09, post-corte):** S/ 150.00 $\rightarrow$ Pasa al ciclo de octubre (vence 26/10, interés S/ 3.40). Total: **S/ 153.40**.
- **Pago Tardío el 06/10/2026 (10 días de mora):**
  - Mora devengada (10 días): $\mathbf{S/\ 1.99}$.
  - Monto total exigible a cobrar: $\mathbf{S/\ 203.31}$.
  - Imputación del pago: S/ 1.99 a Mora + S/ 1.32 a Interés + S/ 200.00 a Capital.

---

### Lámina 9: Arquitectura Local Monolítica
- **Tecnologías:**
  - **Frontend:** Angular 21 con Signals reactivos en `src/app/current-account/`.
  - **Backend:** Node.js >= 24.15 empleando `node:sqlite` nativo (`DatabaseSync`), `node:http` y `node:crypto`.
  - **Base de Datos:** Archivo local SQLite en `local-server/data/credit.sqlite`.
- **Mecanismos de Control:**
  - Hasheo de credenciales con `scrypt` y sal criptográfica.
  - Aislamiento multi-tienda mediante filtrado obligatorio por `storeId`.
  - Neutralización de fórmulas en exportaciones CSV.

---

### Lámina 10: Conclusiones y Estado del Proyecto
- **Conclusiones Académicas:**
  - Se modelaron las reglas financieras del curso en un prototipo local ejecutable y contrastable.
  - Los resultados numéricos del cronograma francés y la mora coincidieron exactamente con la ejecución de prueba del lead.
- **Estado de Pruebas:**
  - Build de Angular y pruebas frontend aprobadas (5 tests).
  - 39 pruebas del backend y 7 pruebas Angular correctas; recorrido E2E Microsoft Edge completado. Véase VERIFICACION.md para el alcance y las limitaciones.
  - Reporte de validación técnica disponible en `docs/VERIFICACION.md` (a cargo del lead).

---

## 2. Guion para Video Demostrativo ($\le$ 20 Minutos)

| Minutaje | Acción en Pantalla | Locución del Equipo |
| :---: | :--- | :--- |
| **00:00 - 02:00** | Carátula y presentación de integrantes. | *"Buenas tardes profesor. Presentamos el prototipo académico de Crédito Barrio para el curso SI642. Nuestro equipo está compuesto por [Nombres reales de los integrantes]. Desarrollamos esta solución como prototipo local para modelar la cuenta corriente vecinal aplicando ingeniería económica."* |
| **02:00 - 04:30** | Diapositivas de fórmulas financieras y delimitación legal. | *"Explicamos el marco matemático: convención 30E/360, equivalencia de tasas y amortización francesa con periodo de gracia inicial capitalizado. Precisamos que la prelación de pagos se adopta conforme a la rúbrica del curso como buena práctica referencial."* |
| **04:30 - 07:00** | Terminal Windows: arranque con `npm run dev` y apertura de `localhost:4200`. | *"Mostramos el entorno en Windows. Ejecutamos `npm run dev`. El backend en Node 24 utiliza la base de datos local `credit.sqlite` y sirve la API en el puerto 3000, mientras Angular 21 corre en el 4200."* |
| **07:00 - 10:30** | Navegador: Login como `plataforma` y luego como `bodega` (`STORE_ADMIN`). | *"Iniciamos sesión con `plataforma` para ver las tiendas y auditoría. Luego ingresamos como `bodega` para ver catálogo y clientes con sus días de corte y tasas pactadas."* |
| **10:30 - 14:00** | **Demostración de Caso 1:** Compra en cuotas del 15/09/2026. | *"Registramos la compra del Caso 1 por S/ 600 a 3 meses. El sistema calcula 11 días de gracia y capitaliza el principal a S/ 605.66. Se genera el cronograma francés: cuotas 1 y 2 por S/ 212.46 y cuota 3 ajustada por S/ 212.44, amortizando los S/ 605.66 exactos."* |
| **14:00 - 17:00** | **Demostración de Caso 2:** Fin de mes y mora al 06/10/2026. | *"Probamos el Caso 2: compra antes y después del corte. Generamos el estado de setiembre. Si simulamos el cobro el 6 de octubre (10 días después del vencimiento), el sistema devenga S/ 1.99 de mora histórica, cobrando S/ 203.31 exactos e imputando a mora, interés y capital."* |
| **17:00 - 19:00** | Portal de Cliente (`cliente`), exportación CSV y prueba de aislamiento con `salon`. | *"Ingresamos como cliente para consultar el saldo disponible y descargar el CSV protegido contra inyecciones. Mostramos que un comercio no puede ver estados de otro comercio."* |
| **19:00 - 20:00** | Conclusiones y cierre del video. | *"Concluimos la presentación destacando que el prototipo replica las formulaciones financieras del curso. Muchas gracias."* |

---

## 3. Lista de Verificación (Checklist) para la Entrega Final

- [ ] **Informe en Word/PDF:** Completar datos reales de los integrantes, porcentajes de aporte y matriz de interacción con IA.
- [ ] **Aprobación de Reutilización de Código:** Confirmar con el docente del curso la aprobación del uso de la base de código Angular y dejar constancia de que la licencia original no fue localizada.
- [ ] **Presentación en Diapositivas:** Verificar que los valores del Caso 1 y Caso 2 coincidan con la ejecución de Node ($P = 605.66$, cuotas $212.46$ y $212.44$, mora $1.99$).
- [ ] **Video Demostrativo:** Duración estricta menor o igual a 20 minutos con participación oral efectiva de los alumnos.
- [ ] **Empaquetado ZIP:** Excluir `node_modules/`, `dist/` y archivos `.sqlite` temporales.
