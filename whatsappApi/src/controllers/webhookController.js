import config from "../config/env.js";
import messageHandler from "../services/messageHandler.js";

class WebhookController {
  async handleIncoming(req, res) {
    try {
      console.log("Webhook received:", JSON.stringify(req.body, null, 2));

      // IMPORTANTE: Responder inmediatamente a WhatsApp para evitar timeouts
      res.status(200).send("EVENT_RECEIVED");

      // Verificar que tenemos los datos necesarios
      const entry = req.body.entry?.[0];
      if (!entry) {
        console.log("No entry found in webhook");
        return;
      }

      const change = entry.changes?.[0];
      if (!change) {
        console.log("No changes found in webhook");
        return;
      }

      const value = change.value;
      if (!value) {
        console.log("No value found in webhook");
        return;
      }

      // Verificar si es un mensaje
      const message = value.messages?.[0];
      const senderInfo = value.contacts?.[0];

      if (message) {
        console.log("Processing message from:", message.from);

        // Procesar el mensaje de forma asíncrona sin bloquear la respuesta
        setImmediate(async () => {
          try {
            await messageHandler.handleIncomingMessage(message, senderInfo);
          } catch (error) {
            console.error("Error processing message:", error);
          }
        });
      } else {
        console.log("No message found in webhook, might be status update");
      }
    } catch (error) {
      console.error("Error in handleIncoming:", error);
      console.error("Stack trace:", error.stack);

      // Si aún no hemos enviado una respuesta, enviar error
      if (!res.headersSent) {
        res.status(500).send("Internal Server Error");
      }
    }
  }

  verifyWebhook(req, res) {
    try {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      console.log("Webhook verification attempt:", {
        mode,
        token: token ? "PROVIDED" : "MISSING",
        challenge: challenge ? "PROVIDED" : "MISSING",
        expectedToken: config.WEBHOOK_VERIFY_TOKEN ? "CONFIGURED" : "MISSING",
      });

      if (mode === "subscribe" && token === config.WEBHOOK_VERIFY_TOKEN) {
        console.log("Webhook verified successfully!");
        res.status(200).send(challenge);
      } else {
        console.log("Webhook verification failed");
        res.sendStatus(403);
      }
    } catch (error) {
      console.error("Error in verifyWebhook:", error);
      res.sendStatus(500);
    }
  }
}

export default new WebhookController();
