import { apiClient } from "./Client";
import type { ApiSuccess, InsightsOverview } from "@/types";

export const insightsApi = {
  getOverview: async (periodoDias = 30): Promise<InsightsOverview> => {
    const response = await apiClient.get<ApiSuccess<InsightsOverview>>(
      "/insights",
      { params: { periodo_dias: periodoDias } },
    );
    return response.data.data;
  },
};
