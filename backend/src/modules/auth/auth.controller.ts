// ¿Qué? Controlador HTTP para el módulo de autenticación.
// ¿Para qué? Validar datos de entrada con Zod y delegar la ejecución a authService.
// ¿Impacto? Capa HTTP limpia y estandarizada con respuestas unificadas.

import { Request, Response, NextFunction } from "express";
import { authService, AuthError } from "./auth.service.js";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
  verifyResetTokenSchema,
} from "./auth.schemas.js";
import { sendSuccess, sendError } from "../../utils/apiResponse.js";

const handleError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof AuthError) {
    sendError(res, error.message, error.statusCode);
    return;
  }
  next(error);
};

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = loginSchema.parse(req.body);
      const result = await authService.login(data.email, data.password);
      sendSuccess(res, result, "Inicio de sesión exitoso");
    } catch (error) {
      handleError(error, res, next);
    }
  },

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = registerSchema.parse(req.body);
      const result = await authService.register(data);
      sendSuccess(res, result, "Registro completado con éxito", 201);
    } catch (error) {
      handleError(error, res, next);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = forgotPasswordSchema.parse(req.body);
      const result = await authService.forgotPassword(data.email);
      sendSuccess(res, result);
    } catch (error) {
      handleError(error, res, next);
    }
  },

  async verifyResetToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = verifyResetTokenSchema.parse(req.body);
      const result = await authService.verifyResetToken(token);
      if (!result.valid) {
        sendError(res, result.error || "Token inválido", 401);
        return;
      }
      sendSuccess(res, result);
    } catch (error) {
      handleError(error, res, next);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = resetPasswordSchema.parse(req.body);
      const result = await authService.resetPassword(data.token, data.password_nueva);
      sendSuccess(res, result);
    } catch (error) {
      handleError(error, res, next);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.getMe(req.user!.id_usuario);
      sendSuccess(res, result);
    } catch (error) {
      handleError(error, res, next);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateProfileSchema.parse(req.body);
      const result = await authService.updateProfile(req.user!.id_usuario, data);
      sendSuccess(res, result);
    } catch (error) {
      handleError(error, res, next);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = changePasswordSchema.parse(req.body);
      const result = await authService.changePassword(req.user!.id_usuario, data);
      sendSuccess(res, result);
    } catch (error) {
      handleError(error, res, next);
    }
  },
};
