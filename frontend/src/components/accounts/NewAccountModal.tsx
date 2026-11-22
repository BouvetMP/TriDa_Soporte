import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { CreateAccountPayload, AccountType } from "@/types";
import { useToast } from "@/components/ui/Toast";

interface NewAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAccountPayload) => Promise<void>;
}

export const NewAccountModal: React.FC<NewAccountModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { showToast } = useToast();

  const [nombre, setNombre] = useState("");
  const [entidad, setEntidad] = useState("");
  const [tipo, setTipo] = useState<AccountType>("BANCO");
  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [saldoInicial, setSaldoInicial] = useState<string>("0");
  const [color, setColor] = useState("#8B5CF6");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setNombre("");
    setEntidad("");
    setTipo("BANCO");
    setNumeroCuenta("");
    setSaldoInicial("0");
    setColor("#8B5CF6");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      showToast({
        type: "error",
        title: "Campo requerido",
        message: "Por favor asigna un nombre a la cuenta.",
      });
      return;
    }

    const accountNumberDigits = numeroCuenta.replace(/\D/g, "");
    if (tipo !== "EFECTIVO" && !entidad.trim()) {
      showToast({
        type: "error",
        title: "Entidad requerida",
        message: "Indica el banco o la entidad financiera de la cuenta.",
      });
      return;
    }
    if (tipo !== "EFECTIVO" && accountNumberDigits.length < 4) {
      showToast({
        type: "error",
        title: "Número de cuenta requerido",
        message: "Ingresa el número completo de la cuenta.",
      });
      return;
    }

    const parsedSaldo = parseFloat(saldoInicial);
    if (isNaN(parsedSaldo) || parsedSaldo < 0) {
      showToast({
        type: "error",
        title: "Saldo inválido",
        message: "El saldo inicial debe ser un número igual o mayor a 0.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        nombre: nombre.trim(),
        entidad: tipo === "EFECTIVO" ? undefined : entidad.trim(),
        tipo,
        numero_enmascarado:
          tipo === "EFECTIVO"
            ? undefined
            : accountNumberDigits.slice(-4),
        saldo_inicial: parsedSaldo,
        color,
      });

      showToast({
        type: "success",
        title: "Cuenta creada",
        message: `La cuenta "${nombre}" ha sido agregada con éxito.`,
      });

      handleClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al crear la cuenta.";
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
      onClose={handleClose}
      isSubmitting={isSubmitting}
      title="Agregar Nueva Cuenta"
      description="Registra un banco, tarjeta, billetera digital o dinero en efectivo"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre de la cuenta"
          placeholder="Ej: Bancolombia Ahorros, Nequi, Tarjeta Visa"
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
              {
                value: "BILLETERA",
                label: "Billetera Digital (Nequi/Daviplata)",
              },
              { value: "EFECTIVO", label: "Efectivo en mano" },
            ]}
          />

          <Input
            label={`Entidad Financiera${tipo === "EFECTIVO" ? " (Opcional)" : " *"}`}
            placeholder="Ej: Bancolombia, Davivienda, Nu"
            value={entidad}
            onChange={(e) => setEntidad(e.target.value)}
            required={tipo !== "EFECTIVO"}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Saldo Inicial (COP)"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            value={saldoInicial}
            onChange={(e) => setSaldoInicial(e.target.value)}
            required
          />

          {tipo !== "EFECTIVO" && (
            <div>
              <Input
                label="Número completo de cuenta *"
                placeholder="Escribe el número completo"
                inputMode="numeric"
                autoComplete="off"
                value={numeroCuenta}
                onChange={(e) => setNumeroCuenta(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-text-muted">
                Por seguridad, solo guardamos y mostramos los últimos 4 dígitos.
              </p>
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="new-account-color"
            className="block text-xs font-semibold tracking-wide text-text-secondary uppercase mb-1.5"
          >
            Color distintivo
          </label>
          <div className="flex items-center gap-2">
            <input
              id="new-account-color"
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
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Guardar cuenta
          </Button>
        </div>
      </form>
    </Modal>
  );
};
