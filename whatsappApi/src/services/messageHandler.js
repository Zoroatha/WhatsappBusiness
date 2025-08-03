// Importa el servicio de WhatsApp para enviar mensajes.
import whatsappService from "./whatsappService.js";
// Importa la función para añadir datos a Google Sheets.
import appendToSheet from "./googleSheetsService.js";
// Importa el servicio de openRouter para generar respuestas.
import openRouterService from "../services/OpenRouterService.js";

// Al inicio del archivo, agregar:
import googleCalendarService from "../services/googleCalendarService.js";

// Clase principal para manejar la lógica de los mensajes.
class MessageHandler {
  /**
   * Constructor: inicializa el estado de las citas por usuario y el servicio de WhatsApp.
   */
  constructor() {
    this.appointmentState = {}; // Estado de citas por número de teléfono
    this.assistantState = {}; // Estado para el asistente IA
    this.whatsappService = whatsappService;
  }

  /**
   * Maneja todos los mensajes entrantes, dirigiendo el flujo de la conversación.
   */
  async handleIncomingMessage(message, senderInfo) {
    if (message?.type === "text") {
      const incomingMessage = message.text.body.toLowerCase().trim();

      // Verifica si el usuario quiere ver la agenda de hoy
      if (incomingMessage === "citas hoy" || incomingMessage === "agenda") {
        await this.showTodayAppointments(message.from, message.id);
        return;
      }

      // Reconoce y responde a saludos.
      if (this.isGreeting(incomingMessage)) {
        await this.sendWelcomeMessage(message.from, message.id, senderInfo);
        await this.sendWelcomeMenu(message.from, message.id);
        return;
      }

      // Responde al comando "send media".
      if (incomingMessage === "send media") {
        await this.sendMedia(message.from, message.id);
        return;
      }

      // ✅ Verificar estado del asistente ANTES que otros flujos
      if (this.assistantState[message.from]) {
        await this.handleAssistantFlow(message.from, message, senderInfo);
        return;
      }

      // Si el usuario está en el flujo de agendamiento de citas
      if (this.appointmentState[message.from]) {
        await this.handleAppointmentFlow(message.from, message);
        return;
      }

      // Para cualquier otro mensaje de texto, envía un eco.
      await this.handleTextMessage(message);
    }

    // Si el mensaje es una respuesta de botón interactivo.
    else if (
      message?.type === "interactive" &&
      message.interactive?.type === "button_reply"
    ) {
      const buttonId = message.interactive.button_reply.id;

      switch (buttonId) {
        case "schedule":
          await this.handleMenuOption(message.from, "agendar", message.id);
          break;
        case "services":
          await this.handleMenuOption(message.from, "consultar", message.id);
          break;
        case "speak_to_agent":
          await this.handleMenuOption(message.from, "ubicacion", message.id);
          break;
      }

      await whatsappService.markAsRead(message.id);
    }
  }

  async showTodayAppointments(to, messageId) {
    try {
      const today = new Date();
      const events = await googleCalendarService.getEventsForDate(today);

      if (events.length === 0) {
        await whatsappService.sendMessage(
          to,
          "📅 No hay citas programadas para hoy.",
          messageId
        );
        return;
      }

      let message = `📅 *Citas de hoy (${today.toLocaleDateString(
        "es-VE"
      )}):*\n\n`;

      events.forEach((event, index) => {
        const startTime = new Date(event.start.dateTime).toLocaleTimeString(
          "es-VE",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        );
        message += `${index + 1}. 🕐 ${startTime} - ${event.summary}\n`;
      });

      await whatsappService.sendMessage(to, message, messageId);
    } catch (error) {
      console.error("Error mostrando citas:", error);
      await whatsappService.sendMessage(
        to,
        "❌ Error consultando las citas del día.",
        messageId
      );
    }
  }

  /**
   * Comprueba si un mensaje de texto es un saludo.
   */
  isGreeting(message) {
    const greetings = ["hi", "hello", "hey", "hola", "buenas", "buenos dias"];
    return greetings.includes(message.toLowerCase().trim());
  }

  /**
   * Obtiene el nombre del remitente o usa un valor por defecto.
   */
  getSenderName(senderInfo) {
    return senderInfo?.profile?.name || senderInfo.wa_id || "Client";
  }

  /**
   * Envía un "eco" de vuelta al remitente para mensajes de texto no manejados.
   */
  async handleTextMessage(message) {
    const response = `Echo: ${message.text.body}`;
    await whatsappService.sendMessage(message.from, response, message.id);
    await whatsappService.markAsRead(message.id);
  }

  /**
   * ✅ CORREGIDO: Maneja la selección de opciones del menú principal
   */
  async handleMenuOption(to, option, messageId = null) {
    let response;

    switch (option) {
      case "agendar":
        this.appointmentState[to] = { step: "name" };
        response =
          "📅 *Proceso de Agendamiento de Cita*\n\nPara agendar tu cita, por favor proporciona tu *nombre completo*:";
        await whatsappService.sendMessage(to, response, messageId);
        break;

      case "consultar":
        // ✅ Activar el asistente IA para consultas
        this.assistantState[to] = { step: "question" };
        response =
          "🤖 *Asistente Virtual Activado*\n\n💬 Hola! Soy tu asistente inteligente. Puedes hacerme cualquier consulta sobre:\n\n• Información médica general\n• Medicamentos y tratamientos\n• Servicios de la clínica\n• Cualquier duda de salud\n\n¿En qué puedo ayudarte hoy?";
        await whatsappService.sendMessage(to, response, messageId);
        break;

      case "ubicacion":
        // ✅ CORREGIDO: Enviar ubicación usando el método del servicio
        try {
          response =
            "📍 *Nuestra Ubicación:*\n\nTe comparto nuestra ubicación exacta:";
          await whatsappService.sendMessage(to, response, messageId);

          // Enviar la ubicación real
          await whatsappService.sendLocation(to);

          // Mensaje adicional con información extra
          const extraInfo =
            "🕐 *Horarios de Atención:*\nLunes a Viernes: 8:00 AM - 6:00 PM\nSábados: 8:00 AM - 2:00 PM\n\n📞 Para emergencias: +57 3002726932";
          await whatsappService.sendMessage(to, extraInfo, null);
        } catch (error) {
          console.error("❌ Error enviando ubicación:", error.message);
          const fallbackResponse =
            "📍 Nuestra ubicación:\n\nAv. Principal, Maracaibo, Zulia, Venezuela\n\n📞 Teléfono: +57 3002726932\n📧 Email: cesarthdiz@gmail.com";
          await whatsappService.sendMessage(to, fallbackResponse, messageId);
        }
        break;

      case "emergencia":
        try {
          response =
            "🚑 *Contacto de Emergencia*\n\nTe comparto nuestro contacto de emergencia:";
          await whatsappService.sendMessage(to, response, messageId);

          // Enviar el contacto
          await whatsappService.sendContact(to);
        } catch (error) {
          console.error("❌ Error enviando contacto:", error.message);
          const fallbackResponse =
            "🚑 En caso de emergencia:\n\n📞 Llama al: +57 3002726932\n📧 Email: cesarthdiz@gmail.com";
          await whatsappService.sendMessage(to, fallbackResponse, messageId);
        }
        break;

      default:
        response =
          "❌ Lo siento, no entendí tu selección. Por favor, elige una de las opciones del menú.";
        await whatsappService.sendMessage(to, response, messageId);
    }
  }

  /**
   * Envía un mensaje de bienvenida personalizado.
   */
  async sendWelcomeMessage(to, messageId, senderInfo) {
    const name = this.getSenderName(senderInfo);
    const welcomeMessage = `👋 Hola *${name}*, ¡bienvenido/a a nuestro servicio de WhatsApp! ¿En qué puedo ayudarte hoy?`;
    await whatsappService.sendMessage(to, welcomeMessage, messageId);
    await whatsappService.markAsRead(messageId);
  }

  /**
   * Envía el menú principal con botones interactivos.
   */
  async sendWelcomeMenu(to, messageId) {
    const buttons = [
      { type: "reply", reply: { id: "schedule", title: "📅 Agendar Cita" } },
      { type: "reply", reply: { id: "services", title: "💬 Consultar" } },
      { type: "reply", reply: { id: "speak_to_agent", title: "📍 Ubicación" } },
    ];
    await whatsappService.sendInteractiveButtons(
      to,
      "Selecciona una opción:",
      buttons,
      messageId
    );
  }

  /**
   * Envía un mensaje multimedia (audio en este caso).
   */
  async sendMedia(to, messageId) {
    const mediaUrl = "https://s3.amazonaws.com/gndx.dev/medpet-audio.aac";
    const caption = "🎵 Aquí tienes el archivo de audio solicitado:";
    const type = "audio";
    try {
      await whatsappService.sendMediaMessage(to, type, mediaUrl, caption);
      await whatsappService.markAsRead(messageId);
    } catch (error) {
      console.error("Error sending media:", error.message);
      await whatsappService.sendMessage(
        to,
        "❌ Lo siento, hubo un error al enviar el medio.",
        messageId
      );
    }
  }

  /**
   * Completa el flujo de agendamiento de citas.
   */
  completeAppointmentFlow(to) {
    const appointment = this.appointmentState[to];
    if (!appointment) return;

    const userData = [
      appointment.name || "",
      appointment.date || "",
      appointment.time || "",
      new Date().toLocaleString("es-VE", { timeZone: "America/Caracas" }),
      appointment.consulta || "",
      appointment.monto || "0",
      appointment.proveedor || "",
      appointment.rif || "",
      appointment.pago || "",
    ];

    appendToSheet(userData);
    console.log(`✅ Cita completada para ${to}:`, userData);
    delete this.appointmentState[to];
  }

  /**
   * Maneja el progreso del flujo de agendamiento de citas.
   */
  async handleAppointmentFlow(to, message) {
    const state = this.appointmentState[to];
    let response;

    switch (state.step) {
      case "name":
        state.name = message.text.body.trim();
        state.step = "date";
        response = `✅ Gracias *${state.name}*.\n\n📅 Por favor, proporciona tu *fecha preferida* (formato: DD/MM/AAAA):\n\n_Ejemplo: 15/12/2024_`;
        break;

      case "date":
        state.date = message.text.body.trim();
        state.step = "time";
        response = `📅 Fecha registrada: *${state.date}*\n\n🕐 ¿A qué *hora* prefieres tu cita?\n\n_Ejemplo: 10:30 AM o 14:30_`;
        break;

      case "time":
        state.time = message.text.body.trim();

        // 🆕 Verificar disponibilidad
        const requestedDate = googleCalendarService.parseDateTime(
          state.date,
          state.time
        );
        if (requestedDate) {
          const existingEvents = await googleCalendarService.getEventsForDate(
            requestedDate
          );
          const hasConflict = existingEvents.some((event) => {
            const eventStart = new Date(event.start.dateTime);
            const diff = Math.abs(
              eventStart.getTime() - requestedDate.getTime()
            );
            return diff < 30 * 60 * 1000; // Menos de 30 minutos de diferencia
          });

          if (hasConflict) {
            response = `⚠️ *Horario no disponible*

🕐 Ya hay una cita programada cerca de esa hora.

📅 *Horarios disponibles para ${state.date}:*
- 9:00 AM
- 11:00 AM  
- 2:00 PM
- 4:00 PM

Por favor elige otro horario:`;
            break;
          }
        }

        state.step = "consulta";
        response = `🕐 Hora registrada: *${state.time}*\n\n💬 ¿Qué tipo de *consulta* necesitas?`;
        break;

      case "consulta":
        state.consulta = message.text.body.trim();
        state.step = "monto";
        response = `💬 Tipo de consulta: *${state.consulta}*\n\n💰 ¿Cuál es el *monto* de la consulta?\n\n_Ejemplo: 50, 100, 150 (solo números)_`;
        break;

      case "monto":
        const montoInput = message.text.body.trim();
        if (isNaN(montoInput) || montoInput === "") {
          response = `❌ Por favor ingresa un *monto válido* (solo números).\n\n💰 Ejemplo: 50, 100, 150`;
          break;
        }
        state.monto = montoInput;
        state.step = "proveedor";
        response = `💰 Monto registrado: *$${state.monto}*\n\n🏥 ¿Cuál es el nombre del *proveedor* o centro médico?\n\n_Ejemplo: Clínica San Rafael, Dr. García, etc._`;
        break;

      case "proveedor":
        state.proveedor = message.text.body.trim();
        state.step = "rif";
        response = `🏥 Proveedor registrado: *${state.proveedor}*\n\n📋 Por favor proporciona el *RIF* del proveedor:\n\n_Ejemplo: J-12345678-9, V-98765432-1_`;
        break;

      case "rif":
        state.rif = message.text.body.trim().toUpperCase();
        state.step = "pago";
        response = `📋 RIF registrado: *${state.rif}*\n\n💳 ¿Cuál será el *método de pago*?\n\n_Opciones: Efectivo, Tarjeta, Transferencia, Pago móvil, etc._`;
        break;

      case "pago":
        state.pago = message.text.body.trim();
        response = `✅ *¡CITA CONFIRMADA!* ✅\n\n📋 *RESUMEN DE TU CITA:*\n\n👤 *Nombre:* ${state.name}\n📅 *Fecha:* ${state.date}\n🕐 *Hora:* ${state.time}\n💬 *Consulta:* ${state.consulta}\n💰 *Monto:* $${state.monto}\n🏥 *Proveedor:* ${state.proveedor}\n📋 *RIF:* ${state.rif}\n💳 *Método de pago:* ${state.pago}\n\n🎉 ¡Gracias por confiar en nosotros!\n\n📧 Recibirás una confirmación por email próximamente.`;
        this.completeAppointmentFlow(to);
        break;

      default:
        response = `❌ Hubo un error en el proceso. Vamos a reiniciar.\n\n📅 Por favor, proporciona tu *nombre completo* para agendar tu cita:`;
        state.step = "name";
        break;
    }

    if (state.step !== "completed") {
      this.appointmentState[to] = state;
    }

    await whatsappService.sendMessage(to, response, message.id);
    await whatsappService.markAsRead(message.id);
  }

  /**
   * ✅ MÉTODO CORREGIDO: Maneja el flujo del asistente IA
   */
  async handleAssistantFlow(to, message, senderInfo) {
    const state = this.assistantState[to];

    if (state && state.step === "question") {
      try {
        console.log(`🤖 Consultando OpenRouter para: ${message.text.body}`);

        // Usar el servicio de DeepSeek
        const userName = this.getSenderName(senderInfo);
        const aiResponse = await openRouterService.generateResponse(
          message.text.body,
          userName,
          "Eres un asistente médico virtual de una farmacia/clínica. Proporciona información útil y precisa sobre salud, medicamentos y servicios médicos. Responde en español y de manera amigable."
        );

        // Enviar respuesta de la IA
        await whatsappService.sendMessage(to, `🤖 ${aiResponse}`, message.id);
        await whatsappService.markAsRead(message.id);

        // Limpiar el estado del asistente
        delete this.assistantState[to];

        // Enviar menú de opciones después de la respuesta
        setTimeout(async () => {
          const menuMessage = "¿Hay algo más en lo que pueda ayudarte?";
          const buttons = [
            {
              type: "reply",
              reply: { id: "schedule", title: "📅 Agendar Cita" },
            },
            {
              type: "reply",
              reply: { id: "services", title: "💬 Otra Consulta" },
            },
            {
              type: "reply",
              reply: { id: "speak_to_agent", title: "📍 Ubicación" },
            },
          ];
          await whatsappService.sendInteractiveButtons(
            to,
            menuMessage,
            buttons
          );
        }, 1000); // Esperar 1 segundo antes de mostrar el menú
      } catch (error) {
        console.error("❌ Error en handleAssistantFlow:", error.message);

        // Respuesta de fallback
        const fallbackResponse =
          "❌ Lo siento, no pude procesar tu consulta en este momento. Por favor intenta de nuevo más tarde.";
        await whatsappService.sendMessage(to, fallbackResponse, message.id);

        // Limpiar estado y mostrar menú
        delete this.assistantState[to];
        await this.sendWelcomeMenu(to, null);
      }
    }
  }

  /**
   * Permite cancelar el flujo de cita en cualquier momento
   */
  cancelAppointmentFlow(to) {
    if (this.appointmentState[to]) {
      delete this.appointmentState[to];
      return true;
    }
    return false;
  }

  /**
   * Obtiene el estado actual del flujo de cita para un usuario
   */
  getAppointmentState(to) {
    return this.appointmentState[to] || null;
  }

  /**
   * ✅ ELIMINADO: El método sendContact() duplicado e incorrecto
   * Ahora se usa whatsappService.sendContact() directamente
   */
  /**
   * Completa el flujo de agendamiento de citas Y crea evento en Google Calendar
   */
  async completeAppointmentFlow(to) {
    const appointment = this.appointmentState[to];
    if (!appointment) return;

    try {
      // 1. Crear evento en Google Calendar
      console.log("📅 Creando evento en Google Calendar...");
      const calendarResult = await googleCalendarService.createEvent(
        appointment
      );

      // 2. Preparar datos para Google Sheets (mantener funcionalidad existente)
      const userData = [
        appointment.name || "",
        appointment.date || "",
        appointment.time || "",
        new Date().toLocaleString("es-VE", { timeZone: "America/Caracas" }),
        appointment.consulta || "",
        appointment.monto || "0",
        appointment.proveedor || "",
        appointment.rif || "",
        appointment.pago || "",
        calendarResult.success ? calendarResult.eventId : "Error", // Agregar ID del evento
      ];

      // 3. Guardar en Google Sheets
      appendToSheet(userData);

      // 4. Enviar confirmación con link de calendario (si se creó exitosamente)
      if (calendarResult.success) {
        const confirmationMessage = `🎉 *¡CITA CONFIRMADA Y AGENDADA!* 🎉

📅 *Tu cita ha sido guardada en Google Calendar*
🔗 *Link directo:* ${calendarResult.eventLink}

📋 *RESUMEN COMPLETO:*
👤 *Nombre:* ${appointment.name}
📅 *Fecha:* ${appointment.date}
🕐 *Hora:* ${appointment.time}
💬 *Consulta:* ${appointment.consulta}
💰 *Monto:* $${appointment.monto}
🏥 *Proveedor:* ${appointment.proveedor}
📋 *RIF:* ${appointment.rif}
💳 *Método de pago:* ${appointment.pago}

✅ *La cita está sincronizada con Google Calendar*
📧 *Recibirás recordatorios automáticos*

¡Gracias por confiar en nosotros!`;

        await whatsappService.sendMessage(to, confirmationMessage);
      }

      console.log(`✅ Cita completada para ${to}:`, userData);
    } catch (error) {
      console.error("❌ Error en completeAppointmentFlow:", error.message);

      // Mensaje de error amigable
      const errorMessage = `⚠️ *Cita registrada* pero hubo un problema con Google Calendar.

📋 *Datos guardados exitosamente*
❌ *Calendar:* No se pudo sincronizar automáticamente

📞 *Por favor contacta a soporte para confirmar tu cita*

*Datos de tu cita:*
👤 ${appointment.name}
📅 ${appointment.date} - ${appointment.time}
💬 ${appointment.consulta}`;

      await whatsappService.sendMessage(to, errorMessage);
    } finally {
      // Siempre limpiar el estado
      delete this.appointmentState[to];
    }
  }
}

// Exporta una única instancia del MessageHandler.
export default new MessageHandler();
