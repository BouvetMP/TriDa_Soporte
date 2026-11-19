import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCategories } from "./useCategories";

const mocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("@/api/Categories", () => ({
  CategoriesApi: {
    getAll: mocks.getAll,
  },
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));

type CategoriesResponse = {
  success: true;
  data: Array<{ id_categoria: number; nombre: string }>;
};

afterEach(() => {
  cleanup();
});

describe("useCategories", () => {
  beforeEach(() => {
    mocks.getAll.mockReset();
    mocks.showToast.mockReset();
  });

  it("keeps the newest result when category requests finish out of order", async () => {
    const resolvers: Array<(response: CategoriesResponse) => void> = [];
    mocks.getAll.mockImplementation(
      () =>
        new Promise<CategoriesResponse>((resolve) => {
          resolvers.push(resolve);
        }),
    );

    const { result } = renderHook(() => useCategories());
    await waitFor(() => {
      expect(resolvers).toHaveLength(1);
    });

    act(() => {
      void result.current.refreshCategories();
    });
    await waitFor(() => {
      expect(resolvers).toHaveLength(2);
    });

    await act(async () => {
      resolvers[1]({
        success: true,
        data: [{ id_categoria: 2, nombre: "Nueva" }],
      });
    });
    await waitFor(() => {
      expect(result.current.categories[0]?.nombre).toBe("Nueva");
    });

    await act(async () => {
      resolvers[0]({
        success: true,
        data: [{ id_categoria: 1, nombre: "Antigua" }],
      });
    });

    expect(result.current.categories[0]?.nombre).toBe("Nueva");
  });
});
