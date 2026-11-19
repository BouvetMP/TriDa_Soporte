import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAlerts } from "./useAlerts";

const mocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  getPendingCount: vi.fn(),
  updateStatus: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("@/api/Alerts", () => ({
  AlertsApi: {
    getAll: mocks.getAll,
    getPendingCount: mocks.getPendingCount,
    updateStatus: mocks.updateStatus,
  },
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));

type PendingCountResponse = {
  success: true;
  data: { count: number };
};

afterEach(() => {
  cleanup();
});

describe("useAlerts", () => {
  beforeEach(() => {
    mocks.getAll.mockReset();
    mocks.getAll.mockResolvedValue({
      success: true,
      data: { items: [], pagination: { total: 0, limit: 15, offset: 0 } },
    });
    mocks.getPendingCount.mockReset();
    mocks.updateStatus.mockReset();
    mocks.showToast.mockReset();
  });

  it("ignores an older pending-count response after a newer request", async () => {
    const pendingCountResolvers: Array<
      (response: PendingCountResponse) => void
    > = [];
    mocks.getPendingCount.mockImplementation(
      () =>
        new Promise<PendingCountResponse>((resolve) => {
          pendingCountResolvers.push(resolve);
        }),
    );
    mocks.updateStatus.mockResolvedValue({ success: true, data: {} });

    const { result } = renderHook(() => useAlerts());
    await waitFor(() => {
      expect(pendingCountResolvers).toHaveLength(1);
    });

    await act(async () => {
      await result.current.resolveAlert(1, "FUI_YO");
    });
    await waitFor(() => {
      expect(pendingCountResolvers).toHaveLength(2);
    });

    await act(async () => {
      pendingCountResolvers[1]({ success: true, data: { count: 2 } });
    });
    await waitFor(() => {
      expect(result.current.pendingCount).toBe(2);
    });

    await act(async () => {
      pendingCountResolvers[0]({ success: true, data: { count: 1 } });
    });
    expect(result.current.pendingCount).toBe(2);
  });
});
