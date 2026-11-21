import { apiClient } from "./Client";
import type { ApiSuccess, InsightsOverview } from "@/types";

export const insightsApi = {
  getOverview: async (periodoDias = 30, idCuenta?: number): Promise<InsightsOverview> => {
    const response = await apiClient.get<ApiSuccess<InsightsOverview>>(
      "/insights",
      { params: { periodo_dias: periodoDias, id_cuenta: idCuenta } },
    );
    return response.data.data;
  },
};
