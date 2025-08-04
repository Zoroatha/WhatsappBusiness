// Importa el servicio de WhatsApp para enviar mensajes.
import whatsappService from "./whatsappService.js";
// Importa la función para añadir datos a Google Sheets.
import appendToSheet from "./googleSheetsService.js";
// Importa el servicio de openRouter para generar respuestas.
import openRouterService from "../services/openRouterService.js";
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
    try {
      console.log("📨 Processing message in MessageHandler:", {
        type: message?.type,
        from: message?.from,
        hasAppointmentState: !!this.appointmentState[message?.from],
        hasAssistantState: !!this.assistantState[message?.from],
      });

      if (message?.type === "text") {
        const incomingMessage = message.text.body.toLowerCase().trim();

        // Comando para cancelar cualquier flujo activo
        if (incomingMessage === "cancelar" || incomingMessage === "cancel") {
          await this.cancelAllFlows(message.from, message.id);
          return;
        }

        // Verifica si el usuario quiere ver la agenda de hoy
        if (incomingMessage === "citas hoy" || incomingMessage === "agenda") {
          await this.showTodayAppointments(message.from, message.id);
          return;
        }

        // Reconoce y responde a saludos.
        if (this.isGreeting(incomingMessage)) {
          await this.resetUserStates(message.from); // Limpiar estados previos
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

        // Para cualquier otro mensaje de texto, mostrar menú principal
        await this.sendWelcomeMenu(message.from, message.id);
      }

      // Si el mensaje es una respuesta de botón interactivo.
      else if (
        message?.type === "interactive" &&
        message.interactive?.type === "button_reply"
      ) {
        const buttonId = message.interactive.button_reply.id;

        // Limpiar estados previos antes de procesar nueva opción
        await this.resetUserStates(message.from);

        switch (buttonId) {
          case "schedule":
            await this.handleMenuOption(message.from, "agendar", message.id);
            break;
          case "services":
            await this.handleMenuOption(message.from, "consultar", message.id);
            break;
          case "location":
            await this.handleMenuOption(message.from, "ubicacion", message.id);
            break;
          case "emergency":
            await this.handleMenuOption(message.from, "emergencia", message.id);
            break;
          default:
            await this.sendWelcomeMenu(message.from, message.id);
        }

        await whatsappService.markAsRead(message.id);
      }
    } catch (error) {
      console.error("❌ Error in handleIncomingMessage:", error);
      console.error("📋 Stack trace:", error.stack);

      // Limpiar estados en caso de error
      await this.resetUserStates(message?.from);

      // Enviar mensaje de error al usuario
      try {
        if (message?.from) {
          await whatsappService.sendMessage(
            message.from,
            "❌ Lo siento, ocurrió un error procesando tu mensaje. Por favor intenta de nuevo escribiendo 'hola'.",
            message?.id
          );
        }
      } catch (sendError) {
        console.error("❌ Failed to send error message:", sendError);
      }
    }
  }

  /**
   * ✅ NUEVO: Resetea todos los estados de un usuario
   */
  async resetUserStates(phoneNumber) {
    if (this.appointmentState[phoneNumber]) {
      delete this.appointmentState[phoneNumber];
    }
    if (this.assistantState[phoneNumber]) {
      delete this.assistantState[phoneNumber];
    }
  }

  /**
   * ✅ NUEVO: Cancela todos los flujos activos
   */
  async cancelAllFlows(to, messageId) {
    try {
      const hadActiveFlow =
        this.appointmentState[to] || this.assistantState[to];

      await this.resetUserStates(to);

      const message = hadActiveFlow
        ? "✅ Proceso cancelado. ¿En qué puedo ayudarte?"
        : "👋 Hola! ¿En qué puedo ayudarte hoy?";

      await whatsappService.sendMessage(to, message, messageId);
      await this.sendWelcomeMenu(to, null);
      await whatsappService.markAsRead(messageId);
    } catch (error) {
      console.error("❌ Error in cancelAllFlows:", error);
    }
  }

  /**
   * Muestra las citas programadas para hoy
   */
  async showTodayAppointments(to, messageId) {
    try {
      console.log("📅 Showing today appointments for:", to);

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
      await whatsappService.markAsRead(messageId);
    } catch (error) {
      console.error("❌ Error mostrando citas:", error);
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
    const greetings = [
      "hi",
      "hello",
      "hey",
      "hola",
      "buenas",
      "buenos dias",
      "buen dia",
      "buenas tardes",
      "buenas noches",
      "saludos",
      "que tal",
      "inicio",
      "empezar",
      "menu",
    ];
    return greetings.some((greeting) =>
      message.toLowerCase().includes(greeting)
    );
  }

  /**
   * Obtiene el nombre del remitente o usa un valor por defecto.
   */
  getSenderName(senderInfo) {
    return senderInfo?.profile?.name || senderInfo?.wa_id || "Cliente";
  }

  /**
   * ✅ CORREGIDO: Maneja la selección de opciones del menú principal
   */
  async handleMenuOption(to, option, messageId = null) {
    try {
      console.log(`🎯 Handling menu option: ${option} for ${to}`);

      let response;

      switch (option) {
        case "agendar":
          this.appointmentState[to] = { step: "name" };
          response = `📅 *Proceso de Agendamiento de Cita*

Para agendar tu cita, necesito algunos datos:

👤 Por favor proporciona tu *nombre completo*:

💡 _Escribe 'cancelar' en cualquier momento para salir_`;
          await whatsappService.sendMessage(to, response, messageId);
          break;

        case "consultar":
          this.assistantState[to] = { step: "question" };
          response = `🤖 *Asistente Virtual Activado*

💬 Hola! Soy tu asistente inteligente. Puedo ayudarte con:

• 💊 Información sobre medicamentos
• 🏥 Servicios de la clínica  
• 🩺 Consultas médicas generales
• ❓ Cualquier duda de salud

¿En qué puedo ayudarte hoy?

💡 _Escribe 'cancelar' para volver al menú principal_`;
          await whatsappService.sendMessage(to, response, messageId);
          break;

        case "ubicacion":
          try {
            response = `📍 *Nuestra Ubicación*

Te comparto nuestra ubicación exacta:`;
            await whatsappService.sendMessage(to, response, messageId);

            // Enviar la ubicación real
            await whatsappService.sendLocation(to);

            // Información adicional
            const extraInfo = `🕐 *Horarios de Atención:*
• Lunes a Viernes: 8:00 AM - 6:00 PM
• Sábados: 8:00 AM - 2:00 PM
• Domingos: Cerrado

📞 *Contacto:* +57 3002726932
📧 *Email:* cesarthdiz@gmail.com`;

            await whatsappService.sendMessage(to, extraInfo, null);
          } catch (error) {
            console.error("❌ Error enviando ubicación:", error.message);
            const fallbackResponse = `📍 *Nuestra Ubicación*

🏥 Av. Principal, Maracaibo, Zulia, Venezuela

🕐 *Horarios de Atención:*
• Lunes a Viernes: 8:00 AM - 6:00 PM  
• Sábados: 8:00 AM - 2:00 PM
• Domingos: Cerrado

📞 *Contacto:* +57 3002726932
📧 *Email:* cesarthdiz@gmail.com`;
            await whatsappService.sendMessage(to, fallbackResponse, messageId);
          }
          break;

        case "emergencia":
          try {
            response = `🚑 *Contacto de Emergencia*

Te comparto nuestro contacto de emergencia:`;
            await whatsappService.sendMessage(to, response, messageId);

            // Enviar el contacto
            await whatsappService.sendContact(to);

            // Información adicional de emergencia
            const emergencyInfo = `🚨 *Para Emergencias 24/7:*

📞 Línea directa: +57 3002726932
📧 Email urgente: cesarthdiz@gmail.com

⚡ *Respuesta inmediata garantizada*`;

            await whatsappService.sendMessage(to, emergencyInfo, null);
          } catch (error) {
            console.error("❌ Error enviando contacto:", error.message);
            const fallbackResponse = `🚑 *Contacto de Emergencia*

📞 Línea directa: +57 3002726932
📧 Email urgente: cesarthdiz@gmail.com

🚨 Disponible 24/7 para emergencias`;
            await whatsappService.sendMessage(to, fallbackResponse, messageId);
          }
          break;

        default:
          response =
            "❌ Lo siento, no entendí tu selección. Te muestro las opciones disponibles:";
          await whatsappService.sendMessage(to, response, messageId);
          await this.sendWelcomeMenu(to, null);
      }
    } catch (error) {
      console.error("❌ Error in handleMenuOption:", error);
      const fallbackResponse =
        "❌ Error procesando tu selección. Te muestro el menú principal:";
      await whatsappService.sendMessage(to, fallbackResponse, messageId);
      await this.sendWelcomeMenu(to, null);
    }
  }

  /**
   * Envía un mensaje de bienvenida personalizado.
   */
  async sendWelcomeMessage(to, messageId, senderInfo) {
    try {
      const name = this.getSenderName(senderInfo);
      const welcomeMessage = `👋 ¡Hola *${name}*!

Bienvenido/a a nuestro servicio de atención por WhatsApp 🏥

¿En qué puedo ayudarte hoy?`;

      await whatsappService.sendMessage(to, welcomeMessage, messageId);
      await whatsappService.markAsRead(messageId);
    } catch (error) {
      console.error("❌ Error in sendWelcomeMessage:", error);
    }
  }

  /**
   * ✅ MEJORADO: Envía el menú principal con botones interactivos más completo
   */
  async sendWelcomeMenu(to, messageId) {
    try {
      const buttons = [
        { type: "reply", reply: { id: "schedule", title: "📅 Agendar Cita" } },
        { type: "reply", reply: { id: "services", title: "🤖 Consultar IA" } },
        { type: "reply", reply: { id: "location", title: "📍 Ubicación" } },
      ];

      const menuText = `📋 *Menú Principal*

Selecciona una opción:`;

      await whatsappService.sendInteractiveButtons(
        to,
        menuText,
        buttons,
        messageId
      );
    } catch (error) {
      console.error("❌ Error in sendWelcomeMenu:", error);
      // Fallback a texto simple si fallan los botones
      const fallbackText = `📋 *Opciones disponibles:*

1️⃣ Escribe "agendar" para programar una cita
2️⃣ Escribe "consultar" para hablar con nuestro asistente IA  
3️⃣ Escribe "ubicacion" para ver dónde estamos
4️⃣ Escribe "hola" para volver a este menú`;

      await whatsappService.sendMessage(to, fallbackText, messageId);
    }
  }

  /**
   * Envía un mensaje multimedia (audio en este caso).
   */
  async sendMedia(to, messageId) {
    try {
      const mediaUrl = "https://s3.amazonaws.com/gndx.dev/medpet-audio.aac";
      const caption = "🎵 Aquí tienes el archivo de audio solicitado:";
      const type = "audio";

      await whatsappService.sendMediaMessage(to, type, mediaUrl, caption);
      await whatsappService.markAsRead(messageId);
    } catch (error) {
      console.error("❌ Error sending media:", error.message);
      await whatsappService.sendMessage(
        to,
        "❌ Lo siento, hubo un error al enviar el archivo multimedia.",
        messageId
      );
    }
  }

  /**
   * ✅ MEJORADO: Maneja el progreso del flujo de agendamiento de citas
   */
  async handleAppointmentFlow(to, message) {
    try {
      console.log(
        `📋 Handling appointment flow for ${to}, step: ${this.appointmentState[to]?.step}`
      );

      const state = this.appointmentState[to];
      if (!state) {
        console.error("❌ No appointment state found for:", to);
        await this.sendWelcomeMenu(to, message.id);
        return;
      }

      let response;

      switch (state.step) {
        case "name":
          const nameInput = message.text.body.trim();
          if (nameInput.length < 2) {
            response = `❌ Por favor ingresa un nombre válido (mínimo 2 caracteres):`;
            break;
          }
          state.name = nameInput;
          state.step = "date";
          response = `✅ Gracias *${state.name}*

📅 Ahora necesito la *fecha* para tu cita:

📌 Formato: DD/MM/AAAA
📝 Ejemplo: 15/12/2024

¿Qué fecha prefieres?`;
          break;

        case "date":
          const dateInput = message.text.body.trim();
          if (!this.isValidDate(dateInput)) {
            response = `❌ Fecha inválida. Por favor usa el formato DD/MM/AAAA

📝 Ejemplos válidos:
• 15/12/2024
• 01/01/2025

Ingresa la fecha nuevamente:`;
            break;
          }
          state.date = dateInput;
          state.step = "time";
          response = `📅 Fecha registrada: *${state.date}*

🕐 ¿A qué *hora* prefieres tu cita?

📌 Horarios disponibles:
• 9:00 AM - 11:00 AM
• 2:00 PM - 5:00 PM

📝 Ejemplos: 10:30 AM, 14:30, 3:00 PM`;
          break;

        case "time":
          const timeInput = message.text.body.trim();
          if (!this.isValidTime(timeInput)) {
            response = `❌ Hora inválida. Por favor usa un formato válido:

📝 Ejemplos:
• 10:30 AM
• 14:30  
• 3:00 PM
• 15:00

Ingresa la hora nuevamente:`;
            break;
          }

          state.time = timeInput;

          // Verificar disponibilidad en Google Calendar
          try {
            const requestedDate = googleCalendarService.parseDateTime(
              state.date,
              state.time
            );
            if (requestedDate) {
              const existingEvents =
                await googleCalendarService.getEventsForDate(requestedDate);
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
• 9:00 AM
• 11:00 AM  
• 2:00 PM
• 4:00 PM

Por favor elige otro horario:`;
                break;
              }
            }
          } catch (calendarError) {
            console.warn(
              "⚠️ Calendar check failed, continuing:",
              calendarError.message
            );
          }

          state.step = "consulta";
          response = `🕐 Hora confirmada: *${state.time}*

💬 ¿Qué tipo de *consulta* necesitas?

📝 Ejemplos:
• Consulta médica general
• Control de presión arterial  
• Revisión de medicamentos
• Chequeo de rutina`;
          break;

        case "consulta":
          const consultaInput = message.text.body.trim();
          if (consultaInput.length < 3) {
            response = `❌ Por favor describe tu consulta con más detalle (mínimo 3 caracteres):`;
            break;
          }
          state.consulta = consultaInput;
          state.step = "monto";
          response = `💬 Consulta: *${state.consulta}*

💰 ¿Cuál es el *monto* de la consulta?

📝 Solo ingresa números (ejemplo: 50, 100, 150)`;
          break;

        case "monto":
          const montoInput = message.text.body.trim();
          if (
            isNaN(montoInput) ||
            montoInput === "" ||
            parseFloat(montoInput) <= 0
          ) {
            response = `❌ Monto inválido. Ingresa solo números:

📝 Ejemplos válidos: 50, 100, 150.5

💰 ¿Cuál es el monto?`;
            break;
          }
          state.monto = parseFloat(montoInput).toFixed(2);
          state.step = "proveedor";
          response = `💰 Monto: *$${state.monto}*

🏥 ¿Cuál es el *proveedor* o centro médico?

📝 Ejemplos:
• Clínica San Rafael
• Dr. García  
• Hospital Central`;
          break;

        case "proveedor":
          const proveedorInput = message.text.body.trim();
          if (proveedorInput.length < 2) {
            response = `❌ Nombre del proveedor muy corto. Por favor ingresa un nombre válido:`;
            break;
          }
          state.proveedor = proveedorInput;
          state.step = "rif";
          response = `🏥 Proveedor: *${state.proveedor}*

📋 Ingresa el *RIF* del proveedor:

📝 Formato: J-12345678-9 o V-98765432-1`;
          break;

        case "rif":
          const rifInput = message.text.body.trim().toUpperCase();
          if (!this.isValidRIF(rifInput)) {
            response = `❌ RIF inválido. Usa el formato correcto:

📝 Ejemplos:
• J-12345678-9
• V-98765432-1  
• G-20123456-7

Ingresa el RIF nuevamente:`;
            break;
          }
          state.rif = rifInput;
          state.step = "pago";
          response = `📋 RIF: *${state.rif}*

💳 ¿Cuál será el *método de pago*?

📝 Opciones:
• Efectivo
• Tarjeta de débito/crédito
• Transferencia bancaria
• Pago móvil`;
          break;

        case "pago":
          const pagoInput = message.text.body.trim();
          if (pagoInput.length < 2) {
            response = `❌ Método de pago muy corto. Por favor especifica el método:`;
            break;
          }
          state.pago = pagoInput;

          // Completar el agendamiento
          await this.completeAppointmentFlow(to);
          return; // Salir aquí porque completeAppointmentFlow maneja la respuesta

        default:
          console.error("❌ Unknown appointment step:", state.step);
          delete this.appointmentState[to];
          response = `❌ Error en el proceso. Vamos a reiniciar.

📅 Por favor, proporciona tu *nombre completo*:`;
          this.appointmentState[to] = { step: "name" };
          break;
      }

      // Actualizar estado y enviar respuesta
      if (this.appointmentState[to]) {
        this.appointmentState[to] = state;
      }

      await whatsappService.sendMessage(to, response, message.id);
      await whatsappService.markAsRead(message.id);
    } catch (error) {
      console.error("❌ Error in handleAppointmentFlow:", error);

      // Reset appointment state and send error message
      delete this.appointmentState[to];
      const errorResponse = `❌ Error en el proceso de cita. 

Por favor inicia de nuevo escribiendo 'hola' o 'agendar'.`;
      await whatsappService.sendMessage(to, errorResponse, message.id);
    }
  }

  /**
   * ✅ MEJORADO: Maneja el flujo del asistente IA
   */
  async handleAssistantFlow(to, message, senderInfo) {
    try {
      console.log(`🤖 Handling assistant flow for ${to}`);

      const state = this.assistantState[to];

      if (state && state.step === "question") {
        const userQuestion = message.text.body.trim();

        if (userQuestion.length < 2) {
          const response = `❌ Tu consulta es muy corta. Por favor describe tu pregunta con más detalle:

💡 Ejemplos:
• ¿Qué medicamento es bueno para el dolor de cabeza?
• ¿Cuáles son los síntomas de la gripe?
• ¿Qué servicios ofrecen en la clínica?`;

          await whatsappService.sendMessage(to, response, message.id);
          return;
        }

        console.log(`🤖 Consultando OpenRouter para: ${userQuestion}`);

        // Indicador de que está procesando
        await whatsappService.sendMessage(
          to,
          "🤖 Consultando con nuestro asistente médico... ⏳",
          message.id
        );

        // Usar el servicio de OpenRouter
        const userName = this.getSenderName(senderInfo);
        const systemPrompt = `Eres un asistente médico virtual de una farmacia/clínica en Venezuela. 

INSTRUCCIONES:
- Proporciona información útil y precisa sobre salud, medicamentos y servicios médicos
- Responde en español de manera amigable y profesional
- Si la consulta requiere diagnóstico médico, recomienda consultar con un profesional
- Mantén respuestas concisas pero informativas (máximo 200 palabras)
- Usa emojis apropiados para hacer la respuesta más amigable

CONTEXTO DE LA CLÍNICA:
- Horarios: Lunes a Viernes 8AM-6PM, Sábados 8AM-2PM
- Servicios: Consultas médicas, farmacia, exámenes básicos
- Contacto: +57 3002726932`;

        const aiResponse = await openRouterService.generateResponse(
          userQuestion,
          userName,
          systemPrompt
        );

        // Enviar respuesta de la IA
        await whatsappService.sendMessage(to, `🤖 ${aiResponse}`, null);
        await whatsappService.markAsRead(message.id);

        // Limpiar el estado del asistente
        delete this.assistantState[to];

        // Enviar menú de opciones después de la respuesta
        setTimeout(async () => {
          try {
            const followUpMessage = `¿Te fue útil la información? ¿Hay algo más en lo que pueda ayudarte?`;
            await whatsappService.sendMessage(to, followUpMessage, null);

            const buttons = [
              {
                type: "reply",
                reply: { id: "services", title: "🤖 Otra Consulta" },
              },
              {
                type: "reply",
                reply: { id: "schedule", title: "📅 Agendar Cita" },
              },
              {
                type: "reply",
                reply: { id: "location", title: "📍 Ubicación" },
              },
            ];

            await whatsappService.sendInteractiveButtons(
              to,
              "Opciones disponibles:",
              buttons
            );
          } catch (menuError) {
            console.error("❌ Error sending follow-up menu:", menuError);
          }
        }, 2000); // Esperar 2 segundos
      }
    } catch (error) {
      console.error("❌ Error en handleAssistantFlow:", error.message);

      // Respuesta de fallback
      const fallbackResponse = `❌ Lo siento, no pude procesar tu consulta en este momento.

🔄 Por favor intenta:
• Reformular tu pregunta
• Contactar directamente: +57 3002726932
• Intentar más tarde`;

      await whatsappService.sendMessage(to, fallbackResponse, message.id);

      // Limpiar estado y mostrar menú
      delete this.assistantState[to];

      setTimeout(async () => {
        await this.sendWelcomeMenu(to, null);
      }, 1000);
    }
  }

  /**
   * ✅ MEJORADO: Completa el flujo de agendamiento de citas y crea evento en Google Calendar
   */
  async completeAppointmentFlow(to) {
    const appointment = this.appointmentState[to];
    if (!appointment) {
      console.error("❌ No appointment data found for:", to);
      return;
    }

    try {
      console.log(`✅ Completing appointment for ${to}:`, appointment);

      let calendarResult = { success: false, eventId: null, eventLink: null };

      // 1. Intentar crear evento en Google Calendar
      try {
        console.log("📅 Creando evento en Google Calendar...");
        calendarResult = await googleCalendarService.createEvent(appointment);
      } catch (calendarError) {
        console.warn("⚠️ Calendar creation failed:", calendarError.message);
      }

      // 2. Preparar datos para Google Sheets
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
      try {
        await appendToSheet(userData);
        console.log("✅ Datos guardados en Google Sheets");
      } catch (sheetsError) {
        console.error("❌ Error saving to Google Sheets:", sheetsError.message);
      }

      // 4. Enviar confirmación según el resultado
      if (calendarResult.success) {
        const confirmationMessage = `🎉 *¡CITA CONFIRMADA Y AGENDADA!* 🎉

✅ *Tu cita ha sido guardada exitosamente*

📋 *RESUMEN COMPLETO:*
👤 *Paciente:* ${appointment.name}
📅 *Fecha:* ${appointment.date}
🕐 *Hora:* ${appointment.time}
💬 *Tipo de consulta:* ${appointment.consulta}
💰 *Monto:* ${appointment.monto}
🏥 *Proveedor:* ${appointment.proveedor}
📋 *RIF:* ${appointment.rif}
💳 *Método de pago:* ${appointment.pago}

📅 *Calendario:* ${
          calendarResult.eventLink
            ? `[Ver en Google Calendar](${calendarResult.eventLink})`
            : "Evento creado exitosamente"
        }

🔔 *Recordatorios automáticos activados*
📧 *Confirmación por email próximamente*

¡Gracias por confiar en nosotros! 🙏`;

        await whatsappService.sendMessage(to, confirmationMessage);
      } else {
        // Mensaje si no se pudo crear en Calendar pero se guardó en Sheets
        const basicConfirmation = `✅ *¡CITA CONFIRMADA!* ✅

📋 *RESUMEN DE TU CITA:*
👤 *Paciente:* ${appointment.name}
📅 *Fecha:* ${appointment.date}
🕐 *Hora:* ${appointment.time}
💬 *Tipo de consulta:* ${appointment.consulta}
💰 *Monto:* ${appointment.monto}
🏥 *Proveedor:* ${appointment.proveedor}
📋 *RIF:* ${appointment.rif}
💳 *Método de pago:* ${appointment.pago}

📝 *Tu cita ha sido registrada correctamente*
📧 *Recibirás confirmación por email próximamente*

¡Gracias por confiar en nosotros! 🙏`;

        await whatsappService.sendMessage(to, basicConfirmation);
      }

      // 5. Enviar información adicional
      const additionalInfo = `📋 *Información Importante:*

🕐 *Por favor llega 10 minutos antes*
📄 *Trae documento de identidad*
💊 *Si tomas medicamentos, trae la lista*

📞 *¿Necesitas cambiar la cita?*
Contacta: +57 3002726932

🏥 *Ubicación:* Av. Principal, Maracaibo
🕐 *Horarios:* Lun-Vie 8AM-6PM, Sáb 8AM-2PM`;

      await whatsappService.sendMessage(to, additionalInfo);

      console.log(`✅ Cita completada exitosamente para ${to}`);

      // 6. Mostrar menú después de un tiempo
      setTimeout(async () => {
        try {
          await whatsappService.sendMessage(
            to,
            "¿Hay algo más en lo que pueda ayudarte?"
          );
          await this.sendWelcomeMenu(to, null);
        } catch (menuError) {
          console.error("❌ Error sending final menu:", menuError);
        }
      }, 3000);
    } catch (error) {
      console.error("❌ Error en completeAppointmentFlow:", error.message);

      // Mensaje de error amigable pero con los datos de la cita
      const errorMessage = `⚠️ *Problema guardando tu cita*

📋 *Datos registrados:*
👤 ${appointment.name}
📅 ${appointment.date} - ${appointment.time}
💬 ${appointment.consulta}
💰 ${appointment.monto}

🔄 *Tu cita será procesada manualmente*

📞 *Contacta para confirmar:*
📱 WhatsApp: +57 3002726932
📧 Email: cesarthdiz@gmail.com

¡Disculpa las molestias!`;

      await whatsappService.sendMessage(to, errorMessage);
    } finally {
      // Siempre limpiar el estado
      delete this.appointmentState[to];
    }
  }

  /**
   * ✅ NUEVO: Validadores de entrada
   */
  isValidDate(dateString) {
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = dateString.match(dateRegex);

    if (!match) return false;

    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    const year = parseInt(match[3]);

    // Validaciones básicas
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year < 2024 || year > 2030) return false;

    // Verificar que la fecha no sea en el pasado
    const inputDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return inputDate >= today;
  }

  isValidTime(timeString) {
    const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$|^(\d{1,2}):(\d{2})$/i;
    return timeRegex.test(timeString.trim());
  }

  isValidRIF(rifString) {
    const rifRegex = /^[VJEGPN]-\d{8}-\d$/;
    return rifRegex.test(rifString);
  }

  /**
   * ✅ MEJORADO: Permite cancelar el flujo de cita en cualquier momento
   */
  cancelAppointmentFlow(to) {
    if (this.appointmentState[to]) {
      delete this.appointmentState[to];
      console.log(`✅ Appointment flow cancelled for ${to}`);
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
   * ✅ NUEVO: Obtiene el estado actual del asistente para un usuario
   */
  getAssistantState(to) {
    return this.assistantState[to] || null;
  }

  /**
   * ✅ NUEVO: Método para limpiar estados antiguos (mantenimiento)
   */
  cleanupOldStates() {
    const now = Date.now();
    const TIMEOUT = 30 * 60 * 1000; // 30 minutos

    // Limpiar estados de citas antiguos
    Object.keys(this.appointmentState).forEach((phoneNumber) => {
      const state = this.appointmentState[phoneNumber];
      if (state.timestamp && now - state.timestamp > TIMEOUT) {
        delete this.appointmentState[phoneNumber];
        console.log(`🧹 Cleaned old appointment state for ${phoneNumber}`);
      }
    });

    // Limpiar estados de asistente antiguos
    Object.keys(this.assistantState).forEach((phoneNumber) => {
      const state = this.assistantState[phoneNumber];
      if (state.timestamp && now - state.timestamp > TIMEOUT) {
        delete this.assistantState[phoneNumber];
        console.log(`🧹 Cleaned old assistant state for ${phoneNumber}`);
      }
    });
  }

  /**
   * ✅ NUEVO: Método de utilidad para logging detallado
   */
  logUserActivity(phoneNumber, action, details = {}) {
    console.log(`👤 User Activity - ${phoneNumber}:`, {
      action,
      timestamp: new Date().toISOString(),
      hasAppointmentState: !!this.appointmentState[phoneNumber],
      hasAssistantState: !!this.assistantState[phoneNumber],
      ...details,
    });
  }
}

// Exporta una única instancia del MessageHandler.
export default new MessageHandler();
