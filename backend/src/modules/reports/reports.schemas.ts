// ¿Qué? Esquemas Zod para filtros de reportes financieros.
// ¿Para qué? Validar rangos de fechas y tipo de reporte solicitado.

import { z } from "zod";

export const reportQuerySchema = z.object({
  id_cuenta: z.coerce.number().int().positive().optional(),
  fecha_inicio: z.iso.datetime().or(z.iso.date()).optional(),
  fecha_fin: z.iso.datetime().or(z.iso.date()).optional(),
  tipo_movimiento: z.enum(["INGRESO", "GASTO", "AHORRO"]).optional(),
  limit: z.coerce.number().int().min(1).max(5000).default(500),
});

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
