import dotenv from "dotenv";

dotenv.config();

const config = {
  PORT: process.env.PORT || 3000,
  WEBHOOK_VERIFY_TOKEN:
    process.env.WEBHOOK_VERIFY_TOKEN || process.env.VERIFY_TOKEN,
  ACCESS_TOKEN: process.env.ACCESS_TOKEN,
  PHONE_NUMBER_ID: process.env.PHONE_NUMBER_ID,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  // Agregar otras variables que necesites
};

// Verificar variables críticas
const requiredVars = ["WEBHOOK_VERIFY_TOKEN", "ACCESS_TOKEN"];
for (const varName of requiredVars) {
  if (!config[varName]) {
    console.error(
      `❌ ERROR: Missing required environment variable: ${varName}`
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
  hasOpenAIKey: !!config.OPENAI_API_KEY,
});

export default config;
