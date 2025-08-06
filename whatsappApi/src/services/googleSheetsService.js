import { google } from "googleapis";
import config from "../config/env.js"; // ✅ CORREGIDO: Desde services/ hacia config/

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.auth = null;
    this.spreadsheetId = "1Qw-ur4kXMMUYkiin2geCkfF4Y7D_lCphkuqL0CW0NZg";
    this.initializeAuth();
  }

  /**
   * ✅ CORREGIDO: Usar variables de entorno en lugar de archivo local
   */
  async initializeAuth() {
    try {
      // ✅ Verificar que las credenciales estén disponibles
      if (!config.GOOGLE_SERVICE_ACCOUNT_EMAIL || !config.GOOGLE_PRIVATE_KEY) {
        console.warn(
          "⚠️ Google Sheets: Missing credentials, service will be disabled"
        );
        return;
      }

      // ✅ Usar credenciales desde variables de entorno
      this.auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: config.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"), // ✅ Corregir saltos de línea
        },
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      const authClient = await this.auth.getClient();
      this.sheets = google.sheets({ version: "v4", auth: authClient });

      console.log("✅ Google Sheets service initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing Google Sheets auth:", error.message);
      this.sheets = null; // Asegurar que el servicio esté marcado como no disponible
    }
  }

  /**
   * ✅ Verificar si el servicio está disponible
   */
  isAvailable() {
    return this.sheets !== null;
  }

  /**
   * ✅ CORREGIDO: Agregar fila con mejor manejo de errores
   */
  async addRowToSheets(values) {
    if (!this.isAvailable()) {
      throw new Error(
        "Google Sheets service is not available - missing credentials"
      );
    }

    try {
      console.log("📊 Adding row to Google Sheets:", values);

      const result = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: "'Hoja 1'!A1", // ✅ Asegurar que la hoja existe
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        resource: {
          values: [values],
        },
      });

      console.log("✅ Row added successfully to Google Sheets");
      return result;
    } catch (error) {
      console.error("❌ Error adding row to Google Sheets:", error.message);

      // ✅ Mejor información de error para debugging
      if (error.code === 404) {
        throw new Error("Spreadsheet not found or access denied");
      } else if (error.code === 400) {
        throw new Error("Invalid data format or range");
      } else {
        throw new Error(`Google Sheets API error: ${error.message}`);
      }
    }
  }

  /**
   * ✅ NUEVO: Método para verificar conectividad
   */
  async healthCheck() {
    if (!this.isAvailable()) {
      return { status: "disabled", message: "Missing credentials" };
    }

    try {
      // Intentar leer la primera celda para verificar acceso
      await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "A1",
      });

      return { status: "healthy", message: "Google Sheets accessible" };
    } catch (error) {
      return {
        status: "unhealthy",
        message: `Google Sheets error: ${error.message}`,
        code: error.code,
      };
    }
  }

  /**
   * ✅ NUEVO: Obtener datos de la hoja (útil para debugging)
   */
  async getSheetData(range = "A1:Z100") {
    if (!this.isAvailable()) {
      throw new Error("Google Sheets service is not available");
    }

    try {
      const result = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range,
      });

      return result.data.values || [];
    } catch (error) {
      console.error("❌ Error getting sheet data:", error.message);
      throw error;
    }
  }

  /**
   * ✅ NUEVO: Crear headers si no existen
   */
  async ensureHeaders() {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const headers = [
        "Nombre",
        "Fecha",
        "Hora",
        "Fecha Registro",
        "Consulta",
        "Monto",
        "Proveedor",
        "RIF",
        "Método Pago",
        "ID Evento Calendar",
      ];

      // Verificar si ya existen headers
      const existingData = await this.getSheetData("A1:J1");
      if (existingData.length === 0) {
        console.log("📊 Creating headers in Google Sheets...");
        await this.addRowToSheets(headers);
        console.log("✅ Headers created successfully");
      }

      return true;
    } catch (error) {
      console.error("❌ Error ensuring headers:", error.message);
      return false;
    }
  }
}

// ✅ Crear instancia del servicio
const googleSheetsService = new GoogleSheetsService();

/**
 * ✅ FUNCIÓN PRINCIPAL CORREGIDA: Mantener compatibilidad con código existente
 */
const appendToSheet = async (data) => {
  try {
    if (!googleSheetsService.isAvailable()) {
      console.warn("⚠️ Google Sheets service not available, skipping...");
      return "Google Sheets service not configured";
    }

    // ✅ Asegurar que los headers existan
    await googleSheetsService.ensureHeaders();

    // ✅ Agregar la fila de datos
    await googleSheetsService.addRowToSheets(data);

    console.log("✅ Data successfully added to Google Sheets");
    return "Datos correctamente agregados";
  } catch (error) {
    console.error(
      `❌ Error al agregar fila en Google Sheets: ${error.message}`
    );

    // ✅ No lanzar el error, solo registrarlo (para que el bot siga funcionando)
    return `Error: ${error.message}`;
  }
};

// ✅ Exportar tanto el servicio como la función para compatibilidad
export default appendToSheet;
export { googleSheetsService };
