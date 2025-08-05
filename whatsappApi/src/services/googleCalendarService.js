import { google } from "googleapis";
import config from "./config/env.js";

class GoogleCalendarService {
  constructor() {
    this.calendar = null;
    this.auth = null;
    this.calendarId = config.GOOGLE_CALENDAR_ID;
    this.initializeAuth();
  }

  /**
   * ✅ Inicializar autenticación con Google Calendar
   */
  async initializeAuth() {
    try {
      if (!config.GOOGLE_SERVICE_ACCOUNT_EMAIL || !config.GOOGLE_PRIVATE_KEY) {
        console.warn(
          "⚠️ Google Calendar: Missing credentials, service will be disabled"
        );
        return;
      }

      this.auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: config.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        },
        scopes: ["https://www.googleapis.com/auth/calendar"],
      });

      const authClient = await this.auth.getClient();
      this.calendar = google.calendar({ version: "v3", auth: authClient });

      console.log("✅ Google Calendar service initialized successfully");
    } catch (error) {
      console.error(
        "❌ Error initializing Google Calendar auth:",
        error.message
      );
      this.calendar = null;
    }
  }

  /**
   * ✅ Verificar si el servicio está disponible
   */
  isAvailable() {
    return this.calendar !== null && this.calendarId;
  }

  /**
   * ✅ Parsear fecha y hora del formato de usuario
   */
  parseDateTime(dateStr, timeStr) {
    try {
      // Parsear fecha DD/MM/YYYY
      const dateParts = dateStr.split("/");
      if (dateParts.length !== 3) {
        throw new Error("Invalid date format");
      }

      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // JavaScript months are 0-based
      const year = parseInt(dateParts[2]);

      // Parsear hora
      let hour, minute;

      if (
        timeStr.toLowerCase().includes("am") ||
        timeStr.toLowerCase().includes("pm")
      ) {
        // Formato 12 horas
        const timeParts = timeStr
          .toLowerCase()
          .replace(/\s/g, "")
          .match(/(\d+):?(\d*)(am|pm)/);
        if (!timeParts) {
          throw new Error("Invalid time format");
        }

        hour = parseInt(timeParts[1]);
        minute = timeParts[2] ? parseInt(timeParts[2]) : 0;

        if (timeParts[3] === "pm" && hour !== 12) {
          hour += 12;
        } else if (timeParts[3] === "am" && hour === 12) {
          hour = 0;
        }
      } else {
        // Formato 24 horas
        const timeParts = timeStr.split(":");
        hour = parseInt(timeParts[0]);
        minute = timeParts[1] ? parseInt(timeParts[1]) : 0;
      }

      const dateTime = new Date(year, month, day, hour, minute);

      // Validar que la fecha es válida
      if (isNaN(dateTime.getTime())) {
        throw new Error("Invalid date/time combination");
      }

      return dateTime;
    } catch (error) {
      console.error("❌ Error parsing date/time:", error.message);
      return null;
    }
  }

  /**
   * ✅ Obtener eventos para una fecha específica
   */
  async getEventsForDate(date) {
    if (!this.isAvailable()) {
      console.warn("⚠️ Google Calendar service not available");
      return [];
    }

    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      return response.data.items || [];
    } catch (error) {
      console.error("❌ Error getting calendar events:", error.message);
      return [];
    }
  }

  /**
   * ✅ Crear evento en Google Calendar
   */
  async createEvent(appointmentData) {
    if (!this.isAvailable()) {
      throw new Error("Google Calendar service not available");
    }

    try {
      console.log("📅 Creating calendar event:", appointmentData);

      // Parsear fecha y hora
      const startDateTime = this.parseDateTime(
        appointmentData.date,
        appointmentData.time
      );
      if (!startDateTime) {
        throw new Error("Invalid date/time format");
      }

      // Duración por defecto de 1 hora
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + 1);

      const event = {
        summary: `Cita: ${appointmentData.name} - ${appointmentData.consulta}`,
        description: `
📋 DETALLES DE LA CITA:

👤 Paciente: ${appointmentData.name}
💬 Consulta: ${appointmentData.consulta}
💰 Monto: $${appointmentData.monto}
🏥 Proveedor: ${appointmentData.proveedor}
📋 RIF: ${appointmentData.rif}
💳 Método de pago: ${appointmentData.pago}

📅 Agendado mediante WhatsApp Bot
        `.trim(),
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: "America/Caracas",
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: "America/Caracas",
        },
        attendees: [
          {
            email: config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            displayName: appointmentData.name,
          },
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 }, // 24 horas antes
            { method: "popup", minutes: 60 }, // 1 hora antes
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        resource: event,
        sendUpdates: "all",
      });

      const eventId = response.data.id;
      const eventLink = response.data.htmlLink;

      console.log("✅ Calendar event created successfully:", eventId);

      return {
        success: true,
        eventId,
        eventLink,
        event: response.data,
      };
    } catch (error) {
      console.error("❌ Error creating calendar event:", error.message);

      // Diferentes tipos de error
      if (error.code === 403) {
        throw new Error("Calendar access denied - check permissions");
      } else if (error.code === 404) {
        throw new Error("Calendar not found - check calendar ID");
      } else {
        throw new Error(`Calendar error: ${error.message}`);
      }
    }
  }

  /**
   * ✅ Eliminar evento del calendario
   */
  async deleteEvent(eventId) {
    if (!this.isAvailable()) {
      throw new Error("Google Calendar service not available");
    }

    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId,
      });

      console.log("✅ Calendar event deleted:", eventId);
      return { success: true };
    } catch (error) {
      console.error("❌ Error deleting calendar event:", error.message);
      throw error;
    }
  }

  /**
   * ✅ Actualizar evento del calendario
   */
  async updateEvent(eventId, updateData) {
    if (!this.isAvailable()) {
      throw new Error("Google Calendar service not available");
    }

    try {
      // Primero obtener el evento existente
      const existingEvent = await this.calendar.events.get({
        calendarId: this.calendarId,
        eventId: eventId,
      });

      // Actualizar solo los campos proporcionados
      const updatedEvent = {
        ...existingEvent.data,
        ...updateData,
      };

      const response = await this.calendar.events.update({
        calendarId: this.calendarId,
        eventId: eventId,
        resource: updatedEvent,
      });

      console.log("✅ Calendar event updated:", eventId);
      return {
        success: true,
        event: response.data,
      };
    } catch (error) {
      console.error("❌ Error updating calendar event:", error.message);
      throw error;
    }
  }

  /**
   * ✅ Verificar estado del servicio
   */
  async healthCheck() {
    if (!this.isAvailable()) {
      return {
        status: "disabled",
        message: "Missing credentials or calendar ID",
      };
    }

    try {
      // Intentar listar calendarios para verificar conectividad
      await this.calendar.calendarList.list({
        maxResults: 1,
      });

      return {
        status: "healthy",
        message: "Google Calendar accessible",
        calendarId: this.calendarId,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        message: `Calendar error: ${error.message}`,
        code: error.code,
      };
    }
  }

  /**
   * ✅ Obtener información del calendario
   */
  async getCalendarInfo() {
    if (!this.isAvailable()) {
      throw new Error("Google Calendar service not available");
    }

    try {
      const response = await this.calendar.calendars.get({
        calendarId: this.calendarId,
      });

      return response.data;
    } catch (error) {
      console.error("❌ Error getting calendar info:", error.message);
      throw error;
    }
  }

  /**
   * ✅ Validar formato de fecha y hora
   */
  isValidDateTimeFormat(dateStr, timeStr) {
    try {
      const parsed = this.parseDateTime(dateStr, timeStr);
      return (
        parsed !== null && parsed instanceof Date && !isNaN(parsed.getTime())
      );
    } catch {
      return false;
    }
  }
}

// ✅ Exportar instancia única
export default new GoogleCalendarService();
