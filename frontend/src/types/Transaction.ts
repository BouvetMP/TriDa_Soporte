export type TipoMovimiento = "INGRESO" | "GASTO" | "AHORRO";
export type TransactionType = TipoMovimiento;

export type NivelRiesgo = "BAJO" | "MEDIO" | "ALTO" | "CRITICO";
export type RiskLevel = NivelRiesgo;

export interface TransactionCategoryInfo {
  id_categoria: number;
  nombre: string;
  icono?: string | null;
  color?: string | null;
}

export interface Transaction {
  id_transaccion: number;
  id_cuenta: number;
  id_usuario?: number;
  id_categoria?: number | null;
  nombre_cuenta?: string | null;
  nombre_categoria?: string | null;
  icono_categoria?: string | null;
  color_categoria?: string | null;
  monto: number;
  tipo_movimiento: TipoMovimiento;
  descripcion?: string | null;
  comercio?: string | null;
  fecha_transaccion: string;
  es_sospechosa?: boolean;
  score_anomalia?: number | null;
  nivel_riesgo?: NivelRiesgo | null;
  estado?: "PENDIENTE" | "CONFIRMADA" | "APROBADA" | "SOSPECHOSA" | "RECHAZADA";
  latitud?: number | null;
  longitud?: number | null;
  created_at?: string;
  categoria?: TransactionCategoryInfo | null;
}

export interface CreateTransactionPayload {
  id_cuenta: number;
  id_dispositivo?: number;
  id_categoria?: number;
  monto: number;
  tipo_movimiento: TipoMovimiento;
  descripcion?: string;
  comercio?: string;
  fecha_transaccion?: string;
  latitud?: number;
  longitud?: number;
}

export interface TransactionFilters {
  id_cuenta?: number;
  id_categoria?: number;
  tipo_movimiento?: TipoMovimiento;
  nivel_riesgo?: NivelRiesgo;
  estado?: "PENDIENTE" | "CONFIRMADA" | "APROBADA" | "SOSPECHOSA" | "RECHAZADA";
  fecha_inicio?: string;
  fecha_fin?: string;
  limit?: number;
  offset?: number;
  search?: string;
  min_monto?: number;
  max_monto?: number;
  sort_by?: "fecha_transaccion" | "monto" | "tipo_movimiento" | "nivel_riesgo";
  sort_order?: "asc" | "desc";
}

export interface CreateTransactionResult {
  transaction: Transaction;
  evaluation: Record<string, unknown>;
  alert: unknown;
}

export interface DeleteTransactionResult {
  id_transaccion: number;
}
