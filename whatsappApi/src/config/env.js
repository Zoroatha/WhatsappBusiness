// config/env.js
import dotenv from "dotenv";
dotenv.config();

export default {
  // WhatsApp API
  WEBHOOK_VERIFY_TOKEN: process.env.WEBHOOK_VERIFY_TOKEN,
  API_TOKEN: process.env.API_TOKEN,
  PORT: process.env.PORT || 3000,
  BUSINESS_PHONE: process.env.BUSINESS_PHONE,
  API_VERSION: process.env.API_VERSION,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  BASE_URL: process.env.BASE_URL,

  // Google API (agregar estas líneas)
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
};
