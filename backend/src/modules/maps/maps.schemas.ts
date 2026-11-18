// ¿Qué? Esquemas Zod para la consulta de datos geográficos del mapa.
// ¿Para qué? Validar límite de marcadores y filtros de riesgo/fechas.

import { z } from "zod";

export const mapQuerySchema = z.object({
  id_cuenta: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(2000).default(500),
  nivel_riesgo: z.enum(["BAJO", "MEDIO", "ALTO", "CRITICO", "ALL"]).optional(),
  estado: z
    .enum(["PENDIENTE", "CONFIRMADA", "APROBADA", "SOSPECHOSA", "RECHAZADA", "ALL"])
    .optional(),
  fecha_inicio: z.iso.datetime().or(z.iso.date()).optional(),
  fecha_fin: z.iso.datetime().or(z.iso.date()).optional(),
});

export type MapQueryInput = z.infer<typeof mapQuerySchema>;
