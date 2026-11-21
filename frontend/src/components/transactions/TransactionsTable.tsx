import React from "react";
import { Transaction } from "@/types/Transaction";
import { Category } from "@/types/Category";
import { RiskBadge } from "./RiskBadge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formatCurrency, formatDate } from "@/utils/Formatters";
import {
  ShoppingBag,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  PiggyBank,
} from "lucide-react";

interface TransactionsTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  onResolve: (id: number, estado: "CONFIRMADA" | "RECHAZADA") => void;
  categories: Category[];
  onUpdateCategory: (id: number, categoryId: number | null) => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  isLoading,
  onResolve,
  categories,
  onUpdateCategory,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" className="text-[var(--color-primary-500)]" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl">
        <ShoppingBag className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3 opacity-50" />
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
          No hay transacciones registradas
        </h3>
      </div>
    );
  }

  const renderTypeIcon = (tipo: string) => {
    switch (tipo) {
      case "INGRESO":
        return <ArrowDownLeft className="w-4 h-4 text-income" />;
      case "GASTO":
        return <ArrowUpRight className="w-4 h-4 text-expense" />;
      case "AHORRO":
        return <PiggyBank className="w-4 h-4 text-saving" />;
      case "TRANSFERENCIA":
        return <ArrowLeftRight className="w-4 h-4 text-text-secondary" />;
      default:
        return null;
    }
  };

  return (
    <div className="overflow-x-auto bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface-hover)] text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider">
            <th className="py-3 px-4">Fecha</th>
            <th className="py-3 px-4">Detalle / Comercio</th>
            <th className="py-3 px-4">Categoría</th>
            <th className="py-3 px-4">Tipo</th>
            <th className="py-3 px-4 text-right">Monto</th>
            <th className="py-3 px-4">Riesgo</th>
            <th className="py-3 px-4">Estado</th>
            <th className="py-3 px-4 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)]">
          {transactions.map((tx) => (
            <tr
              key={tx.id_transaccion}
              className="hover:bg-[var(--color-bg-surface-hover)] transition-colors"
            >
              <td className="py-3.5 px-4 whitespace-nowrap text-xs text-[var(--color-text-subtle)] font-mono">
                {formatDate(tx.fecha_transaccion)}
              </td>
              <td className="py-3.5 px-4">
                <div className="font-medium text-[var(--color-text-primary)]">
                  {tx.comercio || tx.descripcion || "General"}
                </div>
                {tx.comercio && tx.descripcion && (
                  <div className="text-xs text-[var(--color-text-subtle)]">
                    {tx.descripcion}
                  </div>
                )}
                {tx.tipo_movimiento === "TRANSFERENCIA" && (
                  <div className="text-xs text-[var(--color-text-subtle)]">
                    {tx.nombre_cuenta || "Origen"} →{" "}
                    {tx.nombre_cuenta_destino || "Destino"}
                  </div>
                )}
              </td>
              <td className="py-3.5 px-4 whitespace-nowrap">
                {tx.tipo_movimiento === "TRANSFERENCIA" ? (
                  <span className="text-xs text-[var(--color-text-subtle)]">
                    Transferencia entre cuentas
                  </span>
                ) : (
                  <select
                    aria-label={`Categoría de transacción ${tx.id_transaccion}`}
                    value={tx.id_categoria ?? ""}
                    onChange={(event) =>
                      onUpdateCategory(
                        tx.id_transaccion,
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                    className="max-w-44 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-2 py-1 text-xs text-[var(--color-text-primary)]"
                  >
                    <option value="">Sin categoría</option>
                    {categories
                      .filter(
                        (category) =>
                          category.estado !== false &&
                          category.tipo === tx.tipo_movimiento,
                      )
                      .map((category) => (
                        <option
                          key={category.id_categoria}
                          value={category.id_categoria}
                        >
                          {category.nombre}
                        </option>
                      ))}
                  </select>
                )}
              </td>
              <td className="py-3.5 px-4 whitespace-nowrap">
                <div className="inline-flex items-center gap-1 text-xs font-medium">
                  {renderTypeIcon(tx.tipo_movimiento)}
                  <span>{tx.tipo_movimiento}</span>
                </div>
              </td>
              <td className="py-3.5 px-4 whitespace-nowrap text-right font-semibold font-mono">
                <span
                  className={
                    tx.tipo_movimiento === "INGRESO"
                      ? "text-income"
                      : tx.tipo_movimiento === "GASTO"
                        ? "text-expense"
                        : tx.tipo_movimiento === "AHORRO"
                          ? "text-saving"
                          : "text-text-secondary"
                  }
                >
                  {tx.tipo_movimiento === "INGRESO"
                    ? "+"
                    : tx.tipo_movimiento === "TRANSFERENCIA"
                      ? "↔"
                      : "-"}{" "}
                  {formatCurrency(tx.monto)}
                </span>
              </td>
              <td className="py-3.5 px-4 whitespace-nowrap">
                <RiskBadge
                  nivel={tx.nivel_riesgo}
                  score={tx.score_anomalia}
                  esSospechosa={tx.es_sospechosa}
                />
              </td>
              <td className="py-3.5 px-4 whitespace-nowrap">
                <span className="rounded-full bg-surface-hover px-2 py-1 text-xs">
                  {tx.estado ?? "Sin estado"}
                </span>
              </td>
              <td className="py-3.5 px-4 whitespace-nowrap text-center">
                {tx.estado === "PENDIENTE" &&
                  tx.canal === "webhook" &&
                  tx.tipo_movimiento === "GASTO" && (
                    <span className="mr-2 text-xs text-text-secondary">
                      Confirma desde el correo
                    </span>
                  )}
                {tx.estado === "PENDIENTE" &&
                  !(
                    tx.canal === "webhook" && tx.tipo_movimiento === "GASTO"
                  ) && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onResolve(tx.id_transaccion, "CONFIRMADA")
                        }
                        className="mr-1"
                        aria-label="Confirmar transacción pendiente"
                      >
                        Confirmar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onResolve(tx.id_transaccion, "RECHAZADA")
                        }
                        className="mr-1"
                        aria-label="Rechazar transacción pendiente"
                      >
                        Rechazar
                      </Button>
                    </>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
