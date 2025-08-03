// src/services/sendToWhatsapp.js

import whatsappService from "./whatsappService.js";

/**
 * Envia un mensaje de texto y marca como leído (si messageId es provisto)
 * @param {string} to - Número del receptor
 * @param {string} body - Texto del mensaje
 * @param {string} [messageId] - ID del mensaje original (opcional)
 */
export async function sendTextWithRead(to, body, messageId = null) {
  await whatsappService.sendMessage(to, body, messageId);
  if (messageId) await whatsappService.markAsRead(messageId);
}

/**
 * Envia botones interactivos y marca como leído. Si hay error, manda fallback.
 * @param {string} to - Número del receptor
 * @param {string} text - Texto del cuerpo del mensaje
 * @param {Array} buttons - Botones tipo reply
 * @param {string} [messageId] - ID del mensaje original (opcional)
 */
export async function sendButtonsWithFallback(
  to,
  text,
  buttons,
  messageId = null
) {
  try {
    await whatsappService.sendInteractiveButtons(to, text, buttons, messageId);
    if (messageId) await whatsappService.markAsRead(messageId);
  } catch (error) {
    console.error("❌ Error al enviar botones:", error.message);
    await sendTextWithRead(
      to,
      "⚠️ No se pudieron mostrar las opciones.",
      messageId
    );
  }
}

/**
 * Envia media (imagen/audio/documento/video) con caption y maneja errores
 * @param {string} to
 * @param {"image"|"audio"|"video"|"document"} type
 * @param {string} mediaUrl
 * @param {string} [caption]
 */
export async function sendMediaWithCaption(to, type, mediaUrl, caption = "") {
  try {
    await whatsappService.sendMediaMessage(to, type, mediaUrl, caption);
  } catch (error) {
    console.error("❌ Error al enviar media:", error.message);
    await sendTextWithRead(to, "❌ No se pudo enviar el archivo multimedia.");
  }
}

/**
 * Envia ubicación con fallback en caso de error
 * @param {string} to - Número del receptor
 * @param {Object} [locationData] - Opcional: datos personalizados
 */
export async function sendLocationWithFallback(to, locationData = null) {
  try {
    await sendTextWithRead(to, "📍*Nuestra Ubicación:*");
    await whatsappService.sendLocation(to, locationData);

    const extraInfo =
      "🕐 *Horarios de Atención: Lunes a Viernes: 8:00 AM - 6:00 PM Sábados: 8:00 AM - 2:00 PM";

    Emergencias: "+57 3002726932";
    await sendTextWithRead(to, extraInfo);
  } catch (error) {
    console.error("❌ Error enviando ubicación:", error.message);
    const fallback = "📍 Av. Principal, Maracaibo, Zulia, Venezuela";
    Tel: "+57 3002726932\n Email: cesarthdiz@gmail.com";
    await sendTextWithRead(to, fallback);
  }
}

/**
 * Envia contacto de emergencia y maneja errores
 * @param {string} to
 * @param {Object} [contactData]
 */
export async function sendEmergencyContact(to, contactData = null) {
  try {
    await sendTextWithRead(
      to,
      "🚑 *Contacto de Emergencia:*\n\nAquí tienes nuestros datos:"
    );
    await whatsappService.sendContact(to, contactData);
  } catch (error) {
    console.error("❌ Error enviando contacto:", error.message);
    const fallback =
      "🚑 Emergencias:\n\n📞 +57 3002726932\n📧 cesarthdiz@gmail.com";
    await sendTextWithRead(to, fallback);
  }
} // sendToWhatsapp.js

import whatsappService from "../services/whatsappService.js";
import whatsappUtils from "../utils/whatsappUtils.js";

/**
 * Envía un mensaje al usuario por WhatsApp usando el servicio configurado.
 * @param {string} phoneNumber - Número de teléfono del usuario.
 * @param {string} messageText - Texto del mensaje a enviar.
 * @param {string} [messageId] - ID del mensaje al que se está respondiendo (opcional).
 * @returns {Promise<void>}
 */
export default async function sendToWhatsapp(
  phoneNumber,
  messageText,
  messageId = null
) {
  try {
    // Limpia y valida el número de teléfono
    const cleanNumber = whatsappUtils.cleanPhoneNumber(phoneNumber);

    // Usa el servicio para enviar el mensaje
    await whatsappService.sendMessage(cleanNumber, messageText, messageId);
  } catch (error) {
    console.error("Error enviando mensaje a WhatsApp:", error);
    // Podrías lanzar un error o manejarlo de forma personalizada aquí si deseas
  }
}
