import { Request, Response, NextFunction } from "express";
import { sendError, sendSuccess } from "../../utils/apiResponse.js";
import { accountService, AccountError } from "./accounts.service.js";
import { createAccountSchema, updateAccountSchema } from "./accounts.schemas.js";

function handleAccountError(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof AccountError) {
    return sendError(res, error.message, error.statusCode);
  }
  return next(error);
}

export class AccountsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id_usuario;
      const accounts = await accountService.list(userId);

      sendSuccess(res, accounts);
    } catch (error) {
      handleAccountError(error, res, next);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id_usuario;
      const accountId = Number(req.params.id);
      const account = await accountService.getById(userId, accountId);

      sendSuccess(res, account);
    } catch (error) {
      handleAccountError(error, res, next);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id_usuario;
      const data = createAccountSchema.parse(req.body);
      const created = await accountService.create(userId, data);

      sendSuccess(res, created, "Cuenta creada exitosamente", 201);
    } catch (error) {
      handleAccountError(error, res, next);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id_usuario;
      const accountId = Number(req.params.id);
      const data = updateAccountSchema.parse(req.body);
      const updated = await accountService.update(userId, accountId, data);

      sendSuccess(res, updated, "Cuenta actualizada exitosamente");
    } catch (error) {
      handleAccountError(error, res, next);
    }
  }

  async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id_usuario;
      const accountId = Number(req.params.id);
      const result = await accountService.deactivate(userId, accountId);

      sendSuccess(res, result, "Cuenta desactivada exitosamente");
    } catch (error) {
      handleAccountError(error, res, next);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id_usuario;
      const accountId = Number(req.params.id);
      await accountService.delete(userId, accountId);

      sendSuccess(res, { id_cuenta: accountId }, "Cuenta eliminada exitosamente");
    } catch (error) {
      handleAccountError(error, res, next);
    }
  }
}

export const accountsController = new AccountsController();
export const accountController = accountsController;
