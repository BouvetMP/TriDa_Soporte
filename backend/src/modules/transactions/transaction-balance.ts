import { Prisma } from "@prisma/client";

export type TransactionMovement = "INGRESO" | "GASTO" | "AHORRO";

export const getTransactionBalanceDelta = (
  tipo_movimiento: string,
  monto: number | string | Prisma.Decimal,
): Prisma.Decimal => {
  const amount = new Prisma.Decimal(monto);
  if (tipo_movimiento === "INGRESO") return amount;
  if (tipo_movimiento === "GASTO" || tipo_movimiento === "AHORRO") {
    return amount.negated();
  }
  throw new Error(`Tipo de movimiento inválido: ${tipo_movimiento}`);
};
