import { useState, useEffect, useCallback } from "react";
import { mapApi } from "@/api/Map";
import { useToast } from "@/components/ui/Toast";
import type { GeoTransaction, MapSummary, MapFilters } from "@/types";

export function useMapTransactions(initialFilters?: MapFilters) {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<GeoTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [summary, setSummary] = useState<MapSummary | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<GeoTransaction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<MapFilters>(initialFilters || {});

  const fetchMapData = useCallback(async () => {
    try {
      setLoading(true);
      const [locations, summaryData] = await Promise.all([
        mapApi.getGeoTransactions({ limit: 500, ...filters }),
        mapApi.getMapSummary(),
      ]);
      setTransactions(locations.items);
      setTotal(locations.total);
      setTruncated(locations.truncated);
      setSummary(summaryData);
      setSelectedTransaction((current) =>
        locations.items.find(
          (transaction) =>
            transaction.id_transaccion === current?.id_transaccion,
        ) ?? locations.items[0] ?? null,
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al cargar mapa de gastos";
      showToast({
        type: "error",
        title: "Error de Mapa",
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  const updateFilters = (newFilters: Partial<MapFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters({});
  };

  return {
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
    refreshMap: fetchMapData,
  };
}
