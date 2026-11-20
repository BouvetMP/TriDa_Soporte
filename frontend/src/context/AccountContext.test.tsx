import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Account } from "@/types/Account";
import { useAccount } from "@/hooks/useAccount";
import { AccountProvider } from "./AccountContext";

const mocks = vi.hoisted(() => ({
  getAccounts: vi.fn(),
}));

vi.mock("@/api/Accounts", () => ({
  AccountsApi: { getAccounts: mocks.getAccounts },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

const wrapper = ({ children }: PropsWithChildren) =>
  createElement(AccountProvider, null, children);

afterEach(cleanup);

describe("AccountContext", () => {
  beforeEach(() => {
    mocks.getAccounts.mockReset();
  });

  it("returns to all accounts when the selected account disappears on refresh", async () => {
    const activeAccount: Account = {
      id_cuenta: 7,
      id_usuario: 1,
      nombre: "Cuenta activa",
      tipo: "BANCO",
      color: "#123456",
      saldo_inicial: 100,
      saldo_actual: 100,
      estado: true,
      fecha_creacion: "2026-01-01T00:00:00.000Z",
    };
    mocks.getAccounts
      .mockResolvedValueOnce([activeAccount])
      .mockResolvedValueOnce([]);

    const { result } = renderHook(() => useAccount(), { wrapper });
    await waitFor(() => {
      expect(result.current.accounts).toEqual([activeAccount]);
    });

    act(() => {
      result.current.setSelectedAccountId(activeAccount.id_cuenta);
    });
    expect(result.current.selectedAccountId).toBe(activeAccount.id_cuenta);

    await act(async () => {
      await result.current.refreshAccounts();
    });

    await waitFor(() => {
      expect(result.current.selectedAccountId).toBeNull();
      expect(result.current.selectedAccount).toBeNull();
    });
  });
});
