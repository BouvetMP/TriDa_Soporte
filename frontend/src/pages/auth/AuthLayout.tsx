/**
 * ¿Qué? Layout para las pantallas de inicio de sesión y registro.
 * ¿Para qué? Presentar el branding de TriDa con diseño limpio sin hardcoded HEX colors (RC-004).
 */
import React from "react";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  children,
}) => {
  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-background px-4 py-8 relative overflow-hidden">
      {/* Elementos decorativos sutiles de fondo (orbes de luz sin HEX hardcodeados) */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-saving/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Header de Marca TriDa */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              TriDa v2
            </h1>
            <p className="text-xs font-medium text-text-secondary mt-0.5">
              Asesor Financiero & Protección Inteligente
            </p>
          </div>
        </div>

        {/* Tarjeta contenedora principal */}
        <Card className="p-6 sm:p-8 backdrop-blur-md bg-surface/90 shadow-2xl border-border">
          <div className="mb-6 space-y-1">
            <h2 className="text-xl font-bold text-text-primary">{title}</h2>
            <p className="text-xs text-text-muted">{subtitle}</p>
          </div>

          {children}
        </Card>

        {/* Footer legal estandarizado */}
        <p className="text-center text-[11px] text-text-muted">
          Administra tus finanzas con herramientas de análisis · TriDa ©{" "}
          {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};
