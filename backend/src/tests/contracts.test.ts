import assert from "node:assert/strict";
import test from "node:test";
import { swaggerSpec } from "../config/swagger.js";
import { createAccountSchema, updateAccountSchema } from "../modules/account/accounts.schemas.js";
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  updateTransactionStatusSchema,
} from "../modules/transactions/transactions.schemas.js";
import { getTransactionBalanceDelta } from "../modules/transactions/transaction-balance.js";
import { queryRaw } from "../db/queryRaw.js";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "../modules/auth/auth.schemas.js";
import {
  budgetQuerySchema,
  createBudgetSchema,
} from "../modules/budgets/budgets.schemas.js";
import {
  alertIdSchema,
  listAlertsQuerySchema,
  updateAlertStatusSchema,
} from "../modules/alerts/alerts.schemas.js";
import { getAlertTransactionDecision } from "../modules/alerts/alerts.service.js";
import { registerDeviceSchema, updateTrustSchema } from "../modules/devices/devices.schemas.js";
import { isPrismaKnownRequestError } from "../middlewares/error.middleware.js";
import {
  addFundsSchema,
  createSavingsSchema,
  savingsIdSchema,
  updateSavingsSchema,
} from "../modules/savings/savings.schemas.js";
import { parseId } from "../utils/params.js";
import { reportQuerySchema } from "../modules/reports/reports.schemas.js";
import { mapQuerySchema } from "../modules/maps/maps.schemas.js";
import { getRiskLevel, riskLevelSql, riskRankSql } from "../utils/risk.js";
import {
  parseDateEnd,
  parseDateStart,
  startOfMonth,
  startOfNextMonth,
} from "../utils/dateRange.js";
import {
  createPasswordResetToken,
  getUnverifiedPasswordResetUserId,
  PASSWORD_RESET_TOKEN_TTL_SECONDS,
  verifyPasswordResetToken,
} from "../modules/auth/reset-token.js";
import {
  createEmailVerificationToken,
  getUnverifiedEmailVerificationUserId,
  verifyEmailVerificationToken,
} from "../modules/auth/email-verification.js";
import jwt from "jsonwebtoken";

test("risk thresholds classify boundary scores consistently in TypeScript and SQL", () => {
  const cases = [
    [29, "BAJO"],
    [30, "MEDIO"],
    [69, "MEDIO"],
    [70, "ALTO"],
    [94, "ALTO"],
    [95, "CRITICO"],
  ] as const;

  for (const [score, expected] of cases) {
    assert.equal(getRiskLevel(score), expected);
  }

  assert.match(riskLevelSql("score_anomalia"), /score_anomalia >= 95 THEN 'CRITICO'/);
  assert.match(riskRankSql("score_anomalia"), /score_anomalia >= 70 THEN 3/);
});

test("account schema accepts the documented snake_case contract only", () => {
  const documented = createAccountSchema.parse({
    nombre: "Cuenta principal",
    tipo: "BANCO",
    numero_enmascarado: "****1234",
    saldo_inicial: 250,
  });
  assert.equal(documented.numero_enmascarado, "****1234");
  assert.equal(documented.saldo_inicial, 250);
  assert.equal(
    createAccountSchema.safeParse({
      nombre: "Cuenta secundaria",
      tipo: "EFECTIVO",
      numeroEnmascarado: "1234",
    }).success,
    false,
  );
  assert.equal(
    createAccountSchema.safeParse({ nombre: "Cuenta", tipo: "BANCO", saldo_inicial: -1 }).success,
    false,
  );
  assert.equal(updateAccountSchema.safeParse({}).success, false);
  assert.equal(
    updateAccountSchema.safeParse({ nombre: "Cuenta principal", saldo_inicial: 500 }).success,
    false,
  );
  const accountUpdatePaths = swaggerSpec as {
    paths?: Record<
      string,
      {
        patch?: {
          requestBody?: {
            content?: Record<
              string,
              { schema?: { properties?: Record<string, unknown> } }
            >;
          };
        };
      }
    >;
  };
  const accountUpdate = accountUpdatePaths.paths?.["/api/v2/accounts/{id}"]?.patch;
  assert.equal(
    accountUpdate?.requestBody?.content?.["application/json"]?.schema?.properties
      ?.saldo_inicial,
    undefined,
  );
});

test("transaction schema accepts snake_case and rejects camelCase aliases", () => {
  const transaction = createTransactionSchema.parse({
    id_cuenta: "5",
    monto: "30.5",
    tipo_movimiento: "GASTO",
  });

  assert.equal(transaction.id_cuenta, 5);
  assert.equal(transaction.monto, 30.5);
  assert.equal(createTransactionSchema.parse({
    id_cuenta: 5,
    monto: "1.239",
    tipo_movimiento: "GASTO",
  }).monto, 1.24);
  assert.equal(
    createTransactionSchema.safeParse({
      accountId: "5",
      monto: "30.5",
      tipo_movimiento: "GASTO",
    }).success,
    false,
  );
  assert.equal(
    listTransactionsQuerySchema.safeParse({ limit: "101" }).success,
    false,
  );
  assert.equal(
    createTransactionSchema.safeParse({
      id_cuenta: 5,
      monto: -1,
      tipo_movimiento: "GASTO",
    }).success,
    false,
  );
  assert.equal(
    createTransactionSchema.safeParse({
      id_cuenta: 5,
      monto: 10,
      tipo_movimiento: "GASTO",
      ip_origen: "not-an-ip",
    }).success,
    false,
  );
  assert.equal(
    createTransactionSchema.safeParse({
      id_cuenta: 5,
      monto: 10,
      tipo_movimiento: "GASTO",
      ip_origen: "::1",
    }).success,
    true,
  );
});

test("route IDs and monetary values are bounded and normalized", () => {
  assert.equal(parseId("12"), 12);
  assert.throws(() => parseId("abc"));
  assert.throws(() => parseId("0"));
  assert.equal(addFundsSchema.safeParse({ monto: "2.345" }).data?.monto, 2.35);
  assert.equal(addFundsSchema.safeParse({ monto: "10000000000000" }).success, false);
  assert.equal(
    createBudgetSchema.safeParse({
      id_categoria: 1,
      limite_mensual: "10000000000000",
      mes: 1,
      anio: 2026,
    }).success,
    false,
  );
  assert.equal(
    createSavingsSchema.safeParse({
      nombre: "Ahorro",
      monto_objetivo: 100,
      monto_actual: 100,
    }).success,
    true,
  );
  assert.equal(updateSavingsSchema.safeParse({ fecha_limite: null }).success, true);
});

test("calendar date filters use the configured timezone boundaries", () => {
  const timeZone = "America/Bogota";
  assert.equal(
    parseDateStart("2026-11-01", timeZone).toISOString(),
    "2026-11-01T05:00:00.000Z",
  );
  assert.equal(
    parseDateEnd("2026-11-01", timeZone).toISOString(),
    "2026-11-02T04:59:59.999Z",
  );
  const date = new Date("2026-11-18T12:00:00.000Z");
  assert.equal(startOfMonth(date, timeZone).toISOString(), "2026-11-01T05:00:00.000Z");
  assert.equal(
    startOfNextMonth(date, timeZone).toISOString(),
    "2026-12-01T05:00:00.000Z",
  );
  assert.throws(() => parseDateStart("2026-02-30", timeZone), /Fecha de calendario inválida/);
});

test("documented transaction query parameters map to service filters", () => {
  const query = listTransactionsQuerySchema.parse({
    id_cuenta: "5",
    min_monto: "10",
    fecha_inicio: "2026-01-01",
    sort_by: "monto",
    sort_order: "asc",
    estado: "CONFIRMADA",
    search: "mercado",
  });

  assert.equal(query.id_cuenta, 5);
  assert.equal(query.fecha_inicio, "2026-01-01");
  assert.equal(query.min_monto, 10);
  assert.equal(query.sort_by, "monto");
  assert.equal(query.sort_order, "asc");
  assert.equal(query.estado, "CONFIRMADA");
  assert.deepEqual(
    budgetQuerySchema.parse({ id_cuenta: "5", mes: "2", anio: "2026" }),
    { id_cuenta: 5, mes: 2, anio: 2026 },
  );
  assert.equal(reportQuerySchema.parse({ id_cuenta: "5" }).id_cuenta, 5);
  assert.equal(mapQuerySchema.parse({ id_cuenta: "5" }).id_cuenta, 5);
});

test("global account filters are documented for dashboard, reports, budgets and map", () => {
  const spec = swaggerSpec as {
    paths?: Record<string, { get?: { parameters?: Array<{ name: string }> } }>;
  };
  for (const path of [
    "/api/v2/dashboard/stats",
    "/api/v2/reports/summary",
    "/api/v2/reports/by-category",
    "/api/v2/reports/transactions",
    "/api/v2/budgets",
    "/api/v2/map/stats",
    "/api/v2/map/locations",
  ]) {
    const parameters = spec.paths?.[path]?.get?.parameters ?? [];
    assert.ok(parameters.some(({ name }) => name === "id_cuenta"), `${path} must expose id_cuenta`);
  }
});

test("pending transactions can only be resolved to a balance-affecting final state", () => {
  assert.equal(updateTransactionStatusSchema.safeParse({ estado: "CONFIRMADA" }).success, true);
  assert.equal(updateTransactionStatusSchema.safeParse({ estado: "RECHAZADA" }).success, true);
  assert.equal(updateTransactionStatusSchema.safeParse({ estado: "PENDIENTE" }).success, false);
  assert.equal(getTransactionBalanceDelta("INGRESO", 25).toString(), "25");
  assert.equal(getTransactionBalanceDelta("GASTO", 25).toString(), "-25");
  assert.equal(getTransactionBalanceDelta("AHORRO", 25).toString(), "-25");
  assert.equal(getTransactionBalanceDelta("GASTO", "25.10").toFixed(2), "-25.10");
  assert.throws(() => getTransactionBalanceDelta("INVALIDO", 25), /Tipo de movimiento inválido/);
  assert.throws(
    () => queryRaw("SELECT $2", 1),
    /La consulta SQL no coincide con sus parámetros enlazados/,
  );
});

test("auth schemas align with the snake_case OpenAPI fields", () => {
  assert.equal(
    registerSchema.safeParse({
      nombre_completo: "Ana Pérez",
      email: "ana@email.com",
      password: "ClaveSegura1",
    }).success,
    true,
  );
  assert.equal(
    registerSchema.parse({
      nombre_completo: "Ana Pérez",
      email: "  Ana@EMAIL.COM ",
      password: "ClaveSegura1",
    }).email,
    "ana@email.com",
  );
  assert.equal(
    loginSchema.safeParse({ correo: "ana@email.com", password: "ClaveSegura1" }).success,
    false,
  );
  assert.deepEqual(updateProfileSchema.parse({ telefono: null }), {
    telefono: null,
  });
  assert.equal(updateProfileSchema.safeParse({ telefono: "" }).success, true);

  const spec = swaggerSpec as {
    components?: {
      schemas?: Record<string, { properties?: Record<string, unknown> }>;
    };
    paths?: Record<string, { get?: { parameters?: Array<{ name: string }> } }>;
  };
  const schemas = spec.components?.schemas ?? {};
  assert.ok(schemas.RegisterRequest?.properties?.email);
  assert.equal(schemas.RegisterRequest?.properties?.correo, undefined);
  assert.ok(schemas.ResetPasswordRequest?.properties?.password_nueva);

  const transactionParameters =
    spec.paths?.["/api/v2/transactions"]?.get?.parameters?.map(({ name }) => name) ?? [];
  assert.ok(transactionParameters.includes("fecha_inicio"));
  assert.ok(transactionParameters.includes("sort_by"));
  assert.equal(transactionParameters.includes("startDate"), false);

  assert.ok(schemas.CreateBudgetRequest?.properties?.limite_mensual);
});

test("budget, alert and device payloads use database-aligned snake_case fields", () => {
  assert.equal(
    createBudgetSchema.safeParse({
      id_categoria: 2,
      limite_mensual: 500,
      mes: 6,
      anio: 2026,
    }).success,
    true,
  );
  assert.equal(
    createBudgetSchema.safeParse({
      id_categoria: 2,
      monto_limite: 500,
      mes: 6,
      anio: 2026,
    }).success,
    false,
  );
  assert.equal(listAlertsQuerySchema.parse({ severidad: "ALTA" }).severidad, "ALTA");
  assert.equal(alertIdSchema.parse("12"), 12);
  assert.equal(alertIdSchema.safeParse("no-es-un-id").success, false);
  assert.equal(
    updateAlertStatusSchema.safeParse({ estado: "DESCARTADA", accion_usuario: "FUI_YO" }).success,
    true,
  );
  assert.equal(
    updateAlertStatusSchema.safeParse({ estado: "CONFIRMADA", accion_usuario: "NO_FUI_YO" }).success,
    true,
  );
  assert.equal(
    updateAlertStatusSchema.safeParse({ estado: "CONFIRMADA", accion_usuario: "BLOQUEAR_TARJETA" }).success,
    true,
  );
  assert.equal(
    updateAlertStatusSchema.safeParse({ estado: "CONFIRMADA", accion_usuario: "FUI_YO" }).success,
    false,
  );
  assert.deepEqual(
    getAlertTransactionDecision({
      estado: "DESCARTADA",
      accion_usuario: "FUI_YO",
    }),
    { confirmsTransaction: true, rejectsTransaction: false },
  );
  assert.deepEqual(
    getAlertTransactionDecision({
      estado: "CONFIRMADA",
      accion_usuario: "NO_FUI_YO",
    }),
    { confirmsTransaction: false, rejectsTransaction: true },
  );
  assert.deepEqual(
    getAlertTransactionDecision({
      estado: "CONFIRMADA",
      accion_usuario: "BLOQUEAR_TARJETA",
    }),
    { confirmsTransaction: false, rejectsTransaction: true },
  );
  assert.equal(
    registerDeviceSchema.safeParse({
      identificador_unico: "device-hash",
      tipo_dispositivo: "MOBILE",
    }).success,
    true,
  );
  assert.equal(updateTrustSchema.safeParse({ confiable: true }).success, true);
});

test("OpenAPI includes all previously undocumented auth and dashboard routes", () => {
  const paths = (
    swaggerSpec as {
      paths?: Record<string, { get?: unknown; patch?: unknown }>;
    }
  ).paths ?? {};

  assert.ok(paths["/api/v2/auth/forgot-password"]);
  assert.ok(paths["/api/v2/auth/verify-email"]);
  assert.ok(paths["/api/v2/auth/verify-reset-token"]);
  assert.ok(paths["/api/v2/auth/reset-password"]);
  assert.ok(paths["/api/v2/dashboard/estadisticas"]);
  assert.ok(paths["/api/v2/dashboard/advice"]?.get);
  assert.ok(paths["/api/v2/dashboard/advice/{id}/read"]?.patch);
  assert.ok(paths["/api/v2/auth/me"]?.patch);
});

test("OpenAPI documents category retrieval, soft deletion, and count severities", () => {
  type Operation = {
    summary?: string;
    responses?: Record<
      string,
      {
        content?: {
          "application/json"?: { example?: { data?: Record<string, unknown> } };
        };
      }
    >;
  };
  const paths = (
    swaggerSpec as unknown as {
      paths?: Record<string, Record<string, Operation>>;
    }
  ).paths ?? {};

  assert.ok(paths["/api/v2/categories/{id}"]?.get);
  assert.match(paths["/api/v2/categories/{id}"]?.delete?.summary ?? "", /desactivar/i);
  assert.deepEqual(
    paths["/api/v2/transactions/counts-by-level"]?.get?.responses?.["200"]?.content?.[
      "application/json"
    ]?.example?.data,
    { BAJO: 3, MEDIO: 2, ALTO: 1, CRITICO: 0 },
  );
  assert.deepEqual(
    paths["/api/v2/alerts/counts-by-level"]?.get?.responses?.["200"]?.content?.[
      "application/json"
    ]?.example?.data,
    { BAJA: 3, MEDIA: 2, ALTA: 1, CRITICA: 0 },
  );
});

test("OpenAPI only references existing local components", () => {
  const resolvePointer = (pointer: string) =>
    pointer
      .slice(2)
      .split("/")
      .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
      .reduce<unknown>((current, part) => {
        assert.ok(
          typeof current === "object" && current !== null && part in current,
          `OpenAPI reference not found: ${pointer}`,
        );
        return (current as Record<string, unknown>)[part];
      }, swaggerSpec);

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== "object" || value === null) return;
    for (const [key, nested] of Object.entries(value)) {
      if (key === "$ref" && typeof nested === "string" && nested.startsWith("#/")) {
        resolvePointer(nested);
      } else {
        visit(nested);
      }
    }
  };

  visit(swaggerSpec);
});

test("Prisma known errors are recognized across duplicated runtime instances", () => {
  assert.equal(
    isPrismaKnownRequestError({
      name: "PrismaClientKnownRequestError",
      code: "P2003",
      clientVersion: "6.19.3",
    }),
    true,
  );
  assert.equal(isPrismaKnownRequestError(new Error("database error")), false);
});

test("password reset tokens are short-lived, purpose-bound and invalidated by password changes", () => {
  const serverSecret = "a-secure-test-secret-that-is-at-least-32-characters";
  const passwordHash = "$2b$10$old-password-hash";
  const token = createPasswordResetToken(42, passwordHash, serverSecret);
  const claims = jwt.decode(token);
  assert.equal(jwt.decode(token, { complete: true })?.header.alg, "HS256");

  assert.equal(getUnverifiedPasswordResetUserId(token), 42);
  assert.equal(
    typeof claims === "object" && claims !== null ? claims.exp! - claims.iat! : null,
    PASSWORD_RESET_TOKEN_TTL_SECONDS,
  );
  assert.equal(verifyPasswordResetToken(token, 42, passwordHash, serverSecret), true);
  assert.equal(
    verifyPasswordResetToken(token, 42, "$2b$10$new-password-hash", serverSecret),
    false,
  );
  assert.equal(verifyPasswordResetToken(token, 42, passwordHash, `${serverSecret}-changed`), false);
  assert.equal(getUnverifiedPasswordResetUserId("not-a-jwt"), null);
});

test("email verification tokens bind the user and normalized email", () => {
  const serverSecret = "a-secure-test-secret-that-is-at-least-32-characters";
  const token = createEmailVerificationToken(42, "ana@email.com", serverSecret);

  assert.equal(getUnverifiedEmailVerificationUserId(token), 42);
  assert.equal(jwt.decode(token, { complete: true })?.header.alg, "HS256");
  assert.equal(
    verifyEmailVerificationToken(token, 42, "ana@email.com", serverSecret),
    true,
  );
  assert.equal(
    verifyEmailVerificationToken(token, 42, "other@email.com", serverSecret),
    false,
  );
  assert.equal(
    verifyEmailVerificationToken(token, 42, "ana@email.com", `${serverSecret}-changed`),
    false,
  );
  assert.equal(getUnverifiedEmailVerificationUserId("not-a-jwt"), null);
});

test("password reset token verification is documented as a POST body, not a query string", () => {
  const paths = (
    swaggerSpec as {
      paths?: Record<string, { get?: unknown; post?: { requestBody?: unknown } }>;
    }
  ).paths;
  const path = paths?.["/api/v2/auth/verify-reset-token"];
  assert.ok(path?.post);
  assert.equal(path?.get, undefined);
  assert.ok(path?.post.requestBody);
});

test("savings funding validates positive IDs and contribution amounts", () => {
  assert.equal(savingsIdSchema.parse("1"), 1);
  assert.equal(savingsIdSchema.safeParse("1.5").success, false);
  assert.equal(addFundsSchema.safeParse({ monto: 100 }).success, true);
  assert.equal(addFundsSchema.safeParse({ monto: 0 }).success, false);
});

test("OpenAPI documents common errors for every API operation", () => {
  type DocumentedResponse = {
    $ref?: string;
    content?: { "application/json"?: { schema?: { $ref?: string } } };
  };
  type Operation = {
    security?: unknown[];
    responses?: Record<string, DocumentedResponse>;
  };
  const spec = swaggerSpec as unknown as {
    paths?: Record<string, Record<string, Operation>>;
    components?: {
      responses?: Record<string, unknown>;
      schemas?: Record<string, unknown>;
    };
  };
  const paths = spec.paths ?? {};
  const methods = new Set(["get", "post", "put", "patch", "delete"]);
  let operationCount = 0;

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!path.startsWith("/api/v2/")) continue;

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!methods.has(method)) continue;
      operationCount += 1;
      const responses = operation.responses ?? {};

      for (const status of ["400", "429", "500"]) {
        assert.ok(responses[status], `${method.toUpperCase()} ${path} should document ${status}`);
      }

      for (const [status, response] of Object.entries(responses)) {
        if (/^2\d\d$/.test(status) && !response.$ref) {
          assert.equal(
            response.content?.["application/json"]?.schema?.$ref,
            "#/components/schemas/SuccessResponse",
            `${method.toUpperCase()} ${path} should use the common success envelope`,
          );
        }
      }

      if (operation.security?.length) {
        assert.ok(responses["401"], `${method.toUpperCase()} ${path} should document 401`);
        assert.ok(responses["403"], `${method.toUpperCase()} ${path} should document 403`);
      }

      if (path.includes("{id}")) {
        assert.ok(responses["404"], `${method.toUpperCase()} ${path} should document 404`);
      }

      for (const [status, response] of Object.entries(responses)) {
        if (/^[45]\d\d$/.test(status)) {
          assert.ok(
            response.$ref || response.content?.["application/json"]?.schema?.$ref,
            `${method.toUpperCase()} ${path} response ${status} should have a schema`,
          );
        }
      }
    }
  }

  assert.ok(operationCount > 0);
});

test("OpenAPI documents the pending transaction resolution route and response envelopes", () => {
  const spec = swaggerSpec as {
    paths?: Record<string, { patch?: { requestBody?: unknown } }>;
    components?: {
      responses?: Record<string, unknown>;
      schemas?: Record<string, unknown>;
    };
  };
  assert.ok(spec.paths?.["/api/v2/transactions/{id}/status"]?.patch?.requestBody);
  assert.ok(spec.components?.schemas?.SuccessResponse);
  assert.ok(spec.components?.schemas?.ErrorResponse);
  assert.ok(spec.components?.responses?.BadRequestError);
  assert.ok(spec.components?.responses?.TooManyRequestsError);
  assert.ok(spec.components?.schemas?.RateLimitErrorResponse);
});
