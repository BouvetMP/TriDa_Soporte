export type TransactionMovement = "INGRESO" | "GASTO" | "AHORRO";

export const getTransactionBalanceDelta = (tipo_movimiento: string, monto: number): number => {
  if (tipo_movimiento === "INGRESO") return monto;
  if (tipo_movimiento === "GASTO" || tipo_movimiento === "AHORRO") return -monto;
  throw new Error(`Tipo de movimiento inválido: ${tipo_movimiento}`);
};
