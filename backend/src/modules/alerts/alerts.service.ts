import { prisma } from "../../db/prisma.js";
import { getTransactionBalanceDelta } from "../transactions/transaction-balance.js";
import type { ListAlertsQueryInput, UpdateAlertStatusInput } from "./alerts.schemas.js";

export class AlertError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "AlertError";
  }
}

export const getAlertTransactionDecision = (
  data: Pick<UpdateAlertStatusInput, "estado" | "accion_usuario">,
) => ({
  confirmsTransaction:
    data.accion_usuario === "FUI_YO" && data.estado === "DESCARTADA",
  rejectsTransaction:
    (data.accion_usuario === "NO_FUI_YO" ||
      data.accion_usuario === "BLOQUEAR_TARJETA") &&
    data.estado === "CONFIRMADA",
});

export class AlertsService {
  async getAlerts(userId: number, options: ListAlertsQueryInput) {
    const where = {
      id_usuario: userId,
      estado: options.estado,
      severidad: options.severidad,
    };
    const orderBy =
      options.sort_by === "severidad"
        ? { severidad: options.sort_order }
        : options.sort_by === "estado"
          ? { estado: options.sort_order }
          : { fecha_detectada: options.sort_order };

    const [alerts, total] = await Promise.all([
      prisma.alerta_fraude.findMany({
        where,
        orderBy,
        skip: options.offset,
        take: options.limit,
        include: {
          transaccion: {
            select: {
              id_transaccion: true,
              monto: true,
              tipo_movimiento: true,
              descripcion: true,
              comercio: true,
              fecha_transaccion: true,
              ubicacion: {
                select: { ciudad: true },
              },
            },
          },
        },
      }),
      prisma.alerta_fraude.count({ where }),
    ]);

    return {
      alerts,
      total,
      limit: options.limit,
      offset: options.offset,
    };
  }

  async list(userId: number, options: ListAlertsQueryInput) {
    return this.getAlerts(userId, options);
  }

  async getAlertById(userId: number, id_alerta: number) {
    const alert = await prisma.alerta_fraude.findFirst({
      where: {
        id_alerta,
        id_usuario: userId,
      },
      include: { transaccion: true },
    });

    if (!alert) {
      throw new AlertError("Alerta no encontrada", 404);
    }

    return alert;
  }

  async getById(userId: number, id_alerta: number) {
    return this.getAlertById(userId, id_alerta);
  }

  async updateAlertStatus(userId: number, id_alerta: number, data: UpdateAlertStatusInput) {
    return prisma.$transaction(async (transaction) => {
      const alert = await transaction.alerta_fraude.findFirst({
        where: { id_alerta, id_usuario: userId },
        include: { transaccion: true },
      });

      if (!alert) {
        throw new AlertError("Alerta no encontrada", 404);
      }

      const currentTransaction = alert.transaccion;
      const { confirmsTransaction, rejectsTransaction } =
        getAlertTransactionDecision(data);

      if (confirmsTransaction && currentTransaction.estado === "RECHAZADA") {
        throw new AlertError("Una transacción rechazada no puede aprobarse desde la alerta", 409);
      }

      if (
        (confirmsTransaction || rejectsTransaction) &&
        !["PENDIENTE", "CONFIRMADA", "APROBADA", "RECHAZADA"].includes(currentTransaction.estado)
      ) {
        throw new AlertError("La transacción no puede resolverse desde esta alerta", 409);
      }

      if (confirmsTransaction) {
        const transitioned = await transaction.transaccion.updateMany({
          where: {
            id_transaccion: currentTransaction.id_transaccion,
            id_usuario: userId,
            estado: { in: ["PENDIENTE", "CONFIRMADA", "APROBADA"] },
          },
          data: { estado: "CONFIRMADA" },
        });
        if (transitioned.count !== 1) {
          throw new AlertError("La transacción ya fue resuelta", 409);
        }

        if (currentTransaction.estado === "PENDIENTE" && currentTransaction.id_cuenta !== null) {
          await transaction.cuenta.update({
            where: { id_cuenta: currentTransaction.id_cuenta },
            data: {
              saldo_inicial: {
                increment: getTransactionBalanceDelta(
                  currentTransaction.tipo_movimiento,
                  Number(currentTransaction.monto),
                ),
              },
            },
          });
        }
      } else if (
        rejectsTransaction &&
        ["PENDIENTE", "CONFIRMADA", "APROBADA"].includes(currentTransaction.estado)
      ) {
        const transitioned = await transaction.transaccion.updateMany({
          where: {
            id_transaccion: currentTransaction.id_transaccion,
            id_usuario: userId,
            estado: { in: ["PENDIENTE", "CONFIRMADA", "APROBADA"] },
          },
          data: { estado: "RECHAZADA" },
        });
        if (transitioned.count !== 1) {
          throw new AlertError("La transacción ya fue resuelta", 409);
        }

        if (currentTransaction.estado !== "PENDIENTE" && currentTransaction.id_cuenta !== null) {
          await transaction.cuenta.update({
            where: { id_cuenta: currentTransaction.id_cuenta },
            data: {
              saldo_inicial: {
                decrement: getTransactionBalanceDelta(
                  currentTransaction.tipo_movimiento,
                  Number(currentTransaction.monto),
                ),
              },
            },
          });
        }
      }

      const updatedAlert = await transaction.alerta_fraude.update({
        where: { id_alerta },
        data: {
          estado: data.estado,
          accion_usuario: data.accion_usuario,
          fecha_resuelta: data.estado === "PENDIENTE" ? null : new Date(),
        },
      });

      if (confirmsTransaction) {
        await transaction.transaccion.updateMany({
          where: {
            id_transaccion: currentTransaction.id_transaccion,
            id_usuario: userId,
            estado: "APROBADA",
          },
          data: { estado: "CONFIRMADA" },
        });
      }

      return updatedAlert;
    });
  }

  async updateStatus(userId: number, id_alerta: number, data: UpdateAlertStatusInput) {
    return this.updateAlertStatus(userId, id_alerta, data);
  }

  async countsByLevel(userId: number) {
    const counts = await prisma.alerta_fraude.groupBy({
      by: ["severidad"],
      where: { id_usuario: userId },
      _count: { id_alerta: true },
    });

    return counts.reduce<Record<string, number>>((result, row) => {
      result[row.severidad] = row._count.id_alerta;
      return result;
    }, {});
  }
}

export const alertsService = new AlertsService();
