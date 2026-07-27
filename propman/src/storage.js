// storage.js — capa de persistencia (localStorage). Única fuente de verdad del estado.

export const KEYS = {
    account: 'propman_account',
    properties: 'propman_properties',
    inquilinos: 'propman_inquilinos',
    movimientos: 'propman_movimientos',
    pagos: 'propman_pagos',
    gastosCompartidos: 'propman_gastosCompartidos',
    delegated: 'propman_delegated',
    lastBackup: 'propman_lastBackup'
};

export const MAX_PROPIEDADES_PROPIAS = 5;

function read(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

export const getAccount = () => read(KEYS.account, null);
export const setAccount = (account) => write(KEYS.account, account);

export const getProperties = () => read(KEYS.properties, []);
export const setProperties = (list) => write(KEYS.properties, list);

export const getInquilinos = () => read(KEYS.inquilinos, []);
export const setInquilinos = (list) => write(KEYS.inquilinos, list);

export const getMovimientos = () => read(KEYS.movimientos, []);
export const setMovimientos = (list) => write(KEYS.movimientos, list);

export const getPagos = () => read(KEYS.pagos, []);
export const setPagos = (list) => write(KEYS.pagos, list);

export const getGastosCompartidos = () => read(KEYS.gastosCompartidos, []);
export const setGastosCompartidos = (list) => write(KEYS.gastosCompartidos, list);

export const getDelegated = () => read(KEYS.delegated, []);
export const setDelegated = (list) => write(KEYS.delegated, list);

export const getLastBackup = () => read(KEYS.lastBackup, null);
export const setLastBackup = (isoDate) => write(KEYS.lastBackup, isoDate);

export function exportAllData() {
    return {
        account: getAccount(),
        properties: getProperties(),
        inquilinos: getInquilinos(),
        movimientos: getMovimientos(),
        pagos: getPagos(),
        gastosCompartidos: getGastosCompartidos(),
        delegated: getDelegated()
    };
}

export function importAllData(data) {
    if (data.account) setAccount(data.account);
    if (Array.isArray(data.properties)) setProperties(data.properties);
    if (Array.isArray(data.inquilinos)) setInquilinos(data.inquilinos);
    if (Array.isArray(data.movimientos)) setMovimientos(data.movimientos);
    if (Array.isArray(data.pagos)) setPagos(data.pagos);
    if (Array.isArray(data.gastosCompartidos)) setGastosCompartidos(data.gastosCompartidos);
    if (Array.isArray(data.delegated)) setDelegated(data.delegated);
}
