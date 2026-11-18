// ¿Qué? Limitadores de tasa de peticiones HTTP (Rate Limiting) por dirección IP.
// ¿Para qué? Mitigar ataques de fuerza bruta en autenticación y abuso/DDoS en la API.
// ¿Impacto? Cumple con la regla de seguridad RS-006.

import rateLimit from "express-rate-limit";
import { sendError } from "../utils/apiResponse.js";

/** Limitador estricto para endpoints sensibles de autenticación (login, registro, cambio de contraseña) */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Máximo 10 intentos por ventana de 15 min
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(
      res,
      "Demasiados intentos desde esta IP. Por favor intente de nuevo en 15 minutos.",
      429,
    );
  },
});

/** Limitador general para las rutas de la API */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 150, // Máximo 150 peticiones por minuto
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, "Límite de peticiones superado. Por favor ralentice sus solicitudes.", 429);
  },
});
