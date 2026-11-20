import { z } from "zod";
import { nonNegativeMoney } from "../../utils/money.js";

const accountTypeSchema = z.enum(["BANCO", "TARJETA", "BILLETERA", "EFECTIVO"]);

export const createAccountSchema = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es requerido").max(100),
    entidad: z.string().trim().max(100).optional(),
    tipo: accountTypeSchema,
    numero_enmascarado: z.string().trim().max(20).optional(),
    color: z.string().trim().max(20).optional().default("#6366F1"),
    saldo_inicial: nonNegativeMoney.optional().default(0),
    estado: z.boolean().optional().default(true),
  })
  .strict();

export const updateAccountSchema = z
  .object({
    nombre: z.string().trim().min(1).max(100).optional(),
    entidad: z.string().trim().max(100).optional(),
    tipo: accountTypeSchema.optional(),
    numero_enmascarado: z.string().trim().max(20).optional(),
    color: z.string().trim().max(20).optional(),
    estado: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe proporcionar al menos un campo para actualizar",
  });

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
