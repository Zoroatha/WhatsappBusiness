import dotenv from "dotenv";

dotenv.config();

const config = {
  PORT: process.env.PORT || 3000,
  WEBHOOK_VERIFY_TOKEN:
    process.env.WEBHOOK_VERIFY_TOKEN || process.env.VERIFY_TOKEN,
  ACCESS_TOKEN: process.env.API_TOKEN || process.env.ACCESS_TOKEN, // ✅ Corregido para usar API_TOKEN
  PHONE_NUMBER_ID: process.env.BUSINESS_PHONE || process.env.PHONE_NUMBER_ID, // ✅ Agregado BUSINESS_PHONE
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY, // ✅ Agregado
  API_VERSION: process.env.API_VERSION || "v22.0", // ✅ Agregado
  BASE_URL: process.env.BASE_URL || "https://graph.facebook.com/v22.0", // ✅ Agregado

  // Google Calendar configuration
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
  GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
};

// Verificar variables críticas
const requiredVars = ["WEBHOOK_VERIFY_TOKEN"];
const optionalVars = ["ACCESS_TOKEN", "PHONE_NUMBER_ID", "OPENROUTER_API_KEY"];

for (const varName of requiredVars) {
  if (!config[varName]) {
    console.error(
      `❌ ERROR: Missing required environment variable: ${varName}`
    );
  } else {
    console.log(`✅ ${varName}: configured`);
  }
}

for (const varName of optionalVars) {
  if (!config[varName]) {
    console.warn(
      `⚠️ WARNING: Missing optional environment variable: ${varName}`
    );
  } else {
    console.log(`✅ ${varName}: configured`);
  }
}

console.log("📊 Environment loaded:", {
  PORT: config.PORT,
  hasWebhookToken: !!config.WEBHOOK_VERIFY_TOKEN,
  hasAccessToken: !!config.ACCESS_TOKEN,
  hasPhoneNumberId: !!config.PHONE_NUMBER_ID,
  hasOpenRouterKey: !!config.OPENROUTER_API_KEY,
  hasGoogleCredentials: !!(
    config.GOOGLE_SERVICE_ACCOUNT_EMAIL && config.GOOGLE_PRIVATE_KEY
  ),
  apiVersion: config.API_VERSION,
  baseUrl: config.BASE_URL,
});

export default config;
