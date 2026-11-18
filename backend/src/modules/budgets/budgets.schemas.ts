import { z } from "zod";

export const createBudgetSchema = z
  .object({
    id_categoria: z.coerce.number().int().positive("El ID de la categoría es requerido"),
    limite_mensual: z.coerce.number().positive("El límite mensual debe ser mayor a 0"),
    mes: z.coerce.number().int().min(1).max(12),
    anio: z.coerce.number().int().min(2020).max(2100),
  })
  .strict();

export const updateBudgetSchema = z
  .object({
    limite_mensual: z.coerce.number().positive("El límite mensual debe ser mayor a 0"),
  })
  .strict();

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
