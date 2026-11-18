// ¿Qué? Esquemas Zod para la gestión de metas de ahorro.
// ¿Para qué? Validar la creación de metas, edición y el aporte de fondos.

import { z } from "zod";
import { nonNegativeMoney, positiveMoney } from "../../utils/money.js";

export const savingsIdSchema = z.coerce.number().int().positive();

export const createSavingsSchema = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es requerido").max(120),
    monto_objetivo: positiveMoney,
    monto_actual: nonNegativeMoney.default(0),
    fecha_limite: z.iso.date().or(z.iso.datetime()).or(z.date()).nullable().optional(),
  })
  .strict();

export const updateSavingsSchema = z
  .object({
    nombre: z.string().trim().min(1).max(120).optional(),
    monto_objetivo: positiveMoney.optional(),
    fecha_limite: z.iso.date().or(z.iso.datetime()).or(z.date()).nullable().optional(),
    estado: z.enum(["ACTIVA", "PAUSADA", "COMPLETADA", "CANCELADA"]).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe proporcionar al menos un campo para actualizar",
  });

export const addFundsSchema = z
  .object({
    monto: positiveMoney,
  })
  .strict();

export type CreateSavingsInput = z.infer<typeof createSavingsSchema>;
export type UpdateSavingsInput = z.infer<typeof updateSavingsSchema>;
export type AddFundsInput = z.infer<typeof addFundsSchema>;
