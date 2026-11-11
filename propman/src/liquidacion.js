// liquidacion.js — liquidación mensual al propietario: cobrado − comisión − gastos. Se calcula en runtime.

import { getTramoVigente } from './data.js';

const redondear = n => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Liquidación de una propiedad para un período "AAAA-MM".
 * - cobrado: suma de montoRecibido de los pagos de ese período que tienen fecha de pago
 * - moneda: la del tramo de alquiler vigente en ese período
 * - gastos: movimientos de tipo "gasto" con fecha dentro del período y en la misma moneda
 * - gastosOtraMoneda: los gastos del período en otra moneda, que no se descuentan y se muestran aparte
 */
export function liquidarPropiedad(property, pagos, movimientos, periodo, comisionPct = 0) {
    const tramo = getTramoVigente(property.historialAlquiler, new Date(`${periodo}-15T12:00:00`));
    const moneda = tramo?.moneda || 'UYU';
    const cobrado = pagos
        .filter(p => p.periodo === periodo && p.fechaPago)
        .reduce((acc, p) => acc + (Number(p.montoRecibido) || 0), 0);
    const delPeriodo = movimientos.filter(m => m.tipo === 'gasto' && (m.fecha || '').startsWith(periodo));
    const gastos = delPeriodo.filter(m => (m.moneda || 'UYU') === moneda).reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
    const gastosOtraMoneda = delPeriodo.filter(m => (m.moneda || 'UYU') !== moneda);
    const comision = cobrado * (Number(comisionPct) || 0) / 100;
    return {
        property,
        moneda,
        cobrado: redondear(cobrado),
        comision: redondear(comision),
        gastos: redondear(gastos),
        neto: redondear(cobrado - comision - gastos),
        gastosOtraMoneda
    };
}

/**
 * Agrupa las liquidaciones por propietario, con totales por moneda.
 * getPagos(prop) y getMovimientos(prop) devuelven los registros de cada propiedad.
 */
export function liquidarPorPropietario(propiedades, getPagos, getMovimientos, periodo, comisionPct = 0) {
    const grupos = new Map();
    for (const p of propiedades) {
        const fila = liquidarPropiedad(p, getPagos(p), getMovimientos(p), periodo, comisionPct);
        const key = p.propietarioKey || 'sin-propietario';
        if (!grupos.has(key)) grupos.set(key, { titular: p.titular, filas: [], totales: {} });
        const g = grupos.get(key);
        g.filas.push(fila);
        const t = g.totales[fila.moneda] || (g.totales[fila.moneda] = { cobrado: 0, comision: 0, gastos: 0, neto: 0 });
        for (const k of ['cobrado', 'comision', 'gastos', 'neto']) t[k] = redondear(t[k] + fila[k]);
    }
    return [...grupos.values()];
}

/**
 * Texto plano listo para pegar en WhatsApp o en un mail al propietario.
 */
export function textoLiquidacion(grupo, periodo, comisionPct, formatMonto) {
    const nombre = grupo.titular?.nombre || grupo.titular?.email || 'propietario';
    const lineas = [`Liquidación ${periodo} — ${nombre}`, ''];
    for (const f of grupo.filas) {
        lineas.push(`${f.property.direccion || '(sin dirección)'}`);
        lineas.push(`  Cobrado: ${formatMonto(f.cobrado, f.moneda)}`);
        if (comisionPct) lineas.push(`  Comisión (${comisionPct} %): −${formatMonto(f.comision, f.moneda)}`);
        if (f.gastos) lineas.push(`  Gastos: −${formatMonto(f.gastos, f.moneda)}`);
        lineas.push(`  A liquidar: ${formatMonto(f.neto, f.moneda)}`);
        lineas.push('');
    }
    const monedas = Object.keys(grupo.totales);
    if (grupo.filas.length > 1) {
        lineas.push(`Total a liquidar: ${monedas.map(m => formatMonto(grupo.totales[m].neto, m)).join(' + ')}`);
    }
    return lineas.join('\n').trim();
}

/**
 * Resumen anual para el contador: una fila por propiedad y mes, con totales por propietario y moneda.
 */
export function resumenAnual(propiedades, getPagos, getMovimientos, anio, comisionPct = 0) {
    const meses = Array.from({ length: 12 }, (_, i) => `${anio}-${String(i + 1).padStart(2, '0')}`);
    const filas = [];
    for (const p of propiedades) {
        const pagos = getPagos(p);
        const movs = getMovimientos(p);
        for (const periodo of meses) {
            const f = liquidarPropiedad(p, pagos, movs, periodo, comisionPct);
            if (f.cobrado === 0 && f.gastos === 0) continue;
            filas.push({
                propietario: p.titular?.nombre || p.titular?.email || '',
                direccion: p.direccion || '',
                periodo,
                moneda: f.moneda,
                cobrado: f.cobrado,
                comision: f.comision,
                gastos: f.gastos,
                neto: f.neto
            });
        }
    }
    const totales = {};
    for (const f of filas) {
        const key = `${f.propietario}|${f.moneda}`;
        const t = totales[key] || (totales[key] = { propietario: f.propietario, moneda: f.moneda, cobrado: 0, comision: 0, gastos: 0, neto: 0 });
        for (const k of ['cobrado', 'comision', 'gastos', 'neto']) t[k] = redondear(t[k] + f[k]);
    }
    return { filas, totales: Object.values(totales) };
}
