// ¿Qué? Rutas del módulo de insights.
// ¿Para qué? Exponer el endpoint de análisis financiero protegido por JWT.

import { Router } from "express";
import { insightsController } from "./insights.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", insightsController.getInsights);

export default router;
