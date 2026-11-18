import { prisma } from "../../db/prisma.js";
import type { RegisterDeviceInput } from "./devices.schemas.js";

export class DeviceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "DeviceError";
  }
}

export class DevicesService {
  async list(userId: number) {
    return prisma.dispositivo.findMany({
      where: { id_usuario: userId },
      orderBy: { fecha_ultimo_uso: "desc" },
    });
  }

  async getById(userId: number, deviceId: number) {
    const device = await prisma.dispositivo.findFirst({
      where: {
        id_dispositivo: deviceId,
        id_usuario: userId,
      },
    });

    if (!device) {
      throw new DeviceError("Dispositivo no encontrado", 404);
    }

    return device;
  }

  async registerOrUpdate(userId: number, data: RegisterDeviceInput) {
    const existing = await prisma.dispositivo.findUnique({
      where: { identificador_unico: data.identificador_unico },
    });

    if (existing && existing.id_usuario !== userId) {
      throw new DeviceError("El identificador ya está registrado por otro usuario", 409);
    }

    if (existing) {
      return prisma.dispositivo.update({
        where: { id_dispositivo: existing.id_dispositivo },
        data: {
          tipo_dispositivo: data.tipo_dispositivo,
          sistema_operativo: data.sistema_operativo,
          navegador: data.navegador,
          fecha_ultimo_uso: new Date(),
        },
      });
    }

    return prisma.dispositivo.create({
      data: {
        id_usuario: userId,
        identificador_unico: data.identificador_unico,
        tipo_dispositivo: data.tipo_dispositivo,
        sistema_operativo: data.sistema_operativo,
        navegador: data.navegador,
      },
    });
  }

  async updateTrustStatus(userId: number, deviceId: number, confiable: boolean) {
    await this.getById(userId, deviceId);
    return prisma.dispositivo.update({
      where: { id_dispositivo: deviceId },
      data: { confiable },
    });
  }

  async delete(userId: number, deviceId: number) {
    await this.getById(userId, deviceId);
    return prisma.dispositivo.delete({
      where: { id_dispositivo: deviceId },
    });
  }
}

export const devicesService = new DevicesService();
export const deviceService = devicesService;
