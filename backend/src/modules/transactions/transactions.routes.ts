// ¿Qué? Definición de rutas Express para el módulo de transacciones.
// ¿Para qué? Exponer endpoints protegidos por autenticación JWT y rate limiting.

import { Router } from "express";
import { transactionsController } from "./transactions.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

// Todas las rutas de transacciones requieren autenticación
router.use(requireAuth);

router.get("/", transactionsController.list);
router.get("/counts-by-level", transactionsController.countsByLevel);
router.get("/:id", transactionsController.getById);
router.post("/", transactionsController.create);
router.patch("/:id/status", transactionsController.changeStatus);
router.delete("/:id", transactionsController.delete);

export default router;
