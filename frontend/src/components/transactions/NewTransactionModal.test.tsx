import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewTransactionModal } from "./NewTransactionModal";

vi.mock("@/hooks/useAccount", () => ({
  useAccount: () => ({ accounts: [], selectedAccount: null }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

describe("NewTransactionModal", () => {
  it("clears validation errors when reopened", async () => {
    const props = {
      onClose: vi.fn(),
      categories: [],
      onSubmit: vi.fn().mockResolvedValue(true),
    };
    const { rerender } = render(
      <NewTransactionModal {...props} isOpen />,
    );

    fireEvent.change(screen.getByRole("spinbutton", { name: "Monto (COP)" }), {
      target: { value: "25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar Transacción" }));

    const validationMessage =
      "Debes seleccionar una cuenta para registrar la transacción.";
    expect(await screen.findByText(validationMessage)).toBeTruthy();

    rerender(<NewTransactionModal {...props} isOpen={false} />);
    rerender(<NewTransactionModal {...props} isOpen />);

    await waitFor(() => {
      expect(screen.queryByText(validationMessage)).toBeNull();
    });
  });
});
