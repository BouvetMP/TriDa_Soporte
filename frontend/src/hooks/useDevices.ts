import { useState, useCallback, useEffect } from "react";
import { DevicesApi } from "@/api/Devices";
import { Device } from "@/types/Device";
import { useToast } from "@/components/ui/Toast";

export const useDevices = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { showToast } = useToast();

  const fetchDevices = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await DevicesApi.getAll();
      if (response.success) {
        setDevices(response.data);
      }
    } catch (error) {
      const err = error as Error;
      showToast({
        type: "error",
        title: "Error al cargar dispositivos",
        message:
          err.message ||
          "No se pudo obtener la lista de dispositivos vinculados.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const toggleTrust = async (
    id: number,
    confiableActual: boolean,
  ): Promise<boolean> => {
    try {
      const nuevoEstado = !confiableActual;
      const response = await DevicesApi.updateTrust(id, {
        confiable: nuevoEstado,
      });
      if (response.success) {
        setDevices((prev) =>
          prev.map((dev) =>
            dev.id_dispositivo === id
              ? { ...dev, confiable: nuevoEstado }
              : dev,
          ),
        );
        showToast({
          type: "success",
          title: "Confianza actualizada",
          message: nuevoEstado
            ? "El dispositivo ahora está marcado como confiable."
            : "El dispositivo ya no se considera confiable.",
        });
        return true;
      }
    } catch (error) {
      const err = error as Error;
      showToast({
        type: "error",
        title: "Error de actualización",
        message:
          err.message ||
          "No se pudo cambiar el estado de confianza del dispositivo.",
      });
    }
    return false;
  };

  const removeDevice = async (id: number): Promise<boolean> => {
    try {
      const response = await DevicesApi.delete(id);
      if (response.success) {
        setDevices((prev) => prev.filter((dev) => dev.id_dispositivo !== id));
        showToast({
          type: "success",
          title: "Dispositivo eliminado",
          message: "El dispositivo ha sido desvinculado exitosamente.",
        });
        return true;
      }
    } catch (error) {
      const err = error as Error;
      showToast({
        type: "error",
        title: "Error al eliminar",
        message: err.message || "No se pudo revocar el dispositivo.",
      });
    }
    return false;
  };

  return {
    devices,
    isLoading,
    toggleTrust,
    removeDevice,
    refreshDevices: fetchDevices,
  };
};
