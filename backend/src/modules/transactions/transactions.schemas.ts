import { isIP } from "node:net";
import { z } from "zod";

const transactionType = z.enum(["INGRESO", "GASTO", "AHORRO"], {
  message: "El tipo de movimiento debe ser INGRESO, GASTO o AHORRO",
});

const transactionQueryId = z.coerce.number().int().positive().optional();
const transactionQueryAmount = z.coerce.number().finite().optional();
const transactionQueryDate = z.iso.datetime().or(z.iso.date()).optional();

export const createTransactionSchema = z
  .object({
    id_cuenta: z.coerce.number().int().positive(),
    id_categoria: z.coerce.number().int().positive().optional(),
    id_dispositivo: z.coerce.number().int().positive().optional(),
    monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
    tipo_movimiento: transactionType,
    comercio: z.string().trim().max(150).optional(),
    descripcion: z.string().trim().max(255).optional(),
    ciudad: z.string().trim().max(100).optional(),
    pais: z.string().trim().max(100).optional(),
    latitud: z.coerce.number().min(-90).max(90).optional(),
    longitud: z.coerce.number().min(-180).max(180).optional(),
    ip_origen: z
      .string()
      .trim()
      .max(45)
      .refine((value) => isIP(value) !== 0, "La dirección IP no es válida")
      .optional(),
    fecha_transaccion: z.iso.datetime().or(z.date()).optional(),
    es_recurrente: z.boolean().optional(),
  })
  .strict();

export const listTransactionsQuerySchema = z.object({
  id_cuenta: transactionQueryId,
  id_categoria: transactionQueryId,
  tipo_movimiento: transactionType.optional(),
  fecha_inicio: transactionQueryDate,
  fecha_fin: transactionQueryDate,
  min_monto: transactionQueryAmount,
  max_monto: transactionQueryAmount,
  search: z.string().trim().min(1).max(255).optional(),
  limit: z.coerce.number().int().positive().optional(),
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
