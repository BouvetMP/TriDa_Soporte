// ¿Qué? Punto de entrada del servidor backend de TriDa v2.
// ¿Para qué? Inicializar la app Express, conectar Prisma y escuchar en el puerto configurado.

import app from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db/prisma.js";

async function bootstrap() {
  try {
    // Verificar conexión a PostgreSQL
    await prisma.$connect();
    console.log("✅ Conexión a PostgreSQL establecida");

    const port = config.PORT || 3000;

    app.listen(port, () => {
      console.log(`🚀 TriDa Backend v2 escuchando en http://localhost:${port}`);
      console.log(`📌 Healthcheck: http://localhost:${port}/health`);
      console.log(`📌 API base:    http://localhost:${port}/api/v2`);
      console.log(`📚 Swagger:     http://localhost:${port}/api/docs`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error);
    process.exit(1);
  }
}

// Cierre limpio
async function shutdown(signal: string) {
  console.log(`\n${signal} recibido. Cerrando servidor...`);
  try {
    await prisma.$disconnect();
    console.log("Conexión a Prisma cerrada");
    process.exit(0);
  } catch (error) {
    console.error("Error durante el cierre:", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

bootstrap();
