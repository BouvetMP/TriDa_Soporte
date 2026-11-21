import { Prisma } from "@prisma/client";
import { haversineDistance } from "../../utils/geo.js";
import { exceedsAverageMultiple } from "../../utils/decimal-money.js";
import { getRiskLevel } from "../../utils/risk.js";

export interface EvaluateRiskInput {
  id_usuario: number;
  monto: number;
  tipo_movimiento: "INGRESO" | "GASTO" | "AHORRO";
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

export const MIN_GEO_DISTANCE_KM = 100;

export function getGeoRiskPenalty(distanceKm: number, speedKmH: number) {
  if (distanceKm <= MIN_GEO_DISTANCE_KM) return null;

  if (speedKmH > 800) {
    return {
      score: 50,
      reason: `Velocidad de desplazamiento imposible: ${Math.round(speedKmH)} km/h (${distanceKm.toFixed(1)} km)`,
    };
  }

  if (speedKmH > 200) {
    return {
      score: 30,
      reason: `Desplazamiento inusualmente rápido: ${Math.round(speedKmH)} km/h`,
    };
  }

  return null;
}

export const MIN_HISTORICAL_TRANSACTIONS_FOR_AVERAGE = 10;

export class RiskService {
  async evaluateRisk(
    input: EvaluateRiskInput,
    transaction: Prisma.TransactionClient,
  ): Promise<RiskEvaluationResult> {
    const razones: string[] = [];
    let score = 0;
    let id_dispositivo_validado: number | null = null;

    // 1. Promedio histórico
    const stats = await transaction.transaccion.aggregate({
      where: {
        id_usuario: input.id_usuario,
        tipo_movimiento: input.tipo_movimiento,
        estado: { in: ["CONFIRMADA", "APROBADA"] },
        fecha_transaccion: {
          gte: new Date(input.fecha_transaccion.getTime() - 90 * 24 * 60 * 60 * 1000),
          lt: input.fecha_transaccion,
        },
      },
      _avg: { monto: true },
      _count: { id_transaccion: true },
    });
    const avgMonto = stats._avg.monto ?? new Prisma.Decimal(0);
    const monto = new Prisma.Decimal(input.monto);
    const countTx = stats._count.id_transaccion;

    if (countTx >= MIN_HISTORICAL_TRANSACTIONS_FOR_AVERAGE && avgMonto.greaterThan(0)) {
      if (exceedsAverageMultiple(monto, avgMonto, 5)) {
        score += 40;
        razones.push(
          `Monto (${monto.toFixed(2)}) excede 5 veces el promedio del usuario (${avgMonto.toFixed(2)})`,
        );
      } else if (exceedsAverageMultiple(monto, avgMonto, 3)) {
        score += 25;
        razones.push(
          `Monto (${monto.toFixed(2)}) excede 3 veces el promedio del usuario (${avgMonto.toFixed(2)})`,
        );
      }
    }

    // 2. Dispositivo confiable
    if (input.id_dispositivo) {
      const dispositivo = await transaction.dispositivo.findFirst({
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
      const lastTx = await transaction.transaccion.findFirst({
        where: {
          id_usuario: input.id_usuario,
          estado: { in: ["CONFIRMADA", "APROBADA"] },
          id_ubicacion: { not: null },
          fecha_transaccion: { lt: input.fecha_transaccion },
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
          const geoPenalty = getGeoRiskPenalty(distanceKm, speedKmH);
          if (geoPenalty) {
            score += geoPenalty.score;
            razones.push(
              `${geoPenalty.reason} (${timeDiffHours.toFixed(2)}h)`,
            );
          }
        }
      }
    }

    const finalScore = Math.min(score, 100);

    const nivel_riesgo = getRiskLevel(finalScore);
    const estado_evaluacion =
      nivel_riesgo === "CRITICO"
        ? "BLOQUEADA"
        : nivel_riesgo === "BAJO"
          ? "APROBADA"
          : "REVISAR";

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
