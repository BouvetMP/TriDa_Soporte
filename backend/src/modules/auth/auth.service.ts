import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { config } from "../../config.js";
import { prisma } from "../../db/prisma.js";
import {
  createPasswordResetToken,
  getUnverifiedPasswordResetUserId,
  verifyPasswordResetToken,
} from "./reset-token.js";
import { isEmailConfigured, sendEmail } from "../../utils/mailer.js";
import type { ChangePasswordInput, RegisterInput, UpdateProfileInput } from "./auth.schemas.js";

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

const JWT_SECRET = config.JWT_SECRET;
const JWT_EXPIRES_IN = config.JWT_EXPIRES_IN;
const PASSWORD_RESET_MESSAGE = "Si el correo está registrado, recibirás instrucciones";

const userProfileSelect = {
  id_usuario: true,
  email: true,
  nombre_completo: true,
  telefono: true,
  rol: true,
  estado: true,
  fecha_registro: true,
} as const;

export class AuthService {
  async register(data: RegisterInput) {
    const existingUser = await prisma.usuario.findUnique({
      where: { email: data.email },
      select: { id_usuario: true },
    });

    if (existingUser) {
      throw new AuthError("El correo electrónico ya está registrado", 400);
    }

    const password_hash = await bcrypt.hash(data.password, 10);
    const user = await prisma.usuario.create({
      data: {
        email: data.email,
        password_hash,
        nombre_completo: data.nombre_completo,
        telefono: data.telefono,
        rol: "USER",
        estado: true,
      },
      select: userProfileSelect,
    });

    return {
      id_usuario: user.id_usuario,
      email: user.email,
      nombre_completo: user.nombre_completo,
    };
  }

  async login(email: string, password: string) {
    const user = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AuthError("Credenciales inválidas", 401);
    }

    if (!user.estado) {
      throw new AuthError("La cuenta se encuentra inactiva o suspendida", 403);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AuthError("Credenciales inválidas", 401);
    }

    const signOptions: SignOptions = {
      expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
    };
    const token = jwt.sign(
      {
        id_usuario: user.id_usuario,
        email: user.email,
        rol: user.rol,
      },
      JWT_SECRET,
      signOptions,
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

  async forgotPassword(email: string) {
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

    try {
      if (!isEmailConfigured()) {
        throw new Error("La configuración SMTP está incompleta");
      }

      const escapedResetUrl = resetUrl.toString().replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      await sendEmail(
        user.email,
        "Restablecer contraseña",
        `<p>Solicitaste restablecer tu contraseña.</p><p><a href="${escapedResetUrl}">Restablecer contraseña</a></p><p>El enlace vence en 20 minutos y solo puede utilizarse una vez.</p>`,
      );
    } catch (error) {
      console.error("No se pudo enviar el correo de recuperación de contraseña", {
        error: error instanceof Error ? error.message : "Error desconocido",
      });
      if (config.NODE_ENV === "development") {
        console.info(`[DEV] Enlace de recuperación: ${resetUrl.toString()}`);
      }
    }

    return { message: PASSWORD_RESET_MESSAGE };
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

    const password_hash = await bcrypt.hash(password_nueva, 10);
    const result = await prisma.usuario.updateMany({
      where: {
        id_usuario: user.id_usuario,
        password_hash: user.password_hash,
      },
      data: { password_hash },
    });

    if (result.count !== 1) {
      throw new AuthError("Token inválido, expirado o ya utilizado", 401);
    }

    return { message: "Contraseña actualizada exitosamente" };
  }

  async getMe(userId: number) {
    const user = await prisma.usuario.findUnique({
      where: { id_usuario: userId },
      select: userProfileSelect,
    });

    if (!user) {
      throw new AuthError("Usuario no encontrado", 404);
    }

    return user;
  }

  async updateProfile(userId: number, data: UpdateProfileInput) {
    return prisma.usuario.update({
      where: { id_usuario: userId },
      data: {
        nombre_completo: data.nombre_completo,
        telefono: data.telefono,
      },
      select: userProfileSelect,
    });
  }

  async changePassword(userId: number, data: ChangePasswordInput) {
    const user = await prisma.usuario.findUnique({
      where: { id_usuario: userId },
      select: { password_hash: true },
    });

    if (!user) {
      throw new AuthError("Usuario no encontrado", 404);
    }

    const isCurrentPasswordValid = await bcrypt.compare(data.password_actual, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new AuthError("La contraseña actual es incorrecta", 400);
    }

    const password_hash = await bcrypt.hash(data.password_nueva, 10);
    await prisma.usuario.update({
      where: { id_usuario: userId },
      data: { password_hash },
    });

    return { message: "Contraseña cambiada exitosamente" };
  }
}

export const authService = new AuthService();
