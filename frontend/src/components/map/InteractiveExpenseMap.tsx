import { useEffect, useRef } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { AlertTriangle, Building2, Calendar } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/utils/Formatters";
import { getRiskBadgeClass, getRiskLabel } from "@/utils/Risk";
import type { GeoTransaction } from "@/types";

interface InteractiveExpenseMapProps {
  transactions: GeoTransaction[];
  selectedTransaction: GeoTransaction | null;
  onSelectTransaction: (transaction: GeoTransaction) => void;
}

interface MapViewControllerProps {
  transactions: GeoTransaction[];
  selectedTransaction: GeoTransaction | null;
}

function MapViewController({
  transactions,
  selectedTransaction,
}: MapViewControllerProps) {
  const map = useMap();
  const previous = useRef({ transactionIds: "", selectedId: null as number | null });
  const transactionIds = transactions
    .map((transaction) => transaction.id_transaccion)
    .join(",");

  useEffect(() => {
    if (previous.current.transactionIds !== transactionIds) {
      previous.current = {
        transactionIds,
        selectedId: selectedTransaction?.id_transaccion ?? null,
      };
      if (transactions.length === 1) {
        const [transaction] = transactions;
        map.setView([transaction.latitud, transaction.longitud], 13);
      } else {
        map.fitBounds(
          L.latLngBounds(
            transactions.map(
              (transaction) =>
                [transaction.latitud, transaction.longitud] as L.LatLngTuple,
            ),
          ),
          { padding: [24, 24], maxZoom: 13 },
        );
      }
      return;
    }

    if (
      selectedTransaction &&
      previous.current.selectedId !== selectedTransaction.id_transaccion
    ) {
      previous.current.selectedId = selectedTransaction.id_transaccion;
      map.flyTo(
        [selectedTransaction.latitud, selectedTransaction.longitud],
        Math.max(map.getZoom(), 13),
        { duration: 0.4 },
      );
    }
  }, [map, selectedTransaction, transactionIds, transactions]);

  return null;
}

function createTransactionIcon(selected: boolean) {
  return L.divIcon({
    className: "trida-map-marker-icon",
    html: `<span class="trida-map-marker${selected ? " trida-map-marker-selected" : ""}"></span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

export function InteractiveExpenseMap({
  transactions,
  selectedTransaction,
  onSelectTransaction,
}: InteractiveExpenseMapProps) {
  if (transactions.length === 0) {
    return (
      <Card className="flex h-[560px] items-center justify-center border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 text-center text-sm text-[var(--color-text-muted)]">
        No hay ubicaciones registradas para mostrar en el mapa.
      </Card>
    );
  }

  return (
    <Card className="border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden flex flex-col h-[560px]">
      <div className="relative min-h-[300px] flex-1">
        <MapContainer
          center={[4.711, -74.0721]}
          zoom={6}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewController
            transactions={transactions}
            selectedTransaction={selectedTransaction}
          />
          {transactions.map((transaction) => {
            const selected =
              selectedTransaction?.id_transaccion === transaction.id_transaccion;
            return (
              <Marker
                key={`${transaction.id_transaccion}-${selected}`}
                position={[transaction.latitud, transaction.longitud]}
                icon={createTransactionIcon(selected)}
                title={transaction.comercio || "Transacción"}
                alt={`Transacción ${transaction.id_transaccion}`}
                eventHandlers={{
                  click: () => onSelectTransaction(transaction),
                }}
              >
                <Popup>
                  <strong>{transaction.comercio || "Comercio no especificado"}</strong>
                  <br />
                  {formatCurrency(transaction.monto)} ·{" "}
                  {formatDate(transaction.fecha_transaccion)}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

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
              <div className="flex flex-wrap items-center gap-2">
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
