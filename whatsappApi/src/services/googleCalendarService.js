// services/googleCalendarService.js
import { google } from "googleapis";
import config from "../config/env.js";

class GoogleCalendarService {
  constructor() {
    // Usar las MISMAS credenciales que googleSheetsService
    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: config.GOOGLE_PRIVATE_KEY,
      },
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    this.calendar = google.calendar({ version: "v3", auth: this.auth });
    this.calendarId = config.GOOGLE_CALENDAR_ID;
  }

  /**
   * Crea un evento en Google Calendar
   * @param {Object} appointmentData - Datos de la cita
   * @returns {Promise<Object>} Datos del evento creado
   */
  async createEvent(appointmentData) {
    try {
      // Parsear fecha y hora
      const { date, time, name, consulta, proveedor } = appointmentData;
      const eventDateTime = this.parseDateTime(date, time);

      if (!eventDateTime) {
        throw new Error("Formato de fecha/hora inválido");
      }

      // Configurar el evento
      const event = {
        summary: `📅 Cita: ${name} - ${consulta}`,
        description: `
👤 Paciente: ${name}
💬 Tipo de consulta: ${consulta}
🏥 Proveedor: ${proveedor}
📱 Agendado vía WhatsApp Bot
        `.trim(),
        start: {
          dateTime: eventDateTime.toISOString(),
          timeZone: "America/Caracas", // Zona horaria de Venezuela
        },
        end: {
          dateTime: new Date(
            eventDateTime.getTime() + 60 * 60 * 1000
          ).toISOString(), // +1 hora
          timeZone: "America/Caracas",
        },
        attendees: [
          // Si tienes el email del paciente, agrégalo aquí
          // { email: patientEmail }
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 }, // 1 día antes
            { method: "popup", minutes: 60 }, // 1 hora antes
          ],
        },
      };

      // Crear el evento
      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        resource: event,
      });

      console.log("✅ Evento creado en Google Calendar:", response.data.id);
      return {
        success: true,
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
        event: response.data,
      };
    } catch (error) {
      console.error("❌ Error creando evento en Calendar:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Convierte fecha y hora de texto a objeto Date
   * @param {string} dateStr - Fecha en formato DD/MM/AAAA
   * @param {string} timeStr - Hora en formato HH:MM AM/PM o HH:MM
   * @returns {Date|null} Objeto Date o null si es inválido
   */
  parseDateTime(dateStr, timeStr) {
    try {
      console.log(`🕐 Parseando fecha: "${dateStr}" y hora: "${timeStr}"`);

      // Parsear fecha DD/MM/AAAA
      const dateParts = dateStr.split("/");
      if (dateParts.length !== 3) {
        console.error("❌ Formato de fecha inválido, debe ser DD/MM/AAAA");
        return null;
      }

      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // Mes base 0
      const year = parseInt(dateParts[2]);

      // Parsear hora
      let hour, minute;
      const timeUpper = timeStr.toUpperCase().trim();

      if (timeUpper.includes("AM") || timeUpper.includes("PM")) {
        // Formato 12 horas
        const isPM = timeUpper.includes("PM");
        const timePart = timeUpper.replace(/AM|PM/g, "").trim();
        const timeParts = timePart.split(":");

        hour = parseInt(timeParts[0]);
        minute = parseInt(timeParts[1]) || 0;

        // 🔧 CORRECCIÓN: Era "isPA" ahora es "isPM"
        if (isPM && hour !== 12) hour += 12;
        if (!isPM && hour === 12) hour = 0;
      } else {
        // Formato 24 horas
        const timeParts = timeStr.split(":");
        hour = parseInt(timeParts[0]);
        minute = parseInt(timeParts[1]) || 0;
      }

      const resultDate = new Date(year, month, day, hour, minute);
      console.log(`✅ Fecha parseada: ${resultDate.toLocaleString("es-VE")}`);

      return resultDate;
    } catch (error) {
      console.error("❌ Error parseando fecha/hora:", error);
      return null;
    }
  }

  /**
   * Lista eventos del día
   * @param {Date} date - Fecha a consultar
   * @returns {Promise<Array>} Lista de eventos
   */
  async getEventsForDate(date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        orderBy: "startTime",
        singleEvents: true,
      });

      return response.data.items || [];
    } catch (error) {
      console.error("❌ Error obteniendo eventos:", error.message);
      return [];
    }
  }

  /**
   * Cancela un evento
   * @param {string} eventId - ID del evento a cancelar
   * @returns {Promise<boolean>} true si se canceló exitosamente
   */
  async cancelEvent(eventId) {
    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId,
      });

      console.log("✅ Evento cancelado:", eventId);
      return true;
    } catch (error) {
      console.error("❌ Error cancelando evento:", error.message);
      return false;
    }
  }
}

export default new GoogleCalendarService();
