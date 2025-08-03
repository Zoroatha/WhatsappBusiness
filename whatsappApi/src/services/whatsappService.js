// Importa la librería 'axios' para realizar solicitudes HTTP.
// Es la herramienta principal para comunicarse con la API de WhatsApp.
import axios from "axios";

// Importa la configuración del entorno desde un archivo 'env.js'.
// Este archivo debería contener variables sensibles y de configuración
import config from "../config/env.js";

// Define la clase WhatsAppService.
// Esta clase encapsula toda la lógica para enviar diferentes tipos de mensajes
// y gestionar interacciones con la API de WhatsApp Business.
class WhatsAppService {
  /**
   * Envía un mensaje de texto simple a un destinatario de WhatsApp.
   * @param {string} to - El número de teléfono del destinatario, incluyendo el código de país (ej. "584121234567").
   * @param {string} body - El contenido del mensaje de texto a enviar.
   * @param {string} [messageId] - Opcional. El ID del mensaje original si este mensaje es una respuesta.
   * Esto ayuda a WhatsApp a mantener el contexto de la conversación.
   */
  async sendMessage(to, body, messageId) {
    try {
      const requestData = {
        messaging_product: "whatsapp",
        to,
        text: { body },
      };

      // Solo agregar contexto si messageId existe
      if (messageId) {
        requestData.context = { message_id: messageId };
      }

      // Realiza una solicitud POST a la API de WhatsApp.
      await axios({
        method: "POST",
        url: `https://graph.facebook.com/${config.API_VERSION}/${config.BUSINESS_PHONE}/messages`,
        headers: {
          Authorization: `Bearer ${config.API_TOKEN}`,
        },
        data: requestData,
      });
    } catch (error) {
      console.error(
        "Error sending message:",
        error.response?.data || error.message
      );
    }
  }

  /**
   * Marca un mensaje específico como "leído" en el chat de WhatsApp.
   * Esto actualiza el estado del mensaje para el remitente en WhatsApp.
   * @param {string} messageId - El ID del mensaje que se desea marcar como leído.
   */
  async markAsRead(messageId) {
    try {
      // Realiza una solicitud POST para actualizar el estado de un mensaje.
      await axios({
        method: "POST",
        url: `https://graph.facebook.com/${config.API_VERSION}/${config.BUSINESS_PHONE}/messages`,
        headers: {
          Authorization: `Bearer ${config.API_TOKEN}`,
        },
        data: {
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
        },
      });
    } catch (error) {
      console.error(
        "Error marking message as read:",
        error.response?.data || error.message
      );
    }
  }

  /**
   * Envía un mensaje interactivo con botones de respuesta rápida a un destinatario.
   * @param {string} to - El número de teléfono del destinatario.
   * @param {string} BodyText - El texto principal que se muestra encima de los botones.
   * @param {Array<Object>} buttons - Un array de objetos que definen los botones a mostrar.
   * @param {string} [messageId] - Opcional. El ID del mensaje original para contexto.
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

      // Solo agregar contexto si messageId existe
      if (messageId) {
        requestData.context = { message_id: messageId };
      }

      await axios({
        method: "POST",
        url: `https://graph.facebook.com/${config.API_VERSION}/${config.BUSINESS_PHONE}/messages`,
        headers: { Authorization: `Bearer ${config.API_TOKEN}` },
        data: requestData,
      });
    } catch (error) {
      console.error(
        "Error sending interactive buttons:",
        error.response?.data || error.message
      );
    }
  }

  /**
   * Envía un mensaje multimedia (imagen, video, audio, documento) a un destinatario.
   * @param {string} to - El número de teléfono del destinatario.
   * @param {'image'|'video'|'audio'|'document'} type - El tipo de medio a enviar.
   * @param {string} mediaUrl - La URL pública accesible del archivo multimedia.
   * @param {string} [caption] - Opcional. Un texto de leyenda para la imagen, video o documento.
   * @returns {Promise<void>} No retorna un valor específico, maneja el envío.
   * @throws {Error} Si el tipo de medio no es soportado o si ocurre un error en la API.
   */
  async sendMediaMessage(to, type, mediaUrl, caption) {
    try {
      const mediaObject = {};

      switch (type) {
        case "image":
          mediaObject.image = { link: mediaUrl, caption };
          break;
        case "video":
          mediaObject.video = { link: mediaUrl, caption };
          break;
        case "audio":
          mediaObject.audio = { link: mediaUrl };
          break;
        case "document":
          mediaObject.document = {
            link: mediaUrl,
            caption,
            filename: "document.pdf",
          };
          break;
        default:
          throw new Error("Unsupported media type");
      }

      await axios({
        method: "POST",
        url: `https://graph.facebook.com/${config.API_VERSION}/${config.BUSINESS_PHONE}/messages`,
        headers: {
          Authorization: `Bearer ${config.API_TOKEN}`,
          "Content-Type": "application/json",
        },
        data: {
          messaging_product: "whatsapp",
          to,
          type,
          ...mediaObject,
        },
      });
    } catch (error) {
      console.error(
        "Error sending media message:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  /**
   * ✅ CORREGIDO: Envía la ubicación usando coordenadas
   * @param {string} to - Número de teléfono del destinatario
   * @param {Object} locationData - Datos de ubicación personalizados (opcional)
   */
  async sendLocation(to, locationData = null) {
    try {
      // Datos por defecto de ubicación (puedes personalizar estos valores)
      const defaultLocation = {
        latitude: 10.4925, // Latitud de Maracaibo, Venezuela
        longitude: -66.9036, // Longitud de Maracaibo, Venezuela
        name: "ZoroathaProject - Clínica",
        address: "Av. Principal, Maracaibo, Zulia, Venezuela",
      };

      // Usar ubicación personalizada o la por defecto
      const location = locationData || defaultLocation;

      console.log(`📍 Enviando ubicación a ${to}:`, location);

      await axios({
        method: "POST",
        url: `https://graph.facebook.com/${config.API_VERSION}/${config.BUSINESS_PHONE}/messages`,
        headers: {
          Authorization: `Bearer ${config.API_TOKEN}`,
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
    } catch (error) {
      console.error(
        "❌ Error sending location:",
        error.response?.data || error.message
      );
      throw error; // Re-lanzar el error para manejo en el MessageHandler
    }
  }

  /**
   * ✅ NUEVO MÉTODO: Envía información de contacto
   * @param {string} to - Número de teléfono del destinatario
   * @param {Object} contactData - Datos del contacto (opcional)
   */
  async sendContact(to, contactData = null) {
    try {
      // Datos por defecto del contacto
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

      // Usar contacto personalizado o el por defecto
      const contact = contactData || defaultContact;

      console.log(`📞 Enviando contacto a ${to}`);

      await axios({
        method: "POST",
        url: `https://graph.facebook.com/${config.API_VERSION}/${config.BUSINESS_PHONE}/messages`,
        headers: {
          Authorization: `Bearer ${config.API_TOKEN}`,
          "Content-Type": "application/json",
        },
        data: {
          messaging_product: "whatsapp",
          to,
          type: "contacts",
          contacts: [contact], // WhatsApp espera un array de contactos
        },
      });

      console.log(`✅ Contacto enviado exitosamente a ${to}`);
    } catch (error) {
      console.error(
        "❌ Error sending contact:",
        error.response?.data || error.message
      );
      throw error; // Re-lanzar el error para manejo en el MessageHandler
    }
  }
}

// Exporta una única instancia de la clase WhatsAppService.
export default new WhatsAppService();
