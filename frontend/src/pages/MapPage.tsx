import { MapPin } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { useMapTransactions } from "@/hooks/useMapTransactions";
import { MapSummaryCards } from "@/components/map/MapSummaryCards";
import { MapFiltersBar } from "@/components/map/MapFiltersBar";
import { InteractiveExpenseMap } from "@/components/map/InteractiveExpenseMap";
import { GeoTransactionsList } from "@/components/map/GeoTransactionsList";

export function MapPage() {
  const {
    transactions,
    total,
    truncated,
    summary,
    selectedTransaction,
    setSelectedTransaction,
    loading,
    filters,
    updateFilters,
    resetFilters,
  } = useMapTransactions();

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Mapa de Gastos
            </h1>
            <span className="p-1 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
              <MapPin className="w-4 h-4" />
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Ubicación geográfica de consumos en comercios y detección de
            anomalías por localización.
          </p>
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      <MapSummaryCards summary={summary} />

      {/* Barra de Filtros */}
      <MapFiltersBar
        filters={filters}
        onFilterChange={updateFilters}
        onReset={resetFilters}
      />

      {/* Contenido Principal: Mapa + Lista */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {truncated && (
            <p className="lg:col-span-12 text-xs text-[var(--color-text-muted)]">
              Se muestran {transactions.length} de {total} ubicaciones. Ajusta
              los filtros para ver un conjunto más específico.
            </p>
          )}
          <div className="lg:col-span-8">
            <InteractiveExpenseMap
              selectedTransaction={selectedTransaction}
            />
          </div>

          <div className="lg:col-span-4">
            <GeoTransactionsList
              transactions={transactions}
              selectedTransaction={selectedTransaction}
              onSelectTransaction={setSelectedTransaction}
            />
          </div>
        </div>
      )}
    </div>
  );
}
