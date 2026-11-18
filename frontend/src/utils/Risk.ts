import { NivelRiesgo } from "@/types/Transaction";

/**
 * Devuelve las clases CSS de Tailwind según el nivel de riesgo.
 */
export const getRiskBadgeClass = (nivel?: NivelRiesgo | null): string => {
  switch (nivel) {
    case "CRITICO":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    case "ALTO":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "MEDIO":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "BAJO":
    default:
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  }
};

/**
 * Devuelve el texto descriptivo en español según el nivel de riesgo.
 */
export const getRiskLabel = (nivel?: NivelRiesgo | null): string => {
  switch (nivel) {
    case "CRITICO":
      return "Riesgo Crítico";
    case "ALTO":
      return "Riesgo Alto";
    case "MEDIO":
      return "Riesgo Medio";
    case "BAJO":
      return "Riesgo Bajo";
    default:
      return "Riesgo Bajo";
  }
};
