import React from "react";
import { DashboardData } from "@/types/Dashboard";
import { formatCurrency } from "@/utils/Formatters";
import { Wallet, TrendingUp, TrendingDown, ShieldAlert } from "lucide-react";

interface MetricsCardsProps {
  metrics: DashboardData;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Saldo Total */}
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-[var(--color-text-subtle)] uppercase tracking-wider">
            Saldo Consolidado
          </span>
          <div className="p-2 bg-[var(--color-primary-500)]/10 text-[var(--color-primary-500)] rounded-lg">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-bold font-mono text-[var(--color-text-primary)]">
          {formatCurrency(metrics.saldo_total)}
        </div>
      </div>

      {/* Ingresos del Mes */}
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-[var(--color-text-subtle)] uppercase tracking-wider">
            Ingresos del Mes
          </span>
          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-bold font-mono text-emerald-500">
          + {formatCurrency(metrics.mes_actual.ingresos)}
        </div>
      </div>

      {/* Gastos del Mes */}
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-[var(--color-text-subtle)] uppercase tracking-wider">
            Gastos del Mes
          </span>
          <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-bold font-mono text-red-500">
          - {formatCurrency(metrics.mes_actual.gastos)}
        </div>
      </div>

      {/* Alertas pendientes */}
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-[var(--color-text-subtle)] uppercase tracking-wider">
            Alertas Pendientes
          </span>
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-1">
          <div className="text-2xl font-bold font-mono text-amber-500">
            {metrics.alertas.activas}
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
            {metrics.alertas.criticas} de severidad alta o crítica
          </p>
        </div>
      </div>
    </div>
  );
};
