// ============================================================
// VGV SpA — Google Apps Script (Code.gs) FINAL SIMPLIFICADO
// ============================================================

const SPREADSHEET_ID    = "1UDwJH8CtZUDufUI5rI9Gv7VeC9pvI62RXBJhw_8BK_0";
const SHEET_LOGIN_ID    = "14dsVF9EppWfPNUBwNssNh3Jvzi55VbvZam1d9dwynwM";
const HOJA_ENTREGAS     = "Entregas";
const FOLDER_FOTOS_NAME = "VGV_Fotos_Entregas";

// ============================================================
// ENTRYPOINT
// ============================================================
function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    // El frontend envía URLSearchParams → leer con e.parameter.data
    const data   = JSON.parse(e.parameter.data);
    const accion = data.accion;

    let respuesta = {};

    if (accion === "login")            respuesta = login(data);
    if (accion === "registrarEntrega") respuesta = registrarEntrega(data);

    return output.setContent(JSON.stringify(respuesta));

  } catch (err) {
    return output.setContent(JSON.stringify({ ok: false, error: err.message }));
  }
}

// ============================================================
// doGet — útil para probar que el backend está vivo
// ============================================================
function doGet(e) {
  return ContentService
    .createTextOutput("OK — VGV Backend activo")
    .setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================
// LOGIN — basado en tu hoja real:
// A=usuario | B=clave | C=nombre | D=rol
// ============================================================
function login(data) {
  const usuario  = (data.usuario  || "").trim().toLowerCase();
  const password = (data.password || "").trim();

  const ss   = SpreadsheetApp.openById(SHEET_LOGIN_ID);
  const hoja = ss.getSheets()[0];
  const rows = hoja.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    var row    = rows[i];
    var user   = (row[0] || "").toString().trim().toLowerCase();
    var pass   = (row[1] || "").toString().trim();
    var nombre = (row[2] || "").toString().trim();
    var rol    = (row[3] || "").toString().trim();

    if (user === usuario && pass === password) {
      logAccion("login", { usuario: usuario });
      return { ok: true, usuario: { nombre: nombre, rol: rol } };
    }
  }

  return { ok: false, error: "Usuario o contraseña incorrectos" };
}
// ============================================================
// REGISTRAR ENTREGA — guarda foto + datos en hoja Entregas
// ============================================================
function registrarEntrega(data) {
  try {
    var numero         = (data.numero         || "").trim();   // antes "guia"
    var usuario        = (data.usuario        || "").trim();
    var rol            = (data.rol            || "").trim();
    var fecha          = (data.fecha          || "").trim();
    var hora           = (data.hora           || "").trim();
    var estado         = (data.estado         || "").trim();
    var patente        = (data.patente        || "").trim();
    var tipoDocumento  = (data.tipoDocumento  || "").trim();   // ← NUEVO
    var foto64         = data.fotoBase64 || "";

    if (!numero)  return { ok: false, error: "Falta el número del documento" };
    if (!foto64)  return { ok: false, error: "Falta la foto" };

    // Guardar foto en Drive
    // Carpeta raíz de fotos
      var rootFolder = getOrCreateFolderByName(FOLDER_FOTOS_NAME);

    // Crear carpeta del día (YYYY-MM-DD)
    var dailyFolder = getOrCreateDailyFolder(rootFolder, fecha);

    // Guardar archivo dentro de la carpeta del día
  var blob = base64ToBlob(
  foto64,
  "image/jpeg",
  tipoDocumento + "_" + numero + "_" + Date.now() + ".jpg"
);
var file = dailyFolder.createFile(blob);


    // Guardar registro en hoja Entregas
    var ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
    var hoja = ss.getSheetByName(HOJA_ENTREGAS);
    if (!hoja) hoja = ss.insertSheet(HOJA_ENTREGAS);

    // Crear encabezados si no existen
    if (hoja.getLastRow() === 0) {
      hoja.appendRow([
        "Fecha",
        "Hora",
        "Usuario",
        "Patente",
        "Tipo documento",
        "Número",
        "Estado",
        "Rol",
        "Archivo"
      ]);
      hoja.getRange(1, 1, 1, 9).setFontWeight("bold");
    }
    // Registrar entrega EXACTAMENTE como tu estructura
    hoja.appendRow([
      fecha,          // Fecha
      hora,           // Hora
      usuario,        // Usuario
      patente,        // Patente
      tipoDocumento,  // Tipo documento
      numero,         // Número
      estado,         // Estado
      rol,            // Rol
      file.getUrl()   // Archivo
    ]);

    logAccion("entrega", { numero: numero, usuario: usuario });

    return { ok: true, url: file.getUrl() };

  } catch (err) {
    logError(err, "registrarEntrega");
    return { ok: false, error: err.message };
  }
}
// ============================================================
// UTILIDADES
// ============================================================
function getOrCreateFolderByName(name) {
  var it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

function base64ToBlob(base64, contentType, filename) {
  var parts = base64.split(",");
  var data  = parts.length > 1 ? parts[1] : parts[0];
  var bytes = Utilities.base64Decode(data);
  return Utilities.newBlob(bytes, contentType, filename);
}
function getOrCreateDailyFolder(parentFolder, fecha) {
  const nombreCarpeta = fecha; // Ej: "2026-06-01"

  // Buscar si ya existe
  const subFolders = parentFolder.getFoldersByName(nombreCarpeta);
  if (subFolders.hasNext()) {
    return subFolders.next();
  }

  // Si no existe → crear
  return parentFolder.createFolder(nombreCarpeta);
}

// ============================================================
// AUDITORÍA
// ============================================================
function logAccion(tipo, detalle) {
  try {
    var ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
    var hoja = ss.getSheetByName("LOGS");
    if (!hoja) hoja = ss.insertSheet("LOGS");
    hoja.appendRow([new Date(), tipo, JSON.stringify(detalle)]);
  } catch(e) {}
}

function logError(error, contexto) {
  try {
    var ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
    var hoja = ss.getSheetByName("ERRORES");
    if (!hoja) hoja = ss.insertSheet("ERRORES");
    hoja.appendRow([new Date(), contexto, error.toString()]);
  } catch(e) {}
}
SpreadsheetApp.flush();
