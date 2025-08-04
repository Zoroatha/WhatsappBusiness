import config from "../config/env.js";
import messageHandler from "../services/messageHandler.js";

class WebhookController {
  async handleIncoming(req, res) {
    // CRÍTICO: Responder inmediatamente a WhatsApp para evitar timeouts
    res.status(200).send("EVENT_RECEIVED");

    try {
      console.log("📨 Webhook received:", new Date().toISOString());

      // Log más compacto para evitar spam en logs
      if (process.env.NODE_ENV === "development") {
        console.log("Webhook body:", JSON.stringify(req.body, null, 2));
      }

      // Verificar estructura básica del webhook
      const entry = req.body?.entry?.[0];
      if (!entry) {
        console.log("⚠️  No entry found in webhook");
        return;
      }

      const change = entry.changes?.[0];
      if (!change) {
        console.log("⚠️  No changes found in webhook");
        return;
      }

      const value = change.value;
      if (!value) {
        console.log("⚠️  No value found in webhook");
        return;
      }

      // Verificar si es un mensaje o actualización de estado
      const message = value.messages?.[0];
      const senderInfo = value.contacts?.[0];
      const statuses = value.statuses;

      if (message) {
        console.log(`📩 Processing message from: ${message.from}`);
        console.log(`📝 Message type: ${message.type}`);

        // Procesar mensaje de forma asíncrona para no bloquear la respuesta
        process.nextTick(async () => {
          try {
            await messageHandler.handleIncomingMessage(message, senderInfo);
          } catch (error) {
            console.error("❌ Error processing message:", error.message);
            console.error("📋 Stack trace:", error.stack);

            // Intentar enviar mensaje de error al usuario si es posible
            try {
              if (message?.from) {
                await messageHandler.whatsappService.sendMessage(
                  message.from,
                  "❌ Lo siento, ocurrió un error procesando tu mensaje. Por favor intenta de nuevo escribiendo 'hola'."
                );
              }
            } catch (sendError) {
              console.error(
                "❌ Failed to send error message to user:",
                sendError.message
              );
            }
          }
        });
      } else if (statuses) {
        // Manejar actualizaciones de estado de mensajes
        console.log(
          "📊 Received message status update:",
          statuses.length,
          "status(es)"
        );

        if (process.env.NODE_ENV === "development") {
          statuses.forEach((status) => {
            console.log(`📍 Status: ${status.status} for message ${status.id}`);
          });
        }
      } else {
        console.log("ℹ️  Webhook received with no messages or statuses");

        if (process.env.NODE_ENV === "development") {
          console.log("📋 Webhook structure:", {
            hasEntry: !!entry,
            hasChanges: !!change,
            hasValue: !!value,
            hasMessages: !!value.messages,
            hasStatuses: !!value.statuses,
            hasContacts: !!value.contacts,
          });
        }
      }
    } catch (error) {
      console.error("💥 Critical error in handleIncoming:", error.message);
      console.error("📋 Error stack:", error.stack);

      // Log información del request para debugging
      console.error("📋 Request info:", {
        method: req.method,
        url: req.url,
        headers: req.headers,
        bodyExists: !!req.body,
        bodyType: typeof req.body,
      });
    }
  }

  verifyWebhook(req, res) {
    try {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      console.log("🔐 Webhook verification attempt:", {
        mode: mode || "MISSING",
        tokenProvided: !!token,
        challengeProvided: !!challenge,
        expectedTokenConfigured: !!config.WEBHOOK_VERIFY_TOKEN,
        timestamp: new Date().toISOString(),
      });

      // Verificar que todos los parámetros estén presentes
      if (!mode || !token || !challenge) {
        console.error("❌ Webhook verification failed: Missing parameters");
        return res.status(400).json({
          error: "Missing required parameters",
          required: ["hub.mode", "hub.verify_token", "hub.challenge"],
          provided: {
            mode: !!mode,
            token: !!token,
            challenge: !!challenge,
          },
        });
      }

      // Verificar que tengamos el token configurado
      if (!config.WEBHOOK_VERIFY_TOKEN) {
        console.error(
          "❌ Webhook verification failed: WEBHOOK_VERIFY_TOKEN not configured"
        );
        return res.status(500).json({
          error: "Webhook verify token not configured on server",
        });
      }

      // Verificar modo y token
      if (mode === "subscribe" && token === config.WEBHOOK_VERIFY_TOKEN) {
        console.log("✅ Webhook verified successfully!");
        console.log(`🔗 Challenge response: ${challenge}`);
        res.status(200).send(challenge);
      } else {
        console.error("❌ Webhook verification failed:", {
          modeMatch: mode === "subscribe",
          tokenMatch: token === config.WEBHOOK_VERIFY_TOKEN,
          receivedMode: mode,
          // No loggear el token completo por seguridad
          tokenMatches: token === config.WEBHOOK_VERIFY_TOKEN,
        });

        res.status(403).json({
          error: "Forbidden",
          message: "Webhook verification failed",
        });
      }
    } catch (error) {
      console.error("💥 Error in verifyWebhook:", error.message);
      console.error("📋 Stack trace:", error.stack);

      res.status(500).json({
        error: "Internal server error during webhook verification",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Método adicional para health check específico del webhook
  async healthCheck(req, res) {
    try {
      const health = {
        status: "healthy",
        service: "Webhook Controller",
        timestamp: new Date().toISOString(),
        config: {
          hasWebhookToken: !!config.WEBHOOK_VERIFY_TOKEN,
          hasAccessToken: !!config.ACCESS_TOKEN,
          hasPhoneNumberId: !!config.PHONE_NUMBER_ID,
        },
        uptime: process.uptime(),
      };

      res.status(200).json(health);
    } catch (error) {
      console.error("❌ Health check error:", error.message);
      res.status(500).json({
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export default new WebhookController();
