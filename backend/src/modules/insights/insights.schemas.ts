// ¿Qué? Esquemas Zod para filtros opcionales de insights.
// ¿Para qué? Validar el periodo de análisis solicitado por el frontend.

import { z } from "zod";

export const insightsQuerySchema = z.object({
  periodo_dias: z.coerce.number().int().min(7).max(365).default(30),
});

export type InsightsQueryInput = z.infer<typeof insightsQuerySchema>;
