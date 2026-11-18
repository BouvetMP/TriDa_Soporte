import React, { useState } from "react";
import { Edit2, Trash2, ShieldCheck } from "lucide-react";
import { Account } from "@/types";
import { formatCurrency, maskCardNumber } from "@/utils/Formatters";
import { AccountBadge } from "@/components/shared/AccountBadge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (id_cuenta: number) => Promise<void>;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onEdit,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(account.id_cuenta);
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  return (
    <>
      <Card className="relative overflow-hidden group hover:border-primary/40 transition-all duration-200">
        <div
          className="absolute top-0 bottom-0 left-0 w-1.5"
          style={{ backgroundColor: account.color || "var(--color-primary)" }}
        />

        <CardHeader className="flex flex-row items-center justify-between pb-2 pl-6">
          <div className="flex items-center gap-3 min-w-0">
            <AccountBadge tipo={account.tipo} showIconOnly />
            <div className="min-w-0">
              <CardTitle className="text-base truncate">
                {account.nombre}
              </CardTitle>
              {account.entidad && (
                <p className="text-xs text-text-muted truncate">
                  {account.entidad}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onEdit(account)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
              title="Editar cuenta"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="p-1.5 rounded-lg text-text-muted hover:text-expense hover:bg-expense/10 transition-colors"
              title="Eliminar cuenta"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="pl-6 pt-2 space-y-3">
          <div>
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              Saldo actual
            </span>
            <p className="text-2xl font-extrabold text-text-primary tracking-tight">
              {formatCurrency(account.saldo_inicial)}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs text-text-secondary">
            <span className="font-mono">
              {account.numero_enmascarado
                ? maskCardNumber(account.numero_enmascarado)
                : "•••• ••••"}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-income font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Activa
            </span>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDelete}
        title="¿Desactivar esta cuenta?"
        description={`La cuenta "${account.nombre}" dejará de mostrarse y no aceptará nuevos movimientos.`}
        confirmText="Desactivar cuenta"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
};
