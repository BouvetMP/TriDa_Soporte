import React, { useState } from "react";
import { useAlerts } from "@/hooks/useAlerts";
import { FraudAlert, AlertStatus, AlertSeverity } from "@/types/Alert";
import { AlertBadge } from "@/components/alerts/AlertBadge";
import { AlertActionModal } from "@/components/alerts/AlertActionModal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Select } from "@/components/ui/Select";
import { formatDate, formatCurrency } from "@/utils/Formatters";
import { ShieldAlert, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";

export const AlertsPage: React.FC = () => {
  const {
    alerts,
    pagination,
    queryParams,
    isLoading,
    updateFilters,
    changePage,
    resolveAlert,
  } = useAlerts();

  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            Centro de Alertas de Fraude
          </h1>
          <p className="text-sm text-[var(--color-text-subtle)] mt-1">
            Monitorea anomalías detectadas por TriDa v2 en tus transacciones.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-[var(--color-bg-surface)] p-4 rounded-xl border border-[var(--color-border-subtle)]">
        <Select
          value={queryParams.estado || ""}
          onChange={(e) =>
            updateFilters({
              estado: (e.target.value as AlertStatus) || undefined,
            })
          }
          options={[
            { value: "", label: "Todos los estados" },
            { value: "PENDIENTE", label: "Pendientes de revisión" },
            { value: "CONFIRMADA", label: "Fraude confirmado" },
            { value: "DESCARTADA", label: "Descartadas (Legítimas)" },
          ]}
        />

        <Select
          value={queryParams.severidad || ""}
          onChange={(e) =>
            updateFilters({
              severidad: (e.target.value as AlertSeverity) || undefined,
            })
          }
          options={[
            { value: "", label: "Cualquier severidad" },
            { value: "CRITICA", label: "Crítica" },
            { value: "ALTA", label: "Alta" },
            { value: "MEDIA", label: "Media" },
            { value: "BAJA", label: "Baja" },
          ]}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" className="text-[var(--color-primary-500)]" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
            Sin alertas registradas
          </h3>
          <p className="text-sm text-[var(--color-text-subtle)] mt-1">
            No se encontraron amenazas ni comportamientos inusuales con los
            filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl shadow-sm overflow-hidden">
          <ul className="divide-y divide-[var(--color-border-subtle)]">
            {alerts.map((alert) => (
              <li
                key={alert.id_alerta}
                onClick={() => {
                  if (alert.estado === "PENDIENTE") {
                    setSelectedAlert(alert);
                  }
                }}
                className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center gap-4 ${
                  alert.estado === "PENDIENTE"
                    ? "bg-[var(--color-bg-surface-hover)] cursor-pointer"
                    : "hover:bg-[var(--color-bg-surface-hover)]"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertBadge severidad={alert.severidad} />
                    <AlertBadge estado={alert.estado} />
                  </div>

                  <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {alert.motivo}
                  </h4>

                  {alert.transaccion && (
                    <p className="text-xs text-[var(--color-text-subtle)] mt-1">
                      Comercio:{" "}
                      <span className="font-medium">
                        {alert.transaccion.comercio || "No especificado"}
                      </span>{" "}
                      | Monto:{" "}
                      <span className="font-medium font-mono">
                        {formatCurrency(alert.transaccion.monto)}
                      </span>
                    </p>
                  )}

                  <span className="text-xs text-[var(--color-text-muted)] mt-2 block font-mono">
                    Detectada: {formatDate(alert.fecha_detectada)}
                  </span>
                </div>

                {alert.estado === "PENDIENTE" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAlert(alert);
                    }}
                  >
                    Resolver
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Controles de Paginación */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-4">
          <span className="text-xs text-[var(--color-text-subtle)]">
            Página {pagination.page} de {pagination.total_pages} (Total:{" "}
            {pagination.total})
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => changePage(pagination.page - 1)}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => changePage(pagination.page + 1)}
              className="flex items-center gap-1"
            >
              Siguiente <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Acción sobre Alerta */}
      <AlertActionModal
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        alert={selectedAlert}
        onResolve={resolveAlert}
      />
    </div>
  );
};
