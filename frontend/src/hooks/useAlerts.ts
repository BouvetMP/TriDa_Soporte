import { useState, useCallback, useEffect } from "react";
import { AlertsApi } from "@/api/Alerts";
import {
  FraudAlert,
  ListAlertsQueryParams,
  AlertUserAction,
  AlertStatus,
} from "@/types/Alert";
import { useToast } from "@/components/ui/Toast";

export const useAlerts = (initialParams: ListAlertsQueryParams = {}) => {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 15,
    total_pages: 1,
  });

  const [queryParams, setQueryParams] = useState<ListAlertsQueryParams>({
    limit: 15,
    offset: 0,
    sort_by: "fecha_detectada",
    sort_order: "desc",
    ...initialParams,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { showToast } = useToast();

  const fetchPendingCount = useCallback(async () => {
    try {
      const response = await AlertsApi.getPendingCount();
      if (response.success) {
        setPendingCount(response.data.count);
      }
    } catch (error) {
      const err = error as Error;
      showToast({
        type: "error",
        title: "Error de conexión",
        message: err.message || "No se pudo actualizar el contador de alertas.",
      });
    }
  }, [showToast]);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await AlertsApi.getAll(queryParams);
      if (response.success) {
        setAlerts(response.data.items);

        const { pagination: responsePagination } = response.data;
        const limit = responsePagination.limit || queryParams.limit || 15;
        const total = responsePagination.total;
        const totalPages = Math.ceil(total / limit) || 1;
        const currentPage =
          Math.floor((responsePagination.offset ?? queryParams.offset ?? 0) / limit) +
          1;

        setPagination({
          total,
          page: currentPage,
          limit,
          total_pages: totalPages,
        });
      }
    } catch (error) {
      const err = error as Error;
      showToast({
        type: "error",
        title: "Error de conexión",
        message: err.message || "No se pudieron cargar las alertas.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [queryParams, showToast]);

  useEffect(() => {
    fetchAlerts();
    fetchPendingCount();
  }, [fetchAlerts, fetchPendingCount]);

  const updateFilters = (newParams: Partial<ListAlertsQueryParams>) => {
    setQueryParams((prev: ListAlertsQueryParams) => ({
      ...prev,
      ...newParams,
      offset: 0,
    }));
  };

  const changePage = (page: number) => {
    const limit = queryParams.limit || 15;
    const offset = (page - 1) * limit;
    setQueryParams((prev: ListAlertsQueryParams) => ({ ...prev, offset }));
  };

  const resolveAlert = async (
    id: number,
    accion: AlertUserAction,
  ): Promise<boolean> => {
    try {
      // Si el usuario reconoce la transacción ("FUI_YO"), la alerta se descarta.
      // De lo contrario ("NO_FUI_YO" o "BLOQUEAR_TARJETA"), se confirma la alerta de fraude.
      const nuevoEstado: AlertStatus =
        accion === "FUI_YO" ? "DESCARTADA" : "CONFIRMADA";

      const response = await AlertsApi.updateStatus(id, {
        estado: nuevoEstado,
        accion_usuario: accion,
      });

      if (response.success) {
        showToast({
          type: "success",
          title: "Alerta actualizada",
          message: "Tu acción de seguridad ha sido registrada exitosamente.",
        });
        fetchAlerts();
        fetchPendingCount();
        return true;
      }
    } catch (error) {
      const err = error as Error;
      showToast({
        type: "error",
        title: "Error de actualización",
        message: err.message || "No se pudo procesar la respuesta a la alerta.",
      });
    }
    return false;
  };

  return {
    alerts,
    pendingCount,
    pagination,
    queryParams,
    isLoading,
    updateFilters,
    changePage,
    resolveAlert,
    refresh: fetchAlerts,
  };
};
