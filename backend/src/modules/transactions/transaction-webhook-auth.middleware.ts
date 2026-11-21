import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "../../config.js";
import { AppError } from "../../utils/AppError.js";

export const requireTransactionWebhookSecret = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const expectedSecret = config.TRANSACTION_WEBHOOK_SECRET;
  if (expectedSecret.length < 32) {
    return next(
      new AppError(
        "La clave del webhook de transacciones no está configurada",
        503,
        "WEBHOOK_NOT_CONFIGURED",
      ),
    );
  }

  const receivedSecret = req.get("x-trida-webhook-secret") ?? "";
  const expected = Buffer.from(expectedSecret);
  const received = Buffer.from(receivedSecret);
  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return next(
      new AppError("Credenciales del webhook inválidas", 401, "INVALID_WEBHOOK_SECRET"),
    );
  }
  return next();
};
