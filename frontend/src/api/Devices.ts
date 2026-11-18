import { apiClient } from "./Client";
import { ApiSuccess } from "@/types/Api";
import {
  Device,
  RegisterDevicePayload,
  UpdateDeviceTrustPayload,
} from "@/types/Device";

export const DevicesApi = {
  /**
   * Obtiene todos los dispositivos vinculados a la cuenta del usuario
   */
  getAll: async (): Promise<ApiSuccess<Device[]>> => {
    const response = await apiClient.get<ApiSuccess<Device[]>>("/devices");
    return response.data;
  },

  /**
   * Registra un nuevo dispositivo
   */
  register: async (
    payload: RegisterDevicePayload,
  ): Promise<ApiSuccess<Device>> => {
    const response = await apiClient.post<ApiSuccess<Device>>(
      "/devices",
      payload,
    );
    return response.data;
  },

  /**
   * Actualiza el estado de confianza (confiable: true/false) de un dispositivo
   */
  updateTrust: async (
    id: number,
    payload: UpdateDeviceTrustPayload,
  ): Promise<ApiSuccess<Device>> => {
    const response = await apiClient.patch<ApiSuccess<Device>>(
      `/devices/${id}/trust`,
      payload,
    );
    return response.data;
  },

  /**
   * Revoca o elimina un dispositivo registrado
   */
  delete: async (id: number): Promise<ApiSuccess<void>> => {
    const response = await apiClient.delete<ApiSuccess<void>>(`/devices/${id}`);
    return response.data;
  },
};
