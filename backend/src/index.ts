// ¿Qué? Punto de entrada del servidor backend de TriDa v2.
// ¿Para qué? Inicializar la app Express, conectar Prisma y escuchar en el puerto configurado.

import type { Server } from "node:http";
import app from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db/prisma.js";

let httpServer: Server | undefined;
let shutdownRequested = false;
let shutdownPromise: Promise<void> | undefined;

async function bootstrap() {
  try {
    // Verificar conexión a PostgreSQL
    await prisma.$connect();
    console.log("✅ Conexión a PostgreSQL establecida");

    if (shutdownRequested) {
      return;
    }

    const port = config.PORT || 3000;

    httpServer = app.listen(port, () => {
      console.log(`🚀 TriDa Backend v2 escuchando en http://localhost:${port}`);
      console.log(`📌 Healthcheck: http://localhost:${port}/health`);
      console.log(`📌 Readiness:  http://localhost:${port}/health/ready`);
      console.log(`📌 API base:    http://localhost:${port}/api/v2`);
      console.log(`📚 Swagger:     http://localhost:${port}/api/docs`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error);
    if (!shutdownRequested) {
      process.exitCode = 1;
    }
  }
}

// Cierre limpio
function shutdown(signal: string): Promise<void> {
  shutdownRequested = true;
  if (shutdownPromise) {
    return shutdownPromise;
  }

  shutdownPromise = (async () => {
    console.log(`\n${signal} recibido. Cerrando servidor...`);
    let failed = false;

    try {
      const server = httpServer;
      if (server?.listening) {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }
    } catch (error) {
      failed = true;
      console.error("Error al cerrar el servidor HTTP:", error);
    }

    try {
      await prisma.$disconnect();
      console.log("Conexión a Prisma cerrada");
    } catch (error) {
      failed = true;
      console.error("Error al cerrar Prisma:", error);
    }

    process.exitCode = failed ? 1 : 0;
  })();

  return shutdownPromise;
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

void bootstrap();
