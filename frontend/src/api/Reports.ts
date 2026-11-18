import { apiClient } from "./Client";
import type { ApiSuccess, FinancialReportData, ReportFilters } from "@/types";

interface ApiReportSummary {
  periodo: { fecha_inicio: string; fecha_fin: string };
  totales: { ingresos: number; gastos: number; ahorros: number; balance: number };
}

interface ApiCategoryReport {
  categorias: Array<{
    id_categoria: number;
    nombre: string;
    icono: string | null;
    color: string | null;
    total: number;
    cantidad: number;
  }>;
}

interface ApiTransactionReport {
  items: FinancialReportData["transacciones"];
}

export const reportsApi = {
  getFinancialReport: async (
    filters: ReportFilters,
  ): Promise<FinancialReportData> => {
    const params = {
      fecha_inicio: filters.fecha_inicio,
      fecha_fin: filters.fecha_fin,
    };
    const [summaryResponse, expenseResponse, incomeResponse, transactionResponse] =
      await Promise.all([
        apiClient.get<ApiSuccess<ApiReportSummary>>("/reports/summary", { params }),
        apiClient.get<ApiSuccess<ApiCategoryReport>>("/reports/by-category", {
          params: { ...params, tipo_movimiento: "GASTO" },
        }),
        apiClient.get<ApiSuccess<ApiCategoryReport>>("/reports/by-category", {
          params: { ...params, tipo_movimiento: "INGRESO" },
        }),
        apiClient.get<ApiSuccess<ApiTransactionReport>>("/reports/transactions", {
          params: { ...params, limit: 5000 },
        }),
      ]);

    const summary = summaryResponse.data.data;
    const gastos = expenseResponse.data.data.categorias;
    const ingresos = incomeResponse.data.data.categorias;
    const transacciones = transactionResponse.data.data.items;
    const gastoTotal = summary.totales.gastos;
    const ingresoTotal = summary.totales.ingresos;
    const merchantTotals = new Map<string, { total: number; count: number }>();

    for (const transaction of transacciones) {
      if (transaction.tipo_movimiento !== "GASTO") continue;
      const merchant = transaction.comercio || "Sin comercio";
      const current = merchantTotals.get(merchant) ?? { total: 0, count: 0 };
      current.total += transaction.monto;
      current.count += 1;
      merchantTotals.set(merchant, current);
    }

    const mapCategories = (
      categories: ApiCategoryReport["categorias"],
      total: number,
      tipo: "INGRESO" | "GASTO",
    ) =>
      categories.map((category) => ({
        id_categoria: category.id_categoria,
        nombre: category.nombre,
        tipo,
        total: category.total,
        porcentaje: total > 0 ? (category.total / total) * 100 : 0,
        numero_transacciones: category.cantidad,
        color: category.color,
      }));

    return {
      resumen: {
        total_ingresos: ingresoTotal,
        total_gastos: gastoTotal,
        balance_neto: summary.totales.balance,
        tasa_ahorro:
          ingresoTotal > 0 ? (summary.totales.ahorros / ingresoTotal) * 100 : 0,
      },
      gastos_por_categoria: mapCategories(gastos, gastoTotal, "GASTO"),
      ingresos_por_categoria: mapCategories(ingresos, ingresoTotal, "INGRESO"),
      top_comercios: [...merchantTotals.entries()]
        .map(([comercio, values]) => ({
          comercio,
          total: values.total,
          numero_transacciones: values.count,
          porcentaje: gastoTotal > 0 ? (values.total / gastoTotal) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5),
      transacciones,
      periodo: summary.periodo,
    };
  },
};
