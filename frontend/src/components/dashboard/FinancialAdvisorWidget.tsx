import React from "react";
import { AIRecommendation } from "@/types/Dashboard";
import { Bot, Sparkles, AlertTriangle, Lightbulb, Award } from "lucide-react";

interface FinancialAdvisorWidgetProps {
  recommendations: AIRecommendation[];
  score?: number;
}

export const FinancialAdvisorWidget: React.FC<FinancialAdvisorWidgetProps> = ({
  recommendations,
  score,
}) => {
  const getIcon = (tipo: string) => {
    switch (tipo) {
      case "ALERTA":
        return (
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        );
      case "LOGRO":
        return <Award className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
      case "SUGERENCIA":
      default:
        return (
          <Lightbulb className="w-4 h-4 text-[var(--color-primary-500)] shrink-0 mt-0.5" />
        );
    }
  };

  return (
    <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[var(--color-primary-500)]/10 text-[var(--color-primary-500)]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
              Asesor TriDa AI{" "}
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </h3>
            <p className="text-xs text-[var(--color-text-subtle)]">
              Análisis financiero automatizado
            </p>
          </div>
        </div>

        {typeof score === "number" && (
          <div className="text-right">
            <span className="text-xs text-[var(--color-text-subtle)] block">
              Score Financiero
            </span>
            <span className="text-lg font-bold font-mono text-[var(--color-primary-500)]">
              {score} / 100
            </span>
          </div>
        )}
      </div>

      {recommendations.length === 0 ? (
        <div className="p-4 rounded-lg bg-[var(--color-bg-surface-hover)] text-xs text-[var(--color-text-subtle)] text-center">
          Tu salud financiera está equilibrada. No hay alertas ni sugerencias
          pendientes por el momento.
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={rec.id_recomendacion}
              className="p-3.5 rounded-lg bg-[var(--color-bg-surface-hover)] border border-[var(--color-border-subtle)] flex items-start gap-3"
            >
              {getIcon(rec.tipo)}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-[var(--color-text-primary)]">
                  {rec.titulo}
                </h4>
                <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                  {rec.mensaje}
                </p>
                {rec.accion_sugerida && (
                  <span className="inline-block mt-2 text-xs font-medium text-[var(--color-primary-500)] underline">
                    {rec.accion_sugerida}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
