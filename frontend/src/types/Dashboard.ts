export interface DashboardData {
  saldo_total: number;
  mes_actual: {
    ingresos: number;
    gastos: number;
    ahorros: number;
    balance_neto: number;
  };
  alertas: {
    activas: number;
    criticas: number;
  };
}

export interface CategoryExpense {
  id_categoria: number;
  nombre_categoria: string;
  total: number;
  porcentaje: number;
  color?: string | null;
}

export interface AIRecommendation {
  id_recomendacion: number;
  tipo: "ALERTA" | "SUGERENCIA" | "LOGRO";
  titulo: string;
  mensaje: string;
  accion_sugerida?: string | null;
  fecha_generacion: string;
}
