import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "../auth/AuthLayout";
import { TransactionsApi } from "@/api/Transactions";
import type {
  EmailTransactionConfirmation,
  EmailTransactionConfirmationResult,
} from "@/types/Transaction";
import { formatCurrency, formatDate } from "@/utils/Formatters";
import { Button } from "@/components/ui/Button";

export const TransactionConfirmationPage: React.FC = () => {
  const [token] = useState(
    () => new URLSearchParams(window.location.search).get("token") ?? "",
  );
  const [confirmation, setConfirmation] =
    useState<EmailTransactionConfirmation | null>(null);
  const [result, setResult] =
    useState<EmailTransactionConfirmationResult | null>(null);
  const [message, setMessage] = useState(
    token ? "Cargando los detalles del movimiento..." : "El enlace no es válido.",
  );
  const [isLoading, setIsLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;
    let active = true;
    TransactionsApi.getEmailConfirmation(token)
      .then((data) => {
        if (active) {
          setConfirmation(data);
          setMessage("");
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los detalles del movimiento.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const respond = async (decision: "FUI_YO" | "NO_FUI_YO") => {
    setIsLoading(true);
    setMessage("");
    try {
      const response = await TransactionsApi.resolveEmailConfirmation(
        token,
        decision,
      );
      setResult(response);
      setConfirmation((current) =>
        current ? { ...current, estado: response.estado, puede_responder: false } : current,
      );
      setMessage(
        decision === "FUI_YO"
          ? "El gasto fue confirmado y el saldo de la cuenta fue actualizado."
          : "El gasto fue rechazado y se registró una alerta crítica de seguridad.",
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "No se pudo registrar tu respuesta.";
      setMessage(errorMessage);
      try {
        setConfirmation(await TransactionsApi.getEmailConfirmation(token));
      } catch (refreshError) {
        const refreshMessage =
          refreshError instanceof Error
            ? refreshError.message
            : "No se pudo actualizar el estado del movimiento.";
        setMessage(`${errorMessage} ${refreshMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Confirma el movimiento"
      subtitle="Revisar el enlace no confirma ni rechaza el gasto."
    >
      <div className="space-y-4">
        {confirmation && (
          <dl className="space-y-2 rounded-lg border border-border bg-surface p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Monto</dt>
              <dd className="font-semibold">{formatCurrency(confirmation.monto)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Comercio</dt>
              <dd className="text-right">
                {confirmation.comercio ||
                  confirmation.descripcion ||
                  "Gasto automático"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Cuenta</dt>
              <dd>{confirmation.nombre_cuenta ?? "Cuenta vinculada"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Fecha</dt>
              <dd>{formatDate(confirmation.fecha_transaccion)}</dd>
            </div>
          </dl>
        )}

        {message && (
          <p
            role={result?.decision === "NO_FUI_YO" ? "alert" : "status"}
            className="text-center text-sm text-text-secondary"
          >
            {message}
          </p>
        )}

        {confirmation?.puede_responder && !result && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              onClick={() => void respond("FUI_YO")}
              disabled={isLoading}
            >
              Sí, fui yo
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void respond("NO_FUI_YO")}
              disabled={isLoading}
            >
              No fui yo
            </Button>
          </div>
        )}

        {!confirmation?.puede_responder && (
          <Link
            to="/login"
            className="block text-center text-sm font-semibold text-primary"
          >
            Ir al inicio de sesión
          </Link>
        )}
      </div>
    </AuthLayout>
  );
};
