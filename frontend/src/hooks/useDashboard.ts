import { useState, useCallback, useEffect } from "react";
import { DashboardApi } from "@/api/Dashboard";
import { DashboardData } from "@/types/Dashboard";
import { useToast } from "@/components/ui/Toast";

export const useDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await DashboardApi.getStats();
      if (response.success) {
        setData(response.data);
      }
    } catch (error) {
      const err = error as Error;
      showToast({
        type: "error",
        title: "Error de carga",
        message:
          err.message || "No se pudieron actualizar los datos del Dashboard.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    data,
    isLoading,
    refreshDashboard: fetchDashboardData,
  };
};
