import {
  Target,
  PlusCircle,
  Edit2,
  Trash2,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/utils/Formatters";
import type { SavingsGoal, EstadoMeta } from "@/types";

interface SavingsGoalCardProps {
  goal: SavingsGoal;
  onContribute: (goal: SavingsGoal) => void;
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (goal: SavingsGoal) => void;
}

export function SavingsGoalCard({
  goal,
  onContribute,
  onEdit,
  onDelete,
}: SavingsGoalCardProps) {
  const porcentaje =
    goal.progreso ??
    (goal.monto_objetivo > 0
      ? (goal.monto_actual / goal.monto_objetivo) * 100
      : 0);
  const isCompleted = goal.estado === "COMPLETADA" || porcentaje >= 100;
  const restante = Math.max(0, goal.monto_objetivo - goal.monto_actual);

  const getStatusBadge = (estado: EstadoMeta) => {
    switch (estado) {
      case "COMPLETADA":
        return <Badge variant="success">Completada</Badge>;
      case "PAUSADA":
        return <Badge variant="warning">Pausada</Badge>;
      case "CANCELADA":
        return <Badge variant="danger">Cancelada</Badge>;
      default:
        return <Badge variant="info">En Progreso</Badge>;
    }
  };

  return (
    <Card className="p-5 border-[var(--color-border)] bg-[var(--color-bg-card)] flex flex-col justify-between hover:border-[var(--color-primary)]/40 transition-colors">
      <div>
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base shadow-sm"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[var(--color-text-primary)]">
                {goal.nombre}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(goal)}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
              title="Editar meta"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(goal)}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-bg-hover)] transition-colors"
              title="Eliminar meta"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Estado y fechas */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {getStatusBadge(goal.estado)}
          {goal.fecha_limite && (
            <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(goal.fecha_limite)}
            </span>
          )}
        </div>

        {/* Montos */}
        <div className="flex justify-between items-baseline mb-2">
          <div>
            <span className="text-xs text-[var(--color-text-muted)]">
              Ahorrado
            </span>
            <p className="text-lg font-bold text-[var(--color-text-primary)]">
              {formatCurrency(goal.monto_actual)}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-[var(--color-text-muted)]">
              Objetivo
            </span>
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
              {formatCurrency(goal.monto_objetivo)}
            </p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-[var(--color-bg-secondary)] h-2.5 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isCompleted
                ? "bg-[var(--color-success)]"
                : "bg-[var(--color-primary)]"
            }`}
            style={{ width: `${Math.min(porcentaje, 100)}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-4">
          <span>
            Faltan:{" "}
            <strong className="text-[var(--color-text-primary)]">
              {formatCurrency(restante)}
            </strong>
          </span>
          <span>{porcentaje.toFixed(1)}%</span>
        </div>
      </div>

      {/* Botón de acción */}
      <div className="pt-3 border-t border-[var(--color-border)]">
        {isCompleted ? (
          <div className="flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-[var(--color-success)] bg-[var(--color-success-light)] rounded-xl">
            <CheckCircle2 className="w-4 h-4" />
            <span>¡Meta Alcanzada!</span>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-1.5 text-xs py-2"
            onClick={() => onContribute(goal)}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Aportar a esta meta</span>
          </Button>
        )}
      </div>
    </Card>
  );
}
