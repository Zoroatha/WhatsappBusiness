import express from "express";
import config from "./config/env.js";
import webhookRoutes from "./routes/webhookRoutes.js";

const app = express();

// Configurar middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Usar las rutas del webhook
app.use("/webhook", webhookRoutes);

// Ruta de salud/estado
app.get("/", (req, res) => {
  res.json({
    status: "running",
    service: "MedPet WhatsApp Bot",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Ruta adicional de health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    timestamp: new Date().toISOString(),
  });
});

// Manejo de rutas no encontradas
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Manejo mejorado de errores no capturados
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
  console.error("Stack:", err.stack);

  // Dar tiempo para que se procesen logs antes de salir
  setTimeout(() => {
    console.error("Exiting due to uncaught exception...");
    process.exit(1);
  }, 1000);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);

  // No salir inmediatamente para evitar SIGTERM, solo loggear
  console.error("Application will continue running, but this should be fixed");
});

// Manejo de señales de terminación
process.on("SIGTERM", () => {
  console.log("📴 SIGTERM signal received: closing HTTP server");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("📴 SIGINT signal received: closing HTTP server");
  process.exit(0);
});

// Heartbeat mejorado (menos frecuente para evitar spam)
const heartbeatInterval = setInterval(() => {
  console.log(`💚 Bot is alive... [${new Date().toISOString()}]`);
}, 60000); // cada 60 segundos en lugar de 15

// Limpiar interval al salir
process.on("exit", () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
});

console.log("🚀 Environment config loaded:", {
  PORT: config.PORT,
  NODE_ENV: process.env.NODE_ENV || "development",
  hasWebhookToken: !!config.WEBHOOK_VERIFY_TOKEN,
  hasAccessToken: !!config.ACCESS_TOKEN,
});

console.log("✅ Webhook routes initialized");

const PORT = process.env.PORT || config.PORT || 3000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Server is listening on port: ${PORT}`);
  console.log(`🔗 Webhook URL: https://your-domain.railway.app/webhook`);
  console.log(`💚 Health check: https://your-domain.railway.app/health`);
});

// Configurar timeout del servidor
server.timeout = 30000; // 30 segundos

export default app;
