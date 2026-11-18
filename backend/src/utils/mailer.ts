// ¿Qué? Servicio para enviar correos transaccionales mediante SMTP configurado.
// ¿Para qué? Centralizar el envío y propagar fallos para que el flujo que lo usa los registre.

import nodemailer from "nodemailer";
import { config } from "../config.js";

export const isEmailConfigured = (): boolean =>
  Boolean(config.SMTP_HOST && config.EMAIL_USER && config.EMAIL_PASS);

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  if (!isEmailConfigured()) {
    throw new Error("La configuración SMTP está incompleta");
  }

  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASS,
    },
  });

  await transport.sendMail({
    from: config.EMAIL_FROM,
    to,
    subject,
    html,
  });
};
