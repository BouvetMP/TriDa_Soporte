import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { CreateSavingsGoalPayload } from "@/types";

interface NewSavingsGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateSavingsGoalPayload) => Promise<boolean>;
}

export function NewSavingsGoalModal({
  isOpen,
  onClose,
  onSubmit,
}: NewSavingsGoalModalProps) {
  const [nombre, setNombre] = useState<string>("");
  const [montoObjetivo, setMontoObjetivo] = useState<string>("");
  const [montoActual, setMontoActual] = useState<string>("");
  const [fechaLimite, setFechaLimite] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !montoObjetivo) return;

    setSubmitting(true);
    const success = await onSubmit({
      nombre: nombre.trim(),
      monto_objetivo: Number(montoObjetivo),
      monto_actual: montoActual ? Number(montoActual) : undefined,
      fecha_limite: fechaLimite || undefined,
    });
    setSubmitting(false);

    if (success) {
      setNombre("");
      setMontoObjetivo("");
      setMontoActual("");
      setFechaLimite("");
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva Meta de Ahorro" isSubmitting={submitting}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            Nombre de la Meta *
          </label>
          <Input
            type="text"
            placeholder="Ej: Fondo de Emergencia, Vacaciones..."
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
              Monto Objetivo (COP) *
            </label>
            <Input
              type="number"
              min="1"
              step="1000"
              placeholder="Ej: 3000000"
              value={montoObjetivo}
              onChange={(e) => setMontoObjetivo(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
              Ahorro Inicial (Opcional)
            </label>
            <Input
              type="number"
              min="0"
              step="1000"
              placeholder="0"
              value={montoActual}
              onChange={(e) => setMontoActual(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                Fecha Límite (Opcional)
              </label>
              <Input
                type="date"
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
              />
            </div>

        </div>


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
            {submitting ? "Creando..." : "Crear Meta"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
