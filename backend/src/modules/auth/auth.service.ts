import bcrypt from "bcryptjs";
import { config } from "../../config.js";
import { prisma } from "../../db/prisma.js";
import { signToken } from "../../utils/jwt.js";
import {
  createPasswordResetToken,
  getUnverifiedPasswordResetUserId,
  verifyPasswordResetToken,
} from "./reset-token.js";
import {
  createEmailVerificationToken,
  getUnverifiedEmailVerificationUserId,
  verifyEmailVerificationToken,
} from "./email-verification.js";
import { isEmailConfigured, sendEmail } from "../../utils/mailer.js";
import { AppError } from "../../utils/AppError.js";
import { logger } from "../../utils/logger.js";
import { comparePassword, hashPassword } from "../../utils/password.js";
import type { ChangePasswordInput, RegisterInput } from "./auth.schemas.js";

export class AuthError extends AppError {
  constructor(message: string, statusCode = 400, code = "AUTH_ERROR") {
    super(message, statusCode, code);
  }
}

const JWT_SECRET = config.JWT_SECRET;
const JWT_EXPIRES_IN = config.JWT_EXPIRES_IN;
const PASSWORD_RESET_MESSAGE = "Si el correo está registrado, recibirás instrucciones";
const VERIFICATION_REGISTRATION_MESSAGE =
  "Si el correo puede registrarse, recibirás un enlace de verificación";
const REGISTRATION_WITHOUT_EMAIL_MESSAGE =
  "Si el correo puede registrarse, ya puedes intentar iniciar sesión";
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("trida-login-timing-placeholder", 12);

const userProfileSelect = {
  id_usuario: true,
  email: true,
  nombre_completo: true,
  telefono: true,
  pais: true,
  ciudad: true,
  rol: true,
  estado: true,
  fecha_registro: true,
  ultimo_acceso: true,
} as const;

export class AuthService {
  async register(data: RegisterInput) {
    if (config.SMTP_ENABLED && !isEmailConfigured()) {
      throw new AuthError(
        "El registro no está disponible porque falta configurar el envío de correo",
        503,
      );
    }

    const existingUser = await prisma.usuario.findUnique({
      where: { email: data.email },
      select: { id_usuario: true, email: true, email_verificado_en: true },
    });

    if (existingUser) {
      if (config.SMTP_ENABLED && !existingUser.email_verificado_en) {
        await this.sendVerificationEmail(existingUser.id_usuario, existingUser.email);
      }
      return this.getRegistrationResponse();
    }

    const password_hash = await hashPassword(data.password);
    const user = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.usuario.create({
        data: {
          email: data.email,
          password_hash,
          nombre_completo: data.nombre_completo,
          telefono: data.telefono,
          rol: "USER",
          estado: true,
          email_verificado_en: config.SMTP_ENABLED ? null : new Date(),
        },
        select: userProfileSelect,
      });

      await transaction.perfil_financiero.create({
        data: { id_usuario: createdUser.id_usuario },
      });

      return createdUser;
    });

    if (config.SMTP_ENABLED) {
      await this.sendVerificationEmail(user.id_usuario, user.email);
    }
    return this.getRegistrationResponse();
  }

  private getRegistrationResponse() {
    return {
      message: config.SMTP_ENABLED
        ? VERIFICATION_REGISTRATION_MESSAGE
        : REGISTRATION_WITHOUT_EMAIL_MESSAGE,
      emailVerificationRequired: config.SMTP_ENABLED,
    };
  }

  async login(email: string, password: string) {
    const user = await prisma.usuario.findUnique({
      where: { email },
    });

    const isPasswordValid = await comparePassword(password, user?.password_hash ?? DUMMY_PASSWORD_HASH);
    if (
      !user ||
      !isPasswordValid ||
      !user.estado ||
      (config.SMTP_ENABLED && !user.email_verificado_en)
    ) {
      await prisma.log_auditoria.create({
        data: {
          id_usuario: user?.id_usuario ?? null,
          tipo_accion: "INICIO_SESION_FALLIDO",
          entidad_afectada: "usuarios",
          id_entidad: user?.id_usuario ?? null,
          descripcion: "Intento de inicio de sesión rechazado.",
        },
      });
      throw new AuthError("Credenciales inválidas", 401);
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.usuario.update({
        where: { id_usuario: user.id_usuario },
        data: { ultimo_acceso: new Date() },
      });
      await transaction.log_auditoria.create({
        data: {
          id_usuario: user.id_usuario,
          tipo_accion: "INICIO_SESION_EXITOSO",
          entidad_afectada: "usuarios",
          id_entidad: user.id_usuario,
          descripcion: "Inicio de sesión exitoso.",
        },
      });
    });

    const token = signToken(
      {
        id_usuario: user.id_usuario,
        email: user.email,
        rol: user.rol,
        token_version: user.token_version,
      },
      JWT_EXPIRES_IN,
    );

    return {
      token,
      usuario: {
        id_usuario: user.id_usuario,
        email: user.email,
        nombre_completo: user.nombre_completo,
        rol: user.rol,
      },
    };
  }

  private async sendVerificationEmail(userId: number, email: string) {
    const token = createEmailVerificationToken(userId, email, JWT_SECRET);
    const verificationUrl = new URL("/verify-email", config.FRONTEND_URL);
    verificationUrl.hash = new URLSearchParams({ token }).toString();
    const escapedVerificationUrl = verificationUrl
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;");

    try {
      await sendEmail(
        email,
        "Verifica tu correo de TriDa",
        `<p>Confirma tu correo para activar tu cuenta.</p><p><a href="${escapedVerificationUrl}">Verificar correo</a></p><p>El enlace vence en 24 horas.</p>`,
      );
    } catch (error) {
      logger.error("email.verification_send_failed", error);
      throw new AuthError(
        "No se pudo enviar el correo de verificación. Inténtalo nuevamente.",
        503,
      );
    }
  }

  async verifyEmail(token: string) {
    const userId = getUnverifiedEmailVerificationUserId(token);
    if (userId === null) {
      throw new AuthError("El enlace de verificación es inválido o expiró", 400);
    }

    const user = await prisma.usuario.findUnique({
      where: { id_usuario: userId },
      select: { id_usuario: true, email: true, email_verificado_en: true },
    });

    if (
      !user ||
      !verifyEmailVerificationToken(token, user.id_usuario, user.email, JWT_SECRET)
    ) {
      throw new AuthError("El enlace de verificación es inválido o expiró", 400);
    }

    if (!user.email_verificado_en) {
      await prisma.usuario.updateMany({
        where: {
          id_usuario: user.id_usuario,
          email: user.email,
          email_verificado_en: null,
        },
        data: { email_verificado_en: new Date() },
      });
    }

    return { message: "Correo verificado. Ya puedes iniciar sesión." };
  }

  async forgotPassword(email: string) {
    if (!config.SMTP_ENABLED) {
      throw new AuthError(
        "La recuperación por correo está temporalmente deshabilitada",
        503,
      );
    }
    if (!isEmailConfigured()) {
      throw new AuthError(
        "La recuperación por correo no está disponible porque falta configurar el envío de correo",
        503,
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { email },
      select: { id_usuario: true, email: true, password_hash: true },
    });

    if (!user) {
      return { message: PASSWORD_RESET_MESSAGE };
    }

    const resetToken = createPasswordResetToken(user.id_usuario, user.password_hash, JWT_SECRET);
    const resetUrl = new URL("/reset-password", config.FRONTEND_URL);
    resetUrl.hash = new URLSearchParams({ token: resetToken }).toString();
    void this.sendPasswordResetEmail(user.email, resetUrl).catch((error: unknown) => {
      logger.error("email.password_reset_send_failed", error);
    });

    return { message: PASSWORD_RESET_MESSAGE };
  }

  private async sendPasswordResetEmail(email: string, resetUrl: URL) {
    if (!isEmailConfigured()) {
      throw new Error("La configuración SMTP está incompleta");
    }

    const escapedResetUrl = resetUrl.toString().replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    await sendEmail(
      email,
      "Restablecer contraseña",
      `<p>Solicitaste restablecer tu contraseña.</p><p><a href="${escapedResetUrl}">Restablecer contraseña</a></p><p>El enlace vence en 20 minutos y solo puede utilizarse una vez.</p>`,
    );
  }

  private async getPasswordResetUser(token: string) {
    const userId = getUnverifiedPasswordResetUserId(token);
    if (userId === null) {
      return null;
    }

    const user = await prisma.usuario.findUnique({
      where: { id_usuario: userId },
      select: { id_usuario: true, password_hash: true },
    });

    if (
      !user ||
      !verifyPasswordResetToken(token, user.id_usuario, user.password_hash, JWT_SECRET)
    ) {
      return null;
    }

    return user;
  }

  async verifyResetToken(token: string): Promise<{ valid: boolean; error?: string }> {
    const user = await this.getPasswordResetUser(token);
    if (!user) {
      return { valid: false, error: "Token inválido, expirado o ya utilizado" };
    }

    return { valid: true };
  }

  async resetPassword(token: string, password_nueva: string) {
    const user = await this.getPasswordResetUser(token);
    if (!user) {
      throw new AuthError("Token inválido, expirado o ya utilizado", 401);
    }

    const password_hash = await hashPassword(password_nueva);
    const result = await prisma.usuario.updateMany({
      where: {
        id_usuario: user.id_usuario,
        password_hash: user.password_hash,
      },
      data: { password_hash, token_version: { increment: 1 } },
    });

    if (result.count !== 1) {
      throw new AuthError("Token inválido, expirado o ya utilizado", 401);
    }

    return { message: "Contraseña actualizada exitosamente" };
  }

  async changePassword(userId: number, data: ChangePasswordInput) {
    const user = await prisma.usuario.findUnique({
      where: { id_usuario: userId },
      select: { password_hash: true },
    });

    if (!user) {
      throw new AuthError("Usuario no encontrado", 404);
    }

    const isCurrentPasswordValid = await comparePassword(data.password_actual, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new AuthError("La contraseña actual es incorrecta", 400);
    }

    const password_hash = await hashPassword(data.password_nueva);
    await prisma.usuario.update({
      where: { id_usuario: userId },
      data: { password_hash, token_version: { increment: 1 } },
    });

    return { message: "Contraseña cambiada exitosamente" };
  }
}

export const authService = new AuthService();
