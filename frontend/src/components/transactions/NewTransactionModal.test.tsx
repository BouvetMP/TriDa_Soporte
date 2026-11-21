import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewTransactionModal } from "./NewTransactionModal";

vi.mock("@/hooks/useAccount", () => ({
  useAccount: () => ({
    accounts: [
      {
        id_cuenta: 1,
        nombre: "Cuenta de efectivo",
        tipo: "EFECTIVO",
        estado: true,
      },
    ],
    selectedAccount: null,
  }),
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
    const { rerender } = render(<NewTransactionModal {...props} isOpen />);

    fireEvent.change(screen.getByRole("spinbutton", { name: "Monto (COP)" }), {
      target: { value: "25" },
    });
    fireEvent.change(screen.getByLabelText("Cuenta"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Fecha y hora de la transacción"), {
      target: { value: "2999-01-01T10:00" },
    });
    const form = screen
      .getByRole("button", { name: "Guardar Transacción" })
      .closest("form");
    if (!form) throw new Error("No se encontró el formulario de transacción");
    fireEvent.submit(form);

    const validationMessage =
      "La fecha de efectivo no puede estar vacía ni ser futura.";
    expect(await screen.findByText(validationMessage)).toBeTruthy();

    rerender(<NewTransactionModal {...props} isOpen={false} />);
    rerender(<NewTransactionModal {...props} isOpen />);

    await waitFor(() => {
      expect(screen.queryByText(validationMessage)).toBeNull();
    });
  });
});
