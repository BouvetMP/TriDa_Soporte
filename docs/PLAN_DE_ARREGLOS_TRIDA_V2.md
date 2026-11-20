# Plan de arreglos — TriDa v2 (backend + frontend)

Complementa `AUDITORIA_TRIDA_V2.md` (los IDs `F#`, `S#`, `B#`, `DB#`, `UI#`, `D#`, `T#` se refieren a esa auditoría).
> **Estado:** este plan es histórico y contiene pasos ya aplicados. Para decidir el siguiente trabajo, usar [ERRORES_ACTUALES_TRIDA.md](./ERRORES_ACTUALES_TRIDA.md), que refleja la revisión vigente.
**Objetivo:** corregir los errores actuales con cambios pequeños, aislados y reversibles, sin alterar el comportamiento que hoy funciona.

---

## 1. Principios de ejecución ("no romper nada")

1. **Un PR = un problema.** Nada de refactors mezclados con fixes. Cada PR indica *qué toca*, *qué NO toca*, *riesgo* y *cómo verificar*.
2. **Contratos de API: solo cambios aditivos.** No se renombran campos, rutas ni códigos de estado existentes. Si algo debe cambiar de forma visible, se hace en dos pasos (primero se acepta lo nuevo, luego se retira lo viejo).
3. **Alias antes que renombrar.** Para estilos y tokens se añaden alias; no se reescriben cientos de clases de golpe.
4. **Datos antes que código.** Antes de cambiar una estructura que ya contiene datos, documentar verificaciones y respaldo. `database/schema.sql` es el instalador/actualizador idempotente para bases nuevas y existentes. `backend/prisma/schema.prisma` mantiene el modelo relacional e índices compatibles con Prisma; triggers, reglas, funciones, checks e índices basados en expresiones se mantienen en SQL. No se usa un directorio de migraciones Prisma.
5. **Primero la red de seguridad** (Fase 0), después los arreglos.
6. **Decisiones de producto explícitas.** Los puntos que cambian reglas de negocio están marcados 🧭 y requieren aprobación antes de codificar (sección 6).

### Flujo por PR
```
rama fix/<id>-<tema>  →  tests (rojo) → fix (verde) → lint + typecheck + build → smoke manual → PR → merge → verificación en staging
```

---

## 2. Fase 0 — Red de seguridad (sin cambios funcionales)

### P0-1 · Línea base reproducible
Ejecutar y guardar el resultado actual (para comparar después):
```bash
pnpm install --frozen-lockfile
pnpm --dir backend exec tsc --noEmit
pnpm --dir backend lint
pnpm --dir backend test
TEST_DATABASE_URL=... pnpm --dir backend test:integration
pnpm --dir frontend type-check
pnpm --dir frontend lint
pnpm --dir frontend build
```
Anotar errores/avisos existentes: **no se "arreglan de paso"**; solo se evita introducir nuevos.

### P0-2 · Limpieza de archivos generados del frontend (T1)
- **Estado: aplicado.** `tsconfig.node.json` no emite archivos; `.gitignore` excluye las salidas generadas y no quedan `vite.config.js` ni `vite.config.d.ts`.
- **Toca:** `frontend/vite.config.js`, `frontend/vite.config.d.ts` (eliminar), `frontend/tsconfig.node.json`, `frontend/tsconfig.json`, `frontend/package.json`, `.gitignore`.
- **Aplicado también:** los tipos de Vite se movieron a `src/vite-env.d.ts` y el alias de componente se normalizó a `@/` en el único import que lo usaba.

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts"]
}
```
En `tsconfig.json` quitar `"references": [...]` (un proyecto referenciado debe ser `composite`; al quitar `composite` el `tsc -b` falla). Scripts de `package.json`:
```json
"type-check": "tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json",
"build": "pnpm type-check && vite build"
```
`.gitignore`: añadir `vite.config.js`, `vite.config.d.ts`, `*.tsbuildinfo`, `.env.*` (con excepción `!.env.example`).
**Verificar:** `pnpm --dir frontend build` y `dev` funcionan; no reaparecen `vite.config.js/.d.ts`.
**Riesgo:** bajo.

### P0-3 · Validar Swagger en tests (D1, parte 1) — APLICADO
`@apidevtools/swagger-parser` está agregado como dependencia de desarrollo. `contracts.test.ts` valida el documento completo con `SwaggerParser.validate`; el script de contratos ya forma parte del CI.

### P0-4 · Script `typecheck` en backend (T4)
`"typecheck": "tsc --noEmit"`. Sin cambios de código.

---

## 3. Fase 1 — Errores que hoy rompen o confunden (bajo riesgo, alto valor)

Cada PR es independiente; pueden hacerse en paralelo.

### P1-1 · Tokens CSS faltantes como **alias** (F9)
- **Toca:** `frontend/src/styles/index.css` (solo añade).
- **No toca:** ningún componente.

Los componentes ya usan nombres como `--color-bg-surface`. En vez de reescribirlos, se definen como alias de los tokens existentes. Se declaran en `:root`; como `html` es también el elemento con `data-theme`, el tema claro los hereda correctamente.
```css
:root {
  /* Alias de compatibilidad (los componentes actuales los referencian) */
  --color-bg-surface: var(--color-surface);
  --color-bg-surface-hover: var(--color-surface-hover);
  --color-bg-card: var(--color-surface);
  --color-bg-secondary: var(--color-surface-hover);
  --color-bg-hover: var(--color-surface-hover);
  --color-border-subtle: var(--color-border);
  --color-text-subtle: var(--color-text-secondary);
  --color-primary-500: var(--color-primary);

  --color-success: var(--color-income);
  --color-danger: var(--color-expense);
  --color-warning: #f59e0b;

  --color-primary-light: color-mix(in srgb, var(--color-primary) 14%, transparent);
  --color-success-light: color-mix(in srgb, var(--color-success) 14%, transparent);
  --color-danger-light:  color-mix(in srgb, var(--color-danger) 14%, transparent);
  --color-warning-light: color-mix(in srgb, var(--color-warning) 14%, transparent);
}
[data-theme="light"] { --color-warning: #d97706; }
```
**Verificar:** recorrer Reportes, Presupuestos, Ahorro, Mapa, Dispositivos, Perfil en ambos temas (antes: tarjetas transparentes).
**Riesgo:** bajo; es puramente aditivo. Habrá cambio visual *intencional* (las superficies ahora se ven).

### P1-2 · Utilidades Tailwind inexistentes (F10, parte 1)
- **Toca:** `frontend/tailwind.config.ts`, `frontend/src/styles/animations.css`.

```ts
// tailwind.config.ts → theme.extend
fontSize: { "2xs": ["0.625rem", { lineHeight: "0.875rem" }] },
borderWidth: { 3: "3px" },
keyframes: {
  "fade-in":  { from: { opacity: "0" }, to: { opacity: "1" } },
  "slide-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
  "scale-up": { from: { opacity: "0", transform: "scale(.96)" }, to: { opacity: "1", transform: "none" } },
},
animation: {
  "fade-in":  "fade-in .2s ease-out",
  "slide-up": "slide-up .25s ease-out",
  "scale-up": "scale-up .2s ease-out",
},
```
Además, desde `animations.css` respetar `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) { .animate-fade-in, .animate-slide-up, .animate-scale-up { animation: none; } }
```
**Riesgo:** bajo.

### P1-3 · Opacidad de colores Tailwind (F10, parte 2) — PR separado por impacto visual
Problema: `bg-primary/10`, `border-expense/20`, `bg-surface/50`… no se generan cuando el color es `var(--x)` plano. *(Confirmar primero inspeccionando el CSS compilado.)*
- Añadir canales RGB en `index.css` (se **mantienen** los `--color-*` actuales):
```css
:root { --rgb-primary: 99 102 241; --rgb-surface: 17 24 39; --rgb-border: 31 41 55;
        --rgb-income: 16 185 129; --rgb-expense: 239 68 68; --rgb-saving: 59 130 246; }
[data-theme="light"] { --rgb-primary: 79 70 229; --rgb-surface: 255 255 255; --rgb-border: 226 232 240;
        --rgb-income: 5 150 105; --rgb-expense: 220 38 38; --rgb-saving: 37 99 235; }
```
- `tailwind.config.ts`:
```ts
primary: { DEFAULT: "rgb(var(--rgb-primary) / <alpha-value>)", hover: "var(--color-primary-hover)", contrast: "var(--color-primary-contrast)" },
surface: "rgb(var(--rgb-surface) / <alpha-value>)",
border: "rgb(var(--rgb-border) / <alpha-value>)",
income: "rgb(var(--rgb-income) / <alpha-value>)",
expense: "rgb(var(--rgb-expense) / <alpha-value>)",
saving: "rgb(var(--rgb-saving) / <alpha-value>)",
```
**Verificar:** capturas antes/después de Login, Sidebar, Toast, Badge, Alertas. Es un cambio visual positivo (los badges translúcidos aparecen), por eso va aislado.
**Riesgo:** medio-bajo (visual).

### P1-4 · `requireAuth` deja de convertir errores de BD en 401 (F6, S6)
- **Toca:** `backend/src/middlewares/auth.middleware.ts`, `backend/src/utils/jwt.ts`.
```ts
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return void sendError(res, "Token no proporcionado.", 401);

  let decoded: (JwtPayload & { purpose?: string }) | undefined;
  try {
    decoded = verifyToken<JwtPayload & { purpose?: string }>(authHeader.split(" ")[1]);
  } catch {
    return void sendError(res, "Token inválido o expirado.", 401);   // sin 'details'
  }
  if (!decoded?.id_usuario || decoded.purpose === PASSWORD_RESET_PURPOSE) {
    return void sendError(res, "Token inválido o mal formado.", 401);
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { id_usuario: decoded.id_usuario }, select: { id_usuario: true, email: true, rol: true, estado: true } });
    if (!usuario) return void sendError(res, "Usuario no encontrado en la base de datos.", 401);
    if (!usuario.estado) return void sendError(res, "Cuenta de usuario desactivada.", 403);
    req.user = { id_usuario: usuario.id_usuario, email: usuario.email, rol: usuario.rol };
    next();
  } catch (error) {
    next(error);   // fallo de BD → 500 vía errorHandler, NO cierra la sesión
  }
};
```
`jwt.ts`: fijar algoritmo (S2, mismo PR, cambio mínimo):
```ts
jwt.sign(payload, config.JWT_SECRET, { expiresIn, algorithm: "HS256" });
jwt.verify(token, config.JWT_SECRET, { algorithms: ["HS256"] });
```
(`auth.service` firma sin `algorithm`; el valor por defecto ya es HS256, así que los tokens vigentes siguen siendo válidos.)
**Test nuevo:** mockear `prisma.usuario.findUnique` rechazando → esperar 500, no 401.
**Riesgo:** bajo.

### P1-5 · Validación común de IDs de ruta (F11)
- **Toca:** nuevo `backend/src/utils/params.ts`; controladores `accounts`, `categories`, `transactions` (solo la línea del id).
```ts
// utils/params.ts
import { z } from "zod";
export const idParam = z.coerce.number().int().positive();
export const parseId = (value: unknown) => idParam.parse(value);
```
Sustituir `Number(req.params.id)` por `parseId(req.params.id)` dentro del `try`. El `ZodError` ya lo traduce `errorHandler` a 400, sin tocar nada más.
**Test:** `GET /accounts/abc` → 400 (antes 500).

### P1-6 · Cuentas desactivadas no se listan ni aceptan movimientos (F1)
- **Toca:** `accounts.service.ts`, `accounts.controller.ts`, `transactions.service.ts` (2 `findFirst`), texto de `AccountCard`.
```ts
// accounts.service.ts
async getAccounts(userId: number, opts: { incluirInactivas?: boolean } = {}) {
  const accounts = await prisma.cuenta.findMany({
    where: { id_usuario: userId, ...(opts.incluirInactivas ? {} : { estado: true }) },
    orderBy: { fecha_creacion: "asc" },
  });
  return accounts.map(formatAccount);
}
```
`list(userId)` sigue llamando sin opciones (comportamiento nuevo = solo activas); el controlador puede aceptar `?incluir_inactivas=true` para uso futuro.
`getAccountById`, `update`, `deactivate` **no cambian** (siguen operando sobre cualquier cuenta propia).
`transactions.service.ts`: en ambas búsquedas de cuenta añadir `estado: true` y mensaje "La cuenta no existe, está desactivada o no pertenece al usuario".
`AccountCard`: título `¿Desactivar esta cuenta?`, texto "La cuenta dejará de mostrarse y no aceptará nuevos movimientos.", `confirmText="Desactivar cuenta"`.
**Verificar:** el test de integración existente sigue en verde; desactivar una cuenta → desaparece tras refresh; el saldo total del sidebar no cambia (ya filtraba `estado`).
**Riesgo:** bajo. *Efecto a comunicar:* las cuentas ya desactivadas dejan de verse.

### P1-7 · "Todas mis cuentas" en Transacciones (F2)
- **Toca:** `useTransactions.ts`, `TransactionsPage.tsx`, `NewTransactionModal.tsx`.
```ts
// useTransactions.ts — quitar el early-return por !selectedAccount
const queryFilters: TransactionFilters = {
  ...filters,
  ...(selectedAccount ? { id_cuenta: selectedAccount.id_cuenta } : {}),
};
```
`TransactionsPage`: subtítulo `selectedAccount ? "Cuenta actual: …" : "Mostrando todas tus cuentas"` y botón "Nueva transacción" **siempre** habilitado.
`NewTransactionModal`: si no hay cuenta seleccionada, mostrar un `Select` de cuentas activas:
```tsx
const { selectedAccount, accounts } = useAccount();
const [idCuenta, setIdCuenta] = useState("");
const cuentaId = selectedAccount?.id_cuenta ?? (idCuenta ? Number(idCuenta) : undefined);
// en handleSubmit: if (!cuentaId) { setError("Selecciona una cuenta."); return; }
// payload: id_cuenta: cuentaId
```
**Riesgo:** bajo. El API ya soporta listar sin `id_cuenta`.

### P1-8 · Navegación coherente (F3)
- **Toca:** `constants/Navigation.ts`, `components/layout/Sidebar.tsx`.
- `Navigation.ts`: quitar la entrada `/categories` (no hay página) y añadir `{ path: "/devices", label: "Dispositivos", icon: Laptop }` (import `Laptop` de lucide-react).
- Cablear el badge en `Sidebar.tsx`:
```tsx
const { pathname } = useLocation();
const [pending, setPending] = useState(0);
useEffect(() => {
  let active = true;
  AlertsApi.getPendingCount().then(r => active && setPending(r.data.count)).catch(() => {});
  return () => { active = false; };
}, [pathname]);
// ...
<SidebarNav onItemClick={onCloseMobile} pendingAlertsCount={pending} />
```
**Riesgo:** bajo (una petición ligera por navegación).

### P1-9 · Dashboard sin layout duplicado (F4)
- **Toca:** `DashboardPage.tsx` únicamente.
- Cambiar el contenedor raíz a `<div className="space-y-6">`, **eliminar** el bloque "Topbar" y los imports que queden sin uso (`Button`, `ShieldCheck`, `LogOut`, `Sun`, `Moon`, `useTheme`, `logout`): `noUnusedLocals` rompería el build si se dejan.
- Sustituir "Tu conexión con TriDa v2 está 100% segura." por un texto neutro (UI8).

### P1-10 · Swagger: referencias rotas (D1) — APLICADO
- Los dos esquemas de entrada están disponibles en `components.schemas`.
- `SwaggerParser` comprueba el documento completo y sus referencias. Todas las respuestas 2xx tienen esquemas específicos y ejemplos; los conteos documentan las claves devueltas.
**Verificar:** `pnpm --dir backend test` valida Swagger junto con los contratos.

### P1-11 · Fechas "solo fecha" (F8) — sin afectar otras pantallas
En vez de cambiar `formatDate` (usada en todo el sistema), añadir una función nueva y usarla **solo** donde hay columnas `DATE`:
```ts
// utils/Formatters.ts
export function formatDateOnly(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}
```
Usarla en `SavingsGoalCard` (`fecha_limite`).

### P1-12 · Orden por severidad (F7)
- **Toca:** `alerts.service.ts › getAlerts`, solo la rama `sort_by === "severidad"`.
```ts
if (options.sort_by === "severidad") {
  const dir = options.sort_order === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const rows = await prisma.$queryRaw<{ id_alerta: number }[]>(Prisma.sql`
    SELECT id_alerta FROM trida.alertas_fraude
    WHERE id_usuario = ${userId}
      ${options.estado ? Prisma.sql`AND estado = ${options.estado}` : Prisma.empty}
      ${options.severidad ? Prisma.sql`AND severidad = ${options.severidad}` : Prisma.empty}
    ORDER BY CASE severidad WHEN 'BAJA' THEN 1 WHEN 'MEDIA' THEN 2 WHEN 'ALTA' THEN 3 WHEN 'CRITICA' THEN 4 END ${dir}, id_alerta DESC
    LIMIT ${options.limit} OFFSET ${options.offset}`);
  const ids = rows.map(r => r.id_alerta);
  const found = await prisma.alerta_fraude.findMany({ where: { id_alerta: { in: ids }, id_usuario: userId }, include: {/* mismo include actual */} });
  alerts = ids.map(id => found.find(a => a.id_alerta === id)!);
}
```
El resto de órdenes (`fecha_detectada`, `estado`) permanece igual.

---

## 4. Fase 2 — Seguridad y consistencia de datos (requieren verificación de datos)

### P2-1 · Normalizar email (F14)
**Antes del deploy**, comprobar datos existentes:
```sql
SELECT id_usuario, email FROM trida.usuarios WHERE email <> lower(btrim(email));
SELECT lower(btrim(email)), count(*) FROM trida.usuarios GROUP BY 1 HAVING count(*) > 1;
```
Si hay filas, migrar (`UPDATE … SET email = lower(btrim(email))`) y resolver duplicados a mano. Luego:
```ts
const email = z.string().trim().toLowerCase().pipe(z.email("Correo electrónico inválido"));
// usar en register, login, forgotPassword
```
Frontend: `LoginForm` envía `email.trim()`. Test: login con `ANA@x.com` cuando se registró `ana@x.com` → OK.
**Riesgo:** medio si hay datos mixtos; bajo tras la migración.

### P2-2 · Montos válidos (F19)
```ts
// utils/money.ts
// Usa Prisma.Decimal, redondeo ROUND_HALF_UP y un máximo compatible con NUMERIC(15,2).
```
Aplicado a `monto` (transacciones, aportes), `limite_mensual`, `monto_objetivo`, `monto_actual` y `saldo_inicial`. La UI usa `step="0.01"`. Los tests siguen aceptando `"30.5"` y rechazan negativos y valores superiores al límite.

### P2-3 · Límite en listados (S5)
`limit: z.coerce.number().int().positive().max(100).optional()` en `listTransactionsQuerySchema`. El frontend usa 15, no se afecta.

### P2-4 · Errores unificados y sin fugas (B1, S6)
Enfoque aplicado: `AppError` se usa como base; las clases de dominio conservan un código propio y el error global decide la respuesta. El middleware de autenticación entrega errores al mismo manejador.
```ts
// utils/AppError.ts
export class AppError extends Error {
  constructor(message: string, public statusCode = 400, public code?: string) {
    super(message); this.name = new.target.name;
  }
}
// ej.: export class AccountError extends AppError {}  (resto igual)
```
`errorHandler`:
```ts
if (err instanceof AppError) { sendError(res, err.message, err.statusCode, null, err.code); return; }
// Prisma: quitar `{ prisma_code }` de details (se registra en consola, no se devuelve)
// Genérico: devolver message solo si el error es "expuesto" (p.ej. body-parser/http-errors)
const exposed = (err as { expose?: boolean }).expose === true;
const clientMessage = statusCode < 500 && exposed ? errorObj.message : "Ocurrió un error interno en el servidor.";
```
Actualizar `swagger.ts` (`DatabaseRecordError`/`InvalidRelationError` ejemplos) para no mostrar `prisma_code`.
**Verificar:** todos los tests de contrato; JSON malformado → 400 con mensaje genérico.

### P2-5 · Endurecimiento de autenticación
Cambios pequeños y separados:
1. **Timing/enumeración en login (S1)**
```ts
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 10);
const user = await prisma.usuario.findUnique({ where: { email } });
const valid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
if (!user || !valid) throw new AuthError("Credenciales inválidas", 401);
if (!user.estado) throw new AuthError("La cuenta se encuentra inactiva o suspendida", 403);
```
2. **`forgot-password` sin esperar el SMTP (S1):** construir el token y disparar el envío sin `await` (`void this.sendResetEmail(...).catch(logError)`), devolviendo siempre el mismo mensaje.
3. **Contraseñas (S9):** un solo helper `hashPassword` (≥12 rondas) usado por `register`, `resetPassword` y `changePassword`; `.max(72)` en `strongPassword`. *Los hashes antiguos con 10 rondas siguen validando; no hace falta migrarlos.*
4. **Reset token en URL (S10):** en `ResetPasswordPage`, tras leer el token: `window.history.replaceState(null, "", window.location.pathname);`.
5. **Rate limiting (S4):** fábrica de limitadores por ruta (login 10/15 min por IP+email, registro 5/h, forgot 5/15 min, `verify-reset-token` 30/15 min) y `app.set("trust proxy", config.TRUST_PROXY)` configurable por env (valor por defecto: desactivado). Confirmar el nombre de opción (`max` vs `limit`) según la versión instalada.
6. **Swagger solo fuera de producción (S7):** `if (config.NODE_ENV !== "production") { app.use("/api/docs", …) }`. 🧭 Confirmar si en producción se necesita documentación.
7. **CSV (S8):** en `useReports.escapeCsv`, para valores `string` que empiecen por `= + - @ \t \r` anteponer `'`:
```ts
const escapeCsv = (v: string | number | null) => {
  let s = String(v ?? "");
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
```

### P2-6 · Alertas y transacciones bloqueadas (F12) 🧭
Hoy, una transacción bloqueada por el motor (`RECHAZADA`) deja una alerta `PENDIENTE` que no se puede resolver con "Fui yo". **Decisión requerida:** ¿el usuario puede liberar un bloqueo del sistema?
- *Opción A (recomendada):* permitirlo solo si la alerta está `PENDIENTE` y sin `accion_usuario` (bloqueo del sistema, no rechazo del usuario):
```ts
const systemBlocked = currentTransaction.estado === "RECHAZADA" && alert.estado === "PENDIENTE" && alert.accion_usuario === null;
if (confirmsTransaction && currentTransaction.estado === "RECHAZADA" && !systemBlocked) throw new AlertError(…, 409);
// en updateMany del confirm: estado: { in: ["PENDIENTE","CONFIRMADA","APROBADA", ...(systemBlocked ? ["RECHAZADA"] : [])] }
// al incrementar saldo: if ((estado === "PENDIENTE" || systemBlocked) && id_cuenta !== null) { … increment … }
```
- *Opción B:* cerrar automáticamente la alerta (`DESCARTADA`/auto-resuelta) al bloquear y mostrar el motivo en la transacción.
Añadir test de integración (saldo antes/después) cualquiera sea la opción.

### P2-7 · Saldo de cuenta (F15)
- **Aplicado:** la API bloquea editar `saldo_inicial` en `PATCH`, y el modelo ahora distingue `saldo_inicial` de `saldo_actual`.
- **Aplicado:** Prisma y los scripts SQL incluyen `saldo_actual`; las transacciones y resoluciones de alertas actualizan esta columna; el dashboard y el frontend leen el saldo actual.
- **Migración SQL:** `schema.sql` agrega `saldo_actual` y lo inicializa desde `saldo_inicial` en bases existentes. Esta backfill preserva el saldo visible actual, pero no permite recuperar el saldo inicial original de cuentas que ya acumularon movimientos.
- **Pendiente:** ejecutar y validar la migración en una base descartable o copia representativa; no se ejecutó porque el entorno no tiene `TEST_DATABASE_URL` ni `DATABASE_URL`.

### P2-8 · Metas de ahorro (F16)
La creación marca como completadas las metas que alcanzan el objetivo y genera un aporte inicial; la actualización permite borrar `fecha_limite` y recalcula `ACTIVA`/`COMPLETADA` según el monto actual y objetivo. `PAUSADA` y `CANCELADA` se conservan como estados manuales. `useSavings` excluye canceladas y pausadas de los totales generales.

### P2-9 · Índices de BD (DB1) — rendimiento sin cambio funcional
Los índices `idx_alertas_tx_fecha`, `idx_tx_ubicacion`, `idx_tx_dispositivo` e `idx_tx_user_cat_fecha` están en `database/schema.sql` y en el modelo Prisma. Los índices parciales y basados en expresiones se mantienen solo en SQL. Antes de aplicar `schema.sql` a una base existente, respaldarla y validar el script sobre una copia representativa.
Comparar `EXPLAIN (ANALYZE)` de `listTransactions` y `budgets.list` antes/después de aplicar el esquema en el entorno correspondiente.

### P2-10 · Mitigación XSS para JWT en `localStorage` (S11)
La CSP de producción limita scripts al mismo origen y `connect-src` al origen de la API configurada; los builds requieren `VITE_API_BASE_URL` HTTPS. El modo desarrollo permite scripts inline para el cliente/HMR de Vite. La política reduce la capacidad de exfiltrar el token, pero no evita que JavaScript activo lea `localStorage`. La migración a cookie `HttpOnly` con protección CSRF queda como trabajo futuro.

### P2-11 · Auditoría y privacidad (S12–S13)
**Política acordada e implementación agregada; integración PostgreSQL pendiente:** la bitácora conserva eventos indefinidamente, no guarda IP en los nuevos eventos y cada usuario puede consultar solo los suyos en modo de lectura. Se registran inicios de sesión, actividad de dispositivos y decisiones sobre alertas; los cambios de email, contraseña y estado se registran mediante el trigger existente. La API no expone la columna IP. La retención indefinida implica crecimiento continuo de la tabla. Si se incorpora eliminación de cuentas, habrá que resolver la anonimización de eventos frente a las reglas append-only. No se cambió ni ejecutó SQL. La aplicación dejó de añadir automáticamente la IP del servidor a nuevas transacciones; el campo opcional `ip_origen` del API aún puede guardarse si un cliente lo envía. El mapa usa mosaicos de OpenStreetMap (no un `iframe`), solicita recursos con `Referrer-Policy: no-referrer` y muestra un aviso sobre el proveedor externo. Las IP históricas no se borraron.

---

## 5. Fase 3 — Calidad estructural (después de estabilizar)

Se abordan cuando las fases 1–2 estén en producción; cada punto sigue siendo un PR aislado.

| PR | Tema | Resumen del cambio | Riesgo |
|---|---|---|---|
| P3-1 | Modal (UI5) | Evitar que un modal cerrado libere el scroll de otro abierto | Bajo |
| P3-2 | Carreras en hooks (UI4) | **Aplicado:** control de respuesta más reciente en `useTransactions`, `useAlerts`, `useReports`, `useMapTransactions` y `useCategories`. El contexto compartido de categorías está cubierto por el error 8 y sus pruebas de deduplicación, aislamiento por usuario y mutaciones. | Bajo |
| UI7 | Modal de transacciones | **Aplicado:** limpia el error de validación al reabrir; el selector ya limita categorías al tipo de movimiento. | Bajo |
| P3-3 | Umbrales de riesgo (B3) | **Aplicado:** `RISK_THRESHOLDS` centraliza 30/70/95; SQL y TypeScript comparten la clasificación y el mapa recibe el nivel desde el backend. | Bajo: no se modificaron los valores del umbral. |
| P3-4 | Fechas/zonas (B4) | `utils/dateRange.ts` con `APP_TIMEZONE=America/Bogota` | Medio: cambia límites de periodos |
| P3-5 | Serialización (B5) | Serializadores `monto → number` en transacciones/alertas | Bajo (solo normaliza tipos) |
| P3-6 | Categorías (B10, DB2) | Baja lógica + filtro `estado` + reactivar si existe el nombre | Medio 🧭 |
| P3-7 | Dashboard y reportes (B13, B14, F17, UI11–UI13) | `Promise.all`, tarjetas del mapa sin duplicados y sección de comercios en reportes; `RiskBadge` y opciones duplicadas pendientes | Bajo |
| P3-8 | Estado de transacciones en UI (F13) | Badge de estado y botones Confirmar/Rechazar para `PENDIENTE` (usa el endpoint existente) | Bajo |
| P3-9 | A11y (UI6) | `useId` en `Input/Select`, `aria-label` en botones de icono, `role="status"` en Toast | Bajo |
| P3-10 | Dependencias (T2) | **Aplicado:** alinear TS, `@types/node`, `eslint-config-prettier` y tipos de Express; quitar Zod frontend sin uso y `@types/bcryptjs`; añadir `engines` y `.nvmrc` (Node 22.13+). Tests, typecheck y lint pasan; build backend bloqueado por `EPERM` de Prisma en Windows. | Medio |
| P3-11 | Código muerto (sección 8 de la auditoría) | Eliminar archivos/alias sin referencias (verificar con búsqueda global antes) | Bajo |
| P3-12 | Docs (D2–D5) | **Aplicado parcialmente:** README y guía aclarados; OpenAPI incluye contratos y ejemplos específicos para todas las respuestas 2xx y se valida con Swagger Parser en CI. Quedan pendientes los otros puntos documentales de D4–D5. | Nulo |
| B17 | Operación | **Aplicado:** `/health/ready` comprueba PostgreSQL; el apagado ordenado espera solicitudes HTTP y envíos SMTP activos; `request-id`/logs JSON omiten query strings y errores sensibles; SMTP usa transporte pooled reutilizable. | Bajo |
| T3–T4 | Pruebas y CI | **Aplicado:** pruebas Vitest de UI y carreras, y GitHub Actions ejecuta tests, typecheck, lint, builds e integración PostgreSQL. | Bajo |
| DB4 | Estrategia de esquema | **Flujo manual:** `schema.sql` idempotente para bases nuevas y existentes; `schema.prisma` refleja los objetos que Prisma puede modelar. Sin directorio de migraciones Prisma. | Medio: respaldar, validar el estado y probar el script sobre una copia antes de actualizar una base existente. |
| DB5 / DB7 | Deriva SQL y tipos de esquema | **Decidido:** conservar por ahora las funciones SQL legacy porque no se confirmó que no haya consumidores externos; mantener `VARCHAR + CHECK` para evitar cambios no coordinados en bases existentes. El esquema unificado desconecta solo los triggers legacy cuya lógica duplica al backend, conservando sus funciones. | Alto: compatibilidad y cambio de esquema |
| DB8 / DB9 | Canal y precisión monetaria | **Aplicado:** se documentó el canal predeterminado `web`; balances, tasas de ahorro, progreso de metas y umbrales de riesgo calculan con `Prisma.Decimal`, convirtiendo al contrato `number` solo al serializar o presentar. La selección de moneda y conversión queda aparte; la presentación actual sigue en COP. | Bajo |

### P3-13 · Registro de dispositivos (F5) 🧭 — **no activar sin esta advertencia**
Conectar el registro de dispositivo **cambia el comportamiento del motor de riesgo**: los dispositivos nuevos nacen con `confiable = false` y la regla suma +30 puntos (→ riesgo MEDIO → transacción `PENDIENTE`). Si el frontend empieza a enviar `id_dispositivo`, **todas** las transacciones del usuario podrían quedar pendientes.
Pasos seguros:
1. Decidir la política: el primer dispositivo de un usuario se crea `confiable = true` (o se confía el dispositivo de la sesión de login).
2. Backend: `registerOrUpdate` aplica esa política; el esquema completo define la unicidad `(id_usuario, identificador_unico)`. Para bases existentes, comprobar duplicados y planificar el cambio fuera de archivos de migración del repositorio.
3. Frontend: UUID persistente en `localStorage`, `POST /devices` tras el login, enviar `id_dispositivo` en `createTransaction`; protegerlo con una bandera `VITE_ENABLE_DEVICE_REGISTRATION`.
4. Corregir el texto de `DevicesPage`.

---

## 6. Decisiones de producto pendientes (🧭)

| Tema | Pregunta | Recomendación |
|---|---|---|
| Transacciones bloqueadas (F12) | ¿El usuario puede liberar un bloqueo del sistema? | Sí, con trazabilidad (Opción A) |
| Saldo de cuenta (F15) | ¿El usuario puede editar el saldo manualmente? | No; ajustes mediante transacciones |
| Presupuestos (B8) | ¿`AHORRO` consume presupuesto? | No; solo movimientos `GASTO` |
| Umbral "riesgo alto" (B3) | ¿≥50 o ≥70? | Resuelto: el código actual ya usaba ≥70; se centralizaron los umbrales 30/70/95. |
| Categorías (B10) | ¿Baja lógica o borrado? | Baja lógica |
| Swagger en producción (S7) | ¿Debe estar disponible? | Solo en desarrollo/staging |
| Dispositivos (F5) | ¿Primer dispositivo confiable? | Sí |
| AHORRO vs metas (B16) | ¿Un aporte debe descontar saldo? | Decidir y documentar |

---

## 7. Orden recomendado y dependencias

| Orden | PR | Depende de | Riesgo | Tipo |
|---|---|---|---|---|
| 1 | P0-1…P0-4 | – | Nulo | Red de seguridad |
| 2 | P1-1, P1-2 | – | Bajo | Front estilos |
| 3 | P1-4, P1-5 | – | Bajo | Back |
| 4 | P1-10 | P0-3 | Bajo | Docs/back |
| 5 | P1-6, P1-7, P1-8, P1-9, P1-11, P1-12 | – | Bajo | Back + Front |
| 6 | P1-3 | P1-1, P1-2 | Medio-bajo (visual) | Front estilos |
| 7 | P2-3, P2-4, P2-2 | P1-4 | Bajo | Back |
| 8 | P2-1 | verificación de datos | Medio | Back + datos |
| 9 | P2-5 | P2-4 | Medio | Seguridad |
| 10 | P2-8, P2-7 (paso 1), P2-9 | – | Bajo | Mixto |
| 11 | P2-6 | decisión 🧭 | Medio | Back |
| 12 | Fase 3 | Fases 1–2 | Variable | Calidad |
| 13 | P3-13 | decisión 🧭 | Alto | Funcional |

---

## 8. Checklist de no regresión (por cada PR)

**Automático**
- [ ] `pnpm --dir backend typecheck && pnpm --dir backend lint && pnpm --dir backend test`
- [ ] `pnpm --dir backend test:integration` (BD de pruebas separada)
- [ ] `pnpm --dir frontend test && pnpm --dir frontend type-check && pnpm --dir frontend lint && pnpm --dir frontend build`
- [ ] Sin cambios en respuestas existentes (comparar contra `/api/docs.json` anterior; solo adiciones)

**Manual (smoke, ~10 min, tema oscuro y claro)**
- [ ] Registro → login → logout; sesión expirada redirige a `/login?expired=true`
- [ ] Recuperación de contraseña de punta a punta
- [ ] Crear/editar/desactivar cuenta; saldo del sidebar correcto
- [ ] Crear transacción (GASTO/INGRESO/AHORRO); el saldo cambia; borrar la revierte
- [ ] Transacción de alto riesgo → alerta → resolver ("Fui yo" / "No fui yo")
- [ ] Presupuesto: crear, editar, eliminar; barra de progreso
- [ ] Meta de ahorro: crear, aportar, completar
- [ ] Reportes (cambio de periodo y exportar CSV), Insights, Mapa
- [ ] Móvil: menú lateral, modales, scroll

**Despliegue**
- Cada cambio de base se refleja en `database/schema.sql` y `backend/prisma/schema.prisma` cuando Prisma puede representarlo; los objetos SQL personalizados también se mantienen en `schema.sql`.
- Antes de actualizar una base existente, respaldar, comprobar las validaciones del script y probarlo sobre una copia representativa.
- Desplegar backend primero cuando el frontend dependa de un cambio aditivo del API; nunca al revés.
- Mantener cada PR revertible individualmente (`git revert`).

---

## 9. Definición de "terminado" para la fase de arreglos

- Los 10 errores P0 de la sección 1 de la auditoría están cerrados o tienen decisión registrada.
- La suite de pruebas incluye casos para: `requireAuth` con fallo de BD, ID inválido, cuenta inactiva, email normalizado, orden por severidad, Swagger válido.
- Sin `var(--…)` indefinidas ni clases Tailwind inexistentes (revisión del CSS compilado).
- Documentación (`GUIA_INTEGRACION_FRONTEND.md`, `README`, `.env.example`) coincide con el comportamiento real.
