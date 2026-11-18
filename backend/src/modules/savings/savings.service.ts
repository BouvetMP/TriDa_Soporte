import { prisma } from "../../db/prisma.js";
import type { AddFundsInput, CreateSavingsInput, UpdateSavingsInput } from "./savings.schemas.js";

type SavingRecord = {
  id_meta: number;
  nombre: string;
  monto_objetivo: number | string | { toString(): string };
  monto_actual: number | string | { toString(): string };
  fecha_limite: Date | null;
  estado: string;
  fecha_creacion: Date;
};

function formatSaving(item: SavingRecord) {
  const monto_objetivo = Number(item.monto_objetivo);
  const monto_actual = Number(item.monto_actual);
  const progreso = monto_objetivo > 0 ? (monto_actual / monto_objetivo) * 100 : 0;

  return {
    id_meta: item.id_meta,
    nombre: item.nombre,
    monto_objetivo,
    monto_actual,
    progreso: Math.min(Math.round(progreso * 100) / 100, 100),
    fecha_limite: item.fecha_limite,
    estado: item.estado,
    fecha_creacion: item.fecha_creacion,
  };
}

class SavingsError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "SavingsError";
  }
}

export const savingsService = {
  async list(userId: number) {
    const metas = await prisma.meta_ahorro.findMany({
      where: { id_usuario: userId },
      orderBy: { fecha_creacion: "desc" },
    });

    return metas
      .sort((a, b) => Number(b.estado === "ACTIVA") - Number(a.estado === "ACTIVA"))
      .map(formatSaving);
  },

  async create(userId: number, data: CreateSavingsInput) {
    const meta = await prisma.meta_ahorro.create({
      data: {
        id_usuario: userId,
        nombre: data.nombre,
        monto_objetivo: data.monto_objetivo,
        monto_actual: data.monto_actual,
        fecha_limite: data.fecha_limite ? new Date(data.fecha_limite) : null,
        estado: "ACTIVA",
      },
    });

    return formatSaving(meta);
  },

  async update(userId: number, metaId: number, data: UpdateSavingsInput) {
    const existing = await prisma.meta_ahorro.findFirst({
      where: {
        id_meta: metaId,
        id_usuario: userId,
      },
      select: { id_meta: true },
    });

    if (!existing) {
      throw new SavingsError("Meta de ahorro no encontrada", 404);
    }

    const meta = await prisma.meta_ahorro.update({
      where: { id_meta: metaId },
      data: {
        nombre: data.nombre,
        monto_objetivo: data.monto_objetivo,
        fecha_limite: data.fecha_limite ? new Date(data.fecha_limite) : undefined,
        estado: data.estado,
      },
    });

    return formatSaving(meta);
  },

  async addFunds(userId: number, metaId: number, data: AddFundsInput) {
    return prisma.$transaction(async (transaction) => {
      const existing = await transaction.meta_ahorro.findFirst({
        where: {
          id_meta: metaId,
          id_usuario: userId,
        },
      });

      if (!existing) {
        throw new SavingsError("Meta de ahorro no encontrada", 404);
      }

      if (existing.estado !== "ACTIVA") {
        throw new SavingsError("No se pueden agregar fondos a una meta inactiva o completada", 409);
      }

      await transaction.aporte_meta.create({
        data: {
          id_meta: existing.id_meta,
          monto: data.monto,
        },
      });

      const updated = await transaction.meta_ahorro.findUnique({
        where: { id_meta: existing.id_meta },
      });

      if (!updated) {
        throw new SavingsError("Meta de ahorro no encontrada", 404);
      }

      const estado =
        Number(updated.monto_actual) >= Number(updated.monto_objetivo) ? "COMPLETADA" : "ACTIVA";
      const meta =
        estado === updated.estado
          ? updated
          : await transaction.meta_ahorro.update({
              where: { id_meta: existing.id_meta },
              data: { estado },
            });

      return formatSaving(meta);
    });
  },

  async delete(userId: number, metaId: number) {
    const existing = await prisma.meta_ahorro.findFirst({
      where: {
        id_meta: metaId,
        id_usuario: userId,
      },
      select: { id_meta: true },
    });

    if (!existing) {
      throw new SavingsError("Meta de ahorro no encontrada", 404);
    }

    await prisma.meta_ahorro.delete({
      where: { id_meta: metaId },
    });

    return { id_meta: metaId };
  },
};
