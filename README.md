# TriDa

TriDa es una aplicación de finanzas personales con frontend React/Vite, API Express/Prisma y PostgreSQL.

## Requisitos

- Node.js 22.13 o superior (`.nvmrc` usa la línea 22).
- pnpm.
- PostgreSQL.

## Instalación local

1. Instala dependencias desde la raíz:

   ```sh
   pnpm install --frozen-lockfile
   ```

2. Crea `backend/.env` a partir de `.env.example` y configura `DATABASE_URL`, `JWT_SECRET` y `FRONTEND_URL`. `APP_TIMEZONE` define la zona usada en filtros de fecha (por defecto `America/Bogota`). SMTP está desactivado temporalmente por defecto (`SMTP_ENABLED=false`): el registro marca la cuenta como verificada y permite iniciar sesión; la recuperación por correo responde que no está disponible. Para reactivar la verificación y recuperación por correo, configura las credenciales SMTP y establece `SMTP_ENABLED=true`. Si la API está detrás de un proxy confiable, habilita `TRUST_PROXY=true`.

3. Aplica `database/schema.sql` tanto en una base nueva como en una base TriDa existente:

   ```sh
   psql -v ON_ERROR_STOP=1 -d TriDa -f database/schema.sql
   ```

   El script es idempotente y aplica las actualizaciones aditivas compatibles; antes de usarlo sobre una base con datos, haz un respaldo y resuelve las validaciones de datos duplicados o roles no admitidos que el script reporte. Este proyecto usa SQL manual; Prisma se usa para el modelo y el cliente, no para administrar migraciones.

4. Inicia los servicios en terminales separadas:

   ```sh
   pnpm --dir backend dev
   pnpm --dir frontend dev
   ```

   API: `http://localhost:3000/api/v2`; interfaz: `http://localhost:5173`. Swagger está disponible fuera de producción en `/api/docs`.

## Verificación

```sh
pnpm --dir backend typecheck
pnpm --dir backend lint
pnpm --dir backend test
pnpm --dir frontend test
pnpm --dir frontend type-check
pnpm --dir frontend lint
pnpm --dir frontend build
```

El workflow de GitHub Actions en `.github/workflows/ci.yml` ejecuta estas verificaciones y las pruebas de integración del backend con PostgreSQL desechable.

Las pruebas de integración requieren `TEST_DATABASE_URL` apuntando a una base de pruebas exclusiva y con `database/schema.sql` aplicado:

```sh
pnpm --dir backend test:integration
```

## Comportamientos importantes

- El saldo de una cuenta cambia por transacciones; la interfaz no permite editarlo directamente.
- Solo los movimientos `GASTO` confirmados consumen presupuesto; `AHORRO` y los movimientos pendientes o rechazados no cuentan. Los aportes a metas de ahorro son independientes y no descuentan automáticamente una cuenta.
- Las categorías se desactivan lógicamente para conservar el historial.
- Una transacción bloqueada por el motor puede ser confirmada por el usuario desde su alerta; esta decisión se registra.
- El primer dispositivo registrado se considera confiable. La geolocalización solo se solicita con consentimiento del usuario.

Para contratos de API y flujos de integración, consulta [docs/GUIA_INTEGRACION_FRONTEND.md](docs/GUIA_INTEGRACION_FRONTEND.md).
