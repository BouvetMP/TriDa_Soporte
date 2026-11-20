# Errores actuales y mejoras pendientes — TriDa

**Revisión:** 20 de noviembre de 2026  
**Alcance:** estado visible del repositorio en esta revisión; se excluye la implementación de IA. La lista separa errores verificables, deuda de calidad y cambios que necesitan decisión o actualización de datos. No significa que cada mejora sea un defecto funcional.

## Resumen ejecutivo

- Los errores antiguos de cuentas, navegación, transacciones, alertas, montos de entrada, fechas, estilos, autenticación básica y filtros globales ya no deben tratarse como pendientes sin volver a comprobarlos.
- No se identificó un fallo de compilación en esta revisión: pasan las pruebas de contrato backend, las pruebas frontend, typecheck, lint y builds.
- **Resuelto en esta sesión:** README y backend coinciden en que solo `GASTO` confirmado consume presupuesto; `AHORRO`, pendientes y rechazados no cuentan.
- **Política definida e implementación agregada:** auditoría personal de solo lectura, sin IP y con conservación indefinida; falta ejecutar las pruebas de integración PostgreSQL en una base descartable.
- **Resuelto en esta sesión:** los cálculos de saldos netos, tasas de ahorro, progreso de metas y umbrales monetarios de riesgo mantienen `Prisma.Decimal` hasta la serialización.
- **B2 resuelto en el actualizador:** se desconectan los triggers legacy que duplicaban el backend, sin borrar sus funciones existentes, para dejar abierta una integración externa futura.
- **Pruebas de integración ampliadas; ejecución PostgreSQL pendiente:** se añadieron casos para alertas/saldos, metas/aportes, presupuestos/triggers y restablecimiento de contraseña.
- La integración PostgreSQL no se ejecutó localmente: necesita una base exclusiva de pruebas. No se conectó ni modificó una base real.
- Los cambios locales sin commit también forman parte de la inspección; ver la sección final.

## Prioridad 1 — Aclarar y proteger el comportamiento financiero

### 1. Presupuesto: documentar solo `GASTO` — RESUELTO

El servicio y el trigger SQL suman movimientos `GASTO` confirmados; no suman `AHORRO`. El README afirma lo contrario.

- **Corrección aplicada:** README actualizado para indicar que solo `GASTO` confirmado consume presupuesto; `AHORRO`, pendientes y rechazados no cuentan ni generan avisos. El servicio y el trigger ya aplicaban esa regla.
- **Implicación:** queda alineada la documentación, sin cambio en reglas de negocio ni en la base de datos.
- **Referencias:** [budgets.service.ts](../backend/src/modules/budgets/budgets.service.ts), [schema.sql](../database/schema.sql), [README.md](../README.md).

### 2. Ampliar las pruebas de integración de las rutas críticas — COBERTURA AGREGADA; VALIDACIÓN PENDIENTE

Se ampliaron las pruebas del backend en `transactions.integration.test.ts` para cubrir:

- Registro/login, rechazo de ruta protegida sin JWT, reset de contraseña, reutilización del token y rechazo del JWT invalidado.
- Confirmar/rechazar alertas, resolver un bloqueo del sistema y comprobar que el saldo cambia una sola vez o no cambia cuando corresponde.
- Crear una meta, contabilizar aporte inicial y posterior, marcarla completada y rechazar aportes adicionales.
- Crear/actualizar presupuestos y comprobar los avisos del trigger al cruzar 80 % y 100 %; `AHORRO` no genera esos avisos.

`typecheck`, lint, formato y las pruebas de contrato pasan. No se ejecutó `test:integration` porque falta una base PostgreSQL descartable; la validación queda pendiente para una ejecución manual aislada.

**Pendiente:** confirmar la ejecución PostgreSQL en CI o en una base descartable explícita antes de considerar validada la integración. No usar `DATABASE_URL` de desarrollo como sustituto.  
**Referencias:** [transactions.integration.test.ts](../backend/src/tests/transactions.integration.test.ts), [ci.yml](../.github/workflows/ci.yml).

### 3. Validar los scripts SQL sobre una copia representativa

El proyecto eligió SQL manual. `schema.sql` es ahora el único instalador/actualizador idempotente para bases nuevas y existentes. El script no se ha validado aquí contra una copia de la base actualmente desplegada.

- **Validación manual pendiente:** en una base descartable, aplicar `schema.sql` desde cero; después simular el esquema anterior sin `saldo_actual`, `email_verificado_en` y `token_version`, con el constraint antiguo de roles y los triggers legacy; volver a aplicar `schema.sql` dos veces y comprobar el backfill, `NOT NULL`, el trigger de presupuesto, la desconexión de triggers legacy, la conservación de sus funciones y la creación del perfil faltante.
- Esa validación cubrirá un escenario representativo, pero no sustituye aplicar el script a una copia con datos similares a producción.
- Mantener respaldo y procedimiento de recuperación antes de ejecutarlo en un entorno importante.
- **B2 corregido en el esquema unificado:** se desconectan `trg_alerta_feedback` y `trg_meta_completada`, que duplicaban reglas ahora gestionadas por el servicio. No se eliminan sus funciones SQL; quedan disponibles como punto de extensión para una integración externa futura. La inspección de solo lectura de la base local no encontró esos triggers.
- No se ejecutó PostgreSQL localmente porque no hay una base descartable disponible. No se usó CI ni se conectó o modificó una base local.

**Implicación:** aunque `schema.sql` sea idempotente, una base histórica puede contener datos o divergencias no representadas en el escenario de CI. Respaldar y probar sobre una copia representativa antes de actualizar datos importantes.  
**Referencias:** [database/schema.sql](../database/schema.sql), [backend/prisma/schema.prisma](../backend/prisma/schema.prisma).

## Prioridad 2 — Privacidad, precisión y documentación de contratos

### 4. Política de auditoría y retención — POLÍTICA DEFINIDA; VALIDACIÓN POSTGRESQL PENDIENTE

**Decisión:** conservar indefinidamente la bitácora append-only; no guardar IP en los eventos nuevos; permitir que cada usuario consulte únicamente su propio historial y no ofrecer operaciones para editarlo o borrarlo.

- **Implementado:** inicios de sesión exitosos/fallidos, registro/cambios de confianza/eliminación de dispositivos y resolución de alertas se escriben en `logs_auditoria`. Los cambios de email, contraseña y estado se registran mediante el trigger existente.
- **Implementado:** `GET /api/v2/audit` filtra por el usuario autenticado, pagina con cursor y no devuelve la columna IP; el perfil muestra el historial en modo de solo lectura.
- **Sin cambio de esquema ni SQL ejecutado:** se usa la tabla y los triggers existentes.
- **Implicación aceptada:** la retención indefinida acumula registros con el tiempo. Los intentos fallidos con una cuenta no identificable se guardan sin `id_usuario`, por lo que no aparecen en el historial personal.
- Si se añade eliminación de cuentas, habrá que resolver cómo anonimizar sus eventos: la FK usa `ON DELETE SET NULL`, mientras las reglas de la bitácora bloquean `UPDATE`.
- **Decisión confirmada:** conservar las IP que ya existen en `logs_auditoria`; no se hará una limpieza retroactiva. Los eventos nuevos no guardan IP, el endpoint no expone las históricas y `createTransaction` rechaza `ip_origen`. La prueba de integración verifica la ocultación y que la lectura no altere el valor histórico.
- Las pruebas de integración están ampliadas, pero falta ejecutarlas contra PostgreSQL en CI o en una base descartable.

**Referencias:** [database/schema.sql](../database/schema.sql), [backend/src/modules/audit](../backend/src/modules/audit), [SecurityHistory.tsx](../frontend/src/components/profile/SecurityHistory.tsx).

### 5. Revisar cálculos que convierten `Decimal` a `number` — RESUELTO

Algunos cálculos financieros convertían agregados `NUMERIC` a `Number` antes de restar, calcular porcentajes o comparar umbrales.

- **Corrección aplicada:** dashboard, reportes e insights calculan balances y tasas con decimales; metas conservan la precisión al calcular el progreso, y la evaluación de riesgo compara importes con múltiplos decimales exactos.
- Las conversiones a `number` que permanecen son para respuestas JSON o formato de texto, no para operaciones financieras posteriores.
- **Pruebas añadidas:** diferencia de centavos, importes cercanos al máximo de `NUMERIC(15,2)`, porcentaje de ahorro y límites estrictos de riesgo.
- **Sin cambios de esquema ni SQL.** La presentación sigue en COP; elegir USD u otras monedas requiere una decisión aparte sobre conversión real, no solo cambiar el símbolo.

**Implicación:** se evitan errores binarios de coma flotante en los cálculos financieros de estas rutas, manteniendo el contrato numérico actual de la API.  
**Referencias:** [decimal-money.ts](../backend/src/utils/decimal-money.ts), [transaction-balance.ts](../backend/src/modules/transactions/transaction-balance.ts), [risk.service.ts](../backend/src/modules/alerts/risk.service.ts), [dashboard.service.ts](../backend/src/modules/dashboard/dashboard.service.ts), [savings.service.ts](../backend/src/modules/savings/savings.service.ts), [reports.service.ts](../backend/src/modules/reports/reports.service.ts), [insights.service.ts](../backend/src/modules/insights/insights.service.ts).

### 6. Completar la especificación OpenAPI — RESUELTO

- Se documentó la forma concreta de `data` para cada respuesta 2xx de `/api/v2/`, incluidas rutas alias y respuestas cuyos decimales Prisma se serializan como texto.
- Se añadieron ejemplos representativos para todas las operaciones exitosas y se corrigieron ejemplos de categorías que no reflejaban el recurso devuelto.
- Se eliminó el esquema genérico `SuccessResponse`; una prueba contractual exige un esquema específico y un ejemplo por operación.
- `SwaggerParser.validate` valida el documento completo desde la suite de contratos, que ya se ejecuta en CI.

**Validación:** typecheck, lint y las 27 pruebas contractuales pasan; 27/27 incluye la validación completa de Swagger Parser.  
**Referencias:** [swagger.ts](../backend/src/config/swagger.ts), [contracts.test.ts](../backend/src/tests/contracts.test.ts), [ci.yml](../.github/workflows/ci.yml).

**Implicación:** los clientes pueden implementarse con supuestos erróneos aunque la API funcione.  
**Referencias:** [swagger.ts](../backend/src/config/swagger.ts), [contracts.test.ts](../backend/src/tests/contracts.test.ts), [ci.yml](../.github/workflows/ci.yml).

## Prioridad 3 — Operación y mantenibilidad

### 7. Mejorar diagnóstico y reutilización del transporte de correo

**Estado: corregido.** El backend ahora agrega un identificador a cada petición y usa logs estructurados; `mailer` reutiliza su transporte SMTP.

- Se registran las peticiones HTTP completadas en JSON con `request-id`, método, ruta sin query string, estado y duración; no se habilita el log de SQL ni de parámetros.
- Los errores operativos se registran con metadatos seguros; no se registran cuerpos, credenciales, enlaces con tokens ni mensajes/stack de excepciones.
- Se reutiliza un transporte SMTP con pool; el apagado ordenado espera los envíos activos y después lo cierra antes de desconectar Prisma.
- **Validación:** las pruebas contractuales comprueban el request ID, los metadatos de logs y la omisión de secretos. No se envió correo a un servidor SMTP real.

**Implicación:** facilita correlacionar el flujo de peticiones en producción, evita exponer tokens en logs y reduce la creación repetida de conexiones SMTP.  
**Referencias:** [app.ts](../backend/src/app.ts), [requestLogger.middleware.ts](../backend/src/middlewares/requestLogger.middleware.ts), [logger.ts](../backend/src/utils/logger.ts), [mailer.ts](../backend/src/utils/mailer.ts).

### 8. Evitar consultas repetidas de categorías y unificar los clientes API

**Estado: corregido.** Las categorías se comparten en memoria para el usuario autenticado y los clientes API exponen solo el payload.

- El contexto carga categorías cuando una pantalla las necesita, deduplica solicitudes pendientes, actualiza la caché tras crear/editar/desactivar y la reinicia al cambiar de usuario.
- El modal de nuevo presupuesto no carga categorías mientras permanece cerrado.
- Todos los métodos de los clientes API devuelven el payload `data` o un resultado derivado explícito; también se conservan los datos de respuestas de mensajes, borrados y cambios de estado. Los errores HTTP siguen propagándose por Axios.
- Las pruebas cubren deduplicación, aislamiento por usuario, mutaciones de la caché y el retorno de payloads en operaciones que antes los descartaban.

**Validación:** las 21 pruebas frontend, typecheck, lint y formato pasan.
**Implicación:** menos solicitudes repetidas y menos lógica condicional en hooks y pantallas.  
**Referencias:** [CategoriesContext.tsx](../frontend/src/context/CategoriesContext.tsx), [useCategories.ts](../frontend/src/hooks/useCategories.ts), [Client.ts](../frontend/src/api/Client.ts).

### 9. Terminar pequeños pendientes de resiliencia frontend

**Estado: corregido.**

- `ToastProvider` limpia sus temporizadores al cerrar notificaciones o desmontarse y memoriza el valor del contexto.
- `AppLayout` usa `h-dvh` para adaptarse a la altura dinámica del viewport móvil.
- `App.tsx` envuelve las rutas en un `ErrorBoundary` con un fallback accesible y opción para recargar.

**Validación:** 4 pruebas de `ToastProvider` y `ErrorBoundary`, typecheck, lint y build de producción pasan. El build se ejecutó con una URL HTTPS ficticia solo para satisfacer la validación de configuración; no se contactó ninguna API.
**Implicación:** mejora la limpieza de recursos, el comportamiento en móviles y la recuperación ante errores de render.  
**Referencias:** [Toast.tsx](../frontend/src/components/ui/Toast.tsx), [AppLayout.tsx](../frontend/src/components/layout/AppLayout.tsx), [ErrorBoundary.tsx](../frontend/src/components/shared/ErrorBoundary.tsx), [App.tsx](../frontend/src/App.tsx).

### 10. Cerrar limpieza de tooling y deuda pequeña — CORREGIDO

- **Corregido:** ESLint usa globals de navegador en la aplicación y el script de inicialización del tema; limita globals de Node a los archivos de configuración.
- **Corregido:** se habilitaron `rules-of-hooks`, `exhaustive-deps` y las reglas recomendadas de accesibilidad. Se corrigieron los hallazgos detectados en formularios, controles y filas de alertas.
- **Corregido:** `format` y `format:check` cubren los archivos compatibles de todo el frontend con Prettier, excluyendo salidas generadas e ignoradas.
- **Corregido:** Vite y TypeScript usan únicamente el alias `@`; `env.d.ts` está bajo `src/`; los archivos de configuración generados no se emiten y están ignorados por Git.
- **Corregido:** se retiró `calcularDistancia`, se mantiene `haversineDistance` donde se usa, y `.gitignore` excluye `coverage/`. Las dependencias del mapa y `utils/password.ts` se conservan porque tienen usos reales.

**Validación:** Prettier, lint, typecheck, pruebas frontend y build de producción pasan.

**Implicación:** el lint detecta problemas de hooks y accesibilidad sin mezclar globals de Node con el código de navegador; Prettier mantiene el formato del frontend de forma verificable.
**Referencias:** [eslint.config.js](../frontend/eslint.config.js), [frontend/package.json](../frontend/package.json), [vite.config.ts](../frontend/vite.config.ts), [.gitignore](../.gitignore), [geo.ts](../backend/src/utils/geo.ts).

### 11. Coherencia de metas de ahorro — CORREGIDO

- La creación genera el aporte inicial y recalcula el estado al alcanzar el objetivo.
- Cambiar el objetivo recalcula `ACTIVA` o `COMPLETADA` según el progreso real.
- `PAUSADA` y `CANCELADA` se conservan como estados manuales.
- `fecha_limite: null` permite borrar la fecha límite.
- Los resúmenes excluyen metas pausadas y canceladas.

**Validación:** hay pruebas unitarias para el cálculo y el resumen, y la prueba de integración cubre aportes iniciales, recálculo al editar el objetivo, limpieza de `fecha_limite` y conservación de estados manuales. La integración requiere `TEST_DATABASE_URL` y no se ejecutó en esta verificación.

**Implicación:** evita estados contradictorios como una meta completada sin alcanzar el objetivo. Los estados derivados vuelven a calcularse tras editar el objetivo; los aportes futuros mantienen el estado mediante el trigger y la lógica del servicio.

### 12. Tarjetas y maquetación de mapa/reportes — CORREGIDO

- El mapa muestra cuatro métricas distintas: ubicaciones geolocalizadas, ciudades, países y transacciones de riesgo alto.
- Ya no repite la métrica de ubicaciones ni muestra una quinta tarjeta en el grid.
- Reportes muestra categorías y una sección independiente con comercios principales.

**Validación:** los dos tests de mapa/reportes y el typecheck frontend pasan.

**Implicación:** elimina duplicación visual y hace que los datos disponibles tengan una representación visible en la interfaz.

### 13. Medidor de fortaleza de contraseñas — CORREGIDO

- Registro, recuperación y cambio de contraseña usan una misma utilidad de validación.
- Se exige un mínimo de 10 caracteres y un máximo de 72, además de mayúscula, minúscula y número.
- El medidor muestra explícitamente los cinco criterios y solo informa `Válida` al cumplirlos todos.
- OpenAPI refleja las mismas longitudes y requisitos para registro, recuperación y cambio.

**Validación:** 27 tests backend, 4 tests frontend, typecheck, lint y formato pasan.

**Implicación:** evita que el frontend considere segura una contraseña que el backend rechazaría y elimina reglas duplicadas divergentes.

### 14. Redondeo y límites monetarios — CORREGIDO

- El backend normaliza montos con `Prisma.Decimal` y redondeo a dos decimales antes de guardarlos o usarlos en incrementos.
- Transacciones, presupuestos, metas, aportes y saldo inicial comparten la validación del límite exacto de `NUMERIC(15,2)`: `9,999,999,999,999.99`, después del redondeo.
- Los campos monetarios del frontend permiten incrementos de centavo.

**Validación:** pruebas de centavos, límite máximo y redondeo alrededor del límite pasan.

**Implicación:** elimina deriva de centavos y evita errores tardíos de PostgreSQL por montos fuera de rango.

### 15. Filtro global de cuentas y periodos — CORREGIDO

- Dashboard, reportes, presupuestos y mapa reciben la cuenta seleccionada o `null` para todas las cuentas.
- El dashboard usa límites mensuales exclusivos y el backend aplica `America/Bogota`.
- El frontend usa fechas de calendario de Bogotá para reportes y presupuestos.
- Al desactivar o eliminar una cuenta seleccionada, el contexto vuelve a `Todas las cuentas`.

**Validación:** tests de periodos de reporte en el límite UTC/Bogotá y de reset de cuenta seleccionada pasan; typecheck frontend pasa.

**Implicación:** las pantallas financieras comparten el mismo criterio de selección y no mezclan periodos del mes local del navegador con rangos del servidor.

### 16. Manejo uniforme de errores — CORREGIDO

- Las clases de dominio heredan `AppError` y asignan códigos propios.
- Autenticación y límites de tasa producen la misma estructura JSON y códigos HTTP.
- Las categorías inválidas en presupuestos producen 400 y un código específico.

**Validación:** tests backend verifican el envelope estándar, el código de dominio y que los errores internos no filtren mensajes; typecheck backend pasa.

**Implicación:** clientes y logs pueden distinguir el dominio y el motivo sin depender solo del status HTTP.

## Decisiones ya tomadas; conservar por ahora

- Mantener por ahora las funciones SQL legacy porque no se ha confirmado que no existan consumidores externos. No eliminar funciones `fn_*` ni retirar más triggers sin inventariar dichos consumidores; el esquema unificado sí desconecta los dos triggers que duplicaban reglas del backend, conservando sus funciones.
- Mantener la estrategia SQL actual: `database/schema.sql` es el único script de instalación/actualización; no adoptar otra herramienta de migraciones por ahora.
- Posponer la migración de JWT de `localStorage` a cookie `HttpOnly` hasta que exista una necesidad concreta de despliegue y se pueda diseñar el cambio coordinado de CSRF, CORS, cookies y sesiones.
- Mantener `VARCHAR + CHECK` en vez de migrar columnas a enums nativos. Prisma debe seguir reflejando el esquema actual.
- El primer dispositivo registrado se considera confiable; el registro y el envío del identificador ya están conectados al frontend. No habilitar un cambio de política sin volver a evaluar el efecto en riesgo.
- Los aportes a metas son independientes de las transacciones de cuenta; no descuentan automáticamente saldo.
- Las categorías se desactivan lógicamente y los presupuestos consideran solo `GASTO` en el código actual.

## Últimos — Cambios grandes o con impacto en datos/compatibilidad

No ejecutar estos cambios como parte de una limpieza rutinaria. Requieren decisión explícita, diseño, pruebas, respaldo y procedimiento de actualización para bases existentes:

1. **Separar saldo inicial de saldo actual:** agregado `saldo_actual` en Prisma y el esquema unificado. Las transacciones, alertas, dashboard y frontend ahora usan el saldo actual; `saldo_inicial` permanece como referencia de creación. Pendiente ejecutar y validar la migración sobre una base de pruebas o copia representativa.
2. **Migrar JWT de `localStorage` a cookie `HttpOnly` — POSPUESTO:** reevaluar cuando el despliegue sea inminente y coordinar backend/frontend, CORS, CSRF, sesiones y rollback.
3. **Cambiar tipos/estructura de la base o retirar SQL legacy/tablas — POSPUESTO:** verificar primero consumidores externos y preparar scripts compatibles con las bases actuales.
4. **Cambiar la estrategia manual de esquema — NO PLANIFICADO:** se mantiene `schema.sql` como único instalador/actualizador hasta una decisión explícita distinta.

## Validación de esta revisión y límites

En la corrección del error 10 pasan:

- Frontend: ESLint, typecheck, 12 pruebas en 6 archivos y `format:check` para la configuración.
- Backend: typecheck tras retirar el alias sin uso.
- No se ejecutó un build de producción en esta corrección; requiere una `VITE_API_BASE_URL` pública con HTTPS.

No se ejecutaron pruebas de integración locales porque requieren `TEST_DATABASE_URL` configurada para una base descartable. No se ejecutó ningún SQL ni se modificó ninguna base de datos. Los cambios locales sin commit se inspeccionaron, pero deben revisarse y confirmarse por separado antes de considerarlos parte de una entrega.
