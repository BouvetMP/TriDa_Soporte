import { z } from "zod";
import { positiveMoney } from "../../utils/money.js";
import { MAX_POSTGRES_INT } from "../../utils/params.js";

const transactionType = z.enum(["INGRESO", "GASTO", "AHORRO"], {
  message: "El tipo de movimiento debe ser INGRESO, GASTO o AHORRO",
});

const transactionQueryId = z.coerce.number().int().positive().max(MAX_POSTGRES_INT).optional();
const transactionQueryAmount = z.coerce.number().finite().optional();
const transactionQueryDate = z.iso.datetime().or(z.iso.date()).optional();

export const createTransactionSchema = z
  .object({
    id_cuenta: z.coerce.number().int().positive().max(MAX_POSTGRES_INT),
    id_categoria: z.coerce.number().int().positive().max(MAX_POSTGRES_INT).optional(),
    id_dispositivo: z.coerce.number().int().positive().max(MAX_POSTGRES_INT).optional(),
    monto: positiveMoney,
    tipo_movimiento: transactionType,
    comercio: z.string().trim().max(150).optional(),
    descripcion: z.string().trim().max(255).optional(),
    ciudad: z.string().trim().max(100).optional(),
    pais: z.string().trim().max(100).optional(),
    latitud: z.coerce.number().min(-90).max(90).optional(),
    longitud: z.coerce.number().min(-180).max(180).optional(),
    fecha_transaccion: z.iso.datetime().optional(),
    es_recurrente: z.boolean().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.fecha_transaccion) {
      const date = new Date(data.fecha_transaccion);
      if (Number.isNaN(date.getTime())) {
        ctx.addIssue({
          code: "custom",
          path: ["fecha_transaccion"],
          message: "La fecha de la transacción no es válida",
        });
      } else if (date.getTime() > Date.now()) {
        ctx.addIssue({
          code: "custom",
          path: ["fecha_transaccion"],
          message: "La fecha de la transacción no puede ser futura",
        });
      }
    }
  });

export const listTransactionsQuerySchema = z.object({
  id_cuenta: transactionQueryId,
  id_categoria: transactionQueryId,
  tipo_movimiento: transactionType.optional(),
  fecha_inicio: transactionQueryDate,
  fecha_fin: transactionQueryDate,
  min_monto: transactionQueryAmount,
  max_monto: transactionQueryAmount,
  search: z.string().trim().min(1).max(255).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  sort_by: z.string().trim().min(1).max(30).optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
  nivel_riesgo: z.enum(["BAJO", "MEDIO", "ALTO", "CRITICO", "ALL"]).optional(),
  estado: z.enum(["PENDIENTE", "CONFIRMADA", "APROBADA", "SOSPECHOSA", "RECHAZADA"]).optional(),
});

export const updateTransactionStatusSchema = z
  .object({
    estado: z.enum(["CONFIRMADA", "RECHAZADA"]),
  })
  .strict();

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type ListTransactionsQueryInput = z.infer<typeof listTransactionsQuerySchema>;
