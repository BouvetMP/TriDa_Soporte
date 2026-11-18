import { apiClient } from "./Client";
import { ApiSuccess } from "@/types/Api";
import { DashboardData } from "@/types/Dashboard";

export const DashboardApi = {
  getStats: async (): Promise<ApiSuccess<DashboardData>> => {
    const response = await apiClient.get<ApiSuccess<DashboardData>>(
      "/dashboard/stats",
    );
    return response.data;
  },
};
