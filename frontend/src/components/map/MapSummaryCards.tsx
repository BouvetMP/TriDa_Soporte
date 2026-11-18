import { MapPin, Globe, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { MapSummary } from "@/types";

interface MapSummaryCardsProps {
  summary: MapSummary | null;
}

export function MapSummaryCards({ summary }: MapSummaryCardsProps) {
  const totalGeolocalizadas = summary?.total_geolocalizadas ?? 0;
  const ciudadesVisitadas = summary?.ciudades_distintas ?? 0;
  const paisesVisitados = summary?.paises_distintos ?? 0;
  const transaccionesRiesgo = summary?.transacciones_riesgo_alto ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Ubicaciones registradas */}
      <Card className="p-4 flex items-center justify-between border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            Ubicaciones registradas
          </p>
          <p className="text-xl font-bold text-[var(--color-text-primary)] mt-1">
            {totalGeolocalizadas}
          </p>
          <span className="text-2xs text-[var(--color-text-muted)]">
            Transacciones con coordenadas
          </span>
        </div>
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center">
          <MapPin className="w-5 h-5" />
        </div>
      </Card>

      {/* Transacciones Ubicadas */}
      <Card className="p-4 flex items-center justify-between border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            Puntos Registrados
          </p>
          <p className="text-xl font-bold text-[var(--color-primary)] mt-1">
            {totalGeolocalizadas}
          </p>
          <span className="text-2xs text-[var(--color-text-muted)]">
            Movimientos con GPS
          </span>
        </div>
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center">
          <MapPin className="w-5 h-5" />
        </div>
      </Card>

      {/* Ciudades */}
      <Card className="p-4 flex items-center justify-between border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            Ciudades
          </p>
          <p className="text-xl font-bold text-[var(--color-success)] mt-1">
            {ciudadesVisitadas}
          </p>
          <span className="text-2xs text-[var(--color-text-muted)]">
            Ciudades con ubicaciones
          </span>
        </div>
        <div className="w-10 h-10 rounded-xl bg-[var(--color-success-light)] text-[var(--color-success)] flex items-center justify-center">
          <Globe className="w-5 h-5" />
        </div>
      </Card>

      {/* Países */}
      <Card className="p-4 flex items-center justify-between border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            Países registrados
          </p>
          <p className="text-xl font-bold mt-1 text-[var(--color-primary)]">
            {paisesVisitados}
          </p>
          <span className="text-2xs text-[var(--color-text-muted)]">
            Países distintos
          </span>
        </div>
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center">
          <Globe className="w-5 h-5" />
        </div>
      </Card>

      {/* Riesgo geográfico */}
      <Card className="p-4 flex items-center justify-between border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            Riesgo alto
          </p>
          <p className="text-xl font-bold mt-1 text-[var(--color-danger)]">
            {transaccionesRiesgo}
          </p>
          <span className="text-2xs text-[var(--color-text-muted)]">
            Score promedio {summary?.score_promedio ?? 0}
          </span>
        </div>
        <div className="w-10 h-10 rounded-xl bg-[var(--color-danger-light)] text-[var(--color-danger)] flex items-center justify-center">
          <ShieldAlert className="w-5 h-5" />
        </div>
      </Card>
    </div>
  );
}
