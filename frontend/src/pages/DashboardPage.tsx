/**
 * ¿Qué? Pantalla principal (Dashboard) unificada.
 * ¿Para qué? Muestra el perfil del usuario y las estadísticas que expone la API.
 */
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useDashboard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { CategoryExpenseChart } from "@/components/dashboard/CategoryExpenseChart";
import { FinancialAdvisorWidget } from "@/components/dashboard/FinancialAdvisorWidget";
import { AlertBadge } from "@/components/alerts/AlertBadge";
import { formatCurrency, formatDate } from "@/utils/Formatters";
import { Link } from "react-router-dom";
import { Select } from "@/components/ui/Select";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BellRing,
  PiggyBank,
  User as UserIcon,
  Mail,
  Shield,
} from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const { data, isLoading, periodDays, setPeriodDays, markAdviceRead } =
    useDashboard();
  const periodOptions = [
    { value: 30, label: "Últimos 30 días" },
    { value: 90, label: "Últimos 90 días" },
    { value: 180, label: "Últimos 180 días" },
    { value: 365, label: "Último año" },
  ];

  return (
    <div className="space-y-6">
      {/* Banner de bienvenida */}
      <Card className="bg-gradient-to-r from-primary/10 via-surface to-surface border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-primary">
            ¡Hola, {user?.nombre_completo}!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-secondary">
            Has iniciado sesión correctamente. Tu conexión con TriDa v2 está
            diseñada para ayudarte a organizar tus finanzas.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-hover border border-border">
              <UserIcon className="w-5 h-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-text-muted">
                  Nombre
                </p>
                <p className="text-xs font-semibold text-text-primary truncate">
                  {user?.nombre_completo}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-hover border border-border">
              <Mail className="w-5 h-5 text-income shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-text-muted">
                  Email
                </p>
                <p className="text-xs font-semibold text-text-primary truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-hover border border-border">
              <Shield className="w-5 h-5 text-saving shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-text-muted">
                  Rol
                </p>
                <p className="text-xs font-semibold text-text-primary">
                  {user?.rol}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              Resumen Financiero
            </h2>
            <p className="text-sm text-text-muted mt-1">
              El saldo es consolidado; los ingresos, gastos y categorías
              corresponden al periodo seleccionado.
            </p>
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={periodDays}
              onChange={(event) => setPeriodDays(Number(event.target.value))}
              options={periodOptions}
              aria-label="Periodo del resumen financiero"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Spinner size="lg" className="text-primary" />
          </div>
        ) : !data ? (
          <div className="text-center py-12 bg-surface border border-border rounded-xl text-sm text-text-muted shadow-sm">
            No se pudieron cargar los datos del resumen financiero.
          </div>
        ) : (
          <div className="space-y-6">
            <MetricsCards metrics={data.metrics} />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <CategoryExpenseChart categories={data.categories} />
              <FinancialAdvisorWidget
                recommendations={data.advice}
                onMarkRead={markAdviceRead}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">
                    Transacciones recientes
                  </CardTitle>
                  <Link
                    to="/transactions"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Ver todas
                  </Link>
                </CardHeader>
                <CardContent>
                  {data.recentTransactions.length === 0 ? (
                    <p className="py-6 text-center text-sm text-text-muted">
                      No hay transacciones recientes para esta cuenta.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {data.recentTransactions.map((transaction) => {
                        const Icon =
                          transaction.tipo_movimiento === "INGRESO"
                            ? ArrowDownLeft
                            : transaction.tipo_movimiento === "GASTO"
                              ? ArrowUpRight
                              : transaction.tipo_movimiento === "AHORRO"
                                ? PiggyBank
                                : ArrowLeftRight;
                        const color =
                          transaction.tipo_movimiento === "INGRESO"
                            ? "text-income"
                            : transaction.tipo_movimiento === "GASTO"
                              ? "text-expense"
                              : transaction.tipo_movimiento === "AHORRO"
                                ? "text-saving"
                                : "text-text-secondary";

                        return (
                          <li
                            key={transaction.id_transaccion}
                            className="flex items-center justify-between gap-3 py-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-text-primary">
                                  {transaction.tipo_movimiento ===
                                  "TRANSFERENCIA"
                                    ? "Transferencia entre cuentas"
                                    : transaction.comercio ||
                                      transaction.categoria.nombre}
                                </p>
                                <p className="text-xs text-text-muted">
                                  {transaction.tipo_movimiento} ·{" "}
                                  {formatDate(transaction.fecha_transaccion)}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`shrink-0 text-sm font-semibold ${color}`}
                            >
                              {formatCurrency(transaction.monto)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-risk-high" />
                    <CardTitle className="text-base">
                      Alertas recientes
                    </CardTitle>
                  </div>
                  <Link
                    to="/security"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Ver todas
                  </Link>
                </CardHeader>
                <CardContent>
                  {data.recentAlerts.length === 0 ? (
                    <p className="py-6 text-center text-sm text-text-muted">
                      No hay alertas para esta cuenta.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {data.recentAlerts.map((alert) => (
                        <li
                          key={alert.id_alerta}
                          className="rounded-lg border border-border p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-text-primary">
                              {alert.comercio || "Transacción sin comercio"}
                            </p>
                            <div className="flex gap-2">
                              <AlertBadge severidad={alert.severidad} />
                              <AlertBadge estado={alert.estado} />
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-text-secondary">
                            {alert.motivo}
                          </p>
                          <p className="mt-1 text-xs text-text-muted">
                            {formatCurrency(alert.monto)} ·{" "}
                            {formatDate(alert.fecha_detectada)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
