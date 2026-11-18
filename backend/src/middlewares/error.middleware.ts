// ¿Qué? Manejador global de errores.
// ¿Para qué? Capturar excepciones del sistema, validaciones (Zod) y errores de Prisma (DB) antes de enviarlas al cliente.
// ¿Impacto? Cumple con RS-007 impidiendo filtrado de detalles técnicos sensibles y estandariza respuestas de error.

import { Request, Response, NextFunction } from "express";
import { ZodError, ZodIssue } from "zod";
import { sendError } from "../utils/apiResponse.js";

type PrismaKnownRequestErrorLike = {
  name: "PrismaClientKnownRequestError";
  code: string;
  clientVersion: string;
};

export const isPrismaKnownRequestError = (err: unknown): err is PrismaKnownRequestErrorLike =>
  typeof err === "object" &&
  err !== null &&
  "name" in err &&
  err.name === "PrismaClientKnownRequestError" &&
  "code" in err &&
  typeof err.code === "string" &&
  "clientVersion" in err &&
  typeof err.clientVersion === "string";

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // 1. Manejo de Errores de Validación (Zod)
  if (err instanceof ZodError) {
    const formattedDetails = err.issues.map((issue: ZodIssue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    sendError(res, "Error de validación de datos", 400, formattedDetails, "VALIDATION_ERROR");
    return;
  }

  // 2. Manejo de Errores de Prisma (Base de Datos)
  if (isPrismaKnownRequestError(err)) {
    let message = "Error de procesamiento en la base de datos.";
    let statusCode = 400;
    let code = "DATABASE_ERROR";

    // P2002: Violación de restricción única (ej. email duplicado, categoría duplicada)
    if (err.code === "P2002") {
      message = "Conflicto de datos: El registro ya existe.";
      statusCode = 409;
      code = "UNIQUE_CONSTRAINT";
    }
    // P2003: Violación de clave foránea (ej. categoría o cuenta inexistente)
    else if (err.code === "P2003") {
      message = "Relación inválida: El recurso asociado no existe.";
      code = "INVALID_REFERENCE";
    }
    // P2025: Registro no encontrado para actualizar/eliminar
    else if (err.code === "P2025") {
      message = "El recurso solicitado no fue encontrado.";
      statusCode = 404;
      code = "NOT_FOUND";
    }

    sendError(res, message, statusCode, { prisma_code: err.code }, code);
    return;
  }

  // 3. Manejo de Errores Genéricos del Sistema (RS-007)
  console.error(`💥 [ERROR UNHANDLED] ${req.method} ${req.originalUrl}:`, err);

  const errorObj = err instanceof Error ? err : new Error("Error desconocido");
  const statusCode = (errorObj as { statusCode?: number }).statusCode || 500;

  const clientMessage =
    statusCode === 500 ? "Ocurrió un error interno en el servidor." : errorObj.message;

  sendError(res, clientMessage, statusCode);
};
