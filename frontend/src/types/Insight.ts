export interface InsightSummary {
  ingresos: number;
  gastos: number;
  ahorros: number;
  balance: number;
  tasa_ahorro: number;
  total_transacciones: number;
  score_riesgo_promedio: number;
  total_alertas: number;
  alertas_criticas: number;
}

export interface InsightCategory {
  nombre: string;
  icono: string | null;
  color: string | null;
  total: number;
  cantidad: number;
}

export interface InsightMerchant {
  comercio: string;
  total: number;
  cantidad: number;
}

export interface InsightsOverview {
  periodo_dias: number;
  resumen: InsightSummary;
  top_categorias: InsightCategory[];
  top_comercios: InsightMerchant[];
  consejos: string[];
}
