import { prisma } from "../../db/prisma.js";
import type { CreateAccountInput, UpdateAccountInput } from "./accounts.schemas.js";

type AccountRecord = NonNullable<Awaited<ReturnType<typeof prisma.cuenta.findFirst>>>;

function formatAccount(account: AccountRecord) {
  return {
    ...account,
    saldo_inicial: Number(account.saldo_inicial),
  };
}

export class AccountError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "AccountError";
    this.statusCode = statusCode;
  }
}

export class AccountsService {
  async getAccounts(userId: number) {
    const accounts = await prisma.cuenta.findMany({
      where: { id_usuario: userId },
    });
    return accounts.map(formatAccount);
  }

  async list(userId: number) {
    return this.getAccounts(userId);
  }

  async getAccountById(userId: number, accountId: number) {
    const account = await prisma.cuenta.findFirst({
      where: {
        id_cuenta: accountId,
        id_usuario: userId,
      },
    });

    if (!account) {
      throw new AccountError("Cuenta bancaria no encontrada", 404);
    }

    return formatAccount(account);
  }

  async getById(userId: number, accountId: number) {
    return this.getAccountById(userId, accountId);
  }

  async createAccount(userId: number, data: CreateAccountInput) {
    const account = await prisma.cuenta.create({
      data: {
        id_usuario: userId,
        nombre: data.nombre,
        entidad: data.entidad,
        tipo: data.tipo,
        numero_enmascarado: data.numero_enmascarado,
        color: data.color,
        saldo_inicial: data.saldo_inicial,
        estado: data.estado,
      },
    });
    return formatAccount(account);
  }

  async create(userId: number, data: CreateAccountInput) {
    return this.createAccount(userId, data);
  }

  async updateAccount(userId: number, accountId: number, data: UpdateAccountInput) {
    await this.getAccountById(userId, accountId);

    const account = await prisma.cuenta.update({
      where: { id_cuenta: accountId },
      data,
    });
    return formatAccount(account);
  }

  async update(userId: number, accountId: number, data: UpdateAccountInput) {
    return this.updateAccount(userId, accountId, data);
  }

  async deleteAccount(userId: number, accountId: number) {
    await this.getAccountById(userId, accountId);

    return prisma.cuenta.delete({
      where: { id_cuenta: accountId },
    });
  }

  async delete(userId: number, accountId: number) {
    return this.deleteAccount(userId, accountId);
  }

  async deactivate(userId: number, accountId: number) {
    await this.getAccountById(userId, accountId);

    const account = await prisma.cuenta.update({
      where: { id_cuenta: accountId },
      data: { estado: false },
    });

    return {
      id_cuenta: account.id_cuenta,
      nombre: account.nombre,
      estado: account.estado,
    };
  }
}

export const accountsService = new AccountsService();
export const accountService = accountsService;
