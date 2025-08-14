// controllers/webhookController.js - VERSION CON DEBUG
import messageHandler from "../services/messageHandler.js";
import config from "../config/env.js";

/**
 * ✅ Controlador para verificar el webhook (GET) - CON DEBUG DETALLADO
 */
const verifyWebhook = (req, res) => {
  console.log("🔍 WEBHOOK VERIFICATION DEBUG:");
  console.log("- Query params received:", req.query);
  console.log(
    "- Environment WEBHOOK_VERIFY_TOKEN:",
    config.WEBHOOK_VERIFY_TOKEN ? "SET" : "NOT SET"
  );

  const VERIFY_TOKEN = config.WEBHOOK_VERIFY_TOKEN;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("🔍 Verification details:");
  console.log("- Mode:", mode);
  console.log("- Token from Meta:", token);
  console.log("- Token from ENV:", VERIFY_TOKEN);
  console.log("- Tokens match:", token === VERIFY_TOKEN);
  console.log("- Challenge:", challenge);

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully");
    res.status(200).send(challenge);
  } else {
    console.warn("❌ Webhook verification failed");
    console.warn("❌ Reason:", {
      modeCorrect: mode === "subscribe",
      tokenMatch: token === WEBHOOK_VERIFY_TOKEN,
      hasChallenge: !!challenge,
    });
    res.sendStatus(403);
  }
};

/**
 * ✅ Controlador para recibir mensajes del webhook (POST)
 */
const handleIncoming = async (req, res) => {
  try {
    const body = req.body;
    console.log("📥 Incoming webhook data:", JSON.stringify(body, null, 2));

    // Verificar que es un webhook de WhatsApp Business
    if (body?.object !== "whatsapp_business_account") {
      console.warn("⚠️ Non-WhatsApp webhook received");
      return res.sendStatus(200);
    }

    // Procesar entradas de WhatsApp
    if (body.entry && body.entry.length > 0) {
      for (const entry of body.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === "messages") {
              const value = change.value;

              if (value.messages && value.messages.length > 0) {
                for (const message of value.messages) {
                  console.log("📨 Processing message:", {
                    id: message.id,
                    from: message.from,
                    type: message.type,
                    timestamp: message.timestamp,
                  });

                  const senderInfo = value.contacts?.find(
                    (contact) => contact.wa_id === message.from
                  );
                  await messageHandler.handleIncomingMessage(
                    message,
                    senderInfo
                  );
                }
              }

              if (value.statuses && value.statuses.length > 0) {
                for (const status of value.statuses) {
                  console.log("📊 Message status update:", {
                    id: status.id,
                    status: status.status,
                    timestamp: status.timestamp,
                  });
                }
              }
            }
          }
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    res.status(200).json({
      success: false,
      error: "Internal processing error",
    });
  }
};

export default {
  verifyWebhook,
  handleIncoming,
};
