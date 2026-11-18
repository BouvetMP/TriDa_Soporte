import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@components/ui/Select";
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
  const [numeroEnmascarado, setNumeroEnmascarado] = useState("");
  const [saldoInicial, setSaldoInicial] = useState<string>("0");
  const [color, setColor] = useState("#6366F1");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        entidad: entidad.trim() || undefined,
        tipo,
        numero_enmascarado: numeroEnmascarado.trim() || undefined,
        saldo_inicial: parsedSaldo,
        color,
      });

      showToast({
        type: "success",
        title: "Cuenta creada",
        message: `La cuenta "${nombre}" ha sido agregada con éxito.`,
      });

      setNombre("");
      setEntidad("");
      setTipo("BANCO");
      setNumeroEnmascarado("");
      setSaldoInicial("0");
      onClose();
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
      onClose={onClose}
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
            label="Entidad Financiera (Opcional)"
            placeholder="Ej: Bancolombia, Davivienda, Nu"
            value={entidad}
            onChange={(e) => setEntidad(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Saldo Inicial (COP)"
            type="number"
            min="0"
            step="1000"
            placeholder="0"
            value={saldoInicial}
            onChange={(e) => setSaldoInicial(e.target.value)}
            required
          />

          <Input
            label="Últimos 4 dígitos (Opcional)"
            placeholder="Ej: 4321"
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
            Guardar cuenta
          </Button>
        </div>
      </form>
    </Modal>
  );
};
