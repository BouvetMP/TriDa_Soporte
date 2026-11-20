import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthApi } from "./Auth";
import { AccountsApi } from "./Accounts";
import { DashboardApi } from "./Dashboard";
import { DevicesApi } from "./Devices";
import { ProfileApi } from "./Profile";

const clientMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("./Client", () => ({
  apiClient: {
    get: clientMocks.get,
    post: clientMocks.post,
    patch: clientMocks.patch,
    delete: clientMocks.delete,
  },
}));

describe("API clients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns backend data for message, delete, and status mutations", async () => {
    const message = { message: "Operación completada" };
    clientMocks.post.mockResolvedValue({ data: { data: message } });

    await expect(
      AuthApi.verifyEmail({ token: "verification-token" }),
    ).resolves.toEqual(message);
    await expect(
      AuthApi.changePassword({
        password_actual: "ClaveActual1",
        password_nueva: "ClaveNueva2",
      }),
    ).resolves.toEqual(message);
    await expect(
      AuthApi.forgotPassword({ email: "ana@example.com" }),
    ).resolves.toEqual(message);
    await expect(
      AuthApi.resetPassword({
        token: "reset-token",
        password_nueva: "ClaveNueva2",
      }),
    ).resolves.toEqual(message);
    await expect(
      ProfileApi.changePassword({
        password_actual: "ClaveActual1",
        password_nueva: "ClaveNueva2",
      }),
    ).resolves.toEqual(message);

    clientMocks.delete
      .mockResolvedValueOnce({ data: { data: { id_cuenta: 3 } } })
      .mockResolvedValueOnce({
        data: {
          data: {
            id_dispositivo: 4,
            id_usuario: 7,
            tipo_dispositivo: "MOBILE",
            identificador_unico: "device-4",
            confiable: false,
            fecha_primer_uso: "2026-11-19T10:00:00.000Z",
            fecha_ultimo_uso: "2026-11-19T10:00:00.000Z",
          },
        },
      });

    await expect(AccountsApi.deleteAccount(3)).resolves.toEqual({
      id_cuenta: 3,
    });
    await expect(DevicesApi.delete(4)).resolves.toMatchObject({
      id_dispositivo: 4,
      identificador_unico: "device-4",
    });

    const adviceRead = {
      id_consejo: 9,
      leido: true,
      fecha_leido: "2026-11-19T10:00:00.000Z",
    };
    clientMocks.patch.mockResolvedValue({ data: { data: adviceRead } });
    await expect(DashboardApi.markAdviceRead(9)).resolves.toEqual(adviceRead);
  });
});
