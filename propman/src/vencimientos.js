// vencimientos.js — ajustes anuales y fin de contrato. Todo se calcula en runtime, nada se persiste.

import { getTramoVigente, toPeriodo } from './data.js';

const DIAS_AVISO_FIN = 60;

function parseISO(iso) {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m) return null;
    return new Date(y, m - 1, d || 1);
}

function diasEntre(desde, hasta) {
    const MS = 24 * 60 * 60 * 1000;
    const a = Date.UTC(desde.getFullYear(), desde.getMonth(), desde.getDate());
    const b = Date.UTC(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
    return Math.round((b - a) / MS);
}

/**
 * Mes de ajuste anual: el del inicio del contrato, o si no hay, el del primer tramo de alquiler.
 * Devuelve un número de mes (1-12) o null.
 */
export function mesDeAjuste(property) {
    const inicio = parseISO(property?.contrato?.inicio);
    if (inicio) return inicio.getMonth() + 1;
    const tramos = [...(property?.historialAlquiler || [])].sort((a, b) => (a.desde || '').localeCompare(b.desde || ''));
    const primero = tramos[0] && parseISO(`${tramos[0].desde}-01`);
    return primero ? primero.getMonth() + 1 : null;
}

/**
 * Próximo período de ajuste ("AAAA-MM") desde el mes de referencia, inclusive.
 */
export function proximoAjuste(property, hoy = new Date()) {
    const mes = mesDeAjuste(property);
    if (!mes) return null;
    const anio = (mes >= hoy.getMonth() + 1) ? hoy.getFullYear() : hoy.getFullYear() + 1;
    return `${anio}-${String(mes).padStart(2, '0')}`;
}

/**
 * Estado del ajuste para el mes de referencia:
 * - 'ajusta-este-mes': corresponde ajustar y todavía no hay un tramo nuevo cargado para este mes
 * - 'ajustado': ya hay un tramo con "desde" igual al período actual
 * - 'proximo': ajusta en los próximos 2 meses
 * - 'sin-novedad' | 'sin-datos'
 */
export function estadoAjuste(property, hoy = new Date()) {
    const proximo = proximoAjuste(property, hoy);
    if (!proximo) return { estado: 'sin-datos', proximo: null };
    const periodoActual = toPeriodo(hoy);
    // El primer año de contrato no ajusta.
    const inicio = parseISO(property?.contrato?.inicio);
    if (inicio && toPeriodo(inicio) === periodoActual) {
        return { estado: 'sin-novedad', proximo: `${hoy.getFullYear() + 1}-${periodoActual.slice(5)}` };
    }
    if (proximo === periodoActual) {
        const yaCargado = (property.historialAlquiler || []).some(t => t.desde === periodoActual);
        return { estado: yaCargado ? 'ajustado' : 'ajusta-este-mes', proximo };
    }
    const [py, pm] = proximo.split('-').map(Number);
    const meses = (py - hoy.getFullYear()) * 12 + (pm - (hoy.getMonth() + 1));
    return { estado: meses <= 2 ? 'proximo' : 'sin-novedad', proximo };
}

/**
 * Estado del fin de contrato: 'vencido', 'vence-pronto' (≤ 60 días), 'vigente' o 'sin-datos'.
 */
export function estadoFinContrato(property, hoy = new Date()) {
    const fin = parseISO(property?.contrato?.fin);
    if (!fin) return { estado: 'sin-datos', dias: null };
    const dias = diasEntre(hoy, fin);
    if (dias < 0) return { estado: 'vencido', dias };
    if (dias <= DIAS_AVISO_FIN) return { estado: 'vence-pronto', dias };
    return { estado: 'vigente', dias };
}

/**
 * Lista de avisos ordenada por urgencia, para la vista Vencimientos.
 */
export function avisos(properties, hoy = new Date()) {
    const PRIORIDAD = { 'vencido': 0, 'ajusta-este-mes': 1, 'vence-pronto': 2, 'proximo': 3 };
    const lista = [];
    for (const p of properties) {
        const aj = estadoAjuste(p, hoy);
        const fin = estadoFinContrato(p, hoy);
        const tramo = getTramoVigente(p.historialAlquiler, hoy);
        lista.push({ property: p, ajuste: aj, fin, tramo });
    }
    const urgencia = x => Math.min(PRIORIDAD[x.ajuste.estado] ?? 9, PRIORIDAD[x.fin.estado] ?? 9);
    return lista.sort((a, b) => urgencia(a) - urgencia(b) || (a.property.direccion || '').localeCompare(b.property.direccion || ''));
}
