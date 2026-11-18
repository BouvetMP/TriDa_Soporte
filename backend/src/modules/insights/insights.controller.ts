// ¿Qué? Controlador HTTP de insights financieros.
// ¿Para qué? Exponer el análisis de patrones y consejos del usuario autenticado.

import { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../../utils/apiResponse.js";
import { insightsService } from "./insights.service.js";
import { insightsQuerySchema } from "./insights.schemas.js";

export const insightsController = {
  async getInsights(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id_usuario;
      const { periodo_dias } = insightsQuerySchema.parse(req.query);
      const data = await insightsService.getInsights(userId, periodo_dias);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  },
};
