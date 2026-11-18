import { apiClient } from "./Client";
import { ApiSuccess, PaginatedResponse } from "@/types/Api";
import {
  FraudAlert,
  ListAlertsQueryParams,
  UpdateAlertStatusPayload,
} from "@/types/Alert";

export const AlertsApi = {
  /**
   * Obtiene las alertas de fraude aplicando filtros y paginación
   */
  getAll: async (
    params: ListAlertsQueryParams = {},
  ): Promise<ApiSuccess<PaginatedResponse<FraudAlert>>> => {
    const response = await apiClient.get<
      ApiSuccess<PaginatedResponse<FraudAlert>>
    >("/alerts", { params });
    return response.data;
  },

  /**
   * Obtiene el conteo total de alertas pendientes de revisión
   */
  getPendingCount: async (): Promise<ApiSuccess<{ count: number }>> => {
    const response = await AlertsApi.getAll({
      estado: "PENDIENTE",
      limit: 1,
      offset: 0,
    });
    return {
      success: true,
      data: { count: response.data.pagination.total },
    };
  },

  /**
   * Actualiza el estado y acción tomada sobre una alerta
   */
  updateStatus: async (
    id: number,
    payload: UpdateAlertStatusPayload,
  ): Promise<ApiSuccess<FraudAlert>> => {
    const response = await apiClient.patch<ApiSuccess<FraudAlert>>(
      `/alerts/${id}/status`,
      payload,
    );
    return response.data;
  },
};
