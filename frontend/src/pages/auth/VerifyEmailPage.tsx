import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { AuthApi } from "@/api/Auth";

export const VerifyEmailPage: React.FC = () => {
  const [token] = useState(
    () =>
      new URLSearchParams(window.location.hash.slice(1)).get("token") ||
      new URLSearchParams(window.location.search).get("token") ||
      "",
  );
  const [status, setStatus] = useState<"verifying" | "verified" | "error">(
    token ? "verifying" : "error",
  );
  const [message, setMessage] = useState(
    token
      ? "Verificando el enlace..."
      : "No se encontró el enlace de verificación.",
  );

  useEffect(() => {
    if (!token) return;

    let active = true;
    AuthApi.verifyEmail({ token })
      .then(() => {
        if (active) {
          setStatus("verified");
          setMessage("Tu correo ha sido verificado. Ya puedes iniciar sesión.");
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setStatus("error");
          setMessage(
            error instanceof Error
              ? error.message
              : "El enlace de verificación es inválido o expiró.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <AuthLayout
      title="Verificación de correo"
      subtitle="Confirma el correo asociado a tu cuenta de TriDa"
    >
      <div className="space-y-4 text-center">
        <p
          role="status"
          className={
            status === "error"
              ? "text-sm text-expense"
              : "text-sm text-text-secondary"
          }
        >
          {message}
        </p>
        <Link
          to="/login"
          aria-disabled={status === "verifying"}
          className="block w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast"
        >
          Ir al inicio de sesión
        </Link>
      </div>
    </AuthLayout>
  );
};
