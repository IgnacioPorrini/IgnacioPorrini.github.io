// data.js — modelos, cálculos y utilidades de importación/exportación CSV.

export const MONEDAS = ['UYU', 'USD'];
export const TIPOS_PROPIEDAD = ['casa', 'apto', 'local'];

let counter = 0;
export function uid(prefix) {
    counter += 1;
    return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

export function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Monto vigente = último tramo de historialAlquiler cuyo "desde" sea <= la fecha de referencia.
 */
export function getTramoVigente(historialAlquiler, refDate = new Date()) {
    if (!Array.isArray(historialAlquiler) || historialAlquiler.length === 0) return null;
    const ref = refDate instanceof Date ? refDate : new Date(refDate);
    const ordenado = [...historialAlquiler].sort((a, b) => a.desde.localeCompare(b.desde));
    let vigente = null;
    for (const tramo of ordenado) {
        if (tramo.desde <= toPeriodo(ref)) vigente = tramo;
    }
    return vigente || ordenado[0];
}

export function toPeriodo(date) {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonto(monto, moneda) {
    const n = Number(monto) || 0;
    return `${moneda === 'USD' ? 'US$' : '$'} ${n.toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Suma valores agrupados por moneda. Devuelve { UYU: n, USD: n, ... }
 */
export function sumarPorMoneda(items, montoKey = 'monto', monedaKey = 'moneda') {
    const totales = {};
    for (const item of items) {
        const moneda = item[monedaKey] || 'UYU';
        totales[moneda] = (totales[moneda] || 0) + (Number(item[montoKey]) || 0);
    }
    return totales;
}

// ---------- CSV ----------

/** Parser CSV simple con soporte de comillas y comas escapadas. */
export function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    const pushField = () => { row.push(field); field = ''; };
    const pushRow = () => { rows.push(row); row = []; };

    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; }
                else inQuotes = false;
            } else {
                field += c;
            }
        } else if (c === '"') {
            inQuotes = true;
        } else if (c === ',') {
            pushField();
        } else if (c === '\n') {
            pushField(); pushRow();
        } else if (c === '\r') {
            // ignorar, \n lo maneja
        } else {
            field += c;
        }
    }
    if (field.length > 0 || row.length > 0) { pushField(); pushRow(); }

    const filtered = rows.filter(r => r.some(v => v !== ''));
    if (filtered.length === 0) return [];
    const headers = filtered[0].map(h => h.trim());
    return filtered.slice(1).map(r => {
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
        return obj;
    });
}

function csvEscape(value) {
    const str = value === null || value === undefined ? '' : String(value);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
}

export function toCSV(rows, columns) {
    const header = columns.join(',');
    const lines = rows.map(row => columns.map(col => csvEscape(row[col])).join(','));
    return [header, ...lines].join('\n');
}

export function downloadFile(filename, content, mime = 'application/octet-stream') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// ---------- Importadores CSV ----------

/**
 * CSV de propiedades esperado (columnas):
 * direccion,tipo,inquilino_nombre,inquilino_contacto,contrato_inicio,contrato_fin,renovacion_auto,desde,monto,moneda,indice
 */
export function importPropiedadesCSV(text, accountId) {
    const rows = parseCSV(text);
    const properties = [];
    const inquilinos = [];
    for (const r of rows) {
        let inquilinoId = null;
        if (r.inquilino_nombre) {
            const inq = { id: uid('inq'), nombre: r.inquilino_nombre, contacto: r.inquilino_contacto || '' };
            inquilinos.push(inq);
            inquilinoId = inq.id;
        }
        properties.push({
            id: uid('prop'),
            accountId,
            direccion: r.direccion || '',
            tipo: TIPOS_PROPIEDAD.includes(r.tipo) ? r.tipo : 'apto',
            inquilinoId,
            contrato: {
                inicio: r.contrato_inicio || '',
                fin: r.contrato_fin || '',
                renovacionAuto: String(r.renovacion_auto).toLowerCase() === 'true' || r.renovacion_auto === '1'
            },
            historialAlquiler: r.monto ? [{
                desde: r.desde || todayISO().slice(0, 7),
                monto: Number(r.monto) || 0,
                moneda: MONEDAS.includes(r.moneda) ? r.moneda : 'UYU',
                indice: r.indice || ''
            }] : []
        });
    }
    return { properties, inquilinos };
}

/** CSV de movimientos: propertyId o direccion, fecha, tipo, concepto, monto, moneda */
export function importMovimientosCSV(text, resolvePropertyId) {
    const rows = parseCSV(text);
    return rows.map(r => ({
        id: uid('mov'),
        propertyId: r.propertyId || resolvePropertyId(r.direccion) || '',
        fecha: r.fecha || todayISO(),
        tipo: r.tipo === 'gasto' ? 'gasto' : 'ingreso',
        concepto: r.concepto || '',
        monto: Number(r.monto) || 0,
        moneda: MONEDAS.includes(r.moneda) ? r.moneda : 'UYU'
    })).filter(m => m.propertyId);
}

/** CSV de pagos: propertyId o direccion, periodo, montoEsperado, montoRecibido, fechaVencimiento, fechaPago */
export function importPagosCSV(text, resolvePropertyId) {
    const rows = parseCSV(text);
    return rows.map(r => ({
        id: uid('pago'),
        propertyId: r.propertyId || resolvePropertyId(r.direccion) || '',
        periodo: r.periodo || todayISO().slice(0, 7),
        montoEsperado: Number(r.montoEsperado) || 0,
        montoRecibido: Number(r.montoRecibido) || 0,
        fechaVencimiento: r.fechaVencimiento || '',
        fechaPago: r.fechaPago || null
    })).filter(p => p.propertyId);
}
