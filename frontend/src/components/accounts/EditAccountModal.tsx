import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Account, UpdateAccountPayload, AccountType } from "@/types";
import { useToast } from "@/components/ui/Toast";

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  onSubmit: (id_cuenta: number, payload: UpdateAccountPayload) => Promise<void>;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  isOpen,
  onClose,
  account,
  onSubmit,
}) => {
  const { showToast } = useToast();

  const [nombre, setNombre] = useState("");
  const [entidad, setEntidad] = useState("");
  const [tipo, setTipo] = useState<AccountType>("BANCO");
  const [numeroEnmascarado, setNumeroEnmascarado] = useState("");
  const [color, setColor] = useState("#6366F1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setNombre(account.nombre);
      setEntidad(account.entidad || "");
      setTipo(account.tipo);
      setNumeroEnmascarado(account.numero_enmascarado || "");
      setColor(account.color || "#6366F1");
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    if (!nombre.trim()) {
      showToast({
        type: "error",
        title: "Campo requerido",
        message: "El nombre de la cuenta no puede estar vacío.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(account.id_cuenta, {
        nombre: nombre.trim(),
        entidad: entidad.trim() || undefined,
        tipo,
        numero_enmascarado: numeroEnmascarado.trim() || undefined,
        color,
      });

      showToast({
        type: "success",
        title: "Cuenta actualizada",
        message: `Los cambios en "${nombre}" se han guardado.`,
      });
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al actualizar la cuenta.";
      showToast({
        type: "error",
        title: "Error",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isSubmitting={isSubmitting}
      title="Editar Cuenta"
      description="Modifica los detalles de tu fuente de fondos"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre de la cuenta"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Tipo de cuenta"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as AccountType)}
            options={[
              { value: "BANCO", label: "Cuenta Bancaria" },
              { value: "TARJETA", label: "Tarjeta de Crédito / Débito" },
              { value: "BILLETERA", label: "Billetera Digital" },
              { value: "EFECTIVO", label: "Efectivo" },
            ]}
          />

          <Input
            label="Entidad Financiera"
            value={entidad}
            onChange={(e) => setEntidad(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Últimos 4 dígitos"
            maxLength={4}
            value={numeroEnmascarado}
            onChange={(e) => setNumeroEnmascarado(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold tracking-wide text-text-secondary uppercase mb-1.5">
            Color distintivo
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setColor(e.target.value)
              }
              className="h-9 w-12 rounded-lg bg-surface border border-border cursor-pointer"
            />
            <span className="text-xs font-mono text-text-muted">{color}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Actualizar cambios
          </Button>
        </div>
      </form>
    </Modal>
  );
};
