# Verificación de integración local

Fecha: 2026-09-07. Entorno: Windows, Node 24.15.0, npm 11.12.1, Microsoft Edge headless mediante Playwright. Fuente original: `ZAICO21/credit-drive`, commit `571b839`. Esta copia no fue publicada ni se hicieron commits/push.

## Comandos ejecutados y resultados

| Comando | Resultado observado |
|---|---|
| `npm install --ignore-scripts` | Dependencias instaladas; lockfile actualizado |
| `npm run test:local` | **39/39 pruebas correctas**, 16 suites, cero fallos |
| `npm test -- --watch=false` | **7/7 pruebas correctas** con Angular/Vitest |
| `npm run build` | Build correcto en `dist/credit-drive/browser`; advertencias de tamaño CSS, no errores |
| `npm run test:e2e` | **Recorrido completo correcto en Microsoft Edge**, 7 grupos de flujos, viewport escritorio y móvil 375x667 |
| Inicio local `node scripts/dev.mjs` | Interfaz `http://127.0.0.1:4200` respondió HTTP200; proxy `/api/health` devolvió `{ok:true}`. Base SQLite de demostración inicializada; log de errores vacío |
| `npm audit fix --ignore-scripts` | Actualizaciones compatibles aplicadas; siguen **17 avisos** (2 bajos, 3 moderados, 12 altos) en auditoría completa. No se usó `--force` |

La revisión estática independiente encontró errores de snapshots, hora de cierre y conservación del pago que fueron corregidos y cubiertos con pruebas. Las pruebas se ejecutaron finalmente por el integrador; los trabajadores no podían ejecutar comandos en su sandbox Windows. No se atribuye éxito a comandos bloqueados.

## Cobertura comprobada

### Motor y API
- 30E/360 (incluido octubre26→noviembre10 = 14 días comerciales), años bisiestos y rechazo de fechas imposibles.
- TEA/TNA, capitalización, tasa cero, ejemplo obligatorio de 11 días de gracia, último saldo sin centavos residuales.
- Dos juegos con resultados literales: S/600 al36% TEA, cuotas212.46/212.46/212.44; S/200 al24% TNA k30, interés1.32 y mora1.99 al pagar10 días tarde al36% TNA.
- Compra antes/después de hora de corte; automatización probada con reloj controlado08:00/18:00/18:01 e idempotencia.
- Conservación de tasas históricas y mora con varias tasas dentro de un estado; bloqueo de cambio de moneda con historial.
- Límite crediticio, pagos parciales/excesivos/con más de2decimales y pago duplicado rechazados.
- Roles, aislamiento entre tiendas/clientes, usuario/tienda inactivos, consultas SQL parametrizadas, sesiones revocadas y persistencia tras reabrir SQLite.
- JSON inválido y cuerpos de más64KiB rechazados; exportación CSV y detalles de pago conservados.

### Navegador real
1. Login plataforma, alta de tienda, desactivación/reactivación.
2. Login bodega, recarga autenticada, alta de producto y cliente con condiciones financieras.
3. Compra en cuotas, vista previa del servidor y registro.
4. Cierre de octubre2026, detalle, CSV cuyo contenido se inspecciona y pago completo.
5. Login salón: no aparecen productos/clientes de la bodega.
6. Login cliente: tablero, estados propios, catálogo sin edición.
7. Móvil375px: sin desbordamiento horizontal en tablero, apertura/cierre de menú y logout.

Capturas reales: `test-results/` (generadas y no versionadas). El script crea y cierra su propio servidor en puerto efímero con DB en memoria. No altera la DB de demostración. No constituye una prueba exhaustiva de todas las combinaciones de campos, navegadores o cargas.

## Decisiones y limitaciones que deben sustentarse
- **Prototipo docente**, no listo para producción. Dependencias heredadas con avisos (incluido `xlsx`, solo usado por el contexto vehicular no enrutado). No exponer a Internet ni cargar información personal real. El backend nuevo no usa paquetes externos.
- Días configurables de corte/pago1..28; año1900..2199. Convención concreta30E/360. Validar esta interpretación con el docente.
- Precios del catálogo expresados en la moneda de la cuenta; sin conversión FX. Moneda inmutable cuando existe historial.
- Exposición conservadora: capital pendiente incluido interés de gracia capitalizado. Tasas como porcentajes anuales, sin truncarlas en cálculos; importes monetarios redondeados por etapa y almacenados en centavos.
- Cierre manual es una **simulación irreversible de fin de día**: admite fechas futuras. Cierre automático usa hora Lima y solo funciona mientras corre el servidor; al arrancar recupera los cierres vencidos. No registrar compras de ciclos cerrados.
- Mora agrupada por condiciones históricas iguales y redondeada por grupo; pago total por estado, sin pagos parciales.
- Cuentas demo públicas; no hay proceso productivo de recuperación de contraseña, verificación de identidad ni gestión legal del consentimiento.
- Operaciones/SQLite locales; recursos visuales externos (fuentes/iconos/fotografías) pueden requerir Internet. No se verificó toda la UI sin conexión.
- Documentación en Markdown y diagramas Mermaid: requiere edición académica final, no sustituye Word/PPT/video exigidos.

## Pendientes ajenos a la implementación automática
1. Confirmar autorización/licencia de reutilización y aceptación del docente; mantener atribución al repositorio original.
2. Completar autores, sección, bibliografía específica consultada, análisis legal de aplicabilidad y Student Outcome con evidencia personal.
3. Medir y declarar el porcentaje real de ayuda de IA, responsable del grupo, solicitudes, aceptación y correcciones. La ayuda fue sustancial en código, pruebas y documentos; no atribuir artificialmente ese trabajo a estudiantes.
4. Convertir el informe a Word y el guion a PowerPoint, preparar anexos, grabar el video de hasta20min y practicar la sustentación.
5. Revisar límites de calendario y todas las reglas con el docente antes de afirmar cumplimiento integral o asignarse una calificación.
