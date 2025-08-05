// Importa la librería 'axios' para realizar solicitudes HTTP.
import axios from "axios";
import config from "./config/env.js";

class WhatsAppService {
  constructor() {
    // ✅ Validar configuración al inicializar
    this.validateConfig();
  }

  /**
   * ✅ Validar que todas las variables necesarias estén configuradas
   */
  validateConfig() {
    const requiredVars = ["ACCESS_TOKEN", "PHONE_NUMBER_ID", "API_VERSION"];
    const missing = requiredVars.filter((varName) => !config[varName]);

    if (missing.length > 0) {
      console.error(
        `❌ WhatsApp Service: Missing required config: ${missing.join(", ")}`
      );
      throw new Error(`Missing WhatsApp configuration: ${missing.join(", ")}`);
    }

    console.log("✅ WhatsApp Service initialized with valid config");
  }

  /**
   * ✅ CORREGIDO: Usar config.ACCESS_TOKEN en lugar de config.API_TOKEN
   */
  async sendMessage(to, body, messageId) {
    try {
      const requestData = {
        messaging_product: "whatsapp",
        to,
        text: { body },
      };

      if (messageId) {
        requestData.context = { message_id: messageId };
      }

      const response = await axios({
        method: "POST",
        url: `${config.BASE_URL}/${config.PHONE_NUMBER_ID}/messages`, // ✅ Usar PHONE_NUMBER_ID
        headers: {
          Authorization: `Bearer ${config.ACCESS_TOKEN}`, // ✅ CORREGIDO
          "Content-Type": "application/json",
        },
        data: requestData,
      });

      console.log(`✅ Message sent to ${to}`);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error sending message:",
        error.response?.data || error.message
      );
      throw error; // Re-lanzar para manejo en niveles superiores
    }
  }

  /**
   * ✅ CORREGIDO: Usar configuración correcta
   */
  async markAsRead(messageId) {
    try {
      await axios({
        method: "POST",
        url: `${config.BASE_URL}/${config.PHONE_NUMBER_ID}/messages`, // ✅ CORREGIDO
        headers: {
          Authorization: `Bearer ${config.ACCESS_TOKEN}`, // ✅ CORREGIDO
          "Content-Type": "application/json",
        },
        data: {
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
        },
      });

      console.log(`✅ Message ${messageId} marked as read`);
    } catch (error) {
      console.error(
        "❌ Error marking message as read:",
        error.response?.data || error.message
      );
      // No lanzar error aquí, es una función auxiliar
    }
  }

  /**
   * ✅ CORREGIDO: Usar configuración correcta
   */
  async sendInteractiveButtons(to, BodyText, buttons, messageId) {
    try {
      const requestData = {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: BodyText },
          action: { buttons },
        },
      };

      if (messageId) {
        requestData.context = { message_id: messageId };
      }

      const response = await axios({
        method: "POST",
        url: `${config.BASE_URL}/${config.PHONE_NUMBER_ID}/messages`, // ✅ CORREGIDO
        headers: {
          Authorization: `Bearer ${config.ACCESS_TOKEN}`, // ✅ CORREGIDO
          "Content-Type": "application/json",
        },
        data: requestData,
      });

      console.log(`✅ Interactive buttons sent to ${to}`);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error sending interactive buttons:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  /**
   * ✅ CORREGIDO: Usar configuración correcta
   */
  async sendMediaMessage(to, type, mediaUrl, caption) {
    try {
      const mediaObject = {};

      switch (type) {
        case "image":
          mediaObject.image = { link: mediaUrl };
          if (caption) mediaObject.image.caption = caption;
          break;
        case "video":
          mediaObject.video = { link: mediaUrl };
          if (caption) mediaObject.video.caption = caption;
          break;
        case "audio":
          mediaObject.audio = { link: mediaUrl };
          break;
        case "document":
          mediaObject.document = {
            link: mediaUrl,
            filename: caption || "document.pdf", // ✅ Mejor manejo del filename
          };
          break;
        default:
          throw new Error(`Unsupported media type: ${type}`);
      }

      const response = await axios({
        method: "POST",
        url: `${config.BASE_URL}/${config.PHONE_NUMBER_ID}/messages`, // ✅ CORREGIDO
        headers: {
          Authorization: `Bearer ${config.ACCESS_TOKEN}`, // ✅ CORREGIDO
          "Content-Type": "application/json",
        },
        data: {
          messaging_product: "whatsapp",
          to,
          type,
          ...mediaObject,
        },
      });

      console.log(`✅ Media message (${type}) sent to ${to}`);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error sending media message:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  /**
   * ✅ CORREGIDO: Usar configuración correcta
   */
  async sendLocation(to, locationData = null) {
    try {
      const defaultLocation = {
        latitude: 10.4925,
        longitude: -66.9036,
        name: "ZoroathaProject - Clínica",
        address: "Av. Principal, Maracaibo, Zulia, Venezuela",
      };

      const location = locationData || defaultLocation;

      console.log(`📍 Enviando ubicación a ${to}:`, location);

      const response = await axios({
        method: "POST",
        url: `${config.BASE_URL}/${config.PHONE_NUMBER_ID}/messages`, // ✅ CORREGIDO
        headers: {
          Authorization: `Bearer ${config.ACCESS_TOKEN}`, // ✅ CORREGIDO
          "Content-Type": "application/json",
        },
        data: {
          messaging_product: "whatsapp",
          to,
          type: "location",
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            name: location.name,
            address: location.address,
          },
        },
      });

      console.log(`✅ Ubicación enviada exitosamente a ${to}`);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error sending location:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  /**
   * ✅ CORREGIDO: Usar configuración correcta
   */
  async sendContact(to, contactData = null) {
    try {
      const defaultContact = {
        name: {
          formatted_name: "ZoroathaProject - Emergencias",
          first_name: "ZoroathaProject",
          last_name: "Emergencias",
        },
        phones: [
          {
            phone: "+573002726932",
            type: "WORK",
            wa_id: "573002726932",
          },
        ],
        emails: [
          {
            email: "cesarthdiz@gmail.com",
            type: "WORK",
          },
        ],
      };

      const contact = contactData || defaultContact;

      console.log(`📞 Enviando contacto a ${to}`);

      const response = await axios({
        method: "POST",
        url: `${config.BASE_URL}/${config.PHONE_NUMBER_ID}/messages`, // ✅ CORREGIDO
        headers: {
          Authorization: `Bearer ${config.ACCESS_TOKEN}`, // ✅ CORREGIDO
          "Content-Type": "application/json",
        },
        data: {
          messaging_product: "whatsapp",
          to,
          type: "contacts",
          contacts: [contact],
        },
      });

      console.log(`✅ Contacto enviado exitosamente a ${to}`);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Error sending contact:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  /**
   * ✅ NUEVO: Método para verificar el estado del servicio
   */
  async healthCheck() {
    try {
      // Intentar hacer una llamada simple a la API para verificar conectividad
      const response = await axios({
        method: "GET",
        url: `${config.BASE_URL}/${config.PHONE_NUMBER_ID}`,
        headers: {
          Authorization: `Bearer ${config.ACCESS_TOKEN}`,
        },
      });

      console.log("✅ WhatsApp API health check passed");
      return { status: "healthy", data: response.data };
    } catch (error) {
      console.error(
        "❌ WhatsApp API health check failed:",
        error.response?.data || error.message
      );
      return { status: "unhealthy", error: error.message };
    }
  }
}

export default new WhatsAppService();
