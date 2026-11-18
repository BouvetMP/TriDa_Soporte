# Guía de integración del frontend con TriDa API v2

## Objetivo y fuentes de verdad

Este documento orienta a una IA o desarrollador que construya el frontend sin cambiar los contratos existentes del backend ni conectar el navegador directamente a PostgreSQL.

Antes de implementar o modificar una pantalla, consultar:

1. **OpenAPI generado por el backend:** `GET http://localhost:3000/api/docs.json` o la interfaz `http://localhost:3000/api/docs`.
2. **Validaciones de las peticiones:** archivos `*.schemas.ts` de cada módulo en `backend/src/modules/`.
3. **Rutas realmente montadas:** `backend/src/app.ts` y `*.routes.ts`.
4. **Esquema de la base de datos:** `database/schema.sql` (estructura SQL actual) y `backend/prisma/schema.prisma` (mapeo que usa el servidor).

Si una tabla de esta guía y la especificación servida difieren, prevalecen las rutas, validaciones y respuestas del backend actual. No inventar endpoints ni campos.

## Arquitectura existente

- Frontend: React 18, TypeScript, Vite y React Router 6 (`frontend/package.json`). La aplicación ya cuenta con rutas, cliente HTTP, contexto de sesión y pantallas para cuentas, transacciones, alertas, perfil y dashboard. Las secciones de presupuestos, ahorro, insights, reportes, mapa y administración de categorías aún necesitan su UI.
- Backend: Express, API versionada en `/api/v2`, Prisma y PostgreSQL.
- Base de datos: esquema PostgreSQL `trida`; las tablas tienen nombres snake_case, por ejemplo `trida.usuarios`, `trida.cuentas`, `trida.categorias`, `trida.transacciones`, `trida.alertas_fraude` y `trida.metas_ahorro`.
- El backend es responsable de autenticación, permisos, validación, reglas de negocio, persistencia, relaciones, saldos y evaluación de riesgo.

### Regla de seguridad y persistencia

El frontend debe comunicarse exclusivamente con la API HTTP. **No conectar el navegador a PostgreSQL, no exponer `DATABASE_URL`, no importar Prisma en el frontend y no replicar escrituras de negocio mediante SQL.** Las credenciales de base de datos solo pertenecen al entorno privado del backend.

## Conexión local

- Backend local: `http://localhost:3000`
- Base de API: `http://localhost:3000/api/v2`
- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs.json`
- Healthcheck público: `GET http://localhost:3000/health`
- CORS permite el origen indicado por `FRONTEND_URL` en la configuración del backend (por defecto `http://localhost:5173`).

Configurar en Vite una URL pública del backend, por ejemplo `VITE_API_BASE_URL=http://localhost:3000/api/v2`. Las variables `VITE_*` se compilan para el navegador y **nunca** deben contener claves, secretos JWT, credenciales SMTP ni datos de conexión a PostgreSQL.

El backend requiere su propio `.env` con la configuración privada descrita en `.env.example`. No copiar ese archivo al frontend ni enviar sus valores a una IA externa.

## Convenciones de contrato

### JSON y nombres

- Enviar `Content-Type: application/json` y usar los nombres exactos en `snake_case`: `id_cuenta`, `tipo_movimiento`, `fecha_inicio`, `limite_mensual`, etc.
- Algunos esquemas son estrictos: campos desconocidos pueden producir `400`. No sustituir nombres por alias camelCase ni enviar todo el objeto de una pantalla indiscriminadamente.
- Los IDs son enteros. Las cantidades deben ser positivas cuando el campo lo exija. Fechas se envían como ISO 8601 (`YYYY-MM-DD` o fecha-hora ISO, según el endpoint).
- Los campos opcionales pueden omitirse; no enviar `null` sin comprobar que el esquema lo acepta.
- Las columnas `NUMERIC`/`Decimal` pueden serializarse como número o cadena según el endpoint. Para cálculos de interfaz, normalizar y validar el valor sin asumir que todos los endpoints devuelven el mismo tipo.
- No enviar `id_usuario` en solicitudes de escritura salvo que un contrato lo indique explícitamente. El usuario se determina a partir del JWT; el backend aplica el aislamiento por propietario.

### Respuestas

Las rutas de `/api/v2` usan un envoltorio común:

- Éxito: `{ "success": true, "message": "...", "data": ... }`.
- Error: `{ "success": false, "error": { "code": "...", "message": "...", "details": ... } }`. `details` es opcional.
- Los listados paginados contienen `{ "items": [...], "pagination": {...} }` dentro de `data`.
- La creación de una transacción contiene `transaction`, `evaluation` y `alert` dentro de `data`.

Comprobar `response.ok`/el status HTTP y leer `response.data` (o `body.data` con `fetch`). No buscar `evaluation`, `pagination` o `error` en el nivel superior del JSON.

### Errores y límites

Los detalles de validación, cuando existen, están en `error.details` como arreglo de `{ field, message }`. `error.code` permite clasificar el error sin depender de su texto; el límite de solicitudes y las rutas inexistentes usan el mismo formato.

Tratar los estados HTTP, no solo el texto:

- `400`: datos inválidos, validación o referencias incorrectas.
- `401`: token ausente, inválido/expirado o credenciales incorrectas.
- `403`: cuenta desactivada o acceso prohibido.
- `404`: recurso inexistente o que no pertenece al usuario autenticado.
- `409`: conflicto con el estado del recurso, por ejemplo una meta de ahorro inactiva.
- `429`: límite de solicitudes excedido.
- `500`: error inesperado del servidor; mostrar un mensaje genérico y no filtrar detalles internos.

Hay un límite general de 150 solicitudes por IP/minuto y, para rutas de autenticación protegidas por limitador, 10 solicitudes por IP/15 minutos. Respetar `429`; no reintentar en bucle.

## Autenticación

### Rutas públicas

| Método y ruta | Uso | Cuerpo o parámetros |
|---|---|---|
| `POST /auth/register` | Crear usuario | `nombre_completo`, `email`, `password`; opcional `telefono` |
| `POST /auth/login` | Iniciar sesión | `email`, `password` |
| `POST /auth/forgot-password` | Solicitar recuperación | `email` |
| `POST /auth/verify-reset-token` | Verificar token de recuperación | `{ "token": "..." }` |
| `POST /auth/reset-password` | Cambiar clave con token de recuperación | `token`, `password_nueva` |

El registro valida una contraseña de al menos 10 caracteres, con mayúscula, minúscula y número. El login responde en el envoltorio usual de autenticación; los datos están en `data` y contienen `token` y `usuario`.

**Particularidad a tener en cuenta:** `forgot-password` siempre devuelve el mismo mensaje y nunca incluye el token. Con SMTP configurado, el backend envía el enlace; en desarrollo, si falta SMTP o falla el envío, registra el enlace en la consola del servidor. El frontend nunca debe mostrar ni registrar el token.

El enlace de recuperación coloca el token en el fragmento (`#token=...`) para que no se envíe en la solicitud al servidor web. El frontend debe leerlo del fragmento y enviarlo en el cuerpo JSON a `POST /auth/verify-reset-token` y `POST /auth/reset-password`; no ponerlo en una query string ni en logs.

### Rutas de sesión autenticada

| Método y ruta | Uso | Cuerpo |
|---|---|---|
| `GET /auth/me` | Usuario de la sesión | — |
| `PATCH /auth/me` | Actualizar datos personales de sesión | `nombre_completo` y/o `telefono` |
| `POST /auth/change-password` | Cambiar contraseña | `password_actual`, `password_nueva` |

### Envío del JWT

Después del login, enviar el token obtenido en `data.token` como:

```http
Authorization: Bearer <JWT>
```

Todas las rutas de cuentas, categorías, transacciones, dispositivos, alertas, dashboard, presupuestos, ahorros, perfil, insights, reportes y mapa requieren autenticación. No enviar el token en la URL.

Centralizar la creación de peticiones HTTP en un cliente API que adjunte el bearer token, serialice JSON y gestione errores. Si una petición devuelve `401`, limpiar el estado de sesión y llevar al usuario al login. El backend usa bearer tokens; no asumir que ya existe una sesión con cookie HttpOnly.

## Endpoints disponibles

Todas las rutas de las tablas siguientes son relativas a `/api/v2`, salvo `/health`. `:id` representa un ID numérico. Salvo donde se indique, las rutas de API requieren JWT.

### Estado

| Método y ruta | Uso |
|---|---|
| `GET /health` (fuera de `/api/v2`) | Comprobar que el servicio está operativo; no requiere autenticación |

### Cuentas

| Método y ruta | Uso / campos principales |
|---|---|
| `GET /accounts` | Listar cuentas del usuario |
| `POST /accounts` | Crear con `nombre`, `tipo`; opcionales `entidad`, `numero_enmascarado`, `color`, `saldo_inicial`, `estado` |
| `GET /accounts/:id` | Obtener una cuenta |
| `PATCH /accounts/:id` | Actualizar campos de cuenta; enviar solo los que cambian |
| `DELETE /accounts/:id` | Desactivar/eliminar la cuenta según la lógica del backend |

`tipo`: `BANCO`, `TARJETA`, `BILLETERA` o `EFECTIVO`. `saldo_inicial` no puede ser negativo.

### Categorías

| Método y ruta | Uso / campos principales |
|---|---|
| `GET /categories` | Listar categorías del sistema y del usuario |
| `POST /categories` | Crear categoría propia: `nombre`, `tipo`; opcionales `icono`, `color` |
| `PATCH /categories/:id` | Actualizar categoría propia |
| `DELETE /categories/:id` | Desactivar/eliminar categoría propia |

`tipo`: `INGRESO`, `GASTO` o `AHORRO`. Las categorías por defecto del sistema no se deben editar ni eliminar. No existe actualmente `GET /categories/:id`.

### Transacciones

| Método y ruta | Uso |
|---|---|
| `GET /transactions` | Listar y filtrar transacciones paginadas |
| `POST /transactions` | Crear transacción y ejecutar evaluación de riesgo |
| `GET /transactions/counts-by-level` | Conteos por nivel de riesgo |
| `GET /transactions/:id` | Consultar detalle |
| `PATCH /transactions/:id/status` | Resolver una transacción `PENDIENTE`: `estado` debe ser `CONFIRMADA` o `RECHAZADA` |
| `DELETE /transactions/:id` | Eliminar; el backend revierte el saldo cuando aplica |

Campos requeridos para `POST /transactions`:

```json
{
  "id_cuenta": 1,
  "monto": 50.75,
  "tipo_movimiento": "GASTO",
  "descripcion": "Compra",
  "comercio": "Comercio de ejemplo"
}
```

Opcionales: `id_categoria`, `id_dispositivo`, `ciudad`, `pais`, `latitud`, `longitud`, `ip_origen`, `fecha_transaccion`, `es_recurrente`. `monto` debe ser mayor que cero; `tipo_movimiento` acepta `INGRESO`, `GASTO` o `AHORRO`. El backend asigna moneda/estado por defecto y determina usuario, ubicación cuando corresponde y evaluación de riesgo; no inventar campos para esos valores.

Filtros de `GET /transactions`: `limit`, `offset`, `estado`, `nivel_riesgo`, `tipo_movimiento`, `id_cuenta`, `id_categoria`, `search`, `min_monto`, `max_monto`, `fecha_inicio`, `fecha_fin`, `sort_by`, `sort_order`. Ordenamientos admitidos en el contrato: `fecha_transaccion`, `monto`, `tipo_movimiento`, `nivel_riesgo`; dirección `asc` o `desc`.

En un listado, `data.items` contiene filas con nombres de cuenta/categoría, `es_sospechosa`, `nivel_riesgo` y campos de transacción; `data.pagination` contiene `total`, `page`, `limit` y `total_pages`. La creación incluye la transacción, evaluación de riesgo y posible alerta dentro de `data`.

Solo una transacción `CONFIRMADA` afecta el saldo. `PENDIENTE` no lo modifica; resolverla como `CONFIRMADA` aplica el movimiento y resolverla como `RECHAZADA` no lo aplica. Eliminar una transacción revierte el saldo únicamente si estaba confirmada.

Por compatibilidad, los resúmenes también consideran registros históricos `APROBADA` como confirmados. El trigger de presupuesto actualmente definido en `database/schema.sql` se ejecuta al insertar gastos/ahorros sin filtrar por estado; los endpoints de presupuestos sí filtran los movimientos, pero el trigger todavía puede generar consejos de umbral para movimientos pendientes o rechazados. Como el esquema se mantiene intacto, esa limitación requiere corregir el trigger en una migración futura.

Para validar flujos contra PostgreSQL, configura `TEST_DATABASE_URL` con una base separada cuyo nombre identifique que es de pruebas y ejecuta `pnpm --dir backend test:integration`. La prueba rechaza la misma base que `DATABASE_URL` y elimina exclusivamente el usuario temporal que crea.

### Dispositivos

| Método y ruta | Uso / campos principales |
|---|---|
| `GET /devices` | Listar dispositivos |
| `POST /devices` | Registrar/actualizar con `identificador_unico`, `tipo_dispositivo`; opcionales `sistema_operativo`, `navegador` |
| `GET /devices/:id` | Obtener detalle |
| `PATCH /devices/:id/trust` | Cambiar confianza con `{ "confiable": true }` |
| `DELETE /devices/:id` | Eliminar dispositivo |

Usar el `id_dispositivo` real devuelto por la API y solo para el usuario autenticado.

### Alertas

| Método y ruta | Uso / campos principales |
|---|---|
| `GET /alerts` | Listado paginado |
| `GET /alerts/counts-by-level` | Conteos por severidad |
| `GET /alerts/:id` | Detalle |
| `PATCH /alerts/:id/status` | Actualizar estado con `estado` y opcionalmente `accion_usuario` |

Estados: `PENDIENTE`, `CONFIRMADA`, `DESCARTADA`. Acciones: `FUI_YO`, `NO_FUI_YO`, `BLOQUEAR_TARJETA`. `FUI_YO` descarta la alerta y confirma la transacción; `NO_FUI_YO` confirma el fraude y rechaza la transacción. `BLOQUEAR_TARJETA` registra la solicitud y rechaza la transacción, pero no bloquea una tarjeta automáticamente. Filtros de lista: `limit` (máximo 100), `offset`, `severidad` (`BAJA`, `MEDIA`, `ALTA`, `CRITICA`), `estado`, `sort_by` (`fecha_detectada`, `severidad`, `estado`) y `sort_order` (`asc`, `desc`).

### Dashboard

Las rutas en español son alias de las rutas en inglés:

| Método y ruta | Uso |
|---|---|
| `GET /dashboard/stats` o `GET /dashboard/estadisticas` | Estadísticas financieras principales |
| `GET /dashboard/recent-alerts?limit=5` o `GET /dashboard/alertas-recientes?limit=5` | Alertas recientes |
| `GET /dashboard/recent-transactions?limit=5` o `GET /dashboard/transacciones-recientes?limit=5` | Transacciones recientes |

El backend limita el `limit` de las rutas recientes al rango 1–50.

### Presupuestos

| Método y ruta | Uso / campos principales |
|---|---|
| `GET /budgets` | Listar presupuestos con gasto calculado |
| `POST /budgets` | Crear con `id_categoria`, `limite_mensual`, `mes`, `anio` |
| `PATCH /budgets/:id` | Actualizar `limite_mensual` |
| `DELETE /budgets/:id` | Eliminar presupuesto |

`mes` está entre 1 y 12; `limite_mensual` debe ser mayor que cero. `id_categoria` debe provenir de `/categories`; no inventar el ID.

### Metas de ahorro

| Método y ruta | Uso / campos principales |
|---|---|
| `GET /savings` | Listar metas; cada una incluye progreso |
| `POST /savings` | Crear con `nombre`, `monto_objetivo`; opcionales `monto_actual`, `fecha_limite` |
| `PATCH /savings/:id` | Actualizar nombre, objetivo, fecha límite y/o estado |
| `POST /savings/:id/funds` | Registrar un aporte con `{ "monto": 50 }` |
| `DELETE /savings/:id` | Eliminar meta |

Estados: `ACTIVA`, `PAUSADA`, `COMPLETADA`, `CANCELADA`. El aporte debe ser positivo y solo se permite para una meta activa. El backend crea el registro de aporte y la base de datos actualiza `monto_actual` mediante un trigger; no actualizar ese acumulado desde el frontend ni simular aportes con `PATCH`.

### Perfil

| Método y ruta | Uso |
|---|---|
| `GET /profile` | Obtener perfil |
| `PATCH /profile` | Actualizar `nombre_completo` y/o `telefono` |
| `GET /profile/behavior-pattern` | Obtener estadísticas y patrón de comportamiento; puede haber datos sin historial |

`PATCH /auth/me` y `PATCH /profile` actualizan datos personales equivalentes, no el perfil financiero. La base de datos tiene un modelo `perfil_financiero`, pero no hay una ruta documentada para modificarlo; no inventar una.

### Insights y reportes

| Método y ruta | Uso / parámetros |
|---|---|
| `GET /insights?periodo_dias=30` | Resumen, categorías/comercios y consejos; `periodo_dias` entre 7 y 365 |
| `GET /reports/summary` | Resumen en rango opcional `fecha_inicio`, `fecha_fin` |
| `GET /reports/by-category` | Desglose; fechas opcionales y `tipo_movimiento` |
| `GET /reports/transactions` | Detalle exportable; filtros de fecha/tipo y `limit` de 1 a 5000 (por defecto 500) |

`tipo_movimiento`: `INGRESO`, `GASTO` o `AHORRO`. Enviar fechas ISO.

### Mapa

| Método y ruta | Uso / parámetros |
|---|---|
| `GET /map/stats` | Estadísticas geográficas |
| `GET /map/locations` | Ubicaciones geolocalizadas |
| `GET /map/ubicaciones` | Alias en español de ubicaciones |

Parámetros de ubicaciones: `limit` (1–2000, por defecto 500), `nivel_riesgo` (`BAJO`, `MEDIO`, `ALTO`, `CRITICO`, `ALL`), `estado` (`PENDIENTE`, `CONFIRMADA`, `APROBADA`, `SOSPECHOSA`, `RECHAZADA`, `ALL`), `fecha_inicio`, `fecha_fin`. La respuesta del mapa puede indicar `items`, `total` y `truncated`.

## Flujo recomendado de integración

1. Arrancar y verificar el backend con `GET /health`; consultar `/api/docs` cuando sea necesario.
2. Implementar primero el cliente API y los formularios públicos de registro/login.
3. Guardar el token de sesión en el estado de autenticación del frontend y adjuntarlo como Bearer a rutas privadas. No registrar JWT ni contraseñas en logs.
4. Tras autenticar, cargar `/auth/me`; después cargar cuentas y categorías antes de ofrecer el formulario de transacciones.
5. Enviar a las operaciones solo IDs reales obtenidos del backend. Mostrar errores de validación por `details[].field` y no reemplazarlos con valores ficticios.
6. Después de crear o eliminar una transacción, volver a consultar transacciones, saldos de cuentas, dashboard y alertas pertinentes. El servidor es quien actualiza los saldos y evalúa el riesgo.
7. Tras aportar a una meta, usar la meta devuelta por el backend o volver a consultar `/savings`; no incrementar el progreso local como si fuera autoridad.
8. Construir tipos/API adapters por módulo para conservar las diferencias reales de respuesta.

## Prevención de errores de integración

- No construir un `id_cuenta`, `id_categoria` o `id_dispositivo` a mano. Consultar/crear primero el recurso y reutilizar el ID retornado.
- La cuenta de una transacción debe pertenecer al usuario actual. La categoría debe ser propia o del sistema. Una categoría/dispositivo que no corresponda puede provocar rechazo; no asumir que un ID válido numéricamente es válido para ese usuario.
- Para enviar ubicación en una transacción, usar `ciudad`, `pais`, coordenadas dentro de latitud `[-90, 90]` y longitud `[-180, 180]`, y una IP válida si se especifica. No enviar coordenadas parciales fuera de rango.
- No enviar propiedades adicionales a esquemas estrictos, ni campos de base de datos que no estén admitidos en el endpoint.
- No duplicar reglas de saldo, generación de alertas, cierre de metas, progreso ni presupuesto en el cliente como fuente persistente.
- Las eliminaciones pueden ser lógicas o físicas según el módulo. Refrescar los datos desde la API y no asumir que todos los `DELETE` tienen la misma semántica.
- No modificar `schema.sql`, `schema.prisma`, las rutas o las validaciones para acomodar la UI sin una solicitud explícita y revisión coordinada del contrato.

## Lista de comprobación antes de dar el frontend por integrado

- Registro/login funcionan y las rutas privadas envían `Authorization: Bearer`.
- Recargar la aplicación y cerrar sesión no dejan al usuario en una ruta protegida sin token válido.
- Formularios usan snake_case, enums válidos y no envían claves desconocidas.
- Las listas respetan `limit`/`offset` y filtros declarados por la API.
- Los errores 400/401/403/404/409/429/500 se muestran con mensajes adecuados; no se muestran trazas del servidor.
- Crear una transacción usa IDs consultados y refresca el saldo desde la API.
- Aportar a una meta usa `POST /savings/:id/funds`; el progreso se toma de la respuesta/API.
- CORS funciona desde el origen Vite configurado en `FRONTEND_URL`.
- Se prueba al menos un flujo completo en Swagger y en la UI sin acceso directo a la base de datos.
