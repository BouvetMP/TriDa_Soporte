import assert from "node:assert/strict";
import test from "node:test";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

dotenv.config();

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL debe apuntar a una base PostgreSQL exclusiva de pruebas");
}

const databaseIdentity = (value: string) => {
  const url = new URL(value);
  return `${url.hostname}:${url.port || "5432"}${decodeURIComponent(url.pathname)}`;
};

const testDatabaseName = decodeURIComponent(new URL(testDatabaseUrl).pathname);
assert.match(
  testDatabaseName,
  /(test|testing|prueba|pruebas|ci)/i,
  "El nombre de la base indicada por TEST_DATABASE_URL debe identificarla como base de pruebas",
);

if (process.env.DATABASE_URL) {
  assert.notEqual(
    databaseIdentity(testDatabaseUrl),
    databaseIdentity(process.env.DATABASE_URL),
    "TEST_DATABASE_URL no puede apuntar a la misma base que DATABASE_URL",
  );
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET ??= "integration-test-secret-not-for-production";

type SuccessEnvelope<T> = {
  success: true;
  data: T;
};

type FailureEnvelope = {
  success: false;
  error: { code: string; message: string };
};

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("transaction routes keep account balances consistent across creation and resolution", async () => {
  const [{ default: app }, { prisma }] = await Promise.all([
    import("../app.js"),
    import("../db/prisma.js"),
  ]);
  const server = app.listen(0);
  const email = `integration-${randomUUID()}@example.test`;
  const otherEmail = `integration-${randomUUID()}@example.test`;
  let userId: number | undefined;
  let otherUserId: number | undefined;

  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const serverUrl = `http://127.0.0.1:${address.port}`;
    const baseUrl = `${serverUrl}/api/v2`;

    const readinessResponse = await fetch(`${serverUrl}/health/ready`);
    assert.equal(readinessResponse.status, 200);
    assert.deepEqual(await readJson(readinessResponse), {
      status: "ready",
      service: "trida-backend",
      version: "2.0.0",
    });

    userId = (
      await prisma.usuario.create({
        data: {
        nombre_completo: "Usuario de integración",
        email,
          password_hash: await bcrypt.hash("TestPassword123", 10),
          email_verificado_en: new Date(),
        },
      })
    ).id_usuario;

    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: "TestPassword123" }),
    });
    assert.equal(loginResponse.status, 200);
    const login =
      await readJson<SuccessEnvelope<{ token: string; usuario: { id_usuario: number } }>>(
        loginResponse,
      );
    const authorization = { authorization: `Bearer ${login.data.token}` };
    const loggedInUser = await prisma.usuario.findUnique({
      where: { id_usuario: login.data.usuario.id_usuario },
      select: { ultimo_acceso: true },
    });
    assert.ok(loggedInUser?.ultimo_acceso);

    const accountResponse = await fetch(`${baseUrl}/accounts`, {
      method: "POST",
      headers: { ...authorization, "content-type": "application/json" },
      body: JSON.stringify({
        nombre: "Cuenta de integración",
        tipo: "BANCO",
        saldo_inicial: 100,
      }),
    });
    assert.equal(accountResponse.status, 201);
    const account = await readJson<SuccessEnvelope<{ id_cuenta: number }>>(accountResponse);
    const accountId = account.data.id_cuenta;

    otherUserId = (
      await prisma.usuario.create({
        data: {
        nombre_completo: "Segundo usuario de integración",
        email: otherEmail,
          password_hash: await bcrypt.hash("TestPassword123", 10),
          email_verificado_en: new Date(),
        },
      })
    ).id_usuario;

    const otherLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: otherEmail, password: "TestPassword123" }),
    });
    assert.equal(otherLoginResponse.status, 200);
    const otherLogin =
      await readJson<SuccessEnvelope<{ token: string; usuario: { id_usuario: number } }>>(
        otherLoginResponse,
      );

    const sharedDeviceIdentifier = `integration-device-${randomUUID()}`;
    const firstDeviceResponse = await fetch(`${baseUrl}/devices`, {
      method: "POST",
      headers: { ...authorization, "content-type": "application/json" },
      body: JSON.stringify({
        identificador_unico: sharedDeviceIdentifier,
        tipo_dispositivo: "BROWSER",
      }),
    });
    assert.equal(firstDeviceResponse.status, 201);
    const firstDevice = await readJson<
      SuccessEnvelope<{ id_dispositivo: number; confiable: boolean }>
    >(firstDeviceResponse);
    assert.equal(firstDevice.data.confiable, true);

    const otherAuthorization = {
      authorization: `Bearer ${otherLogin.data.token}`,
    };
    const otherDeviceResponse = await fetch(`${baseUrl}/devices`, {
      method: "POST",
      headers: { ...otherAuthorization, "content-type": "application/json" },
      body: JSON.stringify({
        identificador_unico: sharedDeviceIdentifier,
        tipo_dispositivo: "BROWSER",
      }),
    });
    assert.equal(otherDeviceResponse.status, 201);
    const otherDevice = await readJson<
      SuccessEnvelope<{ id_dispositivo: number; confiable: boolean }>
    >(otherDeviceResponse);
    assert.equal(otherDevice.data.confiable, true);

    const otherAccountResponse = await fetch(`${baseUrl}/accounts`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${otherLogin.data.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        nombre: "Cuenta del segundo usuario",
        tipo: "BANCO",
        saldo_inicial: 5,
      }),
    });
    assert.equal(otherAccountResponse.status, 201);
    const otherAccount =
      await readJson<SuccessEnvelope<{ id_cuenta: number }>>(otherAccountResponse);
    const crossUserResponse = await fetch(`${baseUrl}/accounts/${otherAccount.data.id_cuenta}`, {
      headers: authorization,
    });
    assert.equal(crossUserResponse.status, 404);
    const crossUserError = await readJson<FailureEnvelope>(crossUserResponse);
    assert.equal(crossUserError.error.code, "NOT_FOUND");

    const transactionCountBeforeInvalidRequest = await prisma.transaccion.count({
      where: { id_usuario: userId },
    });
    const invalidAccountResponse = await fetch(`${baseUrl}/transactions`, {
      method: "POST",
      headers: { ...authorization, "content-type": "application/json" },
      body: JSON.stringify({
        id_cuenta: 2_147_483_647,
        monto: 10,
        tipo_movimiento: "INGRESO",
      }),
    });
    assert.equal(invalidAccountResponse.status, 404);
    assert.equal(
      await prisma.transaccion.count({ where: { id_usuario: userId } }),
      transactionCountBeforeInvalidRequest,
    );

    const transactionResponse = await fetch(`${baseUrl}/transactions`, {
      method: "POST",
      headers: { ...authorization, "content-type": "application/json" },
      body: JSON.stringify({
        id_cuenta: accountId,
        id_dispositivo: firstDevice.data.id_dispositivo,
        monto: 25,
        tipo_movimiento: "GASTO",
        pais: "Colombia",
      }),
    });
    assert.equal(transactionResponse.status, 201);
    const created = await readJson<
      SuccessEnvelope<{
        transaction: {
          id_transaccion: number;
          id_dispositivo: number | null;
          id_ubicacion: number | null;
          estado: string;
        };
        evaluation: { estado_evaluacion: string };
      }>
    >(transactionResponse);
    assert.equal(created.data.transaction.estado, "CONFIRMADA");
    assert.equal(created.data.transaction.id_dispositivo, firstDevice.data.id_dispositivo);
    assert.equal(created.data.evaluation.estado_evaluacion, "APROBADA");
    const locationId = created.data.transaction.id_ubicacion;
    assert.ok(locationId !== null);
    const storedLocation = await prisma.ubicacion.findUnique({
      where: { id_ubicacion: locationId },
      select: { direccion_ip: true },
    });
    assert.equal(storedLocation?.direccion_ip, null);
    assert.equal(
      Number(
        (
          await prisma.cuenta.findUniqueOrThrow({
            where: { id_cuenta: accountId },
            select: { saldo_inicial: true },
          })
        ).saldo_inicial,
      ),
      75,
    );

    const pending = await prisma.transaccion.create({
      data: {
        id_usuario: userId,
        id_cuenta: accountId,
        tipo_movimiento: "INGRESO",
        monto: 10,
        estado: "PENDIENTE",
      },
    });
    const approveResponse = await fetch(
      `${baseUrl}/transactions/${pending.id_transaccion}/status`,
      {
        method: "PATCH",
        headers: { ...authorization, "content-type": "application/json" },
        body: JSON.stringify({ estado: "CONFIRMADA" }),
      },
    );
    assert.equal(approveResponse.status, 200);
    assert.equal(
      (
        await prisma.transaccion.findUniqueOrThrow({
          where: { id_transaccion: pending.id_transaccion },
        })
      ).estado,
      "CONFIRMADA",
    );
    assert.equal(
      Number(
        (
          await prisma.cuenta.findUniqueOrThrow({
            where: { id_cuenta: accountId },
            select: { saldo_inicial: true },
          })
        ).saldo_inicial,
      ),
      85,
    );
    const resolveAgainResponse = await fetch(
      `${baseUrl}/transactions/${pending.id_transaccion}/status`,
      {
        method: "PATCH",
        headers: { ...authorization, "content-type": "application/json" },
        body: JSON.stringify({ estado: "RECHAZADA" }),
      },
    );
    assert.equal(resolveAgainResponse.status, 409);
    const resolveAgainError = await readJson<FailureEnvelope>(resolveAgainResponse);
    assert.equal(resolveAgainError.success, false);
    assert.equal(resolveAgainError.error.code, "CONFLICT");

    const rejected = await prisma.transaccion.create({
      data: {
        id_usuario: userId,
        id_cuenta: accountId,
        tipo_movimiento: "INGRESO",
        monto: 50,
        estado: "PENDIENTE",
      },
    });
    const rejectResponse = await fetch(
      `${baseUrl}/transactions/${rejected.id_transaccion}/status`,
      {
        method: "PATCH",
        headers: { ...authorization, "content-type": "application/json" },
        body: JSON.stringify({ estado: "RECHAZADA" }),
      },
    );
    assert.equal(rejectResponse.status, 200);
    assert.equal(
      (
        await prisma.transaccion.findUniqueOrThrow({
          where: { id_transaccion: rejected.id_transaccion },
        })
      ).estado,
      "RECHAZADA",
    );
    assert.equal(
      Number(
        (
          await prisma.cuenta.findUniqueOrThrow({
            where: { id_cuenta: accountId },
            select: { saldo_inicial: true },
          })
        ).saldo_inicial,
      ),
      85,
    );

    const deleteResponse = await fetch(`${baseUrl}/transactions/${pending.id_transaccion}`, {
      method: "DELETE",
      headers: authorization,
    });
    assert.equal(deleteResponse.status, 200);
    assert.equal(
      Number(
        (
          await prisma.cuenta.findUniqueOrThrow({
            where: { id_cuenta: accountId },
            select: { saldo_inicial: true },
          })
        ).saldo_inicial,
      ),
      75,
    );

    const deleteCreatedResponse = await fetch(
      `${baseUrl}/transactions/${created.data.transaction.id_transaccion}`,
      { method: "DELETE", headers: authorization },
    );
    assert.equal(deleteCreatedResponse.status, 200);
    assert.equal(
      Number(
        (
          await prisma.cuenta.findUniqueOrThrow({
            where: { id_cuenta: accountId },
            select: { saldo_inicial: true },
          })
        ).saldo_inicial,
      ),
      100,
    );

    const budgetDate = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 15, 12),
    );
    const budgetCategory = await prisma.categoria.create({
      data: {
        id_usuario: userId,
        nombre: `Categoría presupuesto ${randomUUID()}`,
        tipo: "GASTO",
        color: "#2563eb",
      },
    });
    const budget = await prisma.presupuesto.create({
      data: {
        id_usuario: userId,
        id_categoria: budgetCategory.id_categoria,
        limite_mensual: 100,
        mes: budgetDate.getUTCMonth() + 1,
        anio: budgetDate.getUTCFullYear(),
      },
    });
    await prisma.transaccion.createMany({
      data: [
        {
          id_usuario: userId,
          id_cuenta: accountId,
          id_categoria: budgetCategory.id_categoria,
          tipo_movimiento: "GASTO",
          monto: 60,
          estado: "CONFIRMADA",
          fecha_transaccion: budgetDate,
        },
        {
          id_usuario: userId,
          id_cuenta: accountId,
          id_categoria: budgetCategory.id_categoria,
          tipo_movimiento: "AHORRO",
          monto: 30,
          estado: "CONFIRMADA",
          fecha_transaccion: budgetDate,
        },
      ],
    });
    const budgetResponse = await fetch(
      `${baseUrl}/budgets?mes=${budgetDate.getUTCMonth() + 1}&anio=${budgetDate.getUTCFullYear()}`,
      { headers: authorization },
    );
    assert.equal(budgetResponse.status, 200);
    const budgets = await readJson<
      SuccessEnvelope<Array<{ id_presupuesto: number; gastado: number }>>
    >(budgetResponse);
    assert.equal(
      budgets.data.find((item) => item.id_presupuesto === budget.id_presupuesto)?.gastado,
      60,
    );
    assert.equal(
      await prisma.consejo_financiero.count({
        where: {
          id_usuario: userId,
          titulo: "Presupuesto al 80%",
        },
      }),
      0,
    );

    await prisma.cuenta.update({
      where: { id_cuenta: accountId },
      data: { estado: false },
    });
    const listedAccounts = await fetch(`${baseUrl}/accounts`, {
      headers: authorization,
    });
    assert.equal(listedAccounts.status, 200);
    const accounts = await readJson<SuccessEnvelope<Array<{ id_cuenta: number }>>>(
      listedAccounts,
    );
    assert.equal(accounts.data.some((item) => item.id_cuenta === accountId), false);

    const inactiveAccountTransactions = await fetch(
      `${baseUrl}/transactions?id_cuenta=${accountId}`,
      { headers: authorization },
    );
    assert.equal(inactiveAccountTransactions.status, 200);
    const transactions = await readJson<
      SuccessEnvelope<{ items: Array<{ id_cuenta: number | null }> }>
    >(inactiveAccountTransactions);
    assert.equal(
      transactions.data.items.some((item) => item.id_cuenta === accountId),
      false,
    );

    const transactionCountBeforeInactiveAccountRequest = await prisma.transaccion.count({
      where: { id_usuario: userId },
    });
    const inactiveAccountTransaction = await fetch(`${baseUrl}/transactions`, {
      method: "POST",
      headers: { ...authorization, "content-type": "application/json" },
      body: JSON.stringify({
        id_cuenta: accountId,
        monto: 10,
        tipo_movimiento: "INGRESO",
      }),
    });
    assert.equal(inactiveAccountTransaction.status, 404);
    assert.equal(
      await prisma.transaccion.count({ where: { id_usuario: userId } }),
      transactionCountBeforeInactiveAccountRequest,
    );
  } finally {
    try {
      const userIds = [userId, otherUserId].filter((id): id is number => id !== undefined);
      if (userIds.length > 0) {
        await prisma.usuario.deleteMany({ where: { id_usuario: { in: userIds } } });
      }
    } finally {
      try {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      } finally {
        await prisma.$disconnect();
      }
    }
  }
});
