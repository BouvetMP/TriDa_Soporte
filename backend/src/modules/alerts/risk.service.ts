import { prisma } from "../../db/prisma.js";
import { haversineDistance } from "../../utils/geo.js";

export interface EvaluateRiskInput {
  id_usuario: number;
  monto: number;
  tipo_movimiento: "INGRESO" | "GASTO" | "AHORRO";
  comercio?: string;
  ubicacion_lat?: number;
  ubicacion_lon?: number;
  id_dispositivo?: number;
  fecha_transaccion: Date;
}

export interface RiskEvaluationResult {
  score_riesgo: number;
  nivel_riesgo: "BAJO" | "MEDIO" | "ALTO" | "CRITICO";
  estado_evaluacion: "APROBADA" | "REVISAR" | "BLOQUEADA";
  razones: string[];
  id_dispositivo_validado: number | null;
}

export class RiskService {
  async evaluateRisk(input: EvaluateRiskInput): Promise<RiskEvaluationResult> {
    const razones: string[] = [];
    let score = 0;
    let id_dispositivo_validado: number | null = null;

    // 1. Promedio histórico
    const stats = await prisma.transaccion.aggregate({
      where: { id_usuario: input.id_usuario, estado: { in: ["CONFIRMADA", "APROBADA"] } },
      _avg: { monto: true },
      _count: { id_transaccion: true },
    });
    const avgMonto = stats._avg.monto ? Number(stats._avg.monto) : 0;
    const countTx = stats._count.id_transaccion;

    if (countTx >= 3 && avgMonto > 0) {
      if (input.monto > avgMonto * 5) {
        score += 40;
        razones.push(
          `Monto (${input.monto}) excede 5 veces el promedio del usuario (${avgMonto.toFixed(2)})`,
        );
      } else if (input.monto > avgMonto * 3) {
        score += 25;
        razones.push(
          `Monto (${input.monto}) excede 3 veces el promedio del usuario (${avgMonto.toFixed(2)})`,
        );
      }
    }

    // 2. Dispositivo confiable
    if (input.id_dispositivo) {
      const dispositivo = await prisma.dispositivo.findFirst({
        where: { id_dispositivo: input.id_dispositivo, id_usuario: input.id_usuario },
      });

      if (!dispositivo) {
        score += 20;
        razones.push("Dispositivo no registrado previamente para este usuario");
      } else {
        id_dispositivo_validado = dispositivo.id_dispositivo;
        if (dispositivo.confiable === false) {
          score += 30;
          razones.push("Dispositivo marcado como no confiable");
        }
      }
    }

    // 3. Evaluación de Distancia / Velocidad (Geo)
    if (input.ubicacion_lat !== undefined && input.ubicacion_lon !== undefined) {
      const lastTx = await prisma.transaccion.findFirst({
        where: {
          id_usuario: input.id_usuario,
          estado: { in: ["CONFIRMADA", "APROBADA"] },
          id_ubicacion: { not: null },
        },
        include: {
          ubicacion: {
            select: { latitud: true, longitud: true },
          },
        },
        orderBy: { fecha_transaccion: "desc" },
      });

      const lastLatitude = lastTx?.ubicacion?.latitud;
      const lastLongitude = lastTx?.ubicacion?.longitud;
      if (
        lastTx &&
        lastLatitude !== null &&
        lastLatitude !== undefined &&
        lastLongitude !== null &&
        lastLongitude !== undefined
      ) {
        const lastLat = Number(lastLatitude);
        const lastLon = Number(lastLongitude);
        const lastTime = new Date(lastTx.fecha_transaccion);

        const distanceKm = haversineDistance(
          lastLat,
          lastLon,
          input.ubicacion_lat,
          input.ubicacion_lon,
        );

        const timeDiffHours =
          Math.abs(input.fecha_transaccion.getTime() - lastTime.getTime()) / 3600000;

        if (timeDiffHours > 0) {
          const speedKmH = distanceKm / timeDiffHours;
          if (speedKmH > 800) {
            score += 50;
            razones.push(
              `Velocidad de desplazamiento imposible: ${Math.round(speedKmH)} km/h (${distanceKm.toFixed(1)} km en ${timeDiffHours.toFixed(2)}h)`,
            );
          } else if (speedKmH > 200 && distanceKm > 100) {
            score += 30;
            razones.push(`Desplazamiento inusualmente rápido: ${Math.round(speedKmH)} km/h`);
          }
        }
      }
    }

    const finalScore = Math.min(score, 100);

    let nivel_riesgo: "BAJO" | "MEDIO" | "ALTO" | "CRITICO" = "BAJO";
    let estado_evaluacion: "APROBADA" | "REVISAR" | "BLOQUEADA" = "APROBADA";

    if (finalScore >= 95) {
      nivel_riesgo = "CRITICO";
      estado_evaluacion = "BLOQUEADA";
    } else if (finalScore >= 70) {
      nivel_riesgo = "ALTO";
      estado_evaluacion = "REVISAR";
    } else if (finalScore >= 30) {
      nivel_riesgo = "MEDIO";
      estado_evaluacion = "REVISAR";
    }

    return {
      score_riesgo: finalScore,
      nivel_riesgo,
      estado_evaluacion,
      razones,
      id_dispositivo_validado,
    };
  }
}

export const riskService = new RiskService();
