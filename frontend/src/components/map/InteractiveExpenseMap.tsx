import { Navigation, AlertTriangle, Building2, Calendar } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/utils/Formatters";
import { getRiskBadgeClass, getRiskLabel } from "@/utils/Risk";
import type { GeoTransaction } from "@/types";

interface InteractiveExpenseMapProps {
  selectedTransaction: GeoTransaction | null;
}

export function InteractiveExpenseMap({
  selectedTransaction,
}: InteractiveExpenseMapProps) {
  if (!selectedTransaction) {
    return (
      <Card className="flex h-[560px] items-center justify-center border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 text-center text-sm text-[var(--color-text-muted)]">
        No hay ubicaciones registradas para mostrar en el mapa.
      </Card>
    );
  }

  const defaultLat = selectedTransaction.latitud;
  const defaultLng = selectedTransaction.longitud;

  // Generar URL de OpenStreetMap segura embebida
  const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${defaultLng - 0.04}%2C${defaultLat - 0.04}%2C${defaultLng + 0.04}%2C${defaultLat + 0.04}&layer=mapnik&marker=${defaultLat}%2C${defaultLng}`;

  return (
    <Card className="border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden flex flex-col h-[560px]">
      {/* Visor de Mapa */}
      <div className="relative flex-1 w-full bg-[var(--color-bg-secondary)] min-h-[300px]">
        <iframe
          title="Mapa de Transacciones TriDa"
          src={mapEmbedUrl}
          className="w-full h-full border-none"
          loading="lazy"
        />

        {/* Badge flotante de ubicación actual */}
        <div className="absolute top-3 left-3 z-10 bg-[var(--color-bg-card)]/95 backdrop-blur-sm border border-[var(--color-border)] p-2.5 rounded-xl shadow-lg flex items-center gap-2 max-w-xs">
          <div className="p-1.5 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">
              {selectedTransaction.comercio || "Ubicación seleccionada"}
            </p>
            <p className="text-2xs text-[var(--color-text-muted)] truncate">
              {selectedTransaction.ciudad
                ? `${selectedTransaction.ciudad}, ${selectedTransaction.pais || "Colombia"}`
                : `${defaultLat.toFixed(4)}, ${defaultLng.toFixed(4)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Detalle inferior de la transacción seleccionada */}
      {selectedTransaction && (
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-card)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{
                backgroundColor:
                  selectedTransaction.categoria?.color ||
                  "var(--color-primary)",
              }}
            >
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  {selectedTransaction.comercio || "Comercio no especificado"}
                </h3>
                {selectedTransaction.nivel_riesgo && (
                  <span
                    className={`text-2xs px-2 py-0.5 rounded-full font-semibold ${getRiskBadgeClass(
                      selectedTransaction.nivel_riesgo,
                    )}`}
                  >
                    {getRiskLabel(selectedTransaction.nivel_riesgo)}
                  </span>
                )}
                {selectedTransaction.es_sospechosa && (
                  <Badge
                    variant="danger"
                    className="text-2xs flex items-center gap-1"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Sospechosa
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-2 mt-0.5">
                <span>
                  {selectedTransaction.categoria?.nombre || "General"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(selectedTransaction.fecha_transaccion)}
                </span>
              </p>
            </div>
          </div>

          <div className="text-right sm:shrink-0 w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--color-border)]">
            <span className="text-2xs text-[var(--color-text-muted)]">
              Monto registrado
            </span>
            <p className="text-base font-black text-[var(--color-text-primary)]">
              {formatCurrency(selectedTransaction.monto)}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
