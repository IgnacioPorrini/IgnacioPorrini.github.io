// pagos.js — lógica de estado de pago / mora y distribución de gastos compartidos.

import { getTramoVigente, todayISO } from './data.js';

/**
 * Estado de un pago, calculado en runtime (nunca persistido):
 * - fechaPago presente -> pagado
 * - sin fechaPago y hoy <= fechaVencimiento -> pendiente
 * - sin fechaPago y hoy > fechaVencimiento -> atrasado
 */
export function calcularEstado(pago, hoyISO = todayISO()) {
    if (pago.fechaPago) return 'pagado';
    if (!pago.fechaVencimiento) return 'pendiente';
    return hoyISO > pago.fechaVencimiento ? 'atrasado' : 'pendiente';
}

export function conEstado(pagos, hoyISO = todayISO()) {
    return pagos.map(p => ({ ...p, estado: calcularEstado(p, hoyISO) }));
}

export function filtrarPorEstado(pagos, estado, hoyISO = todayISO()) {
    return conEstado(pagos, hoyISO).filter(p => p.estado === estado);
}

/**
 * Distribuye el monto de un gasto compartido entre las propiedades involucradas.
 * - equitativa: partes iguales
 * - proporcional_alquiler: proporcional al monto vigente de alquiler de cada propiedad
 * - manual: usa gasto.montoManual[propertyId]
 * Devuelve { propertyId: montoAsignado }
 */
export function calcularDistribucion(gasto, properties) {
    const involucradas = properties.filter(p => gasto.properties.includes(p.id));
    const resultado = {};

    if (gasto.distribucion === 'manual') {
        for (const p of involucradas) {
            resultado[p.id] = Number(gasto.montoManual?.[p.id]) || 0;
        }
        return resultado;
    }

    if (gasto.distribucion === 'proporcional_alquiler') {
        const pesos = involucradas.map(p => {
            const tramo = getTramoVigente(p.historialAlquiler);
            return { id: p.id, peso: tramo ? Number(tramo.monto) || 0 : 0 };
        });
        const totalPeso = pesos.reduce((acc, x) => acc + x.peso, 0);
        if (totalPeso === 0) {
            const partes = involucradas.length || 1;
            for (const p of involucradas) resultado[p.id] = gasto.monto / partes;
            return resultado;
        }
        for (const { id, peso } of pesos) {
            resultado[id] = gasto.monto * (peso / totalPeso);
        }
        return resultado;
    }

    // equitativa (default)
    const partes = involucradas.length || 1;
    for (const p of involucradas) resultado[p.id] = gasto.monto / partes;
    return resultado;
}
