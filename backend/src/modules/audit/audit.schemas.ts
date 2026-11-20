import { z } from "zod";

export const auditHistoryQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    before_id: z.coerce.number().int().positive().max(2_147_483_647).optional(),
  })
  .strict();

export type AuditHistoryQuery = z.infer<typeof auditHistoryQuerySchema>;
