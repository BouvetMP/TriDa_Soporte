import { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../../utils/apiResponse.js";
import { transactionsService } from "./transactions.service.js";
import { parseId } from "../../utils/params.js";
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  updateTransactionStatusSchema,
} from "./transactions.schemas.js";

export class TransactionsController {
  async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id_usuario;
      const queryObj = listTransactionsQuerySchema.parse(req.query);

      const result = await transactionsService.list(userId, queryObj);

      sendSuccess(res, {
        items: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTransactionById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id_usuario;
      const transactionId = parseId(req.params.id);

      const transaction = await transactionsService.getById(userId, transactionId);

      sendSuccess(res, transaction);
    } catch (error) {
      next(error);
    }
  }

  async getCountsByLevel(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id_usuario;
      const counts = await transactionsService.countsByLevel(userId);

      sendSuccess(res, counts);
    } catch (error) {
      next(error);
    }
  }

  async createTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id_usuario;
      const data = createTransactionSchema.parse(req.body);
      const created = await transactionsService.create(userId, data);

      sendSuccess(
        res,
        {
          transaction: created.transaction,
          evaluation: created.evaluation,
          alert: created.alert,
        },
        "Transacción registrada exitosamente",
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id_usuario;
      const transactionId = parseId(req.params.id);

      await transactionsService.delete(userId, transactionId);
      sendSuccess(res, { id_transaccion: transactionId }, "Transacción eliminada exitosamente");
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id_usuario;
      const transactionId = parseId(req.params.id);
      const { estado } = updateTransactionStatusSchema.parse(req.body);
      const updated = await transactionsService.updateStatus(userId, transactionId, estado);

      sendSuccess(res, updated, "Estado de transacción actualizado exitosamente");
    } catch (error) {
      next(error);
    }
  }

  // Alias para mantener compatibilidad con cualquier variante de nombre en rutas
  list = this.getTransactions.bind(this);
  getById = this.getTransactionById.bind(this);
  countsByLevel = this.getCountsByLevel.bind(this);
  create = this.createTransaction.bind(this);
  delete = this.deleteTransaction.bind(this);
  changeStatus = this.updateStatus.bind(this);
}

export const transactionsController = new TransactionsController();
