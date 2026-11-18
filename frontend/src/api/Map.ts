import { apiClient } from "./Client";
import type {
  ApiSuccess,
  GeoTransaction,
  MapSummary,
  MapFilters,
  MapLocationResult,
} from "@/types";

interface ApiMapLocation extends Omit<
  GeoTransaction,
  "categoria" | "es_sospechosa" | "nivel_riesgo"
> {
  nombre_categoria: string | null;
}

interface ApiMapLocations {
  items: ApiMapLocation[];
  total: number;
  truncated: boolean;
}

function getRiskLevel(score: number): GeoTransaction["nivel_riesgo"] {
  if (score >= 95) return "CRITICO";
  if (score >= 70) return "ALTO";
  if (score >= 30) return "MEDIO";
  return "BAJO";
}

export const mapApi = {
  getGeoTransactions: async (
    filters?: MapFilters,
  ): Promise<MapLocationResult> => {
    const response = await apiClient.get<ApiSuccess<ApiMapLocations>>(
      "/map/locations",
      { params: filters },
    );
    const result = response.data.data;
    return {
      ...result,
      items: result.items.map((item) => ({
        ...item,
        categoria: item.nombre_categoria
          ? { nombre: item.nombre_categoria, color: null, icono: null }
          : null,
        es_sospechosa: item.score_anomalia >= 30,
        nivel_riesgo: getRiskLevel(item.score_anomalia),
      })),
    };
  },

  getMapSummary: async (id_cuenta?: number): Promise<MapSummary> => {
    const response =
      await apiClient.get<ApiSuccess<MapSummary>>("/map/stats", {
        params: id_cuenta ? { id_cuenta } : undefined,
      });
    return response.data.data;
  },
};
