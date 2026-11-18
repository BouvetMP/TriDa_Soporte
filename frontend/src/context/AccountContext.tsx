/**
 * ¿Qué? Contexto global de selección de cuenta financiera.
 * ¿Para qué? Permitir que todas las vistas filtren por "Todas las cuentas" (null) o por una cuenta en específico.
 */
import React, { createContext, useState, useEffect, useCallback } from "react";
import { AccountsApi } from "@/api/Accounts";
import { Account } from "@/types";
import { useAuth } from "@/hooks/useAuth";

export interface AccountContextType {
  accounts: Account[];
  selectedAccountId: number | null; // null = Todas las cuentas
  selectedAccount: Account | null;
  isLoading: boolean;
  setSelectedAccountId: (id: number | null) => void;
  refreshAccounts: () => Promise<void>;
  totalBalance: number;
}

export const AccountContext = createContext<AccountContextType | undefined>(
  undefined,
);

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshAccounts = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const data = await AccountsApi.getAccounts();
      setAccounts(data);
    } catch (error) {
      console.error("Error al cargar cuentas en contexto:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setAccounts([]);
      setSelectedAccountId(null);
      return;
    }
    refreshAccounts();
  }, [isAuthenticated, refreshAccounts]);

  const selectedAccount =
    selectedAccountId !== null
      ? accounts.find((a) => a.id_cuenta === selectedAccountId) || null
      : null;

  // Suma de saldo_inicial de todas las cuentas activas
  const totalBalance = accounts
    .filter((a) => a.estado)
    .reduce((sum, account) => sum + Number(account.saldo_inicial || 0), 0);

  return (
    <AccountContext.Provider
      value={{
        accounts,
        selectedAccountId,
        selectedAccount,
        isLoading,
        setSelectedAccountId,
        refreshAccounts,
        totalBalance,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};
