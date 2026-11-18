import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Category } from "@/types/Category";
import { CreateTransactionPayload, TipoMovimiento } from "@/types/Transaction";
import { useAccount } from "@/hooks/useAccount";

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSubmit: (payload: CreateTransactionPayload) => Promise<boolean>;
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSubmit,
}) => {
  const { selectedAccount } = useAccount();

  const [monto, setMonto] = useState<string>("");
  const [tipoMovimiento, setTipoMovimiento] = useState<TipoMovimiento>("GASTO");
  const [idCategoria, setIdCategoria] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [comercio, setComercio] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) {
      setError("Debes seleccionar una cuenta para registrar la transacción.");
      return;
    }

    const numericMonto = parseFloat(monto);
    if (isNaN(numericMonto) || numericMonto <= 0) {
      setError("El monto debe ser un número positivo.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    const payload: CreateTransactionPayload = {
      id_cuenta: selectedAccount.id_cuenta,
      monto: numericMonto,
      tipo_movimiento: tipoMovimiento,
      id_categoria: idCategoria ? Number(idCategoria) : undefined,
      descripcion: descripcion.trim() || undefined,
      comercio: comercio.trim() || undefined,
      fecha_transaccion: new Date().toISOString(),
    };

    const success = await onSubmit(payload);
    setIsSubmitting(false);

    if (success) {
      setMonto("");
      setDescripcion("");
      setComercio("");
      setIdCategoria("");
      onClose();
    }
  };

  const tipoOptions = [
    { value: "GASTO", label: "Gasto" },
    { value: "INGRESO", label: "Ingreso" },
    { value: "AHORRO", label: "Ahorro" },
  ];

  const categoryOptions = [
    { value: "", label: "Sin categoría" },
    ...categories.map((c) => ({
      value: String(c.id_categoria),
      label: c.nombre,
    })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva Transacción">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-subtle)] mb-1">
            Cuenta Seleccionada
          </label>
          <input
            type="text"
            disabled
            value={selectedAccount?.nombre || "Sin cuenta seleccionada"}
            className="w-full px-3 py-2 bg-[var(--color-bg-surface-hover)] border border-[var(--color-border-subtle)] rounded-lg text-sm font-medium text-[var(--color-text-primary)] cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-subtle)] mb-1">
              Tipo de Movimiento
            </label>
            <Select
              value={tipoMovimiento}
              onChange={(e) =>
                setTipoMovimiento(e.target.value as TipoMovimiento)
              }
              options={tipoOptions}
            />
          </div>

          <Input
            label="Monto (COP)"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-subtle)] mb-1">
            Categoría
          </label>
          <Select
            value={idCategoria}
            onChange={(e) => setIdCategoria(e.target.value)}
            options={categoryOptions}
          />
        </div>

        <Input
          label="Establecimiento / Comercio"
          placeholder="Ej. Éxito, Netflix, Restaurante"
          value={comercio}
          onChange={(e) => setComercio(e.target.value)}
        />

        <Input
          label="Descripción (Opcional)"
          placeholder="Nota personal"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border-subtle)]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Guardar Transacción
          </Button>
        </div>
      </form>
    </Modal>
  );
};
