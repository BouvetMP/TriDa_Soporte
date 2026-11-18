// ¿Qué? Esquemas Zod para la gestión del perfil de usuario.
// ¿Para qué? Validar la actualización de datos personales (el correo no se cambia por seguridad aquí).

import { z } from "zod";

export const updateProfileSchema = z
  .object({
    nombre_completo: z
      .string()
      .trim()
      .min(3, "El nombre debe tener al menos 3 caracteres")
      .max(150)
      .optional(),
    telefono: z
      .string()
      .trim()
      .max(20, "El teléfono no puede superar los 20 caracteres")
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe proporcionar al menos un campo para actualizar",
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
