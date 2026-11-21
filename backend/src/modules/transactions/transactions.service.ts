import { prisma } from "../../db/prisma.js";
import { queryRaw } from "../../db/queryRaw.js";
import { riskService } from "../alerts/risk.service.js";
import { getTransactionBalanceDelta } from "./transaction-balance.js";
import { AppError } from "../../utils/AppError.js";
import { config } from "../../config.js";
import { parseDateEnd, parseDateStart } from "../../utils/dateRange.js";
import {
  RISK_THRESHOLDS,
  riskRankSql,
  unifiedRiskLevelSql,
} from "../../utils/risk.js";
import type { CreateTransactionInput, ListTransactionsQueryInput } from "./transactions.schemas.js";

export class TransactionError extends AppError {
  constructor(message: string, statusCode = 400, code = "TRANSACTION_ERROR") {
    super(message, statusCode, code);
  }
}

export type TransactionQueryParams = ListTransactionsQueryInput;

export class TransactionsService {
  async listTransactions(userId: string | number, params: TransactionQueryParams = {}) {
    const limit = params.limit ?? 10;
    const offset = params.offset ?? 0;
    const page = Math.floor(offset / limit) + 1;
    const sqlParams: unknown[] = [Number(userId)];
    const conditions = [
      "t.id_usuario = $1",
      "EXISTS (SELECT 1 FROM trida.cuentas owned_account WHERE owned_account.id_cuenta = t.id_cuenta AND owned_account.id_usuario = t.id_usuario)",
    ];

    if (params.fecha_inicio) {
      sqlParams.push(parseDateStart(params.fecha_inicio, config.APP_TIMEZONE));
      conditions.push(`t.fecha_transaccion >= $${sqlParams.length}`);
    }

    if (params.fecha_fin) {
      sqlParams.push(parseDateEnd(params.fecha_fin, config.APP_TIMEZONE));
      conditions.push(`t.fecha_transaccion <= $${sqlParams.length}`);
    }

    if (params.tipo_movimiento) {
      sqlParams.push(params.tipo_movimiento);
      conditions.push(`t.tipo_movimiento = $${sqlParams.length}`);
    }

    if (params.id_categoria !== undefined) {
      sqlParams.push(params.id_categoria);
      conditions.push(`t.id_categoria = $${sqlParams.length}`);
    }

    if (params.id_cuenta !== undefined) {
      sqlParams.push(params.id_cuenta);
      conditions.push(`t.id_cuenta = $${sqlParams.length}`);
    }

    if (params.nivel_riesgo && params.nivel_riesgo.toUpperCase() !== "ALL") {
      sqlParams.push(params.nivel_riesgo);
      conditions.push(
        `${unifiedRiskLevelSql("t.score_anomalia", "COALESCE(a.severidad, '')")} = $${sqlParams.length}`,
      );
    }

    if (params.min_monto !== undefined) {
      sqlParams.push(params.min_monto);
      conditions.push(`t.monto >= $${sqlParams.length}`);
    }

    if (params.max_monto !== undefined) {
      sqlParams.push(params.max_monto);
      conditions.push(`t.monto <= $${sqlParams.length}`);
    }

    if (params.estado) {
      sqlParams.push(params.estado);
      conditions.push(`t.estado = $${sqlParams.length}`);
    }

    if (params.search) {
      const escapedSearch = params.search.replace(/[\\%_]/g, "\\$&");
      sqlParams.push(`%${escapedSearch}%`);
      conditions.push(
        `(t.descripcion ILIKE $${sqlParams.length} ESCAPE E'\\\\' OR t.comercio ILIKE $${sqlParams.length} ESCAPE E'\\\\')`,
      );
    }

    const validSortFields: Record<string, string> = {
      fecha_transaccion: "t.fecha_transaccion",
      monto: "t.monto",
      tipo_movimiento: "t.tipo_movimiento",
      nivel_riesgo: `CASE
        WHEN GREATEST(
          ${riskRankSql("t.score_anomalia")},
          CASE
            WHEN a.severidad = 'CRITICA' THEN 4
            WHEN a.severidad = 'ALTA' THEN 3
            WHEN a.severidad = 'MEDIA' THEN 2
            WHEN a.severidad = 'BAJA' THEN 1
            ELSE 1
          END
        ) = 4 THEN 4
        WHEN GREATEST(
          ${riskRankSql("t.score_anomalia")},
          CASE
            WHEN a.severidad = 'CRITICA' THEN 4
            WHEN a.severidad = 'ALTA' THEN 3
            WHEN a.severidad = 'MEDIA' THEN 2
            WHEN a.severidad = 'BAJA' THEN 1
            ELSE 1
          END
        ) = 3 THEN 3
        WHEN GREATEST(
          ${riskRankSql("t.score_anomalia")},
          CASE
            WHEN a.severidad = 'CRITICA' THEN 4
            WHEN a.severidad = 'ALTA' THEN 3
            WHEN a.severidad = 'MEDIA' THEN 2
            WHEN a.severidad = 'BAJA' THEN 1
            ELSE 1
          END
        ) = 2 THEN 2
        ELSE 1
      END`,
    };
    const sortField =
      validSortFields[params.sort_by ?? "fecha_transaccion"] ?? "t.fecha_transaccion";
    const sortOrder = params.sort_order?.toUpperCase() === "ASC" ? "ASC" : "DESC";
    const whereClause = conditions.join(" AND ");
    const countAlertJoin =
      params.nivel_riesgo && params.nivel_riesgo.toUpperCase() !== "ALL"
        ? `LEFT JOIN LATERAL (
          SELECT a.id_alerta, a.severidad
          FROM trida.alertas_fraude a
          WHERE a.id_transaccion = t.id_transaccion
          ORDER BY a.fecha_detectada DESC
          LIMIT 1
        ) a ON TRUE`
        : "";

    const countResult = await queryRaw<Array<{ total: bigint }>>(
      `
        SELECT COUNT(*) AS total
        FROM trida.transacciones t
        ${countAlertJoin}
        WHERE ${whereClause}
      `,
      ...sqlParams,
    );
    const total = Number(countResult[0]?.total ?? 0);

    const dataParams = [...sqlParams, limit, offset];
    const rawTransactions = await queryRaw<
      Array<{
        id_transaccion: number;
        id_usuario: number;
        id_cuenta: number | null;
        id_categoria: number | null;
        monto: string | number;
        tipo_movimiento: string;
        comercio: string | null;
        descripcion: string | null;
        estado: string;
        fecha_transaccion: Date;
        latitud: string | number | null;
        longitud: string | number | null;
        es_sospechosa: boolean;
        nivel_riesgo: string;
        motivo_riesgo: string | null;
        nombre_cuenta: string | null;
        nombre_categoria: string | null;
        icono_categoria: string | null;
        color_categoria: string | null;
      }>
    >(
      `
        SELECT
          t.id_transaccion,
          t.id_usuario,
          t.id_cuenta,
          t.id_categoria,
          t.monto,
          t.tipo_movimiento,
          t.comercio,
          t.descripcion,
          t.estado,
          t.fecha_transaccion,
          u.latitud,
          u.longitud,
          (t.score_anomalia >= ${RISK_THRESHOLDS.MEDIUM} OR a.id_alerta IS NOT NULL) AS es_sospechosa,
          ${unifiedRiskLevelSql("t.score_anomalia", "COALESCE(a.severidad, '')")} AS nivel_riesgo,
          a.motivo AS motivo_riesgo,
          c.nombre AS nombre_cuenta,
          cat.nombre AS nombre_categoria,
          cat.icono AS icono_categoria,
          cat.color AS color_categoria
        FROM trida.transacciones t
        LEFT JOIN trida.cuentas c ON t.id_cuenta = c.id_cuenta
        LEFT JOIN trida.categorias cat ON t.id_categoria = cat.id_categoria
        LEFT JOIN trida.ubicaciones u ON t.id_ubicacion = u.id_ubicacion
        LEFT JOIN LATERAL (
          SELECT a.id_alerta, a.severidad, a.motivo
          FROM trida.alertas_fraude a
          WHERE a.id_transaccion = t.id_transaccion
          ORDER BY a.fecha_detectada DESC
          LIMIT 1
        ) a ON TRUE
        WHERE ${whereClause}
        ORDER BY ${sortField} ${sortOrder}, t.id_transaccion ${sortOrder}
        LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
      `,
      ...dataParams,
    );

    const data = rawTransactions.map((row) => ({
      id_transaccion: row.id_transaccion,
      id_usuario: row.id_usuario,
      id_cuenta: row.id_cuenta,
      nombre_cuenta: row.nombre_cuenta,
      id_categoria: row.id_categoria,
      nombre_categoria: row.nombre_categoria,
      icono_categoria: row.icono_categoria,
      color_categoria: row.color_categoria,
      monto: Number(row.monto),
      tipo_movimiento: row.tipo_movimiento,
      comercio: row.comercio,
      descripcion: row.descripcion,
      estado: row.estado,
      fecha_transaccion: row.fecha_transaccion,
      latitud: row.latitud === null ? null : Number(row.latitud),
      longitud: row.longitud === null ? null : Number(row.longitud),
      es_sospechosa: Boolean(row.es_sospechosa),
      nivel_riesgo: row.nivel_riesgo,
      motivo_riesgo: row.motivo_riesgo,
    }));

    const pagination = {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    };

    return { data, pagination };
  }

  async list(userId: string | number, params: TransactionQueryParams = {}) {
    return this.listTransactions(userId, params);
  }

  async getTransactionById(id: string | number, userId: string | number) {
    const transaction = await prisma.transaccion.findFirst({
      where: {
        id_transaccion: Number(id),
        id_usuario: Number(userId),
      },
    });

    if (!transaction) {
      throw new TransactionError("Transacción no encontrada", 404);
    }

    return {
      ...transaction,
      monto: Number(transaction.monto),
      score_anomalia:
        transaction.score_anomalia === null ? null : Number(transaction.score_anomalia),
    };
  }

  async getById(userId: string | number, transactionId: string | number) {
    return this.getTransactionById(transactionId, userId);
  }

  async createTransaction(
    userId: string | number,
    data: CreateTransactionInput,
  ) {
    const id_usuario = Number(userId);
    const id_categoria = data.id_categoria ?? null;
    const variacion_saldo = getTransactionBalanceDelta(data.tipo_movimiento, data.monto);

    return prisma.$transaction(async (transaction) => {
      const cuentaTransaccion = await transaction.cuenta.findFirst({
        where: { id_cuenta: data.id_cuenta, id_usuario, estado: true },
        select: { id_cuenta: true, tipo: true },
      });
      if (!cuentaTransaccion) {
        throw new TransactionError("La cuenta no existe, no está activa o no pertenece al usuario", 404);
      }

      let fecha_transaccion = new Date();
      if (data.fecha_transaccion) {
        if (cuentaTransaccion.tipo !== "EFECTIVO") {
          throw new TransactionError(
            "La fecha manual solo está disponible para cuentas de efectivo",
            400,
          );
        }
        const fechaManual = new Date(data.fecha_transaccion);
        if (Number.isNaN(fechaManual.getTime())) {
          throw new TransactionError("La fecha de la transacción no es válida", 400);
        }
        if (fechaManual.getTime() > Date.now()) {
          throw new TransactionError("La fecha de la transacción no puede ser futura", 400);
        }
        fecha_transaccion = fechaManual;
      }

      if (id_categoria !== null) {
        const categoriaTransaccion = await transaction.categoria.findFirst({
          where: {
            id_categoria,
            estado: true,
            OR: [{ id_usuario }, { id_usuario: null }],
          },
          select: { id_categoria: true, tipo: true },
        });
        if (!categoriaTransaccion) {
          throw new TransactionError("La categoría no existe o no pertenece al usuario", 404);
        }
        if (categoriaTransaccion.tipo !== data.tipo_movimiento) {
          throw new TransactionError(
            "El tipo de categoría no coincide con el tipo de movimiento",
            400,
          );
        }
      }

      const riskResult = await riskService.evaluateRisk(
        {
          id_usuario,
          monto: data.monto,
          tipo_movimiento: data.tipo_movimiento,
          ubicacion_lat: data.latitud,
          ubicacion_lon: data.longitud,
          id_dispositivo: data.id_dispositivo,
          fecha_transaccion,
        },
        transaction,
      );
      const { id_dispositivo_validado: id_dispositivo, ...evaluation } = riskResult;
      const motivo_riesgo = riskResult.razones.join("; ") || null;
      const estado =
        riskResult.estado_evaluacion === "APROBADA"
          ? "CONFIRMADA"
          : riskResult.estado_evaluacion === "REVISAR"
            ? "PENDIENTE"
            : "RECHAZADA";

      let id_ubicacion: number | null = null;
      if (
        data.latitud !== undefined ||
        data.longitud !== undefined ||
        data.ciudad ||
        data.pais
      ) {
        const ubicacion = await transaction.ubicacion.create({
          data: {
            id_dispositivo,
            direccion_ip: null,
            ciudad: data.ciudad ?? null,
            pais: data.pais ?? null,
            latitud: data.latitud ?? null,
            longitud: data.longitud ?? null,
          },
          select: { id_ubicacion: true },
        });
        id_ubicacion = ubicacion.id_ubicacion;
      }

      const transactionData = await transaction.transaccion.create({
        data: {
          id_usuario,
          id_cuenta: data.id_cuenta,
          id_categoria,
          id_dispositivo,
          id_ubicacion,
          tipo_movimiento: data.tipo_movimiento,
          monto: data.monto,
          comercio: data.comercio ?? null,
          descripcion: data.descripcion ?? null,
          es_recurrente: data.es_recurrente ?? false,
          score_anomalia: riskResult.score_riesgo,
          estado,
          fecha_transaccion,
        },
      });

      if (estado === "CONFIRMADA") {
        await transaction.cuenta.update({
          where: { id_cuenta: data.id_cuenta },
          data: {
            saldo_actual: { increment: variacion_saldo },
          },
        });
      }

      let alerta = null;
      if (riskResult.estado_evaluacion !== "APROBADA") {
        alerta = await transaction.alerta_fraude.create({
          data: {
            id_usuario,
            id_transaccion: transactionData.id_transaccion,
            severidad: {
              BAJO: "BAJA",
              MEDIO: "MEDIA",
              ALTO: "ALTA",
              CRITICO: "CRITICA",
            }[riskResult.nivel_riesgo],
            motivo: motivo_riesgo ?? "Transacción fuera del patrón habitual",
            estado: "PENDIENTE",
          },
        });
      }

      return {
        transaction: {
          ...transactionData,
          monto: Number(transactionData.monto),
          score_anomalia:
            transactionData.score_anomalia === null
              ? null
              : Number(transactionData.score_anomalia),
        },
        evaluation,
        alert: alerta,
      };
    });
  }

  async create(
    userId: string | number,
    data: CreateTransactionInput,
  ) {
    return this.createTransaction(userId, data);
  }

  async deleteTransaction(id: string | number, userId: string | number) {
    return prisma.$transaction(async (client) => {
      const transaction = await client.transaccion.findFirst({
        where: {
          id_transaccion: Number(id),
          id_usuario: Number(userId),
        },
      });

      if (!transaction) {
        throw new TransactionError("Transacción no encontrada", 404);
      }

      if (
        transaction.id_cuenta !== null &&
        (transaction.estado === "CONFIRMADA" || transaction.estado === "APROBADA")
      ) {
        await client.cuenta.update({
          where: { id_cuenta: transaction.id_cuenta },
          data: {
            saldo_actual: {
              decrement: getTransactionBalanceDelta(
                transaction.tipo_movimiento,
                transaction.monto,
              ),
            },
          },
        });
      }

      await client.log_auditoria.create({
        data: {
          id_usuario: Number(userId),
          tipo_accion: "TRANSACCION_ELIMINADA",
          entidad_afectada: "transacciones",
          id_entidad: transaction.id_transaccion,
          descripcion:
            `Transacción eliminada: tipo=${transaction.tipo_movimiento}; ` +
            `monto=${transaction.monto.toString()}; estado=${transaction.estado}; ` +
            `id_cuenta=${transaction.id_cuenta ?? "null"}; ` +
            `fecha=${transaction.fecha_transaccion.toISOString()}.`,
        },
      });

      return client.transaccion.delete({
        where: { id_transaccion: transaction.id_transaccion },
      });
    });
  }

  async updateStatus(
    userId: string | number,
    transactionId: string | number,
    estado: "CONFIRMADA" | "RECHAZADA",
  ) {
    return prisma.$transaction(async (client) => {
      const transaction = await client.transaccion.findFirst({
        where: {
          id_transaccion: Number(transactionId),
          id_usuario: Number(userId),
        },
      });

      if (!transaction) {
        throw new TransactionError("Transacción no encontrada", 404);
      }
      if (transaction.estado !== "PENDIENTE") {
        throw new TransactionError("Solo se pueden resolver transacciones pendientes", 409);
      }

      const result = await client.transaccion.updateMany({
        where: {
          id_transaccion: transaction.id_transaccion,
          id_usuario: Number(userId),
          estado: "PENDIENTE",
        },
        data: { estado },
      });

      if (result.count !== 1) {
        throw new TransactionError("La transacción ya fue resuelta", 409);
      }

      if (estado === "CONFIRMADA" && transaction.id_cuenta !== null) {
        await client.cuenta.update({
          where: { id_cuenta: transaction.id_cuenta },
          data: {
            saldo_actual: {
              increment: getTransactionBalanceDelta(
                transaction.tipo_movimiento,
                transaction.monto,
              ),
            },
          },
        });
      }

      const accion_usuario = estado === "CONFIRMADA" ? "FUI_YO" : "NO_FUI_YO";
      const estado_alerta = estado === "CONFIRMADA" ? "DESCARTADA" : "CONFIRMADA";
      const fecha_resuelta = new Date();

      await client.alerta_fraude.updateMany({
        where: {
          id_transaccion: transaction.id_transaccion,
          id_usuario: Number(userId),
          estado: "PENDIENTE",
        },
        data: {
          estado: estado_alerta,
          accion_usuario,
          fecha_resuelta,
        },
      });

      await client.log_auditoria.create({
        data: {
          id_usuario: Number(userId),
          tipo_accion: "TRANSACCION_RESUELTA",
          entidad_afectada: "transacciones",
          id_entidad: transaction.id_transaccion,
          descripcion: `Resolución de transacción: ${estado}; acción: ${accion_usuario}.`,
        },
      });

      return client.transaccion.findUniqueOrThrow({
        where: { id_transaccion: transaction.id_transaccion },
      });
    });
  }

  async delete(userId: string | number, transactionId: string | number) {
    return this.deleteTransaction(transactionId, userId);
  }

  async countsByLevel(userId: string | number) {
    const rows = await queryRaw<Array<{ nivel_riesgo: string; count: number }>>(
      `
        SELECT
          ${unifiedRiskLevelSql("t.score_anomalia", "COALESCE(a.severidad, '')")} AS nivel_riesgo,
          COUNT(*)::int AS count
        FROM trida.transacciones t
          LEFT JOIN LATERAL (
            SELECT a.severidad
            FROM trida.alertas_fraude a
            WHERE a.id_transaccion = t.id_transaccion
            ORDER BY a.fecha_detectada DESC
            LIMIT 1
          ) a ON TRUE
        WHERE t.id_usuario = $1
        GROUP BY 1
      `,
      Number(userId),
    );

    const counts: Record<string, number> = {
      BAJO: 0,
      MEDIO: 0,
      ALTO: 0,
      CRITICO: 0,
    };
    const severityLevels: Record<string, string> = {
      BAJA: "BAJO",
      MEDIA: "MEDIO",
      ALTA: "ALTO",
      CRITICA: "CRITICO",
    };
    for (const row of rows) {
      const nivel_riesgo = severityLevels[row.nivel_riesgo] ?? row.nivel_riesgo;
      if (nivel_riesgo in counts) {
        counts[nivel_riesgo] = Number(row.count);
      }
    }
    return counts;
  }
}

export const transactionsService = new TransactionsService();
export const transactionService = transactionsService;
