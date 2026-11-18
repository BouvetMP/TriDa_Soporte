import { BarChart3 } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { useReports } from "@/hooks/useReports";
import { ReportFiltersBar } from "@/components/reports/ReportFiltersBar";
import { ReportSummaryCards } from "@/components/reports/ReportSummaryCards";
import { CategoryBreakdownTable } from "@/components/reports/CategoryBreakdownTable";

export function ReportsPage() {
  const {
    reportData,
    loading,
    exporting,
    filters,
    setPeriodType,
    exportReport,
  } = useReports({ tipo_periodo: "MES_ACTUAL" });

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Reportes Financieros
            </h1>
            <span className="p-1 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
              <BarChart3 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Análisis consolidado de ingresos, egresos y comportamiento
            comercial.
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <ReportFiltersBar
        currentPeriod={filters.tipo_periodo ?? "MES_ACTUAL"}
        exporting={exporting}
        onPeriodChange={setPeriodType}
        onExport={exportReport}
      />

      {loading ? (
        <div className="flex items-center justify-center min-h-[350px]">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tarjetas Ejecutivas */}
          <ReportSummaryCards summary={reportData?.resumen} />

          {/* Grilla: Categorías y Comercios */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7">
              <CategoryBreakdownTable
                expenseCategories={reportData?.gastos_por_categoria || []}
                incomeCategories={reportData?.ingresos_por_categoria || []}
              />
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
