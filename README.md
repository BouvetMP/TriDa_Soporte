# TriDa

TriDa es una aplicación de finanzas personales con frontend React/Vite, API Express/Prisma y PostgreSQL.

## Requisitos

- Node.js compatible con ESLint 10 (Node 20.19+ o 22.13+).
- pnpm.
- PostgreSQL.

## Instalación local

1. Instala dependencias desde la raíz:

   ```sh
   pnpm install --frozen-lockfile
   ```

2. Crea `backend/.env` a partir de `.env.example` y configura `DATABASE_URL`, `JWT_SECRET` y `FRONTEND_URL`. `APP_TIMEZONE` define la zona usada en filtros de fecha (por defecto `America/Bogota`). SMTP está desactivado temporalmente por defecto (`SMTP_ENABLED=false`): el registro marca la cuenta como verificada y permite iniciar sesión; la recuperación por correo responde que no está disponible. Para reactivar la verificación y recuperación por correo, configura las credenciales SMTP y establece `SMTP_ENABLED=true`. Si la API está detrás de un proxy confiable, habilita `TRUST_PROXY=true`.

3. En una base nueva, aplica `database/schema.sql` una sola vez. Para actualizar una base existente, haz un respaldo y ejecuta `database/update_existing.sql` con `ON_ERROR_STOP`; valida roles y duplicados que impedirían las restricciones, y crea perfiles financieros que falten. No ejecutes el actualizador sobre una base vacía ni `schema.sql` sobre una base ya creada. El repositorio no mantiene una cadena de migraciones incrementales.

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
pnpm --dir frontend type-check
pnpm --dir frontend lint
pnpm --dir frontend build
```

Las pruebas de integración requieren `TEST_DATABASE_URL` apuntando a una base de pruebas exclusiva y con `database/schema.sql` aplicado:

```sh
pnpm --dir backend test:integration
```

## Comportamientos importantes

- El saldo de una cuenta cambia por transacciones; la interfaz no permite editarlo directamente.
- Los movimientos `AHORRO` cuentan como consumo del presupuesto. Los aportes a metas de ahorro son independientes y no descuentan automáticamente una cuenta.
- Las categorías se desactivan lógicamente para conservar el historial.
- Una transacción bloqueada por el motor puede ser confirmada por el usuario desde su alerta; esta decisión se registra.
- El primer dispositivo registrado se considera confiable. La geolocalización solo se solicita con consentimiento del usuario.

Para contratos de API y flujos de integración, consulta [docs/GUIA_INTEGRACION_FRONTEND.md](docs/GUIA_INTEGRACION_FRONTEND.md).
