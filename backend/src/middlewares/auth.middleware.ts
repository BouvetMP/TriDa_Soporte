// ¿Qué? Middleware de autenticación y autorización por roles.
// ¿Para qué? Interceptar peticiones en rutas protegidas, verificar el JWT y validar el estado del usuario en la BD.
// ¿Impacto? Garantiza la seguridad de las rutas y cumple con RS-001 y RS-002.

import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma.js";
import { verifyToken, JwtPayload } from "../utils/jwt.js";
import { sendError } from "../utils/apiResponse.js";
import { PASSWORD_RESET_PURPOSE } from "../modules/auth/reset-token.js";

/**
 * Middleware principal: Verifica el JWT y confirma que el usuario existe y está activo.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      sendError(res, "Token no proporcionado.", 401);
      return;
    }

    const token = authHeader.split(" ")[1];

    // 1. Verificar firma y expiración del JWT
    const decoded = verifyToken<JwtPayload & { purpose?: string }>(token);

    if (!decoded || !decoded.id_usuario || decoded.purpose === PASSWORD_RESET_PURPOSE) {
      sendError(res, "Token inválido o mal formado.", 401);
      return;
    }

    // 2. Validar existencia y estado activo en la BD (Prisma model: Usuario)
    const usuario = await prisma.usuario.findUnique({
      where: { id_usuario: decoded.id_usuario },
      select: {
        id_usuario: true,
        email: true,
        rol: true,
        nombre_completo: true,
        estado: true,
      },
    });

    if (!usuario) {
      sendError(res, "Usuario no encontrado en la base de datos.", 401);
      return;
    }

    if (!usuario.estado) {
      sendError(res, "Cuenta de usuario desactivada.", 403);
      return;
    }

    // 3. Adjuntar usuario al Request (RS-002: el id viene del JWT verificado)
    req.user = {
      id_usuario: usuario.id_usuario,
      email: usuario.email,
      rol: usuario.rol,
    };

    next();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error de autenticación";
    sendError(res, "Token inválido o expirado.", 401, message);
  }
};

/**
 * Middleware de roles: Restringe el acceso si se requiere un rol específico (ej. 'ADMIN').
 */
export const requireRoles = (rolesPermitidos: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, "Acceso denegado: No autenticado.", 401);
      return;
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      sendError(res, "Permisos insuficientes para esta acción.", 403);
      return;
    }

    next();
  };
};
