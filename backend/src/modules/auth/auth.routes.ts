// ¿Qué? Rutas del módulo de autenticación (Auth).
// ¿Para qué? Mapear los endpoints de login, registro público, perfil y restablecimiento de contraseña.
// ¿Impacto? Expone la API de autenticación en inglés (RL-001) protegida con rate limiters y JWT.

import { Router } from "express";
import { authController } from "./auth.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { authRateLimiter } from "../../middlewares/rateLimit.middleware.js";

const router = Router();

// ── Rutas Públicas ───────────────────────────────────────────
router.post("/login", authRateLimiter, authController.login);
router.post("/register", authRateLimiter, authController.register);
router.post("/forgot-password", authRateLimiter, authController.forgotPassword);
router.post("/verify-reset-token", authRateLimiter, authController.verifyResetToken);
router.post("/reset-password", authRateLimiter, authController.resetPassword);

// ── Rutas Protegidas (Requieren Token JWT) ───────────────────
router.get("/me", requireAuth, authController.me);
router.patch("/me", requireAuth, authController.updateProfile);
router.post("/change-password", requireAuth, authController.changePassword);

export const authRoutes = router;
export default router;
