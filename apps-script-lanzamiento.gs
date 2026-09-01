/**
 * TÍPICOS — Registros del lanzamiento (sábado 5 de septiembre, Porongo)
 * Recibe los datos de tipicos.online/lanzamiento/ y los escribe en la hoja.
 *
 * ─── CÓMO PUBLICARLO (5 minutos) ────────────────────────────────────
 * 1. Andá a https://sheets.new  → nombrá la planilla "Típicos — Lanzamiento".
 * 2. Menú  Extensiones → Apps Script.
 * 3. Borrá todo lo que haya y pegá ESTE archivo completo. Guardá (Ctrl+S).
 * 4. Botón azul "Implementar" → "Nueva implementación".
 *      · Tipo:            Aplicación web
 *      · Ejecutar como:   Yo
 *      · Quién accede:    CUALQUIER PERSONA   ← importantísimo
 * 5. Autorizá con tu cuenta de Google (te va a avisar "no verificada" →
 *    "Configuración avanzada" → "Ir a ... (no seguro)"). Es tu propio script.
 * 6. Copiá la "URL de la aplicación web" (termina en /exec) y pegala en
 *    docs/lanzamiento/index.html, en CONFIG.ENDPOINT.
 *
 * ⚠️ Si más adelante editás este código, hay que hacer
 *    "Implementar → Administrar implementaciones → editar (lápiz) → Versión: Nueva".
 *    Si creás una implementación NUEVA la URL cambia y hay que actualizar el HTML.
 * ────────────────────────────────────────────────────────────────────
 */

var HOJA = 'Registros';

var CABECERAS = [
  'Fecha y hora',
  'Nombre',
  'Teléfono',
  'Invitados',
  'Personas (total)',
  'Detalle',
  'Origen'
];

function doGet(e)  { return guardar(e); }
function doPost(e) { return guardar(e); }

function guardar(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // evita que dos registros simultáneos pisen la misma fila

    var p = (e && e.parameter) ? e.parameter : {};
    var hoja = obtenerHoja();

    var nombre    = String(p.nombre    || '').trim();
    var telefono  = String(p.telefono  || '').trim();
    var invitados = parseInt(p.invitados, 10);  if (isNaN(invitados)) invitados = 0;
    var personas  = parseInt(p.personas,  10);  if (isNaN(personas))  personas  = 1 + invitados;
    var detalle   = String(p.acompanantes || '').trim();
    var origen    = String(p.origen || 'directo').trim();

    if (!nombre && !telefono) {
      return responder({ ok: false, error: 'Sin datos' });
    }

    // El teléfono queda como texto para que Sheets no le coma el "+" ni los ceros
    hoja.appendRow([
      new Date(),
      nombre,
      "'" + telefono,
      invitados,
      personas,
      detalle,
      origen
    ]);

    return responder({ ok: true, fila: hoja.getLastRow() });

  } catch (err) {
    return responder({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (err2) {}
  }
}

function obtenerHoja() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA);

  if (!hoja) {
    hoja = ss.insertSheet(HOJA);
  }

  if (hoja.getLastRow() === 0) {
    hoja.appendRow(CABECERAS);
    var cab = hoja.getRange(1, 1, 1, CABECERAS.length);
    cab.setFontWeight('bold')
       .setBackground('#3D2418')
       .setFontColor('#FBF4E6');
    hoja.setFrozenRows(1);
    hoja.setColumnWidth(1, 160); // fecha
    hoja.setColumnWidth(2, 200); // nombre
    hoja.setColumnWidth(3, 150); // teléfono
    hoja.setColumnWidth(6, 160); // detalle
  }

  return hoja;
}

function responder(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Corré esta función una vez desde el editor (botón ▷) para probar
 * que escribe bien antes de publicar la landing.
 */
function probar() {
  var salida = guardar({
    parameter: {
      nombre: 'Prueba Típicos',
      telefono: '+59170000000',
      invitados: '2',
      personas: '3',
      acompanantes: '2 invitados',
      origen: 'test'
    }
  });
  Logger.log(salida.getContent());
}
