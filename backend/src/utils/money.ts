import { z } from "zod";

const MAX_AMOUNT = 9_999_999_999_999;

const moneyValue = z
  .coerce.number()
  .finite()
  .max(MAX_AMOUNT, "El monto es demasiado grande")
  .transform((value) => Math.round(value * 100) / 100);

export const positiveMoney = moneyValue.pipe(
  z.number().positive("El monto debe ser mayor a 0"),
);

export const nonNegativeMoney = moneyValue.pipe(z.number().min(0));
