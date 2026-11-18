/**
 * ¿Qué? Pantalla principal (Dashboard) unificada.
 * ¿Para qué? Muestra el perfil del usuario y las estadísticas que expone la API.
 */
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useDashboard } from "@/hooks/useDashboard";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { MetricsCards } from "@/components/dashboard/MetricsCards";
import {
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  User as UserIcon,
  Mail,
  Shield,
  LayoutDashboard,
} from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const { data, isLoading } = useDashboard();

  return (
    <div className="min-h-screen bg-background p-6 space-y-6 max-w-6xl mx-auto">
      {/* Topbar (Mantiene la estructura original) */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              TriDa v2 Dashboard
            </h1>
            <p className="text-xs text-text-muted">
              Finanzas personales & Seguridad
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={toggleTheme}>
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={logout}
            icon={<LogOut className="w-4 h-4" />}
          >
            Cerrar sesión
          </Button>
        </div>
      </div>

      {/* Banner de bienvenida */}
      <Card className="bg-gradient-to-r from-primary/10 via-surface to-surface border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-primary">
            ¡Hola, {user?.nombre_completo}!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-secondary">
            Has iniciado sesión correctamente. Tu conexión con TriDa v2 está
            100% segura.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-hover border border-border">
              <UserIcon className="w-5 h-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-text-muted">
                  Nombre
                </p>
                <p className="text-xs font-semibold text-text-primary truncate">
                  {user?.nombre_completo}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-hover border border-border">
              <Mail className="w-5 h-5 text-income shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-text-muted">
                  Email
                </p>
                <p className="text-xs font-semibold text-text-primary truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-hover border border-border">
              <Shield className="w-5 h-5 text-saving shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-text-muted">
                  Rol
                </p>
                <p className="text-xs font-semibold text-text-primary">
                  {user?.rol}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="pt-4">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            Resumen Financiero
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Mostrando el consolidado de tus cuentas y el resumen del mes actual.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Spinner size="lg" className="text-primary" />
          </div>
        ) : !data ? (
          <div className="text-center py-12 bg-surface border border-border rounded-xl text-sm text-text-muted shadow-sm">
            No se pudieron cargar los datos del resumen financiero.
          </div>
        ) : (
          <div className="space-y-6">
            <MetricsCards metrics={data} />
            <Card className="border-dashed">
              <CardContent className="py-6 text-sm text-text-muted">
                El desglose por categoría y las recomendaciones se habilitarán
                en sus secciones de Reportes y Asesor IA.
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
