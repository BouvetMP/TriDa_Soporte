import { z } from "zod";

const idParamSchema = z.coerce.number().int().positive();

export function parseId(value: unknown): number {
  return idParamSchema.parse(value);
}
