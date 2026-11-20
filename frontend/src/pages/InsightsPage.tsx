import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { useInsights } from "@/hooks/useInsights";
import { formatCurrency } from "@/utils/Formatters";

const periodOptions = [
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
  { value: "180", label: "Últimos 180 días" },
  { value: "365", label: "Último año" },
];

export function InsightsPage() {
  const { overview, periodDays, setPeriodDays, loading } = useInsights();
  const summary = overview?.resumen;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--color-text-primary)]">
            Análisis financiero
            <Sparkles className="h-5 w-5 text-[var(--color-primary)]" />
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Resumen y consejos calculados a partir de tus movimientos
            registrados.
          </p>
        </div>
        <div className="w-48">
          <Select
            value={String(periodDays)}
            onChange={(event) => setPeriodDays(Number(event.target.value))}
            options={periodOptions}
            aria-label="Periodo de análisis"
          />
        </div>
      </header>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : !overview || !summary ? (
        <Card className="p-6 text-sm text-[var(--color-text-secondary)]">
          No se pudo obtener el análisis para este periodo.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Ingresos"
              value={formatCurrency(summary.ingresos)}
            />
            <MetricCard label="Gastos" value={formatCurrency(summary.gastos)} />
            <MetricCard
              label="Ahorros"
              value={formatCurrency(summary.ahorros)}
            />
            <MetricCard
              label="Tasa de ahorro"
              value={`${summary.tasa_ahorro.toFixed(1)}%`}
            />
            <MetricCard
              label="Transacciones analizadas"
              value={String(summary.total_transacciones)}
            />
            <MetricCard
              label="Alertas detectadas"
              value={String(summary.total_alertas)}
            />
            <MetricCard
              label="Alertas altas o críticas"
              value={String(summary.alertas_criticas)}
            />
            <MetricCard
              label="Score de riesgo promedio"
              value={`${summary.score_riesgo_promedio.toFixed(1)} / 100`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-bold text-[var(--color-text-primary)]">
                Consejos para este periodo
              </h2>
              <ul className="space-y-3">
                {overview.consejos.map((advice, index) => (
                  <li
                    key={`${index}-${advice}`}
                    className="rounded-lg bg-[var(--color-bg-secondary)] p-3 text-sm text-[var(--color-text-secondary)]"
                  >
                    {advice}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 text-sm font-bold text-[var(--color-text-primary)]">
                Categorías con mayor gasto
              </h2>
              {overview.top_categorias.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  No hay gastos por categoría en el periodo.
                </p>
              ) : (
                <ul className="space-y-3">
                  {overview.top_categorias.map((category) => (
                    <li
                      key={category.nombre}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <span className="truncate text-[var(--color-text-secondary)]">
                        {category.nombre}
                      </span>
                      <span className="shrink-0 font-semibold text-[var(--color-text-primary)]">
                        {formatCurrency(category.total)} · {category.cantidad}{" "}
                        mov.
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="p-5">
            <h2 className="mb-4 text-sm font-bold text-[var(--color-text-primary)]">
              Comercios con mayor gasto
            </h2>
            {overview.top_comercios.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                No hay comercios registrados en el periodo.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {overview.top_comercios.map((merchant) => (
                  <li
                    key={merchant.comercio}
                    className="rounded-lg bg-[var(--color-bg-secondary)] p-3"
                  >
                    <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                      {merchant.comercio}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {formatCurrency(merchant.total)} · {merchant.cantidad}{" "}
                      mov.
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-lg font-bold text-[var(--color-text-primary)]">
        {value}
      </p>
    </Card>
  );
}
