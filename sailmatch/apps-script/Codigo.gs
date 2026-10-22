/**
 * SailMatch liviano — Apps Script de la planilla.
 *
 * Pegar este archivo en la planilla (Extensiones → Apps Script),
 * ejecutar una vez la función `configurar` y después
 * Implementar → Nueva implementación → Aplicación web:
 *   - Ejecutar como: Yo
 *   - Quién tiene acceso: Cualquier persona
 *
 * La planilla queda privada. La web solo puede:
 *   - leer las salidas visibles (sin códigos de edición),
 *   - agregar salidas nuevas,
 *   - editar o cerrar una salida si tiene su código.
 * Nunca puede borrar filas.
 *
 * Moderación: poner "NO" en la columna "visible" oculta una salida.
 */

var HOJA = 'Salidas';
var COLUMNAS = [
  'id', 'creada', 'actualizada', 'visible', 'estado',
  'fecha', 'hora_salida', 'hora_regreso', 'puerto', 'embarcacion',
  'lugares', 'nivel', 'aporte', 'descripcion', 'patron', 'whatsapp',
  'codigo_hash'
];
var PUBLICAS = [
  'id', 'estado', 'fecha', 'hora_salida', 'hora_regreso', 'puerto',
  'embarcacion', 'lugares', 'nivel', 'aporte', 'descripcion', 'patron', 'whatsapp'
];
var NIVELES = ['sin-experiencia', 'algo', 'experiencia'];
var ESTADOS = ['abierta', 'completa', 'cancelada'];
var MAX_POR_MINUTO = 20;   // altas y ediciones por minuto, en total
var MAX_LARGO = {
  puerto: 80, embarcacion: 80, aporte: 80, descripcion: 600, patron: 50
};

/* ---------- configuración (ejecutar una vez a mano) ---------- */

function configurar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA) || ss.insertSheet(HOJA);
  hoja.getRange(1, 1, hoja.getMaxRows(), COLUMNAS.length).setNumberFormat('@');
  hoja.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS]).setFontWeight('bold');
  hoja.setFrozenRows(1);
  var regla = SpreadsheetApp.newDataValidation().requireValueInList(['SI', 'NO'], true).build();
  hoja.getRange(2, COLUMNAS.indexOf('visible') + 1, hoja.getMaxRows() - 1, 1).setDataValidation(regla);
  var sobrante = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (sobrante && sobrante.getName() !== HOJA && ss.getSheets().length > 1) ss.deleteSheet(sobrante);
}

/* ---------- entradas de la aplicación web ---------- */

function doGet(e) {
  return responder(listar());
}

function doPost(e) {
  try {
    var datos = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (datos.web) return responder({ ok: true }); // trampa anti-bots: se ignora en silencio
    switch (datos.accion) {
      case 'publicar': return responder(conLimite(function () { return publicar(datos.salida || {}); }));
      case 'leer':     return responder(leerParaEditar(datos.id, datos.codigo));
      case 'editar':   return responder(conLimite(function () { return editar(datos.id, datos.codigo, datos.salida || {}); }));
      case 'estado':   return responder(conLimite(function () { return cambiarEstado(datos.id, datos.codigo, datos.estado); }));
      default:         return responder({ ok: false, error: 'Acción desconocida.' });
    }
  } catch (err) {
    return responder({ ok: false, error: 'No se pudo procesar el pedido.' });
  }
}

/* ---------- acciones ---------- */

function listar() {
  var hoy = hoyISO();
  var salidas = filas().filter(function (s) {
    return s.visible !== 'NO' && s.estado !== 'cancelada' && s.fecha >= hoy;
  }).map(publica);
  salidas.sort(function (a, b) {
    return (a.fecha + a.hora_salida).localeCompare(b.fecha + b.hora_salida);
  });
  return { ok: true, salidas: salidas };
}

function publicar(entrada) {
  var s = validar(entrada);
  if (s.error) return { ok: false, error: s.error };
  var codigo = nuevoCodigo();
  var ahora = new Date().toISOString();
  s.id = Utilities.getUuid().slice(0, 8);
  s.creada = ahora;
  s.actualizada = ahora;
  s.visible = 'SI';
  s.estado = 'abierta';
  s.codigo_hash = hash(codigo);
  hoja().appendRow(COLUMNAS.map(function (c) { return String(s[c] == null ? '' : s[c]); }));
  return { ok: true, id: s.id, codigo: codigo };
}

function leerParaEditar(id, codigo) {
  var f = buscar(id, codigo);
  if (f.error) return { ok: false, error: f.error };
  return { ok: true, salida: publica(f.salida) };
}

function editar(id, codigo, entrada) {
  var f = buscar(id, codigo);
  if (f.error) return { ok: false, error: f.error };
  var s = validar(entrada);
  if (s.error) return { ok: false, error: s.error };
  var actual = f.salida;
  ['fecha', 'hora_salida', 'hora_regreso', 'puerto', 'embarcacion', 'lugares',
   'nivel', 'aporte', 'descripcion', 'patron', 'whatsapp'].forEach(function (c) { actual[c] = s[c]; });
  actual.actualizada = new Date().toISOString();
  escribirFila(f.fila, actual);
  return { ok: true };
}

function cambiarEstado(id, codigo, estado) {
  if (ESTADOS.indexOf(estado) < 0) return { ok: false, error: 'Estado no válido.' };
  var f = buscar(id, codigo);
  if (f.error) return { ok: false, error: f.error };
  f.salida.estado = estado;
  f.salida.actualizada = new Date().toISOString();
  escribirFila(f.fila, f.salida);
  return { ok: true };
}

/* ---------- validación ---------- */

function validar(e) {
  var s = {};
  s.fecha = texto(e.fecha, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.fecha)) return { error: 'Falta la fecha.' };
  if (s.fecha < hoyISO()) return { error: 'La fecha ya pasó.' };
  s.hora_salida = texto(e.hora_salida, 5);
  if (!/^\d{2}:\d{2}$/.test(s.hora_salida)) return { error: 'Falta la hora de salida.' };
  s.hora_regreso = texto(e.hora_regreso, 5);
  if (s.hora_regreso && !/^\d{2}:\d{2}$/.test(s.hora_regreso)) s.hora_regreso = '';
  s.puerto = texto(e.puerto, MAX_LARGO.puerto);
  if (!s.puerto) return { error: 'Falta el puerto o club de salida.' };
  s.embarcacion = texto(e.embarcacion, MAX_LARGO.embarcacion);
  var lugares = parseInt(e.lugares, 10);
  if (!(lugares >= 1 && lugares <= 20)) return { error: 'Los lugares tienen que ser entre 1 y 20.' };
  s.lugares = String(lugares);
  s.nivel = NIVELES.indexOf(e.nivel) >= 0 ? e.nivel : 'sin-experiencia';
  s.aporte = texto(e.aporte, MAX_LARGO.aporte);
  s.descripcion = texto(e.descripcion, MAX_LARGO.descripcion);
  s.patron = texto(e.patron, MAX_LARGO.patron);
  if (!s.patron) return { error: 'Falta su nombre.' };
  s.whatsapp = normalizarWhatsapp(e.whatsapp);
  if (!s.whatsapp) return { error: 'El número de WhatsApp no es válido.' };
  return s;
}

function texto(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, max);
}

// Acepta 099 123 456, 99123456, +598 99 123 456 o números de otros países con +
function normalizarWhatsapp(v) {
  var crudo = String(v || '').trim();
  var d = crudo.replace(/\D/g, '');
  if (/^09\d{7}$/.test(d)) return '598' + d.slice(1);
  if (/^9\d{7}$/.test(d)) return '598' + d;
  if (/^5989\d{7}$/.test(d)) return d;
  if (crudo.charAt(0) === '+' && d.length >= 8 && d.length <= 15) return d;
  return '';
}

/* ---------- planilla ---------- */

function hoja() {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA);
  if (!h) { configurar(); h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA); }
  return h;
}

function filas() {
  var h = hoja();
  var n = h.getLastRow() - 1;
  if (n < 1) return [];
  return h.getRange(2, 1, n, COLUMNAS.length).getDisplayValues().map(function (fila, i) {
    var s = { _fila: i + 2 };
    COLUMNAS.forEach(function (c, j) { s[c] = String(fila[j]).trim(); });
    s.visible = s.visible.toUpperCase();
    return s;
  }).filter(function (s) { return s.id; });
}

function buscar(id, codigo) {
  id = String(id || '').trim();
  codigo = String(codigo || '').trim().toUpperCase();
  if (!id || !codigo) return { error: 'Faltan el número de salida o el código.' };
  var lista = filas();
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].id === id) {
      if (lista[i].codigo_hash !== hash(codigo)) return { error: 'El código no coincide.' };
      return { fila: lista[i]._fila, salida: lista[i] };
    }
  }
  return { error: 'No se encontró esa salida.' };
}

function escribirFila(nro, s) {
  hoja().getRange(nro, 1, 1, COLUMNAS.length)
    .setValues([COLUMNAS.map(function (c) { return String(s[c] == null ? '' : s[c]); })]);
}

function publica(s) {
  var p = {};
  PUBLICAS.forEach(function (c) { p[c] = s[c] || ''; });
  return p;
}

/* ---------- utilidades ---------- */

function conLimite(fn) {
  var cache = CacheService.getScriptCache();
  var clave = 'envios-' + Math.floor(Date.now() / 60000);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { ok: false, error: 'Hay mucho movimiento, pruebe de nuevo en un minuto.' };
  try {
    var n = parseInt(cache.get(clave) || '0', 10);
    if (n >= MAX_POR_MINUTO) return { ok: false, error: 'Hay mucho movimiento, pruebe de nuevo en un minuto.' };
    cache.put(clave, String(n + 1), 120);
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function nuevoCodigo() {
  var letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var c = '';
  for (var i = 0; i < 6; i++) c += letras.charAt(Math.floor(Math.random() * letras.length));
  return c;
}

function hash(txt) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'sailmatch:' + txt)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

function hoyISO() {
  return Utilities.formatDate(new Date(), 'America/Montevideo', 'yyyy-MM-dd');
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
