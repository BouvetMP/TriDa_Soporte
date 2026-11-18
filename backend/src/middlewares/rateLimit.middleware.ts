// ¿Qué? Limitadores de tasa de peticiones HTTP (Rate Limiting) por dirección IP.
// ¿Para qué? Mitigar ataques de fuerza bruta en autenticación y abuso/DDoS en la API.
// ¿Impacto? Cumple con la regla de seguridad RS-006.

import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { sendError } from "../utils/apiResponse.js";

const authLimitHandler = (_req: import("express").Request, res: import("express").Response) => {
  sendError(res, "Demasiados intentos. Por favor, inténtalo más tarde.", 429);
};

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip ?? "")}:${String(req.body?.email ?? "").trim().toLowerCase()}`,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: authLimitHandler,
});

export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: authLimitHandler,
});

export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: authLimitHandler,
});

export const verifyResetTokenRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: authLimitHandler,
});

export const authMutationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: authLimitHandler,
});

/** Limitador general para las rutas de la API */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  limit: 150, // Máximo 150 peticiones por minuto
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, "Límite de peticiones superado. Por favor ralentice sus solicitudes.", 429);
  },
});
