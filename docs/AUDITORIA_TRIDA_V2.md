# Auditoría técnica — TriDa v2

**Alcance:** únicamente lo que existe hoy en el repositorio (frontend React/Vite, backend Express/Prisma, `schema.sql`, tests y documentación). No se proponen funcionalidades nuevas; solo correcciones, cambios y mejoras sobre lo ya construido.
**Método:** revisión estática del código entregado. Los puntos marcados con *(verificar)* dependen del comportamiento en ejecución/build y conviene confirmarlos.

**Leyenda:** 🔴 P0 error funcional o de seguridad real · 🟠 P1 importante · 🟡 P2 mejora / deuda técnica

---

## 0. Resumen ejecutivo

| Área | 🔴 | 🟠 | 🟡 |
|---|---|---|---|
| 1. Errores funcionales | 10 | 9 | – |
| 2. Seguridad | 3 | 8 | 3 |
| 3. Backend (lógica/API) | – | 9 | 10 |
| 4. Base de datos / Prisma | – | 5 | 5 |
| 5. Frontend (UI/estado/estilos) | 2 | 7 | 10 |
| 6. Contratos y documentación | – | 3 | 4 |
| 7. Tooling, dependencias y tests | – | 4 | 6 |

**Los 8 hallazgos que más impacto tienen hoy:**
1. Variables CSS usadas en muchos componentes **no están definidas** en `index.css` (fondos/bordes transparentes) — F9.
2. `requireAuth` convierte **cualquier error de BD en un 401**, lo que cierra la sesión del usuario — F6.
3. Una cuenta "eliminada" (desactivada) **sigue apareciendo** en el listado — F1.
4. Con "Todas mis cuentas" seleccionado, **Transacciones queda vacía** — F2.
5. Los dispositivos **nunca se registran** desde el frontend: la página está siempre vacía y parte del motor de riesgo es código muerto — F5.
6. La navegación apunta a `/categories` (no existe) y no enlaza `/devices` (sí existe) — F3.
7. Referencias `$ref` rotas en Swagger (`VerifyResetTokenRequest`, `UpdateTransactionStatusRequest`) — D1.
8. `saldo_inicial` se usa como saldo vivo y es editable por el usuario — F15.

---

## 1. Errores funcionales

### 🔴 P0

- **F1 — Cuenta desactivada sigue visible.** `accounts.service.ts › getAccounts` no filtra por `estado`; `AccountsApi.deleteAccount` llama a un endpoint que **desactiva** (`deactivate`), por lo que tras "Eliminar" la tarjeta reaparece tras el refresh. Además el diálogo dice "no se puede deshacer" y el total "Cuentas registradas" cuenta las inactivas.
  *Corrección:* filtrar `estado: true` por defecto (parámetro `?incluir_inactivas`), unificar el texto ("Desactivar cuenta") y rechazar transacciones sobre cuentas inactivas en `createTransaction`.
- **F2 — Transacciones vacías con "Todas mis cuentas".** `useTransactions` hace `if (!selectedAccount) return []`, pero el selector ofrece `null = Todas mis cuentas` como valor por defecto. La página dice "Selecciona una cuenta" y deshabilita "Nueva transacción".
  *Corrección:* si `selectedAccountId === null`, consultar sin `id_cuenta`; exigir cuenta solo al crear (selector dentro del modal).
- **F3 — Navegación inconsistente.** `NAV_ITEMS` incluye `/categories` sin ruta en `App.tsx` (cae en 404) y **no** incluye `/devices`. El `badgeKey: "pendingAlerts"` existe, pero `Sidebar` nunca pasa `pendingAlertsCount` a `SidebarNav`, por lo que el badge jamás aparece.
  *Corrección:* añadir `/devices` al menú, retirar `/categories` (o construir su página, el API ya existe), cablear el contador (contexto compartido con `useAlerts`/`AlertsApi.getPendingCount`).
- **F4 — Dashboard duplica el layout.** `DashboardPage` renderiza su propia pantalla completa (`min-h-screen`, topbar con logout y tema, "TriDa v2 Dashboard") dentro de `AppLayout`, que ya tiene sidebar con logout y tema → doble cabecera y doble scroll.
  *Corrección:* eliminar topbar/`min-h-screen`/`max-w` propios y dejar solo el contenido.
- **F5 — Dispositivos y geolocalización no se alimentan.** Ningún flujo del frontend llama a `POST /devices` ni envía `id_dispositivo`, `latitud`, `longitud` o `ciudad` en `NewTransactionModal`. Consecuencias: `DevicesPage` siempre vacía (su texto afirma que "aparecerán automáticamente"), y las reglas 2 y 3 de `risk.service` (dispositivo y velocidad imposible) y el Mapa nunca se activan con datos reales. El texto de `DevicesPage` ("requerirá autenticación nuevamente") también es falso: el JWT no está ligado al dispositivo.
  *Corrección:* registrar el dispositivo tras el login (fingerprint + UA) y enviar su id en cada transacción; opcionalmente pedir geolocalización con consentimiento; corregir los textos.
- **F6 — `requireAuth` enmascara errores de BD como 401.** El `try/catch` único cubre `verifyToken` **y** `prisma.usuario.findUnique`; si la BD falla, responde "Token inválido o expirado" (con el mensaje interno en `details`) y el interceptor del cliente borra el token y redirige a login.
  *Corrección:* separar `jwt.verify` (→ 401) de la consulta a BD (→ `next(error)` → 500/503) y no devolver `details`.
- **F7 — Orden por severidad incorrecto.** `alerts.service › getAlerts` con `sort_by=severidad` ordena alfabéticamente (`ALTA < BAJA < CRITICA < MEDIA`).
  *Corrección:* ordenar por rango (`CASE severidad WHEN 'CRITICA' THEN 4 …`) vía `queryRaw` o columna calculada.
- **F8 — Fechas "solo fecha" se muestran un día antes.** `fecha_limite` (columna `DATE`) llega como `…T00:00:00.000Z` y `formatDate` la convierte a `America/Bogota` (UTC-5) → día anterior a las 19:00.
  *Corrección:* en `formatDate` detectar fechas sin hora (o añadir variante `dateOnly`) y formatear con `timeZone: "UTC"`.
- **F9 — Variables CSS no definidas.** Los componentes usan `--color-bg-surface`, `--color-bg-surface-hover`, `--color-bg-card`, `--color-bg-secondary`, `--color-bg-hover`, `--color-border-subtle`, `--color-text-subtle`, `--color-primary-500`, `--color-primary-light`, `--color-success(-light)`, `--color-danger(-light)`, `--color-warning(-light)`; `index.css` solo define `--color-bg`, `--color-surface`, `--color-surface-hover`, `--color-border`, `--color-text-*`, `--color-primary*`, `--color-income/expense/saving`. Esos fondos/bordes/colores quedan sin valor.
  *Corrección:* elegir **un solo** sistema de tokens (los nombres de Tailwind ya existen: `bg-surface`, `border-border`, `text-text-primary`…), definir los tokens faltantes (`success/danger/warning` + `-light`) y migrar los `var(--…)` crudos a clases Tailwind.
- **F10 — Clases Tailwind inexistentes o que no funcionan.** *(verificar en build)*
  - `text-2xs` (usada en Map/Reports/Budgets) no existe → definir en `theme.extend.fontSize`.
  - `animate-slide-up`, `animate-fade-in`, `animate-scale-up` (Toast, Modal) no están en `animations.css` ni en Tailwind → definir keyframes y `extend.animation`.
  - `border-3` (Spinner) no existe en Tailwind por defecto.
  - Los colores se definen como `var(--x)`; en Tailwind 3 los modificadores de opacidad (`bg-primary/10`, `border-expense/20`, `bg-surface/50`, `hover:border-primary/40`), muy usados, **no se generan** con colores `var()` planos. Definir colores como `rgb(var(--x-rgb) / <alpha-value>)`.

### 🟠 P1

- **F11 — IDs de ruta no validados → 500.** `accounts`, `categories` y `transactions` usan `Number(req.params.id)`; `"abc"` → `NaN` → error de Prisma. `savings`/`alerts` sí usan Zod. *Corrección:* un `idParamSchema` compartido (`z.coerce.number().int().positive()`).
- **F12 — Transacción `RECHAZADA` con alerta `PENDIENTE` irresoluble.** Una evaluación `BLOQUEADA` crea la transacción como `RECHAZADA` y una alerta `PENDIENTE`; si el usuario pulsa "Fui yo", `updateAlertStatus` lanza 409 ("rechazada no puede aprobarse"). La alerta solo se cierra con "No fui yo". *Corrección:* definir el flujo (permitir liberar una transacción bloqueada por el propio usuario, o cerrar la alerta automáticamente) y mostrar el motivo en la UI.
- **F13 — Estado de transacción invisible y sin resolución.** El endpoint `PATCH /transactions/:id/status` no tiene UI y `TransactionsTable` no muestra `estado` (PENDIENTE/RECHAZADA), solo riesgo. *Corrección:* columna/badge de estado y acciones Confirmar/Rechazar para pendientes.
- **F14 — Email sin normalizar.** `registerSchema`/`loginSchema` no hacen `trim().toLowerCase()`; `findUnique({email})` es sensible a mayúsculas y `LoginForm` no normaliza (solo `RegisterForm` lo hace). *Corrección:* normalizar en los schemas Zod.
- **F15 — `saldo_inicial` usado como saldo actual.** El campo se incrementa/decrementa con cada transacción, pero se llama "inicial", y `EditAccountModal` permite sobrescribirlo (rompe la coherencia con el historial). *Corrección:* separar `saldo_inicial` (inmutable) de saldo actual (calculado o columna `saldo`), o al menos no permitir editarlo por PATCH y mostrar etiqueta "Saldo actual".
- **F16 — Metas de ahorro.**
  - `create` con `monto_actual ≥ monto_objetivo` queda `ACTIVA` (el trigger solo actúa en UPDATE de `monto_actual`).
  - `update` que baje el objetivo por debajo del actual no recalcula estado.
  - `fecha_limite` no se puede borrar (`undefined`/falsy se ignora).
  - `useSavings` incluye metas `CANCELADA`/`PAUSADA` en `total_objetivo` y `porcentaje_general`.
  - El `monto_actual` inicial no genera un `aporte_meta`, por lo que no coincide con la suma de aportes.
- **F17 — Tarjetas/maquetación incompletas.** `MapSummaryCards` repite la misma métrica dos veces ("Ubicaciones registradas" y "Puntos registrados", ambas `total_geolocalizadas`) y pinta 5 tarjetas en un grid de 4. `ReportsPage` define un grid de 12 columnas con solo un hijo `col-span-7` (comentario "Categorías y Comercios", pero `top_comercios` nunca se muestra).
- **F18 — `PasswordStrengthMeter` engañoso.** Con 3 de 4 reglas muestra "Aceptable", pero el backend exige las 4. *Corrección:* mostrar "Válida" solo con 4/4.
- **F19 — Redondeo de montos.** `z.coerce.number().positive()` admite más de 2 decimales y valores enormes. El monto se redondea al guardarse (`NUMERIC(15,2)`), pero el `increment` del saldo usa el valor sin redondear → posible deriva de centavos; valores > 10¹³ producen error de BD. *Corrección:* `.multipleOf(0.01)` (o redondeo explícito) y `.max(…)` en transacciones, presupuestos, metas y aportes.
- **F20 — Filtro de cuenta y periodos inconsistentes.** El selector global de cuenta solo afecta a Transacciones; Dashboard, Reportes, Presupuestos y Mapa lo ignoran. `dashboardService.getStats` usa `fecha_transaccion >= inicioMes` **sin límite superior** (incluye fechas futuras permitidas por `fecha_transaccion` libre) y la hora local del servidor.

---

## 2. Seguridad

### 🔴 P0

- **S1 — Enumeración de usuarios.** `register` responde "El correo ya está registrado" (400); `login` responde más rápido si el usuario no existe (no ejecuta `bcrypt.compare`); `forgotPassword` espera el envío SMTP antes de responder cuando el usuario existe. *Corrección:* comparar contra un hash ficticio, responder `forgot-password` sin esperar el correo (cola/`setImmediate`) y, si se quiere, respuesta genérica en registro con confirmación por email.
- **S2 — JWT sin algoritmo fijado y sesiones que sobreviven a cambios de contraseña.** `verifyToken` no restringe `algorithms: ["HS256"]`; tras `changePassword`/`resetPassword` los JWT de 8 h siguen siendo válidos. *Corrección:* fijar algoritmo, añadir `password_changed_at`/`token_version` al payload y compararlo en `requireAuth`.
- **S3 — `identificador_unico` de dispositivo único global.** Un usuario puede "ocupar" el fingerprint de otro (DoS) y recibe 409 revelando que existe en otra cuenta. *Corrección:* unicidad por `(id_usuario, identificador_unico)`.

### 🟠 P1

- **S4 — Rate limiting.** Una única instancia `authRateLimiter` (10/15 min por IP) se comparte entre login, registro, forgot, verify y reset: `verify-reset-token` se llama al cargar la página y consume el cupo. Además no hay `app.set("trust proxy", …)` → tras un proxy todos comparten IP y `req.ip` es incorrecto. Revisar uso de `max` (en express-rate-limit v8 es `limit`) *(verificar)*. *Corrección:* limitadores por ruta, clave IP+email en login, `skipSuccessfulRequests`, `trust proxy`.
- **S5 — `limit` sin máximo en `GET /transactions`.** `limit: z.coerce.number().int().positive()` permite `limit=10000000`. *Corrección:* `.max(100)`.
- **S6 — Fuga de detalles internos.** `errorHandler` devuelve `details: { prisma_code }` y, para cualquier error con `statusCode`, el `message` original (p. ej. errores de parseo de `express.json`). `requireAuth` devuelve el mensaje de la excepción. Contradice la regla RS-007 declarada.
- **S7 — Swagger expuesto siempre.** `/api/docs` y `/api/docs.json` están abiertos también en producción y bajo el CSP por defecto de Helmet *(verificar que la UI cargue)*. *Corrección:* habilitar solo en `development` o tras autenticación.
- **S8 — Inyección de fórmulas en el CSV.** `exportReport` solo escapa comillas; un `comercio` que empiece por `=`, `+`, `-` o `@` se ejecuta en Excel. *Corrección:* prefijar con `'` o tabulador esas celdas.
- **S9 — Contraseñas.** `auth.service` usa `bcrypt.hash(…, 10)` mientras `utils/password.ts` define 12 rondas y no se usa. Falta `.max(72)` (bcrypt trunca). *Corrección:* un solo helper (≥12 rondas) y límite de longitud.
- **S10 — Token de reset en el historial.** `ResetPasswordPage` lee `#token=` pero no lo elimina de la URL. *Corrección:* `history.replaceState(null, "", location.pathname)` tras leerlo.
- **S11 — JWT en `localStorage`.** Riesgo XSS conocido. Mitigación a corto plazo: CSP estricta en el frontend; a medio plazo, cookie HttpOnly + CSRF (la guía ya lo anticipa). Si no se usan cookies, quitar `credentials: true` del CORS.

### 🟡 P2

- **S12 — Auditoría de seguridad.** `logs_auditoria` solo se llena por triggers de `usuarios`; no se registran login fallido/exitoso, resolución de alertas, cambios de confianza de dispositivo ni bloqueos. Para un producto antifraude conviene escribir estos eventos desde la aplicación (y actualizar `ultimo_acceso`, hoy nunca se escribe).
- **S13 — Privacidad.** Cada transacción guarda `direccion_ip` en `ubicaciones` aunque no haya coordenadas; el mapa embebe `openstreetmap.org` en un `iframe` (envía coordenadas a un tercero). Definir retención/aviso y usar `referrerpolicy="no-referrer"` + `sandbox`.
- **S14 — Logs en desarrollo.** Prisma loguea `query` con parámetros (puede incluir hashes/emails). Desactivar `query` o enmascarar.

---

## 3. Backend (lógica y API)

### 🟠 P1

- **B1 — Manejo de errores heterogéneo.** Hay clases `AccountError`, `CategoryError`, `AuthError`, `BudgetError`, `SavingsError`, `TransactionError`, `AlertError`, `DeviceError`, `ProfileError`; algunos controladores las capturan (`handleAccountError`), otros las dejan pasar al `errorHandler` por la propiedad `statusCode`. `DevicesController.getById` tiene ramas muertas (`!device`) porque el servicio lanza. *Corrección:* una sola `AppError(statusCode, code, message)` y tratarla solo en `errorHandler`; códigos de error propios (no solo por status).
- **B2 — Lógica duplicada servicio ↔ triggers.** `trg_alerta_feedback` (BD) y `alerts.service` actualizan ambos el estado de la transacción; el trigger exige `FUI_YO AND estado='CONFIRMADA'` (el servicio envía `DESCARTADA`), no contempla `BLOQUEAR_TARJETA` y marca `APROBADA`. Igual con la finalización de metas (trigger + comprobación en `addFunds`). *Corrección:* elegir una sola fuente de verdad (recomendado: servicio) y eliminar el trigger redundante.
- **B3 — Umbrales de riesgo repetidos y dispares.** `>=30/70/95` aparece en `risk.service`, SQL de transacciones (×3), SQL del mapa (×2) y `Map.ts` del frontend; "riesgo alto" es `>=50` en `maps.getStats`, `profile` e `insights`, pero `ALTO` es `>=70` en el resto. *Corrección:* constantes únicas (`RISK_THRESHOLDS`) y una función SQL/TS compartida.
- **B4 — Zona horaria y rangos de fecha.** `resolveDateRange` (reports), `listTransactions`, `maps.getLocations` y `dashboard` reimplementan la lógica; mezclan UTC, hora local del servidor y `America/Bogota` del frontend. `new Date("2026-11-01")` es medianoche UTC, no Bogotá. *Corrección:* util único `dateRange.ts` con zona configurable (`APP_TIMEZONE`).
- **B5 — Serialización de `Decimal`.** `getById` y `create` de transacciones, y `alerts` devuelven `monto` como string (Prisma `Decimal`) mientras los tipos del frontend dicen `number`. *Corrección:* serializadores por módulo (como ya hacen accounts/savings/budgets).
- **B6 — `createTransaction` valida dos veces y evalúa riesgo fuera de la transacción.** Cuenta y categoría se consultan antes y dentro de `$transaction`. *Corrección:* mover todo dentro de la transacción (o conservar solo las comprobaciones internas) y pasar el cliente `tx` a `riskService`.
- **B7 — Motor de riesgo.** El promedio histórico mezcla ingresos y gastos y todo el historial; `comercio` y `tipo_movimiento` se reciben y no se usan; la primera transacciones (`countTx < 3`) nunca se evalúa por monto. *Corrección:* promedio por tipo y ventana (p. ej. 90 días), usar o quitar parámetros.
- **B8 — Presupuestos.** `gastado` suma `GASTO` **y** `AHORRO` (decisión no visible en la UI "Total Gastado"); `GET /budgets` devuelve todo el histórico y el filtro mes/año se hace en el cliente; `create` no valida que la categoría sea de tipo `GASTO`; `BudgetError` devuelve 404 para datos inválidos (debería ser 400/422). *Corrección:* parámetros `mes/anio` en el API, validar tipo y ajustar códigos.
- **B9 — `getAlerts`.** Falta rechazar re-resolución incoherente (resolver dos veces con acciones opuestas revierte saldos) → definir si es válido y, si no, 409.

### 🟡 P2

- **B10 — Categorías.** `DELETE` llama a `deactivate`, que es alias de `delete` y **borra físicamente** (deja `id_categoria = NULL` en transacciones y presupuestos); `list` no filtra `estado` (la función SQL `fn_categorias` sí). *Corrección:* baja lógica (`estado = false`) y filtrar. El controlador tiene 7 alias sin uso (`removeCategory`, `destroy`, …).
- **B11 — Perfil.** `register` no crea `perfil_financiero` (lo hacía `fn_register`); `getMe` no devuelve `pais/ciudad/ultimo_acceso` pero el tipo `User` del frontend sí los declara; `/auth/me` y `/profile` duplican responsabilidad; `telefono` no se puede borrar (se envía `undefined`).
- **B12 — Validación de longitudes.** `registerSchema.nombre_completo`/`telefono` y `updateProfile` no tienen `.max()` (BD: 150 / 20) → error de Prisma en lugar de 400 de validación.
- **B13 — Dashboard** ejecuta 3 consultas en serie; usar `Promise.all`.
- **B14 — Reportes.** `getTransactionsReport` devuelve `total: rows.length` (no el total real) sin indicador de truncado; el frontend pide 5000 y calcula `top_comercios` en el cliente (mejor en SQL).
- **B15 — Listado de transacciones.** `ORDER BY` sin desempate (`id_transaccion`) → paginación inestable; `sort_by=nivel_riesgo` ordena por `score_anomalia`, no por el nivel mostrado (que prioriza la alerta); `ILIKE` no escapa `%`/`_`; el `COUNT` hace el `LATERAL JOIN` aun sin filtrar riesgo.
- **B16 — Conceptos duplicados.** `AHORRO` (transacción que resta saldo) y *metas de ahorro* (aportes que no tocan ninguna cuenta) son dos mecanismos sin relación. Documentar o conectar (aporte → transacción AHORRO opcional).
- **B17 — Operación.** `shutdown` no cierra el servidor HTTP (corta peticiones en vuelo); `/health` no comprueba la BD (añadir `/health/ready` con `SELECT 1`); no hay `request-id`/logging estructurado; `mailer` crea un transporte por envío (reutilizar/pool).
- **B18 — Insights.** Texto "Asesor IA" pero es lógica por reglas; los consejos formatean `$${total.toFixed(2)}` (no COP ni locale). La URL de IA se retiró de `.env.example`; la integración con IA sigue fuera del alcance actual.
- **B19 — Consejos del trigger invisibles.** El trigger de presupuesto inserta en `consejos_financieros`, pero ningún endpoint la lee: las alertas de umbral 80 %/100 % nunca llegan al usuario.

---

## 4. Base de datos y Prisma

### 🟠 P1

- **DB1 — Índices faltantes.**
  - `alertas_fraude(id_transaccion)` (usado en cada `LEFT JOIN LATERAL` de transacciones/reportes/contadores) — sin índice hoy. Sugerido: `(id_transaccion, fecha_detectada DESC)`.
  - `transacciones(id_ubicacion)` y `(id_dispositivo)` (FK con `ON DELETE SET NULL`).
  - `transacciones(id_usuario, id_categoria, fecha_transaccion)` para el subselect de `gastado` en presupuestos.
- **DB2 — Unicidad de categorías con `NULL`.** `UNIQUE (id_usuario, nombre)` no protege las categorías del sistema (`id_usuario IS NULL`, los NULL son distintos) ni evita que un usuario duplique el nombre de una del sistema. *Corrección:* índice único parcial para `id_usuario IS NULL` y comprobación contra las del sistema (o `NULLS NOT DISTINCT` en PG 15+).
- **DB3 — Rol.** `CHECK (rol IN ('USER'))` mientras backend y frontend contemplan `ADMIN` (`ProtectedRoute.allowedRoles`). Ampliar el `CHECK` o eliminar el soporte de `ADMIN`.
- **DB4 — Sin migraciones.** `schema.sql` y `schema.prisma` se mantienen a mano → riesgo de deriva. **Decisión:** se conserva el flujo SQL manual solicitado: `schema.sql` para bases nuevas y `update_existing.sql` para bases existentes; no se usa Prisma Migrate. Sigue pendiente automatizar la comparación de ambos esquemas.
- **DB5 — Funciones SQL no usadas.** Casi todas las `trida.fn_*` (login, register, dashboard, presupuestos, metas…) no las llama el backend y ya divergen (p. ej. `fn_presupuestos` no filtra `estado`; `fn_categorias` sí filtra `estado`). **Decisión:** conservarlas para no romper consumidores SQL externos no identificados; los triggers `fn_trg_*` también se conservan. Evitar mantener dos implementaciones requiere revisar compatibilidad y acordar pruebas.

### 🟡 P2

- **DB6 — Tablas sin uso real:** `analisis_gastos`, `reportes_mensuales`, `consejos_financieros` (solo escribe el trigger), `patron_comportamiento` (el endpoint recalcula en caliente en vez de leerla), `perfil_financiero` (sin ruta). Decidir: usarlas o retirarlas del modelo.
- **DB7 — Enums como `String`.** `estado`, `tipo`, `severidad` son `VARCHAR` con `CHECK`; Prisma aún los modela como `String`. **Decisión:** mantener el esquema actual para evitar cambios de compatibilidad; reconsiderar enums nativos solo con un procedimiento coordinado para bases existentes.
- **DB8 — `canal`.** La API no acepta `canal` y la base asigna `'web'` por defecto; se documentó ese comportamiento para la aplicación web.
- **DB9 — Dinero en JS.** **Parcialmente corregido:** saldos y comparaciones de metas usan `Prisma.Decimal`; la conversión a `number` se conserva en las respuestas serializadas. Revisar otros cálculos monetarios antes de ampliar el cambio.
- **DB10 — `prisma generate`** no está en `postinstall`/`build`; un despliegue limpio falla al iniciar.

---

## 5. Frontend

### 🔴 P0

- Ver **F9** (tokens CSS) y **F10** (clases/opacidad) — afectan a casi todas las pantallas.

### 🟠 P1

- **UI1 — Tema.** `ThemeContext` marca `class="dark"` en oscuro y `data-theme="light"` en claro, pero `tailwind.config` usa `darkMode: ["class", '[data-theme="dark"]']` (inconsistente; además no hay utilidades `dark:` en uso). No hay script inline en `index.html` → parpadeo de tema al cargar. *Corrección:* una convención (`data-theme`) y un script antes del bundle.
- **UI2 — Colores "hardcoded".** Se usan `emerald-500`, `red-500`, `amber-500` en `MetricsCards`, `DeviceCard`, `TransactionsTable`, `AlertBadge`, `Risk.ts`, `AlertActionModal`… ignorando `income/expense/risk-*` ya definidos (regla RC-004 declarada). En tema claro `amber-500` sobre blanco tiene bajo contraste.
- **UI3 — Capa de API inconsistente.** `savingsApi`/`budgetsApi`/`reportsApi` (camelCase) devuelven el payload ya desenvuelto; `AccountsApi`, `TransactionsApi`, `DevicesApi`, `AlertsApi` (PascalCase) mezclan `ApiSuccess<T>` y `T`. Los hooks por eso comprueban `response.success` en unos casos y no en otros. *Corrección:* un estilo (devolver `data`) y nombres homogéneos.
- **UI4 — Hooks de datos.** Sin cancelación ni control de respuestas obsoletas (`AbortController`/id de petición) → condiciones de carrera al cambiar filtros rápido. `useCategories` se instancia en varias pantallas/modales y repite la petición. *Corrección:* contexto/caché compartido (o React Query/SWR).
- **UI5 — `Modal`.** El `useEffect` depende de `onClose` (lambda nueva en cada render) y su cleanup pone `body.style.overflow = "unset"`: con varios modales montados, uno cerrado puede liberar el bloqueo de scroll de otro abierto. Falta focus-trap, `aria-labelledby`, retorno de foco y no deberían cerrarse (Esc/backdrop) durante `isSubmitting`.
- **UI6 — Accesibilidad.** `Input`/`Select` generan `id` desde el label (colisiones posibles; usar `useId`); muchos `Select` sin label ni `aria-label`; `AlertsPage` usa `<li onClick>` no navegable por teclado; botones de icono (`Trash2`) sin `aria-label`; `Toast` sin `role="status"/aria-live`.
- **UI7 — `NewTransactionModal`.** El selector de categoría muestra todas sin filtrar por `tipo_movimiento`; no limpia el error al reabrir.
- **UI8 — Textos engañosos.** "Tu conexión … está 100 % segura" (Dashboard), badge "Protegida" fijo en cada `AccountCard`, "Protección de datos garantizada". Retirar afirmaciones que el sistema no verifica.

### 🟡 P2

- **UI9 — Rendimiento/estructura.** Sin `React.lazy` por ruta; sin `ErrorBoundary`; `ToastProvider` crea `value` nuevo en cada render (memoizar) y no limpia `setTimeout` al desmontar; `h-screen` en `AppLayout` → `h-dvh` en móvil.
- **UI10 — Componentes duplicados.** Paginación idéntica en `AlertsPage` y `TransactionsPage` (extraer `<Pagination>`); reglas de contraseña repetidas en `RegisterForm`, `ResetPasswordPage`, `ChangePasswordForm` y `PasswordStrengthMeter` (extraer `validatePassword`); tarjetas resumen casi iguales en 4 módulos.
- **UI11 — `RiskBadge`.** Muestra `Math.round(score*100)%` pero `score_anomalia` va de 0 a 100 (daría 5000 %); hoy no se ve porque el listado no devuelve `score_anomalia`. Unificar escala.
- **UI12 — Filtros del mapa.** `riskOptions` tiene dos opciones con la misma etiqueta ("" y `"ALL"`); retirar una.
- **UI13 — Reportes.** `setCustomDateRange` y `PERSONALIZADO` están implementados pero no hay selector de fechas; añadir inputs o eliminar el código. `getDateRange` usa fecha local del navegador.
- **UI14 — Mapa.** El `iframe` solo muestra la transacción seleccionada (no todos los puntos); `leaflet`/`react-leaflet` están instalados e importan CSS en `main.tsx` pero no se usan. O se implementa el mapa con marcadores o se retiran las dependencias.
- **UI15 — Redirecciones.** El interceptor y `logout` usan `window.location.href` (recarga completa); usar el router. `LoginForm` ignora `location.state.from` para volver a la ruta original.
- **UI16 — Presupuestos.** Años fijos ±1 respecto al actual; umbral 80 % duplicado en `BudgetCard` y `useBudgets`.
- **UI17 — Formularios.** Validación de email débil (`includes("@")`); `LoginForm` no recorta espacios; copy "¿Ya tienes una cuenta registrado?" → "registrada".
- **UI18 — Dashboard.** Endpoints `recent-alerts`/`recent-transactions` y componentes `CategoryExpenseChart`/`FinancialAdvisorWidget` ya existen pero no se usan; el bloque "se habilitarán en sus secciones" es un placeholder. Conectar lo existente o retirarlo.

---

## 6. Contratos y documentación

### 🟠 P1

- **D1 — `$ref` rotos en Swagger (`config/swagger.ts`).**
  - `VerifyResetTokenRequest` está dentro del objeto `errorContentByStatus` (no en `components.schemas`).
  - `UpdateTransactionStatusRequest` está anidado dentro de `UpdateAlertStatusRequest`.
  Ambos `$ref` de `requestBody` quedan sin resolver y los tests actuales no lo detectan. *Corrección:* moverlos a `components.schemas` y añadir un test con `@apidevtools/swagger-parser` (`validate(spec)`, ya presente en el lockfile).
- **D2 — Guía de integración desactualizada** (`docs/GUIA_INTEGRACION_FRONTEND.md`): **corregido**; la guía ahora incluye la pantalla y el endpoint de categorías, el filtro vigente del trigger, y aclara que las categorías se desactivan lógicamente.
- **D3 — Swagger incompleto/inexacto.** **Parcialmente corregido:** se añadió `GET /categories/{id}`, se aclaró la desactivación y se documentaron ejemplos con las claves reales para conteos de transacciones y alertas. El servidor es relativo (`/`); las respuestas 2xx de otros endpoints aún usan el sobre genérico `SuccessResponse` y requieren documentar sus datos específicos.

### 🟡 P2

- **D4 — README raíz ausente** (arranque, variables, `pnpm`, `TEST_DATABASE_URL`, orden de `schema.sql`/Prisma).
- **D5 — `.env.example`:** **Corregido/aclarado:** se retiró la URL de IA sin uso y `APP_TIMEZONE` está definido. Se conservan `SMTP_HOST` con `EMAIL_USER`/`EMAIL_PASS`, que coinciden con la configuración del backend y la documentación; renombrarlos sin compatibilidad podría romper despliegues existentes.
- **D6 — Nombres de archivos vs exports:** `AlertPage.tsx` exporta `AlertsPage`, `DevicePage.tsx` exporta `DevicesPage`; rutas `/security` (alertas) y `/settings` (perfil) no coinciden con nombres de página.
- **D7 — Tipos del frontend vs API:** `Category.es_predeterminada` no existe (el API devuelve `es_default`/`es_personalizada`); `User` declara campos que `/auth/me` no devuelve; `Transaction.monto` es `number` pero algunas respuestas traen string (B5).

---

## 7. Tooling, dependencias y tests

### 🟠 P1

- **T1 — Archivos generados en el repo.** `frontend/vite.config.js` y `vite.config.d.ts` son salida de `tsc -b` (porque `tsconfig.node.json` es `composite` sin `noEmit`/`emitDeclarationOnly`) y conviven con `vite.config.ts` (Vite puede cargar el `.js` en lugar del `.ts`). Eliminarlos, configurar el `tsconfig.node.json` y añadirlos al `.gitignore`.
- **T2 — Desalineación de versiones.** **Corregido:** TS, `@types/node` y `eslint-config-prettier` están alineados; Express 4 usa `@types/express` 4; el frontend no instala Zod (no lo usa); se quitó el stub `@types/bcryptjs` y se añadieron `engines` y `.nvmrc` para Node 22.13+.
- **T3 — Cobertura de tests insuficiente.** El script `test` solo ejecuta `contracts.test.ts`; la integración cubre solo transacciones. Faltan: alertas (flujo de saldos), ahorros/aportes, presupuestos, auth (reset/reenvío), `requireAuth`, y **ningún** test de frontend. *Corrección:* añadir tests de integración por módulo y Vitest + Testing Library para hooks/formularios críticos; script `test` con glob.
- **T4 — Scripts.** Backend sin `typecheck` (`tsc --noEmit`); `build` no ejecuta `prisma generate`; no hay CI (lint + typecheck + test + `swagger validate`).

### 🟡 P2

- **T5 — ESLint frontend:** añade `globals.node` a un proyecto de navegador y carece de `eslint-plugin-react-hooks` y `jsx-a11y` (los `useEffect` con dependencias inestables, UI4/UI5, pasarían desapercibidos).
- **T6 — Prettier** configurado solo en backend (frontend tiene dependencia pero sin `.prettierrc`/script).
- **T7 — Alias de rutas:** `vite.config.ts` define `@types` (choca conceptualmente con `node_modules/@types`) y `tsconfig` no lo declara; se mezclan `@/…` y `@components/…` (`NewAccountModal`). Mantener solo `@/`.
- **T8 — `env.d.ts`** está en la raíz de `frontend/` y `tsconfig` solo incluye `src`: mover a `src/vite-env.d.ts`.
- **T9 — `.gitignore`:** añadir `.env.*` (excepto `.example`), `*.tsbuildinfo`, `coverage/`, `vite.config.js`, `vite.config.d.ts`.
- **T10 — Dependencias sin uso:** frontend `zod`, `leaflet`, `react-leaflet`, `@types/leaflet` (si no se implementa el mapa); backend `utils/password.ts`, alias `calcularDistancia`.

---

## 8. Código muerto / candidatos a eliminar o conectar

| Elemento | Estado |
|---|---|
| `frontend/src/hooks/useAccounts.ts` | No se usa (existe `AccountContext`) |
| `components/dashboard/CategoryExpenseChart`, `FinancialAdvisorWidget`, tipos `CategoryExpense`, `AIRecommendation` | Sin uso |
| `pages/FeaturePlaceholderPage.tsx` | Sin uso |
| `utils/Formatters` → `maskEmail`, `maskPhone` | Sin uso |
| `useReports.setCustomDateRange` | Sin UI |
| `backend/src/utils/password.ts` | Sin uso (y diverge de `auth.service`) |
| `geo.ts › calcularDistancia` | Alias sin uso |
| `CategoriesController` — 7 alias (`removeCategory`, `destroy`, …) | Sin uso |
| `riskService` params `comercio`, `tipo_movimiento` | Sin uso |
| `trida.fn_*` (casi todas), tablas `analisis_gastos`, `reportes_mensuales`, `perfil_financiero`, `patron_comportamiento`, `log_auditoria` (app) | Sin uso desde el backend |
| `/profile` (GET/PATCH) | El frontend usa `/auth/me`; duplicado |
| `leaflet`, `react-leaflet`, `zod` (frontend) | Dependencias sin uso |

---

## 9. Plan de trabajo sugerido

**Fase 1 — Estabilizar lo que está roto (1–2 días)**
F9/F10 (tokens y clases), F6, F1, F2, F3, F4, F7, F8, F11, D1, T1.

**Fase 2 — Coherencia de negocio y seguridad (3–5 días)**
F5, F12–F16, F19–F20, S1–S6, B2, B3, B4, DB1–DB3, errores unificados (B1).

**Fase 3 — Calidad y mantenibilidad (1 semana)**
UI1–UI8, B5–B9, B10–B19, DB4–DB5, T2–T4, D2–D3, README y `.env.example`.

**Fase 4 — Limpieza**
Sección 8 (código muerto), UI9–UI18, T5–T10, DB6–DB10.

> Sugerencia de verificación continua: añadir al CI `tsc --noEmit` (front y back), `eslint`, `prisma validate`, `swagger-parser validate` y los tests de integración contra `TEST_DATABASE_URL`.
