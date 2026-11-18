import React, { useState } from "react";
import { ChangePasswordPayload } from "@/types/Auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { KeyRound, ShieldCheck, Check, X } from "lucide-react";

interface ChangePasswordFormProps {
  onSubmit: (payload: ChangePasswordPayload) => Promise<boolean>;
  isLoading: boolean;
}

export const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({
  onSubmit,
  isLoading,
}) => {
  const [passwordActual, setPasswordActual] = useState<string>("");
  const [passwordNueva, setPasswordNueva] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Validaciones en tiempo real (mínimo 10 caracteres, 1 mayúscula, 1 minúscula, 1 número)
  const isMinLength = passwordNueva.length >= 10;
  const hasUpper = /[A-Z]/.test(passwordNueva);
  const hasLower = /[a-z]/.test(passwordNueva);
  const hasNumber = /[0-9]/.test(passwordNueva);
  const matchesConfirm =
    passwordNueva.length > 0 && passwordNueva === confirmPassword;

  const isPasswordValid = isMinLength && hasUpper && hasLower && hasNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      setError(
        "La nueva contraseña no cumple con las políticas de seguridad requeridas.",
      );
      return;
    }

    if (!matchesConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setError("");
    const success = await onSubmit({
      password_actual: passwordActual,
      password_nueva: passwordNueva,
    });

    if (success) {
      setPasswordActual("");
      setPasswordNueva("");
      setConfirmPassword("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl p-6 shadow-sm space-y-4"
    >
      <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] pb-3 mb-2">
        <KeyRound className="w-5 h-5 text-[var(--color-primary-500)]" />
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
          Cambiar Contraseña
        </h3>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">
          {error}
        </div>
      )}

      <Input
        label="Contraseña Actual"
        type="password"
        placeholder="••••••••••"
        value={passwordActual}
        onChange={(e) => setPasswordActual(e.target.value)}
        required
      />

      <Input
        label="Nueva Contraseña"
        type="password"
        placeholder="••••••••••"
        value={passwordNueva}
        onChange={(e) => setPasswordNueva(e.target.value)}
        required
      />

      {/* Reglas de seguridad */}
      <div className="p-3 rounded-lg bg-[var(--color-bg-surface-hover)] border border-[var(--color-border-subtle)] space-y-1.5 text-xs">
        <span className="font-semibold text-[var(--color-text-subtle)] block mb-1">
          Requisitos de la nueva contraseña:
        </span>
        <div className="flex items-center gap-2">
          {isMinLength ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <X className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          )}
          <span
            className={
              isMinLength
                ? "text-emerald-500"
                : "text-[var(--color-text-subtle)]"
            }
          >
            Mínimo 10 caracteres
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasUpper ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <X className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          )}
          <span
            className={
              hasUpper ? "text-emerald-500" : "text-[var(--color-text-subtle)]"
            }
          >
            Al menos una letra mayúscula
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasLower ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <X className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          )}
          <span
            className={
              hasLower ? "text-emerald-500" : "text-[var(--color-text-subtle)]"
            }
          >
            Al menos una letra minúscula
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasNumber ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <X className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          )}
          <span
            className={
              hasNumber ? "text-emerald-500" : "text-[var(--color-text-subtle)]"
            }
          >
            Al menos un número
          </span>
        </div>
      </div>

      <Input
        label="Confirmar Nueva Contraseña"
        type="password"
        placeholder="••••••••••"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={!isPasswordValid || !matchesConfirm}
          className="flex items-center gap-2"
        >
          <ShieldCheck className="w-4 h-4" />
          Actualizar Contraseña
        </Button>
      </div>
    </form>
  );
};
