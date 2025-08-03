import path from "path";
import { google } from "googleapis";

const sheets = google.sheets(`v4`);

async function addRowToSheets(auth, spreadSheetId, values) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: spreadSheetId,
    range: "'Hoja 1'!A1",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    resource: {
      values: [values],
    },
    auth,
  });
}

const appendToSheet = async (data) => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(
        process.cwd(),
        "src",
        "credentials",
        "credentials.json"
      ),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const authClient = await auth.getClient();

    const sheets = google.sheets({ version: "v4", auth: authClient });

    const spreadSheetId = "1Qw-ur4kXMMUYkiin2geCkfF4Y7D_lCphkuqL0CW0NZg"; // sin barra al final
    await addRowToSheets(authClient, spreadSheetId, data);

    return "Datos correctamente agregados";
  } catch (error) {
    console.error(
      `Error al agregar fila en Google Sheets: ${error.message || error}`
    );
    throw error;
  }
};

export default appendToSheet;
