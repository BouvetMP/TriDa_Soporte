import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useCategories } from "@/hooks/useCategories";
import type { CreateBudgetPayload } from "@/types";

interface NewBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateBudgetPayload) => Promise<boolean>;
  currentMonth: number;
  currentYear: number;
}

export function NewBudgetModal({
  isOpen,
  onClose,
  onSubmit,
  currentMonth,
  currentYear,
}: NewBudgetModalProps) {
  const { categories } = useCategories();
  const [idCategoria, setIdCategoria] = useState<string>("");
  const [montoLimite, setMontoLimite] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const expenseCategories = categories.filter((c) => c.tipo === "GASTO");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCategoria || !montoLimite) return;

    setSubmitting(true);
    const success = await onSubmit({
      id_categoria: Number(idCategoria),
      limite_mensual: Number(montoLimite),
      mes: currentMonth,
      anio: currentYear,
    });
    setSubmitting(false);

    if (success) {
      setIdCategoria("");
      setMontoLimite("");
      onClose();
    }
  };

  const categoryOptions = [
    { value: "", label: "Selecciona una categoría" },
    ...expenseCategories.map((c) => ({
      value: c.id_categoria.toString(),
      label: c.nombre,
    })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Presupuesto" isSubmitting={submitting}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            Categoría de Gasto *
          </label>
          <Select
            value={idCategoria}
            onChange={(e) => setIdCategoria(e.target.value)}
            options={categoryOptions}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            Monto Límite (COP) *
          </label>
          <Input
            type="number"
            min="1"
            step="1000"
            placeholder="Ej: 500000"
            value={montoLimite}
            onChange={(e) => setMontoLimite(e.target.value)}
            required
          />
        </div>

        <p className="text-xs text-[var(--color-text-muted)]">
          Este presupuesto aplica al mes y año seleccionados en la pantalla.
        </p>

        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Creando..." : "Crear Presupuesto"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
