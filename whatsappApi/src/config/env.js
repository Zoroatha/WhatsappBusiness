import dotenv from "dotenv";

dotenv.config();

const config = {
  PORT: process.env.PORT || 3000,
  WEBHOOK_VERIFY_TOKEN: process.env.WEBHOOK_VERIFY_TOKEN,

  // ✅ CORREGIDO: Usar una sola variable consistente
  ACCESS_TOKEN: process.env.API_TOKEN, // Solo usar API_TOKEN del .env
  PHONE_NUMBER_ID: process.env.BUSINESS_PHONE, // Solo usar BUSINESS_PHONE del .env

  // APIs externas
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,

  // WhatsApp API config
  API_VERSION: process.env.API_VERSION || "v22.0",
  BASE_URL: process.env.BASE_URL || "https://graph.facebook.com/v22.0",

  // Google Services configuration
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
  GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
};

// ✅ MEJORADO: Verificación más robusta de variables
const criticalVars = [
  {
    name: "WEBHOOK_VERIFY_TOKEN",
    value: config.WEBHOOK_VERIFY_TOKEN,
    required: true,
  },
  { name: "ACCESS_TOKEN", value: config.ACCESS_TOKEN, required: true },
  { name: "PHONE_NUMBER_ID", value: config.PHONE_NUMBER_ID, required: true },
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

console.log("🔧 =".repeat(50));
console.log("🔧 ENVIRONMENT CONFIGURATION CHECK");
console.log("🔧 =".repeat(50));

// Verificar variables críticas
let hasErrors = false;
for (const { name, value, required } of criticalVars) {
  if (!value && required) {
    console.error(`❌ CRITICAL ERROR: Missing required variable: ${name}`);
    hasErrors = true;
  } else if (value) {
    console.log(`✅ ${name}: configured`);
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
  `🤖 AI Assistant: ${config.OPENROUTER_API_KEY ? "✅ READY" : "⚠️ DISABLED"}`
);
console.log(
  `📊 Google Sheets: ${hasGoogleCredentials ? "✅ READY" : "⚠️ DISABLED"}`
);
console.log(
  `📅 Google Calendar: ${
    hasGoogleCredentials && config.GOOGLE_CALENDAR_ID
      ? "✅ READY"
      : "⚠️ DISABLED"
  }`
);

console.log("\n📊 Environment Details:", {
  PORT: config.PORT,
  API_VERSION: config.API_VERSION,
  BASE_URL: config.BASE_URL,
  hasWebhookToken: !!config.WEBHOOK_VERIFY_TOKEN,
  hasAccessToken: !!config.ACCESS_TOKEN,
  hasPhoneNumberId: !!config.PHONE_NUMBER_ID,
  hasOpenRouterKey: !!config.OPENROUTER_API_KEY,
  hasGoogleCredentials,
  hasCalendarId: !!config.GOOGLE_CALENDAR_ID,
});

// ✅ Fallar si faltan variables críticas
if (hasErrors) {
  console.error("\n❌ STARTUP FAILED: Missing critical environment variables");
  console.error(
    "Please check your .env file and ensure all required variables are set"
  );
  process.exit(1);
}

console.log("🔧 =".repeat(50));
console.log("✅ Environment configuration loaded successfully!");
console.log("🔧 =".repeat(50));

export default config;
