import { prisma } from "../../db/prisma.js";
import { queryRaw } from "../../db/queryRaw.js";
import { riskService } from "../alerts/risk.service.js";
import { getTransactionBalanceDelta } from "./transaction-balance.js";
import type { CreateTransactionInput, ListTransactionsQueryInput } from "./transactions.schemas.js";

export class TransactionError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "TransactionError";
  }
}

export type TransactionQueryParams = ListTransactionsQueryInput;

export class TransactionsService {
  async listTransactions(userId: string | number, params: TransactionQueryParams = {}) {
    const limit = params.limit ?? 10;
    const offset = params.offset ?? 0;
    const page = Math.floor(offset / limit) + 1;
    const sqlParams: unknown[] = [Number(userId)];
    const conditions = ["t.id_usuario = $1"];

    if (params.fecha_inicio) {
      sqlParams.push(new Date(params.fecha_inicio));
      conditions.push(`t.fecha_transaccion >= $${sqlParams.length}`);
    }

    if (params.fecha_fin) {
      const fecha_fin = new Date(params.fecha_fin);
      if (/^\d{4}-\d{2}-\d{2}$/.test(params.fecha_fin)) {
        fecha_fin.setUTCDate(fecha_fin.getUTCDate() + 1);
        sqlParams.push(fecha_fin);
        conditions.push(`t.fecha_transaccion < $${sqlParams.length}`);
      } else {
        sqlParams.push(fecha_fin);
        conditions.push(`t.fecha_transaccion <= $${sqlParams.length}`);
      }
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
      conditions.push(`CASE
        WHEN a.id_alerta IS NOT NULL THEN CASE a.severidad
          WHEN 'BAJA' THEN 'BAJO'
          WHEN 'MEDIA' THEN 'MEDIO'
          WHEN 'ALTA' THEN 'ALTO'
          WHEN 'CRITICA' THEN 'CRITICO'
          ELSE a.severidad
        END
        WHEN t.score_anomalia >= 95 THEN 'CRITICO'
        WHEN t.score_anomalia >= 70 THEN 'ALTO'
        WHEN t.score_anomalia >= 30 THEN 'MEDIO'
        ELSE 'BAJO'
      END = $${sqlParams.length}`);
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
      sqlParams.push(`%${params.search}%`);
      conditions.push(
        `(t.descripcion ILIKE $${sqlParams.length} OR t.comercio ILIKE $${sqlParams.length})`,
      );
    }

    const validSortFields: Record<string, string> = {
      fecha_transaccion: "t.fecha_transaccion",
      monto: "t.monto",
      tipo_movimiento: "t.tipo_movimiento",
      nivel_riesgo: "t.score_anomalia",
    };
    const sortField =
      validSortFields[params.sort_by ?? "fecha_transaccion"] ?? "t.fecha_transaccion";
    const sortOrder = params.sort_order?.toUpperCase() === "ASC" ? "ASC" : "DESC";
    const whereClause = conditions.join(" AND ");

    const countResult = await queryRaw<Array<{ total: bigint }>>(
      `
        SELECT COUNT(*) AS total
        FROM trida.transacciones t
        LEFT JOIN LATERAL (
          SELECT a.id_alerta, a.severidad
          FROM trida.alertas_fraude a
          WHERE a.id_transaccion = t.id_transaccion
          ORDER BY a.fecha_detectada DESC
          LIMIT 1
        ) a ON TRUE
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
          (t.score_anomalia >= 30.0 OR a.id_alerta IS NOT NULL) AS es_sospechosa,
          CASE
            WHEN a.id_alerta IS NOT NULL THEN CASE a.severidad
              WHEN 'BAJA' THEN 'BAJO'
              WHEN 'MEDIA' THEN 'MEDIO'
              WHEN 'ALTA' THEN 'ALTO'
              WHEN 'CRITICA' THEN 'CRITICO'
              ELSE a.severidad
            END
            WHEN t.score_anomalia >= 95 THEN 'CRITICO'
            WHEN t.score_anomalia >= 70 THEN 'ALTO'
            WHEN t.score_anomalia >= 30 THEN 'MEDIO'
            ELSE 'BAJO'
          END AS nivel_riesgo,
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
        ORDER BY ${sortField} ${sortOrder}
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

    return transaction;
  }

  async getById(userId: string | number, transactionId: string | number) {
    return this.getTransactionById(transactionId, userId);
  }

  async createTransaction(
    userId: string | number,
    data: CreateTransactionInput,
    meta: { userAgent?: string; ip?: string } = {},
  ) {
    const id_usuario = Number(userId);
    const cuenta = await prisma.cuenta.findFirst({
      where: {
        id_cuenta: data.id_cuenta,
        id_usuario,
      },
    });

    if (!cuenta) {
      throw new TransactionError("La cuenta no existe o no pertenece al usuario", 404);
    }

    const id_categoria = data.id_categoria ?? null;
    if (id_categoria !== null) {
      const categoria = await prisma.categoria.findFirst({
        where: {
          id_categoria,
          OR: [{ id_usuario }, { id_usuario: null }],
        },
        select: { id_categoria: true },
      });

      if (!categoria) {
        throw new TransactionError("La categoría no existe o no pertenece al usuario", 404);
      }
    }

    const fecha_transaccion = data.fecha_transaccion
      ? new Date(data.fecha_transaccion)
      : new Date();
    const riskResult = await riskService.evaluateRisk({
      id_usuario,
      monto: data.monto,
      tipo_movimiento: data.tipo_movimiento,
      comercio: data.comercio,
      ubicacion_lat: data.latitud,
      ubicacion_lon: data.longitud,
      id_dispositivo: data.id_dispositivo,
      fecha_transaccion,
    });

    const { id_dispositivo_validado, ...evaluation } = riskResult;
    const motivo_riesgo = riskResult.razones.join("; ") || null;
    const variacion_saldo = getTransactionBalanceDelta(data.tipo_movimiento, data.monto);
    const direccion_ip = data.ip_origen ?? meta.ip ?? null;
    const estado =
      riskResult.estado_evaluacion === "APROBADA"
        ? "CONFIRMADA"
        : riskResult.estado_evaluacion === "REVISAR"
          ? "PENDIENTE"
          : "RECHAZADA";

    return prisma.$transaction(async (transaction) => {
      const cuentaTransaccion = await transaction.cuenta.findFirst({
        where: { id_cuenta: data.id_cuenta, id_usuario },
        select: { id_cuenta: true },
      });
      if (!cuentaTransaccion) {
        throw new TransactionError("La cuenta no existe o no pertenece al usuario", 404);
      }

      if (id_categoria !== null) {
        const categoriaTransaccion = await transaction.categoria.findFirst({
          where: {
            id_categoria,
            OR: [{ id_usuario }, { id_usuario: null }],
          },
          select: { id_categoria: true },
        });
        if (!categoriaTransaccion) {
          throw new TransactionError("La categoría no existe o no pertenece al usuario", 404);
        }
      }

      const dispositivoTransaccion =
        id_dispositivo_validado === null
          ? null
          : await transaction.dispositivo.findFirst({
              where: {
                id_dispositivo: id_dispositivo_validado,
                id_usuario,
              },
              select: { id_dispositivo: true },
            });
      const id_dispositivo = dispositivoTransaccion?.id_dispositivo ?? null;

      let id_ubicacion: number | null = null;
      if (
        data.latitud !== undefined ||
        data.longitud !== undefined ||
        data.ciudad ||
        data.pais ||
        direccion_ip
      ) {
        const ubicacion = await transaction.ubicacion.create({
          data: {
            id_dispositivo,
            direccion_ip,
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
            saldo_inicial: { increment: variacion_saldo },
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
        transaction: transactionData,
        evaluation,
        alert: alerta,
      };
    });
  }

  async create(
    userId: string | number,
    data: CreateTransactionInput,
    meta: { userAgent?: string; ip?: string } = {},
  ) {
    return this.createTransaction(userId, data, meta);
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
            saldo_inicial: {
              decrement: getTransactionBalanceDelta(
                transaction.tipo_movimiento,
                Number(transaction.monto),
              ),
            },
          },
        });
      }

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
            saldo_inicial: {
              increment: getTransactionBalanceDelta(
                transaction.tipo_movimiento,
                Number(transaction.monto),
              ),
            },
          },
        });
      }

      await client.alerta_fraude.updateMany({
        where: {
          id_transaccion: transaction.id_transaccion,
          id_usuario: Number(userId),
          estado: "PENDIENTE",
        },
        data: {
          estado: estado === "CONFIRMADA" ? "CONFIRMADA" : "DESCARTADA",
          fecha_resuelta: new Date(),
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
          COALESCE(
            a.severidad,
            CASE
              WHEN t.score_anomalia >= 95 THEN 'CRITICO'
              WHEN t.score_anomalia >= 70 THEN 'ALTO'
              WHEN t.score_anomalia >= 30 THEN 'MEDIO'
              ELSE 'BAJO'
            END
          ) AS nivel_riesgo,
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
