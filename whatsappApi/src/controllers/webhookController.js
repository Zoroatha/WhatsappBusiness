// controllers/webhookController.js
import googleCalendarService from "../services/googleCalendarService.js";
import appendToSheet from "../services/googleSheetsService.js";

/**
 * ✅ Controlador para verificar el webhook (GET)
 */
const verifyWebhook = (req, res) => {
  const WEBHOOK_VERIFY_TOKEN =
    process.env.WEBHOOK_VERIFY_TOKEN || "mi_token_de_verificacion";

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado correctamente");
    res.status(200).send(challenge);
  } else {
    console.warn("❌ Verificación fallida del webhook");
    res.sendStatus(403);
  }
};

/**
 * ✅ Controlador para recibir mensajes del webhook (POST)
 */
const handleIncoming = async (req, res) => {
  try {
    const body = req.body;

    // 🛡️ Asegurarse que el body tiene estructura válida (Meta)
    if (!body.object || body.object !== "whatsapp_business_account") {
      console.warn("⚠️ Webhook recibido, pero no es de WhatsApp");
      return res.sendStatus(404);
    }

    // 🧠 Simular extracción de datos desde el mensaje recibido (esto lo adaptas tú)
    const appointmentData = {
      name: "César Díaz",
      date: "05/08/2025",
      time: "10:30 am",
      consulta: "Consulta general",
      monto: "25",
      proveedor: "Farmacia Zoroatha",
      rif: "J-12345678-9",
      pago: "Transferencia",
    };

    console.log("📥 Datos recibidos:", appointmentData);

    // ✅ Validar formato de fecha y hora
    if (
      !googleCalendarService.isValidDateTimeFormat(
        appointmentData.date,
        appointmentData.time
      )
    ) {
      return res
        .status(400)
        .json({ error: "❌ Formato de fecha/hora inválido" });
    }

    // ✅ Crear evento en Google Calendar
    const calendarResult = await googleCalendarService.createEvent(
      appointmentData
    );
    console.log("✅ Evento creado en Calendar:", calendarResult.eventId);

    // ✅ Crear fila para Google Sheets
    const row = [
      appointmentData.name,
      appointmentData.date,
      appointmentData.time,
      new Date().toLocaleString("es-VE", { timeZone: "America/Caracas" }),
      appointmentData.consulta,
      appointmentData.monto,
      appointmentData.proveedor,
      appointmentData.rif,
      appointmentData.pago,
      calendarResult.eventId,
    ];

    const sheetsResult = await appendToSheet(row);
    console.log("✅ Datos agregados a Sheets:", sheetsResult);

    res.status(200).json({
      success: true,
      calendarEventId: calendarResult.eventId,
      calendarLink: calendarResult.eventLink,
      sheetsStatus: sheetsResult,
    });
  } catch (error) {
    console.error("❌ Error al procesar la cita:", error.message);
    res.status(500).json({ error: "Error interno al procesar la cita" });
  }
};

export default {
  verifyWebhook,
  handleIncoming,
};
// controllers/webhookController.js
