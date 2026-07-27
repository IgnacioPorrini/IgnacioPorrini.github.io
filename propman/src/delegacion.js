// delegacion.js — export/import de archivos .propman para administración de propiedades de terceros.

import { uid, todayISO, downloadFile } from './data.js';

/**
 * Genera y descarga un archivo .propman (JSON) con un snapshot de la propiedad,
 * para que un administrador externo lo importe. No hay sincronización en vivo:
 * el titular debe reexportar cuando los datos cambien.
 */
export function exportarDelegacion({ property, titular, otorgadoA, permisos, vigenteHasta, inquilino, movimientos, pagos }) {
    const payload = {
        delegacion: {
            propertyId: property.id,
            titular: { nombre: titular?.nombre || '', email: titular?.email || '' },
            otorgadoA: otorgadoA || '',
            fechaExport: new Date().toISOString(),
            permisos: {
                verFinanzas: !!permisos?.verFinanzas,
                editarMovimientos: !!permisos?.editarMovimientos,
                editarContrato: !!permisos?.editarContrato,
                revocable: permisos?.revocable !== false
            },
            vigenteHasta: vigenteHasta || null
        },
        snapshot: {
            direccion: property.direccion,
            inquilino: inquilino || null,
            contrato: property.contrato,
            historialAlquiler: property.historialAlquiler,
            movimientos: movimientos || [],
            pagos: pagos || []
        }
    };
    const slug = (property.direccion || 'propiedad').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    downloadFile(`delegacion-${slug}-${todayISO()}.propman`, JSON.stringify(payload, null, 2), 'application/json');
    return payload;
}

/**
 * Parsea un archivo .propman importado y lo normaliza como entrada de propman_delegated.
 * Si ya existe una delegación para el mismo propertyId + otorgadoA, se reemplaza por la más reciente.
 */
export function parseDelegacion(jsonText) {
    const data = JSON.parse(jsonText);
    if (!data || !data.delegacion || !data.snapshot) {
        throw new Error('El archivo .propman no tiene el formato esperado.');
    }
    return {
        localId: uid('deleg'),
        importadoEn: new Date().toISOString(),
        ...data
    };
}

export function mergeDelegacion(delegatedList, nuevaDelegacion) {
    const idx = delegatedList.findIndex(d =>
        d.delegacion.propertyId === nuevaDelegacion.delegacion.propertyId &&
        d.delegacion.otorgadoA === nuevaDelegacion.delegacion.otorgadoA
    );
    if (idx === -1) return [...delegatedList, nuevaDelegacion];
    const copia = [...delegatedList];
    // Conserva localId original para no romper referencias en la UI.
    nuevaDelegacion.localId = copia[idx].localId;
    copia[idx] = nuevaDelegacion;
    return copia;
}

export function estaVigente(entry, hoyISO = todayISO()) {
    const vigenteHasta = entry?.delegacion?.vigenteHasta;
    if (!vigenteHasta) return true;
    return hoyISO <= vigenteHasta;
}
