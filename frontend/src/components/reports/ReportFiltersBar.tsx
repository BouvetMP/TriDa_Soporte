import { Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { TipoPeriodoReporte } from "@/types";

interface ReportFiltersBarProps {
  currentPeriod: TipoPeriodoReporte;
  exporting: boolean;
  onPeriodChange: (periodo: TipoPeriodoReporte) => void;
  onExport: () => void;
}

export function ReportFiltersBar({
  currentPeriod,
  exporting,
  onPeriodChange,
  onExport,
}: ReportFiltersBarProps) {
  const periodOptions: { label: string; value: TipoPeriodoReporte }[] = [
    { label: "Mes Actual", value: "MES_ACTUAL" },
    { label: "Últimos 3 Meses", value: "ULTIMOS_3_MESES" },
    { label: "Últimos 6 Meses", value: "ULTIMOS_6_MESES" },
    { label: "Año Actual", value: "ANIO_ACTUAL" },
  ];

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[var(--color-bg-card)] p-3 rounded-2xl border border-[var(--color-border)]">
      {/* Botones de Periodo */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
        <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] mr-1 shrink-0">
          <Filter className="w-3.5 h-3.5" />
          <span>Periodo:</span>
        </div>
        {periodOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onPeriodChange(opt.value)}
            className={`text-xs font-medium px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap ${
              currentPeriod === opt.value
                ? "bg-[var(--color-primary)] text-white shadow-sm"
                : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Exportación disponible con el backend actual */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="text-xs py-1.5 px-3 flex items-center gap-1.5"
          onClick={onExport}
          disabled={exporting}
        >
          <Download className="w-3.5 h-3.5" />
          <span>CSV</span>
        </Button>
      </div>
    </div>
  );
}
