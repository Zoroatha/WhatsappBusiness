import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

const config = {
  PORT: process.env.PORT || 3000,
  WEBHOOK_VERIFY_TOKEN: process.env.WEBHOOK_VERIFY_TOKEN,

  // WhatsApp API Configuration
  ACCESS_TOKEN: process.env.API_TOKEN || process.env.ACCESS_TOKEN,
  PHONE_NUMBER_ID: process.env.BUSINESS_PHONE || process.env.PHONE_NUMBER_ID,

  // APIs externas
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,

  // WhatsApp API config con valores por defecto más robustos
  API_VERSION: process.env.API_VERSION || "v22.0",
  BASE_URL:
    process.env.BASE_URL ||
    `https://graph.facebook.com/${process.env.API_VERSION || "v22.0"}`,

  // Google Services configuration
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
  GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
};

// Función para verificar variables críticas de forma segura
function checkEnvironment() {
  console.log("🔧 " + "=".repeat(50));
  console.log("🔧 ENVIRONMENT CONFIGURATION CHECK");
  console.log("🔧 " + "=".repeat(50));

  const criticalVars = [
    {
      name: "WEBHOOK_VERIFY_TOKEN",
      value: config.WEBHOOK_VERIFY_TOKEN,
      required: true,
    },
    {
      name: "ACCESS_TOKEN",
      value: config.ACCESS_TOKEN,
      required: true,
      hint: "Check API_TOKEN or ACCESS_TOKEN in .env",
    },
    {
      name: "PHONE_NUMBER_ID",
      value: config.PHONE_NUMBER_ID,
      required: true,
      hint: "Check BUSINESS_PHONE or PHONE_NUMBER_ID in .env",
    },
  ];

  const optionalVars = [
    {
      name: "OPENROUTER_API_KEY",
      value: config.OPENROUTER_API_KEY,
      service: "AI Assistant",
    },
    {
      name: "GOOGLE_SERVICE_ACCOUNT_EMAIL",
      value: config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      service: "Google Sheets/Calendar",
    },
    {
      name: "GOOGLE_PRIVATE_KEY",
      value: config.GOOGLE_PRIVATE_KEY,
      service: "Google Sheets/Calendar",
    },
    {
      name: "GOOGLE_CALENDAR_ID",
      value: config.GOOGLE_CALENDAR_ID,
      service: "Google Calendar",
    },
  ];

  // Verificar variables críticas
  let hasErrors = false;
  console.log("📋 Critical Variables:");

  for (const { name, value, required, hint } of criticalVars) {
    if (!value && required) {
      console.error(`❌ MISSING: ${name}${hint ? ` (${hint})` : ""}`);
      hasErrors = true;
    } else if (value) {
      // Mostrar solo primeros y últimos caracteres por seguridad
      const maskedValue =
        typeof value === "string" && value.length > 10
          ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
          : "configured";
      console.log(`✅ ${name}: ${maskedValue}`);
    }
  }

  // Verificar variables opcionales
  console.log("\n📋 Optional Services:");
  for (const { name, value, service } of optionalVars) {
    if (!value) {
      console.warn(`⚠️  ${service}: DISABLED (${name} not configured)`);
    } else {
      console.log(`✅ ${service}: ENABLED`);
    }
  }

  // Verificar Google Services completo
  const hasGoogleCredentials = !!(
    config.GOOGLE_SERVICE_ACCOUNT_EMAIL && config.GOOGLE_PRIVATE_KEY
  );

  console.log("\n🌐 Service Status Summary:");
  console.log(
    `📱 WhatsApp API: ${
      config.ACCESS_TOKEN && config.PHONE_NUMBER_ID
        ? "✅ READY"
        : "❌ NOT CONFIGURED"
    }`
  );
  console.log(
    `🤖 AI Assistant: ${
      config.OPENROUTER_API_KEY ? "✅ READY" : "⚠️  DISABLED"
    }`
  );
  console.log(
    `📊 Google Sheets: ${hasGoogleCredentials ? "✅ READY" : "⚠️  DISABLED"}`
  );
  console.log(
    `📅 Google Calendar: ${
      hasGoogleCredentials && config.GOOGLE_CALENDAR_ID
        ? "✅ READY"
        : "⚠️  DISABLED"
    }`
  );

  console.log("\n📊 Runtime Environment:", {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: config.PORT,
    API_VERSION: config.API_VERSION,
    BASE_URL: config.BASE_URL?.substring(0, 50) + "...",
    hasWebhookToken: !!config.WEBHOOK_VERIFY_TOKEN,
    hasAccessToken: !!config.ACCESS_TOKEN,
    hasPhoneNumberId: !!config.PHONE_NUMBER_ID,
    hasOpenRouterKey: !!config.OPENROUTER_API_KEY,
    hasGoogleCredentials,
    hasCalendarId: !!config.GOOGLE_CALENDAR_ID,
  });

  console.log("🔧 " + "=".repeat(50));

  // Solo advertir sobre variables críticas faltantes, no salir
  if (hasErrors) {
    console.warn(
      "⚠️  WARNING: Some critical environment variables are missing"
    );
    console.warn("Bot will start but some features may not work correctly");
    console.warn("Please check your environment variables configuration");
  } else {
    console.log("✅ Environment configuration validated successfully!");
  }

  console.log("🔧 " + "=".repeat(50));

  return !hasErrors;
}

// Ejecutar verificación de entorno de forma segura
try {
  checkEnvironment();
} catch (error) {
  console.error("❌ Error checking environment:", error.message);
  console.warn("⚠️  Continuing with available configuration...");
}

export default config;
