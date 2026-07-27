// ui.js — renderizado y controladores de interfaz. SPA sin dependencias, ruteo por hash.

import * as storage from './storage.js';
import * as data from './data.js';
import * as pagosLib from './pagos.js';
import * as delegacionLib from './delegacion.js';
import * as charts from './charts.js';

const BACKUP_REMINDER_DIAS = 14;

const viewRoot = () => document.getElementById('view-root');
const modalRoot = () => document.getElementById('modal-root');
const navRoot = () => document.getElementById('nav-root');
const bannerRoot = () => document.getElementById('backup-banner');

export function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

const NAV_ITEMS = [
    { hash: '#/resumen', label: 'Resumen', icon: 'fa-chart-pie' },
    { hash: '#/propiedades', label: 'Propiedades', icon: 'fa-building' },
    { hash: '#/inquilinos', label: 'Inquilinos', icon: 'fa-users' },
    { hash: '#/pagos', label: 'Pagos', icon: 'fa-file-invoice-dollar' },
    { hash: '#/movimientos', label: 'Movimientos', icon: 'fa-right-left' },
    { hash: '#/gastos', label: 'Gastos compartidos', icon: 'fa-scale-balanced' },
    { hash: '#/delegacion', label: 'Delegación', icon: 'fa-key' },
    { hash: '#/datos', label: 'Cuenta y datos', icon: 'fa-database' }
];

// ---------------------------------------------------------------------------
// Bootstrap / router
// ---------------------------------------------------------------------------

export function init() {
    window.addEventListener('hashchange', route);
    route();
}

function route() {
    const account = storage.getAccount();
    if (!account) {
        renderOnboarding();
        return;
    }
    renderNav();
    renderBackupBanner();

    const hash = location.hash || '#/resumen';
    const view = hash.replace('#/', '').split('?')[0] || 'resumen';
    const renderers = {
        resumen: renderResumen,
        propiedades: renderPropiedades,
        inquilinos: renderInquilinos,
        pagos: renderPagos,
        movimientos: renderMovimientos,
        gastos: renderGastos,
        delegacion: renderDelegacion,
        datos: renderDatos
    };
    (renderers[view] || renderResumen)();
}

function renderNav() {
    const hash = (location.hash || '#/resumen').split('?')[0];
    navRoot().innerHTML = `
        <div class="nav-inner">
            <a class="brand" href="#/resumen"><i class="fas fa-house-chimney"></i> PropMan</a>
            <nav class="tabs">
                ${NAV_ITEMS.map(item => `
                    <a href="${item.hash}" class="tab ${hash === item.hash ? 'active' : ''}">
                        <i class="fas ${item.icon}"></i> ${item.label}
                    </a>
                `).join('')}
            </nav>
        </div>
    `;
}

function renderBackupBanner() {
    if (sessionStorage.getItem('propman_banner_dismissed') === '1') {
        bannerRoot().innerHTML = '';
        return;
    }
    const last = storage.getLastBackup();
    const dias = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : Infinity;
    if (dias < BACKUP_REMINDER_DIAS) {
        bannerRoot().innerHTML = '';
        return;
    }
    const mensaje = last
        ? `Hace ${dias} días que no exportás un backup completo.`
        : 'Todavía no exportaste un backup completo de tus datos.';
    bannerRoot().innerHTML = `
        <div class="banner">
            <span><i class="fas fa-triangle-exclamation"></i> ${mensaje} Si perdés el navegador, perdés lo no exportado.</span>
            <div class="banner-actions">
                <button class="btn btn-sm" data-action="export-backup-now">Exportar ahora</button>
                <button class="btn btn-sm btn-ghost" data-action="dismiss-banner">Ahora no</button>
            </div>
        </div>
    `;
    bannerRoot().querySelector('[data-action="export-backup-now"]').addEventListener('click', () => {
        exportarBackupCompleto();
        renderBackupBanner();
    });
    bannerRoot().querySelector('[data-action="dismiss-banner"]').addEventListener('click', () => {
        sessionStorage.setItem('propman_banner_dismissed', '1');
        bannerRoot().innerHTML = '';
    });
}

function exportarBackupCompleto() {
    const dump = storage.exportAllData();
    data.downloadFile(`propman-backup-${data.todayISO()}.json`, JSON.stringify(dump, null, 2), 'application/json');
    storage.setLastBackup(new Date().toISOString());
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

function renderOnboarding() {
    navRoot().innerHTML = '';
    bannerRoot().innerHTML = '';
    viewRoot().innerHTML = `
        <div class="onboarding">
            <div class="onboarding-card">
                <h1><i class="fas fa-house-chimney text-accent"></i> PropMan</h1>
                <p class="text-muted">Gestor de propiedades en alquiler, 100% local. Tus datos nunca salen de este navegador.</p>
                <form id="onboarding-form">
                    <label>Nombre
                        <input type="text" name="nombre" required placeholder="Tu nombre">
                    </label>
                    <label>Email
                        <input type="email" name="email" required placeholder="tu@email.com">
                    </label>
                    <label>Documento (opcional)
                        <input type="text" name="documento" placeholder="CI / DNI">
                    </label>
                    <button type="submit" class="btn btn-primary w-100">Comenzar</button>
                </form>
            </div>
        </div>
    `;
    document.getElementById('onboarding-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        storage.setAccount({
            id: data.uid('acc'),
            titular: {
                nombre: fd.get('nombre').trim(),
                email: fd.get('email').trim(),
                documento: (fd.get('documento') || '').trim()
            },
            properties: []
        });
        location.hash = '#/resumen';
        route();
    });
}

// ---------------------------------------------------------------------------
// Modal genérico
// ---------------------------------------------------------------------------

function openModal(title, bodyHtml) {
    modalRoot().innerHTML = `
        <div class="modal-overlay" data-action="close-modal">
            <div class="modal" role="dialog" aria-modal="true">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="modal-close" data-action="close-modal" aria-label="Cerrar">&times;</button>
                </div>
                <div class="modal-body">${bodyHtml}</div>
            </div>
        </div>
    `;
    modalRoot().querySelectorAll('[data-action="close-modal"]').forEach(el => {
        el.addEventListener('click', (e) => { if (e.target === el) closeModal(); });
    });
    modalRoot().querySelector('.modal').addEventListener('click', e => e.stopPropagation());
    return modalRoot();
}

function closeModal() {
    modalRoot().innerHTML = '';
}

// ---------------------------------------------------------------------------
// Helpers de datos combinados (propias + delegadas)
// ---------------------------------------------------------------------------

function getPropiedadesCombinadas() {
    const account = storage.getAccount();
    const propias = storage.getProperties().map(p => ({
        ...p,
        origen: 'propia',
        titular: account.titular,
        propietarioKey: account.titular.email || account.id
    }));
    const delegadas = storage.getDelegated().map(entry => ({
        id: entry.delegacion.propertyId,
        accountId: null,
        direccion: entry.snapshot.direccion,
        tipo: entry.snapshot.tipo || 'apto',
        inquilinoId: null,
        inquilinoDelegado: entry.snapshot.inquilino,
        contrato: entry.snapshot.contrato,
        historialAlquiler: entry.snapshot.historialAlquiler || [],
        origen: 'delegada',
        titular: entry.delegacion.titular,
        propietarioKey: entry.delegacion.titular.email || entry.delegacion.propertyId,
        permisos: entry.delegacion.permisos,
        localDelegId: entry.localId,
        vigente: delegacionLib.estaVigente(entry),
        snapshotMovimientos: entry.snapshot.movimientos || [],
        snapshotPagos: entry.snapshot.pagos || []
    }));
    return [...propias, ...delegadas];
}

function movimientosDeParaPropiedad(prop) {
    const propios = storage.getMovimientos().filter(m => m.propertyId === prop.id);
    if (prop.origen === 'delegada') return [...prop.snapshotMovimientos, ...propios];
    return propios;
}

function pagosDeParaPropiedad(prop) {
    if (prop.origen === 'delegada') return prop.snapshotPagos;
    return storage.getPagos().filter(p => p.propertyId === prop.id);
}

function badgeOrigen(prop) {
    return prop.origen === 'propia'
        ? '<span class="badge badge-own">Propia</span>'
        : `<span class="badge badge-delegated" title="Delegada por ${escapeHtml(prop.titular.email)}">Delegada</span>`;
}

// ---------------------------------------------------------------------------
// Resumen (vistas: todas / por propietario / por inquilino / pagos-mora)
// ---------------------------------------------------------------------------

function renderResumen() {
    const sub = new URLSearchParams(location.hash.split('?')[1] || '').get('vista') || 'todas';
    const propiedades = getPropiedadesCombinadas();

    viewRoot().innerHTML = `
        <div class="view-header">
            <h1>Resumen</h1>
        </div>
        <div class="subtabs">
            ${[
                ['todas', 'Todas'],
                ['propietario', 'Por propietario'],
                ['inquilino', 'Por inquilino'],
                ['mora', 'Pagos / mora']
            ].map(([key, label]) => `<a href="#/resumen?vista=${key}" class="subtab ${sub === key ? 'active' : ''}">${label}</a>`).join('')}
        </div>
        <div id="resumen-body"></div>
    `;

    const body = document.getElementById('resumen-body');
    if (propiedades.length === 0) {
        body.innerHTML = `<p class="empty-state">Todavía no cargaste propiedades. Andá a <a href="#/propiedades">Propiedades</a> para agregar la primera.</p>`;
        return;
    }

    if (sub === 'propietario') return renderResumenPorPropietario(body, propiedades);
    if (sub === 'inquilino') return renderResumenPorInquilino(body, propiedades);
    if (sub === 'mora') return renderResumenMora(body, propiedades);
    return renderResumenTodas(body, propiedades);
}

function totalesDePropiedades(propiedades) {
    const todosMovimientos = propiedades.flatMap(movimientosDeParaPropiedad);
    const ingresos = data.sumarPorMoneda(todosMovimientos.filter(m => m.tipo === 'ingreso'));
    const gastos = data.sumarPorMoneda(todosMovimientos.filter(m => m.tipo === 'gasto'));
    const monedas = [...new Set([...Object.keys(ingresos), ...Object.keys(gastos)])];
    const totales = {};
    monedas.forEach(m => { totales[m] = { ingreso: ingresos[m] || 0, gasto: gastos[m] || 0 }; });
    return totales;
}

function renderResumenTodas(body, propiedades) {
    const totales = totalesDePropiedades(propiedades);
    body.innerHTML = `
        <div class="grid-cards">
            ${propiedades.map(p => propiedadCardHtml(p)).join('')}
        </div>
        <h3 class="mt-4">Totales (ingresos vs. gastos, por moneda)</h3>
        <canvas id="chart-totales" height="100"></canvas>
    `;
    charts.renderIngresosGastosChart('chart-totales', totales);
}

function propiedadCardHtml(p) {
    const tramo = data.getTramoVigente(p.historialAlquiler);
    return `
        <div class="card">
            <div class="card-title-row">
                <strong>${escapeHtml(p.direccion) || '(sin dirección)'}</strong>
                ${badgeOrigen(p)}
            </div>
            <div class="text-muted small">${escapeHtml(p.tipo)}</div>
            <div class="mt-2">${tramo ? `Alquiler vigente: <strong>${data.formatMonto(tramo.monto, tramo.moneda)}</strong>` : 'Sin monto de alquiler cargado'}</div>
            <div class="text-muted small">Propietario: ${escapeHtml(p.titular?.email || p.titular?.nombre || '—')}</div>
        </div>
    `;
}

function renderResumenPorPropietario(body, propiedades) {
    const grupos = new Map();
    for (const p of propiedades) {
        const key = p.propietarioKey;
        if (!grupos.has(key)) grupos.set(key, { titular: p.titular, props: [] });
        grupos.get(key).props.push(p);
    }
    body.innerHTML = [...grupos.values()].map(g => `
        <div class="group-section">
            <h3>${escapeHtml(g.titular?.nombre || g.titular?.email || 'Sin datos')} <span class="text-muted small">${escapeHtml(g.titular?.email || '')}</span></h3>
            <div class="grid-cards">${g.props.map(propiedadCardHtml).join('')}</div>
        </div>
    `).join('');
}

function renderResumenPorInquilino(body, propiedades) {
    const inquilinos = storage.getInquilinos();
    const grupos = new Map();
    for (const p of propiedades) {
        let nombre;
        if (p.origen === 'propia') {
            const inq = inquilinos.find(i => i.id === p.inquilinoId);
            nombre = inq ? inq.nombre : 'Sin inquilino asignado';
        } else {
            nombre = p.inquilinoDelegado?.nombre || 'Sin inquilino asignado';
        }
        if (!grupos.has(nombre)) grupos.set(nombre, []);
        grupos.get(nombre).push(p);
    }
    body.innerHTML = [...grupos.entries()].map(([nombre, props]) => `
        <div class="group-section">
            <h3><i class="fas fa-user"></i> ${escapeHtml(nombre)}</h3>
            <div class="grid-cards">${props.map(propiedadCardHtml).join('')}</div>
        </div>
    `).join('');
}

function renderResumenMora(body, propiedades) {
    const todosPagos = propiedades.flatMap(p => pagosDeParaPropiedad(p).map(pg => ({ ...pg, direccion: p.direccion, origen: p.origen })));
    const conEstado = pagosLib.conEstado(todosPagos);
    const conteo = { pagado: 0, pendiente: 0, atrasado: 0 };
    conEstado.forEach(p => { conteo[p.estado] = (conteo[p.estado] || 0) + 1; });

    body.innerHTML = `
        <div class="mora-layout">
            <div>
                <canvas id="chart-mora" height="220"></canvas>
            </div>
            <div>
                <table class="table">
                    <thead><tr><th>Propiedad</th><th>Período</th><th>Vence</th><th>Esperado</th><th>Recibido</th><th>Estado</th></tr></thead>
                    <tbody>
                        ${conEstado.length === 0 ? '<tr><td colspan="6" class="empty-state">Sin registros de pago todavía.</td></tr>' : ''}
                        ${conEstado.sort((a, b) => (a.fechaVencimiento || '').localeCompare(b.fechaVencimiento || '')).map(p => `
                            <tr class="${p.estado === 'atrasado' ? 'row-late' : ''}">
                                <td>${escapeHtml(p.direccion)} ${p.origen === 'delegada' ? '<span class="badge badge-delegated">D</span>' : ''}</td>
                                <td>${escapeHtml(p.periodo)}</td>
                                <td>${escapeHtml(p.fechaVencimiento || '—')}</td>
                                <td>${p.montoEsperado || 0}</td>
                                <td>${p.montoRecibido || 0}</td>
                                <td><span class="estado estado-${p.estado}">${p.estado}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    charts.renderMoraChart('chart-mora', conteo);
}

// ---------------------------------------------------------------------------
// Propiedades
// ---------------------------------------------------------------------------

function renderPropiedades() {
    const properties = storage.getProperties();
    const inquilinos = storage.getInquilinos();

    viewRoot().innerHTML = `
        <div class="view-header">
            <h1>Propiedades <span class="text-muted small">(${properties.length}/${storage.MAX_PROPIEDADES_PROPIAS})</span></h1>
            <button class="btn btn-primary" data-action="new-property" ${properties.length >= storage.MAX_PROPIEDADES_PROPIAS ? 'disabled title="Máximo de 5 propiedades propias"' : ''}>
                <i class="fas fa-plus"></i> Nueva propiedad
            </button>
        </div>
        <div class="grid-cards">
            ${properties.length === 0 ? '<p class="empty-state">No agregaste propiedades todavía.</p>' : ''}
            ${properties.map(p => {
                const inq = inquilinos.find(i => i.id === p.inquilinoId);
                const tramo = data.getTramoVigente(p.historialAlquiler);
                return `
                <div class="card">
                    <div class="card-title-row">
                        <strong>${escapeHtml(p.direccion) || '(sin dirección)'}</strong>
                        <span class="badge badge-own">${escapeHtml(p.tipo)}</span>
                    </div>
                    <div class="text-muted small mt-1">Inquilino: ${inq ? escapeHtml(inq.nombre) : 'Sin asignar'}</div>
                    <div class="mt-1">${tramo ? `Alquiler: <strong>${data.formatMonto(tramo.monto, tramo.moneda)}</strong> (desde ${tramo.desde})` : 'Sin monto cargado'}</div>
                    <div class="text-muted small">Contrato: ${escapeHtml(p.contrato?.inicio || '—')} → ${escapeHtml(p.contrato?.fin || '—')}</div>
                    <div class="card-actions">
                        <button class="btn btn-sm" data-action="edit-property" data-id="${p.id}"><i class="fas fa-pen"></i> Editar</button>
                        <button class="btn btn-sm btn-danger" data-action="delete-property" data-id="${p.id}"><i class="fas fa-trash"></i> Eliminar</button>
                    </div>
                </div>
            `; }).join('')}
        </div>
    `;

    viewRoot().querySelector('[data-action="new-property"]')?.addEventListener('click', () => openPropertyForm(null));
    viewRoot().querySelectorAll('[data-action="edit-property"]').forEach(btn =>
        btn.addEventListener('click', () => openPropertyForm(btn.dataset.id)));
    viewRoot().querySelectorAll('[data-action="delete-property"]').forEach(btn =>
        btn.addEventListener('click', () => {
            if (!confirm('¿Eliminar esta propiedad? También se perderán sus movimientos y pagos asociados.')) return;
            storage.setProperties(storage.getProperties().filter(p => p.id !== btn.dataset.id));
            storage.setMovimientos(storage.getMovimientos().filter(m => m.propertyId !== btn.dataset.id));
            storage.setPagos(storage.getPagos().filter(p => p.propertyId !== btn.dataset.id));
            renderPropiedades();
        }));
}

function openPropertyForm(propertyId) {
    const properties = storage.getProperties();
    const property = properties.find(p => p.id === propertyId) || null;
    const inquilinos = storage.getInquilinos();
    const tramos = property ? [...property.historialAlquiler] : [{ desde: data.todayISO().slice(0, 7), monto: '', moneda: 'UYU', indice: '' }];

    const bodyHtml = `
        <form id="property-form">
            <label>Dirección
                <input type="text" name="direccion" required value="${escapeHtml(property?.direccion || '')}">
            </label>
            <div class="form-row">
                <label>Tipo
                    <select name="tipo">
                        ${data.TIPOS_PROPIEDAD.map(t => `<option value="${t}" ${property?.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </label>
                <label>Inquilino
                    <select name="inquilinoId">
                        <option value="">Sin asignar</option>
                        ${inquilinos.map(i => `<option value="${i.id}" ${property?.inquilinoId === i.id ? 'selected' : ''}>${escapeHtml(i.nombre)}</option>`).join('')}
                    </select>
                </label>
            </div>
            <div class="form-row">
                <label>Contrato inicio
                    <input type="date" name="contratoInicio" value="${escapeHtml(property?.contrato?.inicio || '')}">
                </label>
                <label>Contrato fin
                    <input type="date" name="contratoFin" value="${escapeHtml(property?.contrato?.fin || '')}">
                </label>
            </div>
            <label class="checkbox-label">
                <input type="checkbox" name="renovacionAuto" ${property?.contrato?.renovacionAuto ? 'checked' : ''}>
                Renovación automática
            </label>

            <h3 class="mt-3">Historial de alquiler</h3>
            <p class="text-muted small">El monto vigente es siempre el último tramo cuya fecha "desde" ya pasó.</p>
            <div id="tramos-list"></div>
            <button type="button" class="btn btn-sm" id="add-tramo"><i class="fas fa-plus"></i> Agregar tramo</button>

            <div class="modal-footer">
                <button type="button" class="btn btn-ghost" data-action="close-modal">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar</button>
            </div>
        </form>
    `;
    const modal = openModal(property ? 'Editar propiedad' : 'Nueva propiedad', bodyHtml);
    modal.querySelector('[data-action="close-modal"]').addEventListener('click', closeModal);

    const tramosList = modal.querySelector('#tramos-list');
    function renderTramos() {
        tramosList.innerHTML = tramos.map((t, idx) => `
            <div class="tramo-row" data-idx="${idx}">
                <input type="month" class="t-desde" value="${escapeHtml(t.desde || '')}" required>
                <input type="number" step="0.01" class="t-monto" placeholder="Monto" value="${t.monto ?? ''}" required>
                <select class="t-moneda">${data.MONEDAS.map(m => `<option value="${m}" ${t.moneda === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
                <input type="text" class="t-indice" placeholder="Índice (opcional)" value="${escapeHtml(t.indice || '')}">
                <button type="button" class="btn btn-sm btn-danger remove-tramo" ${tramos.length <= 1 ? 'disabled' : ''}><i class="fas fa-xmark"></i></button>
            </div>
        `).join('');
        tramosList.querySelectorAll('.remove-tramo').forEach(btn => btn.addEventListener('click', (e) => {
            const idx = Number(e.target.closest('.tramo-row').dataset.idx);
            tramos.splice(idx, 1);
            renderTramos();
        }));
    }
    renderTramos();
    modal.querySelector('#add-tramo').addEventListener('click', () => {
        tramos.push({ desde: data.todayISO().slice(0, 7), monto: '', moneda: 'UYU', indice: '' });
        renderTramos();
    });

    modal.querySelector('#property-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const rows = [...tramosList.querySelectorAll('.tramo-row')].map(row => ({
            desde: row.querySelector('.t-desde').value,
            monto: Number(row.querySelector('.t-monto').value) || 0,
            moneda: row.querySelector('.t-moneda').value,
            indice: row.querySelector('.t-indice').value
        }));

        const account = storage.getAccount();
        const payload = {
            id: property?.id || data.uid('prop'),
            accountId: account.id,
            direccion: fd.get('direccion').trim(),
            tipo: fd.get('tipo'),
            inquilinoId: fd.get('inquilinoId') || null,
            contrato: {
                inicio: fd.get('contratoInicio') || '',
                fin: fd.get('contratoFin') || '',
                renovacionAuto: fd.get('renovacionAuto') === 'on'
            },
            historialAlquiler: rows
        };

        let list = storage.getProperties();
        if (property) {
            list = list.map(p => p.id === property.id ? payload : p);
        } else {
            if (list.length >= storage.MAX_PROPIEDADES_PROPIAS) {
                alert('Ya alcanzaste el máximo de 5 propiedades propias.');
                return;
            }
            list = [...list, payload];
        }
        storage.setProperties(list);
        closeModal();
        renderPropiedades();
    });
}

// ---------------------------------------------------------------------------
// Inquilinos
// ---------------------------------------------------------------------------

function renderInquilinos() {
    const inquilinos = storage.getInquilinos();
    const properties = storage.getProperties();

    viewRoot().innerHTML = `
        <div class="view-header">
            <h1>Inquilinos</h1>
            <button class="btn btn-primary" data-action="new-inquilino"><i class="fas fa-plus"></i> Nuevo inquilino</button>
        </div>
        <div class="grid-cards">
            ${inquilinos.length === 0 ? '<p class="empty-state">No agregaste inquilinos todavía.</p>' : ''}
            ${inquilinos.map(i => {
                const props = properties.filter(p => p.inquilinoId === i.id);
                return `
                <div class="card">
                    <strong>${escapeHtml(i.nombre)}</strong>
                    <div class="text-muted small">${escapeHtml(i.contacto || 'Sin contacto')}</div>
                    <div class="mt-1 small">Propiedades: ${props.length ? props.map(p => escapeHtml(p.direccion)).join(', ') : 'ninguna'}</div>
                    <div class="card-actions">
                        <button class="btn btn-sm" data-action="edit-inquilino" data-id="${i.id}"><i class="fas fa-pen"></i> Editar</button>
                        <button class="btn btn-sm btn-danger" data-action="delete-inquilino" data-id="${i.id}"><i class="fas fa-trash"></i> Eliminar</button>
                    </div>
                </div>
            `; }).join('')}
        </div>
    `;

    viewRoot().querySelector('[data-action="new-inquilino"]').addEventListener('click', () => openInquilinoForm(null));
    viewRoot().querySelectorAll('[data-action="edit-inquilino"]').forEach(btn =>
        btn.addEventListener('click', () => openInquilinoForm(btn.dataset.id)));
    viewRoot().querySelectorAll('[data-action="delete-inquilino"]').forEach(btn =>
        btn.addEventListener('click', () => {
            if (!confirm('¿Eliminar este inquilino? Las propiedades asignadas quedarán sin inquilino.')) return;
            storage.setInquilinos(storage.getInquilinos().filter(i => i.id !== btn.dataset.id));
            storage.setProperties(storage.getProperties().map(p => p.inquilinoId === btn.dataset.id ? { ...p, inquilinoId: null } : p));
            renderInquilinos();
        }));
}

function openInquilinoForm(inquilinoId) {
    const inquilino = storage.getInquilinos().find(i => i.id === inquilinoId) || null;
    const bodyHtml = `
        <form id="inquilino-form">
            <label>Nombre
                <input type="text" name="nombre" required value="${escapeHtml(inquilino?.nombre || '')}">
            </label>
            <label>Contacto
                <input type="text" name="contacto" placeholder="Teléfono o email" value="${escapeHtml(inquilino?.contacto || '')}">
            </label>
            <div class="modal-footer">
                <button type="button" class="btn btn-ghost" data-action="close-modal">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar</button>
            </div>
        </form>
    `;
    const modal = openModal(inquilino ? 'Editar inquilino' : 'Nuevo inquilino', bodyHtml);
    modal.querySelector('[data-action="close-modal"]').addEventListener('click', closeModal);
    modal.querySelector('#inquilino-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = { id: inquilino?.id || data.uid('inq'), nombre: fd.get('nombre').trim(), contacto: fd.get('contacto').trim() };
        let list = storage.getInquilinos();
        list = inquilino ? list.map(i => i.id === inquilino.id ? payload : i) : [...list, payload];
        storage.setInquilinos(list);
        closeModal();
        renderInquilinos();
    });
}

// ---------------------------------------------------------------------------
// Pagos
// ---------------------------------------------------------------------------

function propiedadesEditablesParaMovPagos() {
    return getPropiedadesCombinadas().filter(p => p.origen === 'propia' || p.permisos?.editarMovimientos);
}

function renderPagos() {
    const propiedades = getPropiedadesCombinadas();
    const pagos = pagosLib.conEstado(propiedades.flatMap(p => pagosDeParaPropiedad(p).map(pg => ({ ...pg, __direccion: p.direccion, __origen: p.origen }))));
    const propiasEditables = storage.getProperties();

    viewRoot().innerHTML = `
        <div class="view-header">
            <h1>Pagos / Mora</h1>
            <button class="btn btn-primary" data-action="new-pago" ${propiasEditables.length === 0 ? 'disabled title="Agregá una propiedad primero"' : ''}><i class="fas fa-plus"></i> Registrar pago</button>
        </div>
        <table class="table">
            <thead><tr><th>Propiedad</th><th>Período</th><th>Vence</th><th>Esperado</th><th>Recibido</th><th>Fecha pago</th><th>Estado</th><th></th></tr></thead>
            <tbody>
                ${pagos.length === 0 ? '<tr><td colspan="8" class="empty-state">No hay pagos registrados.</td></tr>' : ''}
                ${pagos.sort((a, b) => b.periodo.localeCompare(a.periodo)).map(p => `
                    <tr class="${p.estado === 'atrasado' ? 'row-late' : ''}">
                        <td>${escapeHtml(p.__direccion)} ${p.__origen === 'delegada' ? '<span class="badge badge-delegated">D</span>' : ''}</td>
                        <td>${escapeHtml(p.periodo)}</td>
                        <td>${escapeHtml(p.fechaVencimiento || '—')}</td>
                        <td>${p.montoEsperado || 0}</td>
                        <td>${p.montoRecibido || 0}</td>
                        <td>${escapeHtml(p.fechaPago || '—')}</td>
                        <td><span class="estado estado-${p.estado}">${p.estado}</span></td>
                        <td>
                            ${p.__origen === 'propia' ? `
                                ${p.estado !== 'pagado' ? `<button class="btn btn-sm" data-action="marcar-pagado" data-id="${p.id}"><i class="fas fa-check"></i> Marcar pagado</button>` : ''}
                                <button class="btn btn-sm" data-action="edit-pago" data-id="${p.id}"><i class="fas fa-pen"></i></button>
                                <button class="btn btn-sm btn-danger" data-action="delete-pago" data-id="${p.id}"><i class="fas fa-trash"></i></button>
                            ` : '<span class="text-muted small">Solo lectura</span>'}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    viewRoot().querySelector('[data-action="new-pago"]')?.addEventListener('click', () => openPagoForm(null));
    viewRoot().querySelectorAll('[data-action="edit-pago"]').forEach(btn =>
        btn.addEventListener('click', () => openPagoForm(btn.dataset.id)));
    viewRoot().querySelectorAll('[data-action="delete-pago"]').forEach(btn =>
        btn.addEventListener('click', () => {
            if (!confirm('¿Eliminar este pago?')) return;
            storage.setPagos(storage.getPagos().filter(p => p.id !== btn.dataset.id));
            renderPagos();
        }));
    viewRoot().querySelectorAll('[data-action="marcar-pagado"]').forEach(btn =>
        btn.addEventListener('click', () => {
            const list = storage.getPagos();
            const pago = list.find(p => p.id === btn.dataset.id);
            if (!pago) return;
            pago.fechaPago = data.todayISO();
            if (!pago.montoRecibido) pago.montoRecibido = pago.montoEsperado;
            storage.setPagos(list);
            renderPagos();
        }));
}

function openPagoForm(pagoId) {
    const pago = storage.getPagos().find(p => p.id === pagoId) || null;
    const properties = storage.getProperties();
    const bodyHtml = `
        <form id="pago-form">
            <label>Propiedad
                <select name="propertyId" required>
                    ${properties.map(p => `<option value="${p.id}" ${pago?.propertyId === p.id ? 'selected' : ''}>${escapeHtml(p.direccion)}</option>`).join('')}
                </select>
            </label>
            <div class="form-row">
                <label>Período (AAAA-MM)
                    <input type="month" name="periodo" required value="${escapeHtml(pago?.periodo || data.todayISO().slice(0, 7))}">
                </label>
                <label>Vencimiento
                    <input type="date" name="fechaVencimiento" value="${escapeHtml(pago?.fechaVencimiento || '')}">
                </label>
            </div>
            <div class="form-row">
                <label>Monto esperado
                    <input type="number" step="0.01" name="montoEsperado" value="${pago?.montoEsperado ?? ''}" required>
                </label>
                <label>Monto recibido
                    <input type="number" step="0.01" name="montoRecibido" value="${pago?.montoRecibido ?? ''}">
                </label>
            </div>
            <label>Fecha de pago (vacío = sin pagar)
                <input type="date" name="fechaPago" value="${escapeHtml(pago?.fechaPago || '')}">
            </label>
            <div class="modal-footer">
                <button type="button" class="btn btn-ghost" data-action="close-modal">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar</button>
            </div>
        </form>
    `;
    const modal = openModal(pago ? 'Editar pago' : 'Registrar pago', bodyHtml);
    modal.querySelector('[data-action="close-modal"]').addEventListener('click', closeModal);
    modal.querySelector('#pago-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = {
            id: pago?.id || data.uid('pago'),
            propertyId: fd.get('propertyId'),
            periodo: fd.get('periodo'),
            montoEsperado: Number(fd.get('montoEsperado')) || 0,
            montoRecibido: Number(fd.get('montoRecibido')) || 0,
            fechaVencimiento: fd.get('fechaVencimiento') || '',
            fechaPago: fd.get('fechaPago') || null
        };
        let list = storage.getPagos();
        list = pago ? list.map(p => p.id === pago.id ? payload : p) : [...list, payload];
        storage.setPagos(list);
        closeModal();
        renderPagos();
    });
}

// ---------------------------------------------------------------------------
// Movimientos
// ---------------------------------------------------------------------------

function renderMovimientos() {
    const propiedades = propiedadesEditablesParaMovPagos();
    const movimientos = propiedades.flatMap(p => movimientosDeParaPropiedad(p).map(m => ({ ...m, __direccion: p.direccion, __origen: p.origen })));

    viewRoot().innerHTML = `
        <div class="view-header">
            <h1>Movimientos</h1>
            <button class="btn btn-primary" data-action="new-mov" ${propiedades.length === 0 ? 'disabled' : ''}><i class="fas fa-plus"></i> Nuevo movimiento</button>
        </div>
        <table class="table">
            <thead><tr><th>Propiedad</th><th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Monto</th><th></th></tr></thead>
            <tbody>
                ${movimientos.length === 0 ? '<tr><td colspan="6" class="empty-state">No hay movimientos cargados.</td></tr>' : ''}
                ${movimientos.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(m => `
                    <tr>
                        <td>${escapeHtml(m.__direccion)} ${m.__origen === 'delegada' ? '<span class="badge badge-delegated">D</span>' : ''}</td>
                        <td>${escapeHtml(m.fecha)}</td>
                        <td><span class="badge ${m.tipo === 'ingreso' ? 'badge-own' : 'badge-danger'}">${m.tipo}</span></td>
                        <td>${escapeHtml(m.concepto)}</td>
                        <td>${data.formatMonto(m.monto, m.moneda)}</td>
                        <td>
                            <button class="btn btn-sm" data-action="edit-mov" data-id="${m.id}"><i class="fas fa-pen"></i></button>
                            <button class="btn btn-sm btn-danger" data-action="delete-mov" data-id="${m.id}"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    viewRoot().querySelector('[data-action="new-mov"]')?.addEventListener('click', () => openMovForm(null));
    viewRoot().querySelectorAll('[data-action="edit-mov"]').forEach(btn =>
        btn.addEventListener('click', () => openMovForm(btn.dataset.id)));
    viewRoot().querySelectorAll('[data-action="delete-mov"]').forEach(btn =>
        btn.addEventListener('click', () => {
            if (!confirm('¿Eliminar este movimiento?')) return;
            storage.setMovimientos(storage.getMovimientos().filter(m => m.id !== btn.dataset.id));
            renderMovimientos();
        }));
}

function openMovForm(movId) {
    const mov = storage.getMovimientos().find(m => m.id === movId) || null;
    const propiedades = propiedadesEditablesParaMovPagos();
    const bodyHtml = `
        <form id="mov-form">
            <label>Propiedad
                <select name="propertyId" required>
                    ${propiedades.map(p => `<option value="${p.id}" ${mov?.propertyId === p.id ? 'selected' : ''}>${escapeHtml(p.direccion)}${p.origen === 'delegada' ? ' (delegada)' : ''}</option>`).join('')}
                </select>
            </label>
            <div class="form-row">
                <label>Fecha
                    <input type="date" name="fecha" required value="${escapeHtml(mov?.fecha || data.todayISO())}">
                </label>
                <label>Tipo
                    <select name="tipo">
                        <option value="ingreso" ${mov?.tipo === 'ingreso' ? 'selected' : ''}>Ingreso</option>
                        <option value="gasto" ${mov?.tipo === 'gasto' ? 'selected' : ''}>Gasto</option>
                    </select>
                </label>
            </div>
            <label>Concepto
                <input type="text" name="concepto" required value="${escapeHtml(mov?.concepto || '')}">
            </label>
            <div class="form-row">
                <label>Monto
                    <input type="number" step="0.01" name="monto" required value="${mov?.monto ?? ''}">
                </label>
                <label>Moneda
                    <select name="moneda">
                        ${data.MONEDAS.map(m => `<option value="${m}" ${mov?.moneda === m ? 'selected' : ''}>${m}</option>`).join('')}
                    </select>
                </label>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-ghost" data-action="close-modal">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar</button>
            </div>
        </form>
    `;
    const modal = openModal(mov ? 'Editar movimiento' : 'Nuevo movimiento', bodyHtml);
    modal.querySelector('[data-action="close-modal"]').addEventListener('click', closeModal);
    modal.querySelector('#mov-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = {
            id: mov?.id || data.uid('mov'),
            propertyId: fd.get('propertyId'),
            fecha: fd.get('fecha'),
            tipo: fd.get('tipo'),
            concepto: fd.get('concepto').trim(),
            monto: Number(fd.get('monto')) || 0,
            moneda: fd.get('moneda')
        };
        let list = storage.getMovimientos();
        list = mov ? list.map(m => m.id === mov.id ? payload : m) : [...list, payload];
        storage.setMovimientos(list);
        closeModal();
        renderMovimientos();
    });
}

// ---------------------------------------------------------------------------
// Gastos compartidos
// ---------------------------------------------------------------------------

function renderGastos() {
    const properties = storage.getProperties();
    const gastos = storage.getGastosCompartidos();

    viewRoot().innerHTML = `
        <div class="view-header">
            <h1>Gastos compartidos</h1>
            <button class="btn btn-primary" data-action="new-gasto" ${properties.length < 2 ? 'disabled title="Necesitás al menos 2 propiedades propias"' : ''}><i class="fas fa-plus"></i> Nuevo gasto</button>
        </div>
        <div class="grid-cards">
            ${gastos.length === 0 ? '<p class="empty-state">No hay gastos compartidos cargados.</p>' : ''}
            ${gastos.map(g => {
                const dist = pagosLib.calcularDistribucion(g, properties);
                return `
                <div class="card">
                    <div class="card-title-row"><strong>${escapeHtml(g.concepto)}</strong><span class="badge badge-own">${data.formatMonto(g.monto, g.moneda)}</span></div>
                    <div class="text-muted small">Distribución: ${escapeHtml(g.distribucion)}</div>
                    <ul class="dist-list">
                        ${g.properties.map(pid => {
                            const prop = properties.find(p => p.id === pid);
                            return `<li>${escapeHtml(prop?.direccion || pid)}: <strong>${data.formatMonto(dist[pid] || 0, g.moneda)}</strong></li>`;
                        }).join('')}
                    </ul>
                    <div class="card-actions">
                        <button class="btn btn-sm" data-action="edit-gasto" data-id="${g.id}"><i class="fas fa-pen"></i> Editar</button>
                        <button class="btn btn-sm btn-danger" data-action="delete-gasto" data-id="${g.id}"><i class="fas fa-trash"></i> Eliminar</button>
                    </div>
                </div>
            `; }).join('')}
        </div>
    `;

    viewRoot().querySelector('[data-action="new-gasto"]')?.addEventListener('click', () => openGastoForm(null));
    viewRoot().querySelectorAll('[data-action="edit-gasto"]').forEach(btn =>
        btn.addEventListener('click', () => openGastoForm(btn.dataset.id)));
    viewRoot().querySelectorAll('[data-action="delete-gasto"]').forEach(btn =>
        btn.addEventListener('click', () => {
            if (!confirm('¿Eliminar este gasto compartido?')) return;
            storage.setGastosCompartidos(storage.getGastosCompartidos().filter(g => g.id !== btn.dataset.id));
            renderGastos();
        }));
}

function openGastoForm(gastoId) {
    const gasto = storage.getGastosCompartidos().find(g => g.id === gastoId) || null;
    const properties = storage.getProperties();
    const account = storage.getAccount();
    const seleccionadas = new Set(gasto?.properties || []);

    const bodyHtml = `
        <form id="gasto-form">
            <label>Concepto
                <input type="text" name="concepto" required value="${escapeHtml(gasto?.concepto || '')}">
            </label>
            <div class="form-row">
                <label>Monto total
                    <input type="number" step="0.01" name="monto" required value="${gasto?.monto ?? ''}">
                </label>
                <label>Moneda
                    <select name="moneda">
                        ${data.MONEDAS.map(m => `<option value="${m}" ${gasto?.moneda === m ? 'selected' : ''}>${m}</option>`).join('')}
                    </select>
                </label>
            </div>
            <label>Distribución
                <select name="distribucion" id="gasto-distribucion">
                    <option value="equitativa" ${gasto?.distribucion === 'equitativa' ? 'selected' : ''}>Equitativa</option>
                    <option value="proporcional_alquiler" ${gasto?.distribucion === 'proporcional_alquiler' ? 'selected' : ''}>Proporcional al alquiler</option>
                    <option value="manual" ${gasto?.distribucion === 'manual' ? 'selected' : ''}>Manual</option>
                </select>
            </label>
            <fieldset>
                <legend>Propiedades incluidas</legend>
                ${properties.map(p => `
                    <label class="checkbox-label">
                        <input type="checkbox" class="prop-check" value="${p.id}" ${seleccionadas.has(p.id) ? 'checked' : ''}>
                        ${escapeHtml(p.direccion)}
                        <input type="number" step="0.01" class="manual-monto" data-pid="${p.id}" placeholder="Monto manual" value="${gasto?.montoManual?.[p.id] ?? ''}" style="display:${gasto?.distribucion === 'manual' ? 'inline-block' : 'none'}; width:100px; margin-left:8px;">
                    </label>
                `).join('')}
            </fieldset>
            <div class="modal-footer">
                <button type="button" class="btn btn-ghost" data-action="close-modal">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar</button>
            </div>
        </form>
    `;
    const modal = openModal(gasto ? 'Editar gasto compartido' : 'Nuevo gasto compartido', bodyHtml);
    modal.querySelector('[data-action="close-modal"]').addEventListener('click', closeModal);

    const distSelect = modal.querySelector('#gasto-distribucion');
    const toggleManualInputs = () => {
        modal.querySelectorAll('.manual-monto').forEach(inp => {
            inp.style.display = distSelect.value === 'manual' ? 'inline-block' : 'none';
        });
    };
    distSelect.addEventListener('change', toggleManualInputs);

    modal.querySelector('#gasto-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const propsSeleccionadas = [...modal.querySelectorAll('.prop-check:checked')].map(c => c.value);
        if (propsSeleccionadas.length === 0) {
            alert('Seleccioná al menos una propiedad.');
            return;
        }
        const montoManual = {};
        modal.querySelectorAll('.manual-monto').forEach(inp => { montoManual[inp.dataset.pid] = Number(inp.value) || 0; });

        const payload = {
            id: gasto?.id || data.uid('gc'),
            accountId: account.id,
            concepto: fd.get('concepto').trim(),
            monto: Number(fd.get('monto')) || 0,
            moneda: fd.get('moneda'),
            distribucion: fd.get('distribucion'),
            properties: propsSeleccionadas,
            montoManual
        };
        let list = storage.getGastosCompartidos();
        list = gasto ? list.map(g => g.id === gasto.id ? payload : g) : [...list, payload];
        storage.setGastosCompartidos(list);
        closeModal();
        renderGastos();
    });
}

// ---------------------------------------------------------------------------
// Delegación
// ---------------------------------------------------------------------------

function renderDelegacion() {
    const account = storage.getAccount();
    const properties = storage.getProperties();
    const delegated = storage.getDelegated();

    viewRoot().innerHTML = `
        <div class="view-header"><h1>Delegación</h1></div>

        <section class="panel">
            <h2>Delegar una propiedad mía</h2>
            <p class="text-muted small">Genera un archivo <code>.propman</code> con una foto de la propiedad para que otra persona la administre. No es en tiempo real: si tus datos cambian, tenés que volver a exportar.</p>
            ${properties.length === 0 ? '<p class="empty-state">Agregá una propiedad primero.</p>' : `
            <form id="delegar-form">
                <label>Propiedad
                    <select name="propertyId" required>
                        ${properties.map(p => `<option value="${p.id}">${escapeHtml(p.direccion)}</option>`).join('')}
                    </select>
                </label>
                <label>Otorgado a (email del administrador)
                    <input type="email" name="otorgadoA" required placeholder="admin@email.com">
                </label>
                <label>Vigente hasta (opcional)
                    <input type="date" name="vigenteHasta">
                </label>
                <fieldset>
                    <legend>Permisos</legend>
                    <label class="checkbox-label"><input type="checkbox" name="verFinanzas" checked> Ver finanzas</label>
                    <label class="checkbox-label"><input type="checkbox" name="editarMovimientos" checked> Editar movimientos</label>
                    <label class="checkbox-label"><input type="checkbox" name="editarContrato"> Editar contrato</label>
                    <label class="checkbox-label"><input type="checkbox" name="revocable" checked> Revocable</label>
                </fieldset>
                <button type="submit" class="btn btn-primary"><i class="fas fa-file-export"></i> Exportar .propman</button>
            </form>
            `}
        </section>

        <section class="panel">
            <h2>Propiedades delegadas a mí</h2>
            <label class="file-input">
                <i class="fas fa-file-import"></i> Importar archivo .propman
                <input type="file" id="import-delegacion" accept=".propman,application/json" hidden>
            </label>
            <div class="grid-cards mt-3">
                ${delegated.length === 0 ? '<p class="empty-state">No importaste ninguna delegación todavía.</p>' : ''}
                ${delegated.map(d => `
                    <div class="card">
                        <div class="card-title-row">
                            <strong>${escapeHtml(d.snapshot.direccion)}</strong>
                            ${delegacionLib.estaVigente(d) ? '<span class="badge badge-own">Vigente</span>' : '<span class="badge badge-danger">Vencida</span>'}
                        </div>
                        <div class="text-muted small">Titular: ${escapeHtml(d.delegacion.titular.nombre)} (${escapeHtml(d.delegacion.titular.email)})</div>
                        <div class="text-muted small">Exportado: ${new Date(d.delegacion.fechaExport).toLocaleDateString('es-UY')}</div>
                        <div class="text-muted small">Permisos: ${Object.entries(d.delegacion.permisos).filter(([, v]) => v).map(([k]) => escapeHtml(k)).join(', ') || 'ninguno'}</div>
                        <div class="card-actions">
                            <button class="btn btn-sm btn-danger" data-action="revoke-delegacion" data-id="${d.localId}"><i class="fas fa-trash"></i> Quitar</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>
    `;

    viewRoot().querySelector('#delegar-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const propertyId = fd.get('propertyId');
        const property = properties.find(p => p.id === propertyId);
        const inquilino = storage.getInquilinos().find(i => i.id === property.inquilinoId) || null;
        delegacionLib.exportarDelegacion({
            property,
            titular: account.titular,
            otorgadoA: fd.get('otorgadoA').trim(),
            permisos: {
                verFinanzas: fd.get('verFinanzas') === 'on',
                editarMovimientos: fd.get('editarMovimientos') === 'on',
                editarContrato: fd.get('editarContrato') === 'on',
                revocable: fd.get('revocable') === 'on'
            },
            vigenteHasta: fd.get('vigenteHasta') || null,
            inquilino,
            movimientos: storage.getMovimientos().filter(m => m.propertyId === propertyId),
            pagos: storage.getPagos().filter(p => p.propertyId === propertyId)
        });
    });

    viewRoot().querySelector('#import-delegacion').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            const parsed = delegacionLib.parseDelegacion(text);
            const merged = delegacionLib.mergeDelegacion(storage.getDelegated(), parsed);
            storage.setDelegated(merged);
            renderDelegacion();
        } catch (err) {
            alert('No se pudo importar el archivo: ' + err.message);
        }
        e.target.value = '';
    });

    viewRoot().querySelectorAll('[data-action="revoke-delegacion"]').forEach(btn =>
        btn.addEventListener('click', () => {
            if (!confirm('¿Quitar esta propiedad delegada de tu cuenta? Esto no revoca el permiso del lado del titular.')) return;
            storage.setDelegated(storage.getDelegated().filter(d => d.localId !== btn.dataset.id));
            renderDelegacion();
        }));
}

// ---------------------------------------------------------------------------
// Cuenta y datos (import/export CSV/JSON, backup)
// ---------------------------------------------------------------------------

function renderDatos() {
    const account = storage.getAccount();
    const last = storage.getLastBackup();

    viewRoot().innerHTML = `
        <div class="view-header"><h1>Cuenta y datos</h1></div>

        <section class="panel">
            <h2>Mi cuenta</h2>
            <form id="cuenta-form">
                <label>Nombre
                    <input type="text" name="nombre" required value="${escapeHtml(account.titular.nombre)}">
                </label>
                <label>Email
                    <input type="email" name="email" required value="${escapeHtml(account.titular.email)}">
                </label>
                <label>Documento
                    <input type="text" name="documento" value="${escapeHtml(account.titular.documento || '')}">
                </label>
                <button type="submit" class="btn btn-primary">Guardar</button>
            </form>
        </section>

        <section class="panel">
            <h2>Backup completo</h2>
            <p class="text-muted small">Último backup: ${last ? new Date(last).toLocaleString('es-UY') : 'nunca'}</p>
            <div class="btn-row">
                <button class="btn" data-action="export-json"><i class="fas fa-file-export"></i> Exportar JSON</button>
                <label class="file-input">
                    <i class="fas fa-file-import"></i> Importar JSON
                    <input type="file" id="import-json" accept="application/json" hidden>
                </label>
            </div>
        </section>

        <section class="panel">
            <h2>Importar CSV (desde la plantilla de referencia)</h2>
            <div class="btn-row">
                <label class="file-input">Propiedades <input type="file" id="import-prop-csv" accept=".csv" hidden></label>
                <label class="file-input">Movimientos <input type="file" id="import-mov-csv" accept=".csv" hidden></label>
                <label class="file-input">Pagos <input type="file" id="import-pago-csv" accept=".csv" hidden></label>
            </div>
        </section>

        <section class="panel">
            <h2>Exportar CSV</h2>
            <div class="btn-row">
                <button class="btn" data-action="export-prop-csv"><i class="fas fa-file-csv"></i> Propiedades</button>
                <button class="btn" data-action="export-mov-csv"><i class="fas fa-file-csv"></i> Movimientos</button>
                <button class="btn" data-action="export-pago-csv"><i class="fas fa-file-csv"></i> Pagos</button>
            </div>
        </section>
    `;

    document.getElementById('cuenta-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        storage.setAccount({
            ...account,
            titular: { nombre: fd.get('nombre').trim(), email: fd.get('email').trim(), documento: fd.get('documento').trim() }
        });
        alert('Datos actualizados.');
    });

    document.querySelector('[data-action="export-json"]').addEventListener('click', () => {
        exportarBackupCompleto();
        renderDatos();
    });
    document.getElementById('import-json').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!confirm('Importar reemplazará los datos actuales por los del archivo. ¿Continuar?')) { e.target.value = ''; return; }
        try {
            const parsed = JSON.parse(await file.text());
            storage.importAllData(parsed);
            route();
        } catch (err) {
            alert('Archivo inválido: ' + err.message);
        }
        e.target.value = '';
    });

    document.querySelector('[data-action="export-prop-csv"]').addEventListener('click', () => {
        const rows = storage.getProperties().flatMap(p => {
            const tramo = data.getTramoVigente(p.historialAlquiler) || {};
            const inq = storage.getInquilinos().find(i => i.id === p.inquilinoId);
            return [{
                direccion: p.direccion, tipo: p.tipo,
                inquilino_nombre: inq?.nombre || '', inquilino_contacto: inq?.contacto || '',
                contrato_inicio: p.contrato?.inicio || '', contrato_fin: p.contrato?.fin || '',
                renovacion_auto: p.contrato?.renovacionAuto || false,
                desde: tramo.desde || '', monto: tramo.monto || '', moneda: tramo.moneda || '', indice: tramo.indice || ''
            }];
        });
        const csv = data.toCSV(rows, ['direccion', 'tipo', 'inquilino_nombre', 'inquilino_contacto', 'contrato_inicio', 'contrato_fin', 'renovacion_auto', 'desde', 'monto', 'moneda', 'indice']);
        data.downloadFile(`propman-propiedades-${data.todayISO()}.csv`, csv, 'text/csv');
    });
    document.querySelector('[data-action="export-mov-csv"]').addEventListener('click', () => {
        const properties = storage.getProperties();
        const rows = storage.getMovimientos().map(m => ({
            direccion: properties.find(p => p.id === m.propertyId)?.direccion || '',
            fecha: m.fecha, tipo: m.tipo, concepto: m.concepto, monto: m.monto, moneda: m.moneda
        }));
        const csv = data.toCSV(rows, ['direccion', 'fecha', 'tipo', 'concepto', 'monto', 'moneda']);
        data.downloadFile(`propman-movimientos-${data.todayISO()}.csv`, csv, 'text/csv');
    });
    document.querySelector('[data-action="export-pago-csv"]').addEventListener('click', () => {
        const properties = storage.getProperties();
        const rows = storage.getPagos().map(p => ({
            direccion: properties.find(pr => pr.id === p.propertyId)?.direccion || '',
            periodo: p.periodo, montoEsperado: p.montoEsperado, montoRecibido: p.montoRecibido,
            fechaVencimiento: p.fechaVencimiento, fechaPago: p.fechaPago || ''
        }));
        const csv = data.toCSV(rows, ['direccion', 'periodo', 'montoEsperado', 'montoRecibido', 'fechaVencimiento', 'fechaPago']);
        data.downloadFile(`propman-pagos-${data.todayISO()}.csv`, csv, 'text/csv');
    });

    function resolvePropertyId(direccion) {
        const match = storage.getProperties().find(p => (p.direccion || '').trim().toLowerCase() === (direccion || '').trim().toLowerCase());
        return match?.id;
    }

    document.getElementById('import-prop-csv').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const account2 = storage.getAccount();
        const { properties, inquilinos } = data.importPropiedadesCSV(await file.text(), account2.id);
        const espacioDisponible = storage.MAX_PROPIEDADES_PROPIAS - storage.getProperties().length;
        const aImportar = properties.slice(0, Math.max(espacioDisponible, 0));
        if (aImportar.length < properties.length) {
            alert(`Se importaron ${aImportar.length} de ${properties.length} propiedades por el límite de ${storage.MAX_PROPIEDADES_PROPIAS}.`);
        }
        storage.setInquilinos([...storage.getInquilinos(), ...inquilinos]);
        storage.setProperties([...storage.getProperties(), ...aImportar]);
        alert(`Importadas ${aImportar.length} propiedades.`);
        renderDatos();
        e.target.value = '';
    });
    document.getElementById('import-mov-csv').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const nuevos = data.importMovimientosCSV(await file.text(), resolvePropertyId);
        storage.setMovimientos([...storage.getMovimientos(), ...nuevos]);
        alert(`Importados ${nuevos.length} movimientos.`);
        e.target.value = '';
    });
    document.getElementById('import-pago-csv').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const nuevos = data.importPagosCSV(await file.text(), resolvePropertyId);
        storage.setPagos([...storage.getPagos(), ...nuevos]);
        alert(`Importados ${nuevos.length} pagos.`);
        e.target.value = '';
    });
}
