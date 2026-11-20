import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

function getApiOrigin(apiBaseUrl: string, mode: string): string {
  let apiUrl: URL;
  try {
    apiUrl = new URL(apiBaseUrl);
  } catch {
    throw new Error("VITE_API_BASE_URL debe ser una URL absoluta.");
  }

  if (!["http:", "https:"].includes(apiUrl.protocol)) {
    throw new Error("VITE_API_BASE_URL debe usar HTTP o HTTPS.");
  }

  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(
    apiUrl.hostname,
  );
  if (mode !== "development" && (apiUrl.protocol !== "https:" || isLocalHost)) {
    throw new Error(
      "Los builds que no son de desarrollo requieren una VITE_API_BASE_URL HTTPS pública.",
    );
  }

  return apiUrl.origin;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiBaseUrl =
    process.env.VITE_API_BASE_URL ||
    env.VITE_API_BASE_URL ||
    (mode === "development" ? "http://localhost:3000/api/v2" : "");

  if (!apiBaseUrl) {
    throw new Error("VITE_API_BASE_URL debe definirse para los builds.");
  }

  const apiOrigin = getApiOrigin(apiBaseUrl, mode);
  const connectSources = ["'self'", apiOrigin];
  const scriptSources = ["'self'"];
  if (mode === "development") {
    connectSources.push("http://localhost:*", "http://127.0.0.1:*", "ws:");
    scriptSources.push("'unsafe-inline'");
  }

  const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
    `connect-src ${connectSources.join(" ")}`,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  return {
    plugins: [
      react(),
      {
        name: "trida-content-security-policy",
        transformIndexHtml(html: string) {
          const marker = "__TRIDA_CSP_POLICY__";
          if (!html.includes(marker)) {
            throw new Error("Falta el marcador CSP en frontend/index.html.");
          }
          return html.replace(marker, contentSecurityPolicy);
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      host: true,
    },
  };
});
