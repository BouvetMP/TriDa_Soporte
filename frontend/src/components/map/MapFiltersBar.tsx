import React from "react";
import { Filter, RotateCcw } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import type { MapFilters, NivelRiesgo } from "@/types";

interface MapFiltersBarProps {
  filters: MapFilters;
  onFilterChange: (newFilters: Partial<MapFilters>) => void;
  onReset: () => void;
}

export function MapFiltersBar({
  filters,
  onFilterChange,
  onReset,
}: MapFiltersBarProps) {
  const riskOptions = [
    { value: "", label: "Todos los riesgos" },
    { value: "ALL", label: "Todos los riesgos" },
    { value: "BAJO", label: "Bajo" },
    { value: "MEDIO", label: "Medio" },
    { value: "ALTO", label: "Alto" },
    { value: "CRITICO", label: "Crítico" },
  ];

  const statusOptions = [
    { value: "", label: "Todos los estados" },
    { value: "PENDIENTE", label: "Pendiente" },
    { value: "CONFIRMADA", label: "Confirmada" },
    { value: "APROBADA", label: "Aprobada" },
    { value: "SOSPECHOSA", label: "Sospechosa" },
    { value: "RECHAZADA", label: "Rechazada" },
  ];

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[var(--color-bg-card)] p-3 rounded-2xl border border-[var(--color-border)]">
      <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] shrink-0">
        <Filter className="w-3.5 h-3.5" />
        <span className="font-medium text-[var(--color-text-secondary)]">
          Filtros de Mapa:
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-40">
          <Select
            value={filters.nivel_riesgo || ""}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onFilterChange({
                nivel_riesgo: e.target.value
                  ? (e.target.value as NivelRiesgo)
                  : undefined,
              })
            }
            options={riskOptions}
            className="text-xs py-1.5"
          />
        </div>

        <div className="w-40">
          <Select
            value={filters.estado || ""}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onFilterChange({
                estado: (e.target.value as MapFilters["estado"]) || undefined,
              })
            }
            options={statusOptions}
            className="text-xs py-1.5"
          />
        </div>

        <Input
          type="date"
          aria-label="Fecha inicial"
          value={filters.fecha_inicio || ""}
          onChange={(e) =>
            onFilterChange({ fecha_inicio: e.target.value || undefined })
          }
          className="w-36 text-xs"
        />
        <Input
          type="date"
          aria-label="Fecha final"
          value={filters.fecha_fin || ""}
          onChange={(e) =>
            onFilterChange({ fecha_fin: e.target.value || undefined })
          }
          className="w-36 text-xs"
        />

        <button
          type="button"
          onClick={onReset}
          className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
          title="Restablecer filtros"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
