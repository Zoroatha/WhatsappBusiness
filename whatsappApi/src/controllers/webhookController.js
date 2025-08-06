// controllers/webhookController.js
import messageHandler from "../services/messageHandler.js";
import config from "../config/env.js";

/**
 * ✅ Controlador para verificar el webhook (GET)
 */
const verifyWebhook = (req, res) => {
  const VERIFY_TOKEN = config.WEBHOOK_VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("🔍 Webhook verification attempt:", {
    mode,
    token: token ? "***" : "missing",
    challenge: !!challenge,
  });

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully");
    res.status(200).send(challenge);
  } else {
    console.warn("❌ Webhook verification failed");
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
      return res.sendStatus(200); // Return 200 to avoid retries
    }

    // Procesar entradas de WhatsApp
    if (body.entry && body.entry.length > 0) {
      for (const entry of body.entry) {
        // Verificar si hay cambios en los mensajes
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === "messages") {
              const value = change.value;

              // Procesar mensajes entrantes
              if (value.messages && value.messages.length > 0) {
                for (const message of value.messages) {
                  console.log("📨 Processing message:", {
                    id: message.id,
                    from: message.from,
                    type: message.type,
                    timestamp: message.timestamp,
                  });

                  // Obtener información del remitente
                  const senderInfo = value.contacts?.find(
                    (contact) => contact.wa_id === message.from
                  );

                  // Procesar el mensaje con el handler
                  await messageHandler.handleIncomingMessage(
                    message,
                    senderInfo
                  );
                }
              }

              // Procesar cambios de estado de mensajes (opcional)
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

    // Siempre responder 200 para evitar reintentos
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    console.error("📋 Stack trace:", error.stack);

    // Responder 200 incluso en errores para evitar reintentos de WhatsApp
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
