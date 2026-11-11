// recibos.js — recibo de alquiler imprimible y aviso de cobro por WhatsApp (lo envía la persona, no la app).

import { getTramoVigente, formatMonto } from './data.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function periodoLargo(periodo) {
    const [y, m] = (periodo || '').split('-').map(Number);
    return y && m ? `${MESES[m - 1]} de ${y}` : periodo || '';
}

export function monedaDelPeriodo(property, periodo) {
    const tramo = getTramoVigente(property?.historialAlquiler || [], new Date(`${periodo}-15T12:00:00`));
    return tramo?.moneda || 'UYU';
}

/**
 * Número para wa.me: solo dígitos, con 598 para celulares uruguayos (09xxxxxxx o 9xxxxxxx).
 * Devuelve '' si el contacto no parece un teléfono.
 */
export function telefonoWhatsApp(contacto) {
    const digitos = String(contacto || '').replace(/\D/g, '');
    if (digitos.length < 8) return '';
    if (/^09\d{7}$/.test(digitos)) return `598${digitos.slice(1)}`;
    if (/^9\d{7}$/.test(digitos)) return `598${digitos}`;
    return digitos;
}

export function mensajeCobro({ pago, property, inquilino }) {
    const moneda = monedaDelPeriodo(property, pago.periodo);
    const saldo = (Number(pago.montoEsperado) || 0) - (Number(pago.montoRecibido) || 0);
    const nombre = inquilino?.nombre ? `Hola ${inquilino.nombre.split(' ')[0]}` : 'Hola';
    const vence = pago.fechaVencimiento ? `, con vencimiento el ${pago.fechaVencimiento.split('-').reverse().join('/')}` : '';
    return `${nombre}, ¿cómo estás? Te escribo por el alquiler de ${property?.direccion || 'la propiedad'} de ${periodoLargo(pago.periodo)}${vence}. ` +
        `El saldo pendiente es ${formatMonto(saldo > 0 ? saldo : pago.montoEsperado, moneda)}. ` +
        `Cuando lo pagues, avisame así lo registro. ¡Gracias!`;
}

export function linkWhatsApp(contacto, texto) {
    const tel = telefonoWhatsApp(contacto);
    return `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;
}

/**
 * Recibo como página HTML completa, lista para imprimir o guardar como PDF desde el navegador.
 */
export function htmlRecibo({ pago, property, inquilino, titular }) {
    const moneda = monedaDelPeriodo(property, pago.periodo);
    const fecha = (pago.fechaPago || '').split('-').reverse().join('/');
    const numero = `${(pago.periodo || '').replace('-', '')}-${String(pago.id || '').slice(-4).toUpperCase()}`;
    return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Recibo ${esc(numero)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #14213D; background: #fff; margin: 0; padding: 32px 16px; }
  .recibo { max-width: 640px; margin: 0 auto; border: 2px solid #14213D; border-radius: 8px; padding: 32px; }
  h1 { font-size: 28px; margin: 0 0 4px; }
  .sub { color: #4A5568; margin: 0 0 24px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  td { padding: 10px 0; border-bottom: 1px solid #E1E4E8; vertical-align: top; }
  td:first-child { color: #4A5568; width: 40%; }
  .monto { font-size: 28px; font-weight: bold; }
  .firma { margin-top: 56px; border-top: 1px solid #14213D; width: 260px; padding-top: 8px; color: #4A5568; }
  .acciones { text-align: center; margin: 24px 0 0; }
  button { font-size: 16px; padding: 10px 20px; }
  @media print { .acciones { display: none; } body { padding: 0; } }
</style></head>
<body>
<div class="recibo">
  <h1>Recibo de alquiler</h1>
  <p class="sub">N.º ${esc(numero)}</p>
  <table>
    <tr><td>Recibí de</td><td>${esc(inquilino?.nombre || '________________')}</td></tr>
    <tr><td>La suma de</td><td class="monto">${esc(formatMonto(pago.montoRecibido || pago.montoEsperado, moneda))}</td></tr>
    <tr><td>Por concepto de</td><td>Alquiler de ${esc(periodoLargo(pago.periodo))}</td></tr>
    <tr><td>Inmueble</td><td>${esc(property?.direccion || '')}</td></tr>
    <tr><td>Fecha de pago</td><td>${esc(fecha || '________________')}</td></tr>
  </table>
  <div class="firma">${esc(titular?.nombre || 'Firma')}</div>
</div>
<p class="acciones"><button onclick="window.print()">Imprimir o guardar PDF</button></p>
</body></html>`;
}
