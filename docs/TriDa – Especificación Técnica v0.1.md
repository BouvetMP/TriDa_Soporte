# TriDa – Especificación Técnica (estado actual)

*Versión del documento: 0.2 — actualización basada en el código existente.*
*Estado: especificación de lo implementado (as-built), con pendientes y errores verificados al final.*

## 1. Propósito y alcance de esta revisión

Este documento describe el comportamiento que existe en el repositorio. El código vigente es la fuente de verdad: una diferencia con una idea, borrador o requisito anterior no significa que el código deba cambiar automáticamente.

Para comprobar los contratos HTTP, consultar Swagger en `/api/docs` cuando el backend corre fuera de producción. El JSON OpenAPI está disponible en `/api/docs.json` en esos entornos. Los esquemas y servicios implementan los comportamientos que Swagger no detalla.

La revisión fue estática. Se leyeron rutas, validaciones, servicios, configuración, esquema SQL/Prisma y partes del frontend. No se conectó a la base PostgreSQL del usuario, no se verificaron los datos reales y no se probaron los servicios SMTP en producción.

## 2. Producto que existe

TriDa es una aplicación web para que una persona registre cuentas y movimientos, consulte saldos e informes, administre presupuestos y metas, visualice alertas y explore ubicaciones de transacciones. Admite recepción autenticada de movimientos externos mediante webhook; no incluye conexión directa con bancos.

El motor de riesgo actual es determinista y acotado: evalúa desviaciones del monto frente al promedio reciente, confianza del dispositivo y distancia/velocidad geográfica. No es un modelo de IA ni implementa el motor ponderado de siete factores descrito en borradores previos.

TriDa no ejecuta movimientos de dinero. Los saldos se actualizan por los movimientos registrados y sus transiciones de estado.

## 3. Stack y arquitectura actuales

### Backend

- Node.js, Express y TypeScript.
- PostgreSQL y Prisma; algunos agregados/consultas se ejecutan con SQL parametrizado.
- Validación de entradas con Zod.
- Rutas agrupadas por módulos: autenticación, cuentas, categorías, transacciones e integraciones, dispositivos, alertas, dashboard, presupuestos, ahorro, perfil, insights, reportes, mapa y auditoría.
- Los servicios acceden directamente a Prisma y, cuando se necesita, a SQL. No existe una capa `repository` uniforme entre todos los servicios.
- `database/schema.sql` define elementos de PostgreSQL que acompañan al modelo Prisma, incluidos objetos SQL que Prisma no representa por completo.

### Frontend

- Aplicación SPA con React, TypeScript y Vite.
- Cliente API, hooks, contextos de autenticación/cuenta, páginas y componentes reutilizables.
- Las pantallas incluyen autenticación, dashboard, cuentas, categorías, transacciones, alertas, presupuestos, metas, análisis/reportes, dispositivos, perfil y mapa.

Las versiones exactas de dependencias se mantienen en los manifiestos y lockfile; este documento no impone versiones distintas.

## 4. Persistencia y modelo de datos

- PostgreSQL usa el esquema `trida`; los nombres físicos de tablas y columnas son principalmente españoles y snake_case.
- Las claves primarias son enteros autoincrementales.
- Los importes se persisten como `NUMERIC(15,2)` y Prisma `Decimal`. Varias respuestas HTTP convierten importes a JSON `number`; no se garantiza que el importe se envíe como cadena decimal.
- Las fechas se persisten como `TIMESTAMPTZ` o `DATE`, según el campo. La zona horaria de aplicación predeterminada es `America/Bogota` y se configura mediante `APP_TIMEZONE`.
- Entidades principales: usuarios, perfil financiero, cuentas, categorías, dispositivos, ubicaciones, transacciones, patrones de comportamiento, presupuestos, metas, aportes, alertas, consejos, exportaciones de archivo, eventos externos archivados, análisis, reportes y logs de auditoría.
- Las categorías admiten propietario nulo en el modelo, por lo que la estructura permite categorías globales. La presencia de filas globales en la base real no se comprobó.
- Las metas admiten una categoría opcional en el modelo. La creación actual de una meta no exige fecha inicial ni categoría; la fecha de creación se registra automáticamente.
- Las cuentas guardan saldo inicial y saldo actual. La entidad/institución es texto opcional; no hay un catálogo `Institution` implementado.
- Los presupuestos se modelan por categoría, mes y año. No tienen relación con metas ni fechas arbitrarias.
- No se identificó un conjunto de migraciones versionadas de Prisma que represente todo el historial de cambios. El esquema SQL central es `database/schema.sql`; validar su ejecución contra la base del usuario queda fuera de esta auditoría.

## 5. Comportamiento funcional

### 5.1 Autenticación, perfil y dispositivos

- El registro solicita correo, contraseña y nombre; el teléfono es opcional.
- Se requiere verificación del correo para completar el flujo de registro. Los enlaces de verificación vencen a los 15 minutos. El envío requiere la configuración de correo correspondiente.
- Las contraseñas nuevas requieren al menos 12 caracteres, una mayúscula, una minúscula y un carácter especial; el máximo aceptado es 72 caracteres.
- El inicio de sesión usa JWT Bearer, con vigencia predeterminada de 8 horas (`JWT_EXPIRES_IN`). No hay endpoint de renovación/refresh.
- El frontend conserva el token en `localStorage`; la autenticación no usa cookies `httpOnly`.
- Después de tres intentos fallidos se bloquea temporalmente el acceso según la lógica de autenticación.
- Cerrar sesión invalida las versiones de token del usuario; no existe una sesión persistida y revocable individualmente por dispositivo.
- El perfil permite editar nombre y teléfono. No existe verificación de teléfono ni onboarding obligatorio.
- Se pueden registrar dispositivos, actualizar su confianza, listarlos y eliminarlos. El primer dispositivo registrado para el usuario se marca confiable automáticamente.
- El historial propio de auditoría se consulta mediante el módulo de auditoría; no permite modificar ni borrar registros desde su API.

### 5.2 Cuentas, categorías y movimientos

- Las cuentas pertenecen a un usuario, tienen nombre, tipo, saldo inicial/actual, estado y campos opcionales de entidad y número enmascarado. No se valida una institución contra un catálogo.
- Las categorías se pueden consultar y crear/actualizar según las rutas del módulo. No se exige crear tres categorías ni hay un flujo de onboarding que lo fuerce.
- Los movimientos manuales requieren una cuenta, un monto positivo y tipo `INGRESO`, `GASTO` o `AHORRO`. Pueden incluir categoría, comercio, descripción, ubicación y fecha.
- El webhook externo admite también `TRANSFERENCIA`; requiere cuenta destino distinta. Está protegido por secreto de integración y el servicio conserva huellas/identificadores externos para detectar duplicados.
- Los movimientos tienen estado. Resolver una transacción pendiente puede confirmar o rechazarla; al confirmarla, el saldo se actualiza en la misma operación. En transferencias, se registra el efecto de salida y entrada en las cuentas correspondientes.
- Los gastos recibidos por webhook se resuelven desde el enlace de confirmación por correo; el endpoint normal de cambio de estado no los resuelve.
- La categoría puede ser nula y los movimientos se pueden categorizar posteriormente.
- Existe una ruta de borrado individual, pero el servicio la rechaza con `409 INDIVIDUAL_TRANSACTION_DELETE_DISABLED`. La eliminación histórica es parte del flujo de retención descrito en 5.7.

### 5.3 Riesgo, alertas y confirmación por correo

El motor de riesgo suma contribuciones discretas y limita el resultado a 100:

| Señal evaluada | Regla actual |
| --- | --- |
| Monto | Usa el promedio de movimientos del mismo tipo en los 90 días anteriores, solo cuando hay al menos 10 movimientos: monto superior a 3 veces el promedio suma 25; superior a 5 veces suma 40. |
| Dispositivo | No registrado para el usuario suma 20; registrado pero marcado no confiable suma 30. |
| Geolocalización | Solo si hay transacción previa con ubicación. Distancia de hasta 100 km no penaliza; por encima de esa distancia, velocidad superior a 200 km/h suma 30 y superior a 800 km/h suma 50. |

Clasificación: `BAJO` (menos de 30), `MEDIO` (30–69), `ALTO` (70–94) y `CRITICO` (95–100). El resultado se utiliza para decidir el estado de evaluación y producir razones de riesgo. No hay siete factores, pesos configurables, análisis de país, horario, tipo de comercio ni explicación con un desglose persistido de esos siete factores.

Las alertas están asociadas a usuario y transacción; se pueden listar, consultar, contar por nivel y actualizar de estado. Los valores concretos de severidad/estado se describen en Swagger y en el esquema vigente.

La integración de transacciones incluye confirmación de gastos externos desde un enlace con token. Si el usuario responde que no reconoce el movimiento, el flujo registra la decisión y eleva la alerta conforme al servicio actual. Los correos dependen de SMTP habilitado y configurado.

### 5.4 Dashboard, insights y reportes

- Dashboard permite periodos móviles de 30, 90, 180 o 365 días; el predeterminado es 30. No ofrece el selector de día/semana/mes calendario/rango personalizado descrito en el borrador previo.
- Las estadísticas, gastos por categoría y movimientos recientes aceptan filtro por cuenta. En transferencias, los totales y movimientos recientes contemplan la cuenta de origen o destino.
- El feed de alertas recientes también admite filtro por cuenta, aunque actualmente solo compara con la cuenta de origen; la diferencia se registra al final como error actual.
- El Dashboard consulta consejos financieros del sistema. Estos son registros de consejos asociados a presupuesto/finanzas, no respuestas generadas por un modelo de IA.
- Insights calcula agregados de movimientos, principales categorías/comercios, alertas y consejos basados en reglas. El código incluye mensajes financieros deterministas; no invoca un proveedor de IA.
- Reportes ofrecen resumen, datos por categoría y movimientos, con filtros de fecha y cuenta conforme a la API vigente. No se encontró en ese contrato el conteo de metas cumplidas descrito en el borrador anterior.
- En la página de análisis se muestran indicadores de metas activas/completadas y accesos a metas.

### 5.5 Presupuestos y metas de ahorro

- Un presupuesto se crea para una categoría y mes/año, con límite mensual positivo. Se puede consultar, actualizar y eliminar de acuerdo con las rutas del módulo. No hay periodos arbitrarios ni asociación con metas.
- Las metas tienen nombre, monto objetivo positivo, monto actual inicial y fecha límite opcional. Al crearse, la fecha de creación se registra automáticamente.
- Se pueden listar, crear, editar y eliminar metas; se pueden agregar fondos mediante la ruta `/savings/{id}/funds`. El aporte mínimo es 1000.
- Los estados actuales incluyen `ACTIVA`, `PAUSADA`, `COMPLETADA` y `CANCELADA`. Alcanzar el objetivo completa la meta; la API también permite solicitar explícitamente `COMPLETADA` aunque el saldo aún sea inferior al objetivo. Este comportamiento está cubierto por una prueba contractual y se conserva como comportamiento actual, sujeto a confirmación del producto.
- Los presupuestos y las metas son entidades independientes. No se encontraron CRUD individuales de aportes ni nota opcional por aporte.

### 5.6 Perfil, auditoría y mapa

- El perfil expone datos básicos y un patrón financiero calculado a partir de movimientos confirmados/aprobados.
- La API de auditoría devuelve el historial propio en orden descendente y paginado por cursor.
- El mapa expone estadísticas y ubicaciones de transacciones con coordenadas, riesgo, cuenta y categoría cuando existen. Usa filtros de cuenta, fecha, estado y nivel de riesgo; no incluye una búsqueda externa para ubicar comercios.
- Leaflet y la visualización del mapa pertenecen al frontend. No existe módulo de comercios ni simulador de transacciones en el backend.

### 5.7 Exportación y retención anual de transacciones

- El usuario puede preparar una exportación de movimientos finalizados que tengan al menos un año.
- El flujo es manual: preparar exportación, descargar CSV y confirmar explícitamente la eliminación.
- La exportación vence a los 30 minutos. Las transacciones pendientes y las relacionadas con alertas no resueltas se conservan; el resultado informa cuántas se eliminaron y cuántas se omitieron.
- El proceso no modifica saldos. La operación se registra en auditoría.
- No se encontró un cron/proceso automático de aviso o purga.

## 6. API HTTP vigente

- Prefijo: `/api/v2`; las rutas de salud son `/health` y `/health/ready`.
- Swagger/OpenAPI define las rutas, parámetros, ejemplos de éxito y errores. Se mantiene disponible en `/api/docs` y `/api/docs.json` fuera de producción.
- Los campos JSON usan principalmente snake_case y nombres españoles. Las respuestas exitosas usan `{ success, data, message? }`; los errores usan `{ success: false, error: { code, message, details? } }`.
- El identificador de petición se expone en la cabecera `X-Request-Id`; no se incluye como `requestId` dentro del cuerpo de error.
- Las respuestas de dinero pueden ser números JSON aunque la persistencia use Decimal.
- Grupos actuales: `/auth`, `/accounts`, `/categories`, `/transactions`, `/integrations/transactions/webhook`, `/devices`, `/alerts`, `/dashboard`, `/budgets`, `/savings`, `/profile`, `/insights`, `/reports`, `/map` y `/audit`.
- Los endpoints concretos y sus esquemas deben tomarse del OpenAPI vigente, no de la tabla de endpoints del borrador anterior. Entre ellos están registro/login/verificación de correo/restablecimiento/cambio de contraseña/cierre de sesión; CRUD de cuentas/categorías; transacciones y archivo anual; gestión de dispositivos y alertas; estadísticas, reportes, metas, mapa y auditoría.
- No existen actualmente rutas de onboarding, verificación de teléfono, catálogo de instituciones, simulador, asesor IA dedicado o preferencias de notificaciones.
- El webhook de movimientos requiere `TRANSACTION_WEBHOOK_SECRET`; las rutas de usuario requieren JWT Bearer salvo los flujos públicos y el endpoint de confirmación por correo documentado en Swagger.

## 7. Validación, seguridad y errores

- Las rutas validan cuerpos y parámetros con esquemas Zod antes de ejecutar la lógica del servicio.
- El middleware de autenticación valida JWT, usuario activo y `token_version`. Los recursos financieros se consultan con el usuario autenticado.
- La aplicación configura Helmet, CORS, límites de tasa y límite de cuerpo JSON; las variables de entorno se validan al iniciar.
- `DATABASE_URL` y `JWT_SECRET` son requeridos; el secreto JWT debe tener al menos 32 caracteres. SMTP se configura con `SMTP_ENABLED`, host, puerto y credenciales.
- Los errores de validación devuelven `400`; también se manejan errores de autenticación/autorización, no encontrado, conflicto, bloqueo `423`, límite `429`, dependencia no disponible `503` y error interno `500`.
- Prisma `P2002`, `P2003` y `P2025` se traducen a respuestas controladas. Los errores inesperados se registran y no exponen el detalle interno al cliente.
- Los logs usan eventos estructurados y `requestId`; la forma concreta sigue el logger existente y no coincide exactamente con el esquema propuesto en el borrador anterior.

## 8. Comportamientos anteriores que no deben confundirse con funcionalidades actuales

Los siguientes requisitos de versiones anteriores del documento no están implementados y no se consideran parte del producto vigente solo por aparecer en ese borrador:

- API `/api/v1`, claves JSON en inglés, UUID para todos los identificadores o montos siempre serializados como strings.
- Registro/verificación de teléfono, onboarding obligatorio y catálogo de instituciones financieras.
- Simulador con escenarios, semilla y `TransactionSource`; conexión directa a bancos.
- Motor de criticidad ponderado de siete factores o análisis mediante modelo de IA.
- Módulo de notificaciones intercambiables, preferencias de correo o aplicación móvil/push.
- Refresh token rotativo, sesiones de 30 días y autenticación con cookies `httpOnly`.
- Presupuestos por fechas arbitrarias, relación presupuesto-meta, aportes con nota y CRUD independiente de aportes.
- Selector del Dashboard por hoy/semana/mes/año calendario y rango personalizado.
- Purga anual automatizada con aviso previo por correo.

## 9. Límites de la auditoría

- La inspección del esquema y los servicios fue estática; no se ejecutó `database/schema.sql` en una base ni se verificaron sus datos.
- El usuario indicó previamente que aplicó los cambios de base de datos sin errores. Esta auditoría no puede certificar esa instancia ni el estado de sus datos.
- No se usaron datos de prueba reales, no se comprobó SMTP en un entorno desplegado y no se ejecutaron pruebas de integración PostgreSQL con `TEST_DATABASE_URL`.
- Las pruebas unitarias/contractuales y builds ejecutados en la revisión previa pasaron; eso no sustituye la verificación de los puntos anteriores.

## 10. Acciones pendientes de momento

1. Ejecutar y mantener una prueba de integración con una base PostgreSQL de prueba exclusiva (`TEST_DATABASE_URL`) y comprobar el esquema ya aplicado en el entorno de despliegue.
2. Decidir y, si se aprueba, implementar la revocación efectiva de sesiones al eliminar un dispositivo.
3. Antes de desplegar la columna `dispositivo_historial_registrado` sobre usuarios con dispositivos existentes, definir y ejecutar una inicialización del indicador basada en el historial previo. La columna se agrega con `DEFAULT FALSE`; sin ese backfill, un dispositivo nuevo podría confiarse automáticamente como el primero.
4. Decidir si una meta puede marcarse manualmente como `COMPLETADA` antes de alcanzar su objetivo; el comportamiento actual lo permite.
5. Si siguen en alcance, diseñar por separado onboarding, verificación de teléfono, catálogo de instituciones, simulador, asesor de IA, preferencias de notificación e integración bancaria. No asumirlos implementados.
6. La migración de tokens a cookies `httpOnly` y refresh tokens sigue pendiente y fue pospuesta anteriormente; requiere un trabajo específico de autenticación y cliente web.
7. Probar la configuración y entrega de correo en un entorno real con SMTP, incluyendo registro, recuperación de contraseña y confirmación de movimientos.
8. Resolver los errores funcionales enumerados en la sección siguiente y añadir pruebas de regresión para cada corrección.

## 11. Errores actuales

### E1. Revocación de sesiones al eliminar un dispositivo — resuelto

La eliminación incrementa `token_version` dentro de la misma transacción que elimina el dispositivo y escribe el evento de auditoría. Así se invalidan todos los JWT vigentes del usuario, ya que hoy los tokens no están vinculados a un identificador de dispositivo. El cliente cierra también la sesión actual y solicita volver a iniciar sesión.

### E2. El filtro por cuenta del feed de alertas del Dashboard omite transferencias recibidas — prioridad media

Las estadísticas y los movimientos recientes consideran la cuenta de origen o destino de una transferencia. La consulta de alertas recientes solo filtra por `transacciones.id_cuenta` (origen). Al seleccionar la cuenta destino, la alerta asociada a esa transferencia puede no aparecer en el feed aunque el resto del Dashboard la incluya.

### E3. Reportes y Dashboard pueden mostrar datos anteriores después de fallar una recarga — prioridad media

Los hooks `useReports` y `useDashboard` conservan el último resultado si una solicitud falla tras cambiar el periodo o la cuenta. El usuario recibe un mensaje de error, pero los datos del filtro anterior permanecen en pantalla; en Reportes también pueden seguir exportándose como CSV. La interfaz debe distinguir claramente datos obsoletos o limpiar el resultado fallido.
