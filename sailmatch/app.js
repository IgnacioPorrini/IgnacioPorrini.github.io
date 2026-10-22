(function () {
    'use strict';

    var API = (window.SAILMATCH_API || '').trim();
    var DEMO = !API;
    var NIVEL_TXT = {
        'sin-experiencia': 'No hace falta experiencia',
        'algo': 'Algo de experiencia',
        'experiencia': 'Con experiencia'
    };
    var SEM = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    var SEM_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
    var MES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];

    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

    var estado = {
        salidas: [],
        nivel: '',
        edicion: null // {id, codigo, estado}
    };

    /* ---------- almacenamiento local (comodidad, puede fallar) ---------- */
    function guardadas() {
        try { return JSON.parse(localStorage.getItem('sailmatch-mias') || '[]'); } catch (e) { return []; }
    }
    function recordar(item) {
        try {
            var l = guardadas().filter(function (x) { return x.id !== item.id; });
            l.unshift(item);
            localStorage.setItem('sailmatch-mias', JSON.stringify(l.slice(0, 10)));
        } catch (e) { /* sin almacenamiento: no pasa nada */ }
    }

    /* ---------- API ---------- */
    function pedir(datos) {
        if (DEMO) return Promise.resolve(demoResponder(datos));
        var op = datos
            ? { method: 'POST', body: JSON.stringify(datos), headers: { 'Content-Type': 'text/plain;charset=utf-8' } }
            : { method: 'GET' };
        return fetch(API, op).then(function (r) {
            if (!r.ok) throw new Error('red');
            return r.json();
        }).catch(function () {
            return { ok: false, error: 'No pudimos conectar. Revisá tu conexión y probá de nuevo.' };
        });
    }

    /* ---------- fechas ---------- */
    function aFecha(iso) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
    function isoDe(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function hoyISO() { return isoDe(new Date()); }
    function fechaLarga(iso) {
        var d = aFecha(iso);
        return SEM_LARGO[d.getDay()] + ' ' + d.getDate() + ' de ' + MES_LARGO[d.getMonth()];
    }
    function relativo(iso) {
        var hoy = aFecha(hoyISO()), d = aFecha(iso);
        var dif = Math.round((d - hoy) / 86400000);
        if (dif === 0) return 'Hoy';
        if (dif === 1) return 'Mañana';
        return '';
    }

    /* ---------- vistas ---------- */
    function ir(vista, opciones) {
        $$('.vista').forEach(function (v) { v.hidden = v.id !== 'v-' + vista; });
        var tab = vista === 'listo' ? 'publicar' : vista;
        $$('.tabs button').forEach(function (b) { b.classList.toggle('activa', b.dataset.ir === tab); });
        if (vista === 'salidas') {
            if (opciones && opciones.todas) {
                estado.nivel = '';
                $$('.chip').forEach(function (x) { x.classList.toggle('activa', x.dataset.nivel === ''); });
            }
            cargar();
        }
        if (vista === 'publicar' && !(opciones && opciones.edicion)) prepararAlta();
        if (vista === 'editar') prepararEditar(opciones && opciones.id);
        window.scrollTo(0, 0);
    }

    document.addEventListener('click', function (e) {
        var b = e.target.closest('[data-ir]');
        if (!b) return;
        e.preventDefault();
        ir(b.dataset.ir, { todas: !!b.closest('#v-listo') });
    });

    /* ---------- listado ---------- */
    function cargar() {
        var lista = $('#lista');
        lista.innerHTML = '<div class="cargando">Cargando salidas…</div>';
        pedir(null).then(function (r) {
            if (!r.ok) { lista.innerHTML = '<div class="vacio">' + esc(r.error) + '</div>'; return; }
            estado.salidas = r.salidas || [];
            pintar();
        });
    }

    function pintar() {
        var lista = $('#lista');
        var visibles = estado.salidas.filter(function (s) { return !estado.nivel || s.nivel === estado.nivel; });
        if (!visibles.length) {
            lista.innerHTML = '<div class="vacio">' + (estado.salidas.length
                ? 'No hay salidas para ese nivel por ahora.'
                : 'Todavía no hay salidas publicadas. ¿Tenés barco? Publicá la primera.') + '</div>';
            return;
        }
        lista.innerHTML = visibles.map(tarjeta).join('');
        var ver = new URLSearchParams(location.search).get('ver');
        if (ver) {
            var t = document.getElementById('s-' + ver);
            if (t) { t.classList.add('resaltada'); t.scrollIntoView({ block: 'start' }); }
        }
    }

    function tarjeta(s) {
        var d = aFecha(s.fecha);
        var rel = relativo(s.fecha);
        var completa = s.estado === 'completa';
        var horario = s.hora_salida + (s.hora_regreso ? ' a ' + s.hora_regreso : '');
        var lugares = s.lugares + (s.lugares === '1' ? ' lugar' : ' lugares');
        return '' +
            '<article class="salida' + (completa ? ' completa' : '') + '" id="s-' + esc(s.id) + '">' +
            '<div class="dia"><div class="sem">' + (rel || SEM[d.getDay()]) + '</div><div class="num">' + d.getDate() + '</div><div class="mes">' + MES[d.getMonth()] + '</div></div>' +
            '<div>' +
            '<h3>' + esc(s.puerto) + (s.embarcacion ? ' · ' + esc(s.embarcacion) : '') + '</h3>' +
            '<p class="meta">' + esc(horario) + ' · ' + esc(lugares) + (s.aporte ? ' · ' + esc(s.aporte) : '') + '</p>' +
            '<div class="etiquetas">' +
            (completa ? '<span class="et est">Completa</span>' : '') +
            '<span class="et n-' + esc(s.nivel) + '">' + esc(NIVEL_TXT[s.nivel] || '') + '</span>' +
            '</div>' +
            (s.descripcion ? '<p class="desc">' + esc(s.descripcion) + '</p>' : '') +
            '<p class="patron">Patrón: <strong>' + esc(s.patron) + '</strong></p>' +
            '<div class="acciones">' +
            (completa
                ? '<button class="btn btn-sec btn-chico" disabled>Sin lugares</button>'
                : '<a class="btn btn-wa btn-chico" target="_blank" rel="noopener" href="' + enlaceSumarse(s) + '">Quiero sumarme</a>') +
            '<button class="btn btn-sec btn-chico" data-compartir="' + esc(s.id) + '">Compartir</button>' +
            '</div>' +
            '</div>' +
            '</article>';
    }

    function enlaceSumarse(s) {
        var txt = 'Hola ' + s.patron + ', vi en SailMatch tu salida del ' + fechaLarga(s.fecha) +
            ' a las ' + s.hora_salida + ' desde ' + s.puerto + '. Me gustaría sumarme. ';
        return 'https://wa.me/' + encodeURIComponent(s.whatsapp) + '?text=' + encodeURIComponent(txt);
    }

    $('.filtros').addEventListener('click', function (e) {
        var c = e.target.closest('.chip');
        if (!c) return;
        estado.nivel = c.dataset.nivel;
        $$('.chip').forEach(function (x) { x.classList.toggle('activa', x === c); });
        pintar();
    });

    $('#lista').addEventListener('click', function (e) {
        var b = e.target.closest('[data-compartir]');
        if (!b) return;
        var s = estado.salidas.filter(function (x) { return x.id === b.dataset.compartir; })[0];
        if (!s) return;
        var url = base() + '?ver=' + encodeURIComponent(s.id);
        var txt = 'Salida a vela el ' + fechaLarga(s.fecha) + ' desde ' + s.puerto + ' — buscan ' + s.lugares + ' tripulante(s).';
        if (navigator.share) {
            navigator.share({ title: 'SailMatch', text: txt, url: url }).catch(function () {});
        } else {
            copiar(url, 'Enlace copiado');
        }
    });

    /* ---------- publicar / editar ---------- */
    var form = $('#form-salida');

    function prepararAlta() {
        estado.edicion = null;
        form.reset();
        form.fecha.min = hoyISO();
        $('#titulo-form').textContent = 'Publicar una salida';
        $('#sub-form').textContent = 'Completá los datos y listo. Te damos un código para cambiarla o cerrarla después.';
        $('#btn-guardar').textContent = 'Publicar salida';
        $('#acciones-edicion').hidden = true;
        error('#error-form', '');
    }

    function cargarEnForm(s) {
        ['fecha', 'hora_salida', 'hora_regreso', 'puerto', 'embarcacion', 'lugares', 'aporte', 'descripcion', 'patron'].forEach(function (c) {
            form[c].value = s[c] || '';
        });
        form.whatsapp.value = s.whatsapp ? '+' + s.whatsapp : '';
        $$('input[name=nivel]', form).forEach(function (r) { r.checked = r.value === s.nivel; });
        form.fecha.min = hoyISO();
        $('#titulo-form').textContent = 'Editar mi salida';
        $('#sub-form').textContent = 'Salida n.º ' + estado.edicion.id + '. Cambiá lo que necesites y guardá.';
        $('#btn-guardar').textContent = 'Guardar cambios';
        $('#acciones-edicion').hidden = false;
        var abierta = s.estado !== 'completa';
        $('[data-estado=completa]').hidden = !abierta;
        $('[data-estado=abierta]').hidden = abierta;
        error('#error-form', '');
    }

    function leerForm() {
        var nivel = ($('input[name=nivel]:checked', form) || {}).value;
        return {
            fecha: form.fecha.value,
            hora_salida: form.hora_salida.value,
            hora_regreso: form.hora_regreso.value,
            puerto: form.puerto.value,
            embarcacion: form.embarcacion.value,
            lugares: form.lugares.value,
            nivel: nivel,
            aporte: form.aporte.value,
            descripcion: form.descripcion.value,
            patron: form.patron.value,
            whatsapp: form.whatsapp.value
        };
    }

    function validarLocal(s) {
        if (!s.fecha) return 'Falta la fecha.';
        if (s.fecha < hoyISO()) return 'La fecha ya pasó.';
        if (!s.hora_salida) return 'Falta la hora de salida.';
        if (!s.puerto.trim()) return 'Falta el puerto o club de salida.';
        var l = parseInt(s.lugares, 10);
        if (!(l >= 1 && l <= 20)) return 'Los lugares tienen que ser entre 1 y 20.';
        if (!s.patron.trim()) return 'Falta tu nombre.';
        if (!whatsappValido(s.whatsapp)) return 'Revisá el número de WhatsApp (por ejemplo 099 123 456).';
        return '';
    }

    function whatsappValido(v) {
        var crudo = String(v || '').trim(), d = crudo.replace(/\D/g, '');
        return /^09\d{7}$/.test(d) || /^9\d{7}$/.test(d) || /^5989\d{7}$/.test(d) ||
            (crudo.charAt(0) === '+' && d.length >= 8 && d.length <= 15);
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var s = leerForm();
        var msg = validarLocal(s);
        if (msg) { error('#error-form', msg); return; }
        error('#error-form', '');
        var btn = $('#btn-guardar');
        btn.disabled = true;
        var datos = estado.edicion
            ? { accion: 'editar', id: estado.edicion.id, codigo: estado.edicion.codigo, salida: s, web: form.web.value }
            : { accion: 'publicar', salida: s, web: form.web.value };
        pedir(datos).then(function (r) {
            btn.disabled = false;
            if (!r.ok) { error('#error-form', r.error || 'No se pudo guardar.'); return; }
            if (estado.edicion) {
                aviso('Cambios guardados');
                ir('salidas', { todas: true });
            } else {
                recordar({ id: r.id, codigo: r.codigo, fecha: s.fecha, puerto: s.puerto });
                mostrarListo(r.id, r.codigo, s);
            }
        });
    });

    $('#acciones-edicion').addEventListener('click', function (e) {
        var b = e.target.closest('[data-estado]');
        if (!b || !estado.edicion) return;
        var nuevo = b.dataset.estado;
        if (nuevo === 'cancelada' && !confirm('¿Cancelar esta salida? Deja de verse en el listado.')) return;
        b.disabled = true;
        pedir({ accion: 'estado', id: estado.edicion.id, codigo: estado.edicion.codigo, estado: nuevo }).then(function (r) {
            b.disabled = false;
            if (!r.ok) { error('#error-form', r.error); return; }
            aviso({ completa: 'Marcada como completa', abierta: 'Salida abierta de nuevo', cancelada: 'Salida cancelada' }[nuevo]);
            ir('salidas');
        });
    });

    function mostrarListo(id, codigo, s) {
        $('#codigo-nuevo').textContent = codigo;
        $('#id-nuevo').textContent = id;
        var link = enlaceEditar(id);
        var txt = 'Mi salida en SailMatch (' + fechaLarga(s.fecha) + ', ' + s.puerto + ').\nNúmero: ' + id + '\nCódigo: ' + codigo + '\nPara editarla: ' + link;
        var propio = s.whatsapp.replace(/\D/g, '');
        if (/^0?9\d{7}$/.test(propio)) propio = '598' + propio.replace(/^0/, '');
        $('#btn-codigo-wa').href = 'https://wa.me/' + propio + '?text=' + encodeURIComponent(txt);
        $('#btn-copiar').onclick = function () { copiar(link + '\nCódigo: ' + codigo, 'Copiado'); };
        ir('listo');
    }

    /* ---------- pedir código ---------- */
    var formCodigo = $('#form-codigo');

    function prepararEditar(id) {
        error('#error-codigo', '');
        if (id) formCodigo.id.value = id;
        var mias = guardadas();
        var caja = $('#mis-salidas');
        if (mias.length) {
            caja.hidden = false;
            caja.innerHTML = '<h3>Publicadas desde este teléfono</h3>' + mias.map(function (m) {
                return '<button type="button" class="btn btn-sec btn-chico" data-mia="' + esc(m.id) + '"><span>' +
                    esc(fechaLarga(m.fecha)) + ' · ' + esc(m.puerto) + '</span><span>Editar</span></button>';
            }).join('');
        } else {
            caja.hidden = true;
        }
    }

    $('#mis-salidas').addEventListener('click', function (e) {
        var b = e.target.closest('[data-mia]');
        if (!b) return;
        var m = guardadas().filter(function (x) { return x.id === b.dataset.mia; })[0];
        if (m) abrirEdicion(m.id, m.codigo);
    });

    formCodigo.addEventListener('submit', function (e) {
        e.preventDefault();
        var id = formCodigo.id.value.trim(), codigo = formCodigo.codigo.value.trim().toUpperCase();
        if (!id || !codigo) { error('#error-codigo', 'Completá el número de salida y el código.'); return; }
        abrirEdicion(id, codigo);
    });

    function abrirEdicion(id, codigo) {
        error('#error-codigo', '');
        pedir({ accion: 'leer', id: id, codigo: codigo }).then(function (r) {
            if (!r.ok) { error('#error-codigo', r.error); return; }
            estado.edicion = { id: id, codigo: codigo };
            recordar({ id: id, codigo: codigo, fecha: r.salida.fecha, puerto: r.salida.puerto });
            ir('publicar', { edicion: true });
            cargarEnForm(r.salida);
        });
    }

    /* ---------- utilidades ---------- */
    function base() { return location.origin + location.pathname; }
    function enlaceEditar(id) { return base() + '?editar=' + encodeURIComponent(id); }

    function esc(t) {
        return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function error(sel, msg) { var el = $(sel); el.textContent = msg; el.hidden = !msg; }

    var tToast;
    function aviso(msg) {
        var t = $('#toast');
        t.textContent = msg;
        t.hidden = false;
        clearTimeout(tToast);
        tToast = setTimeout(function () { t.hidden = true; }, 2600);
    }

    function copiar(txt, msg) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(txt).then(function () { aviso(msg); }, function () { prompt('Copiá este texto:', txt); });
        } else {
            prompt('Copiá este texto:', txt);
        }
    }

    /* ---------- modo ejemplo ---------- */
    var demoDatos = null;
    function demoSalidas() {
        if (demoDatos) return demoDatos;
        var d = function (n) { var x = new Date(); x.setDate(x.getDate() + n); return isoDe(x); };
        demoDatos = [
            { id: 'demo0001', estado: 'abierta', fecha: d(2), hora_salida: '10:00', hora_regreso: '14:00', puerto: 'Puerto del Buceo', embarcacion: 'Velero de 27 pies', lugares: '2', nivel: 'sin-experiencia', aporte: 'Gastos compartidos', descripcion: 'Paseo por la bahía si el viento acompaña. Traer agua, protector solar y algo de abrigo.', patron: 'Marcela', whatsapp: '59899000001', codigo: 'DEMO12' },
            { id: 'demo0002', estado: 'abierta', fecha: d(4), hora_salida: '09:30', hora_regreso: '17:00', puerto: 'Puerto de Punta Carretas', embarcacion: 'Snipe', lugares: '1', nivel: 'experiencia', aporte: 'Sin costo', descripcion: 'Entrenamiento para regata. Busco proel con experiencia en spinnaker.', patron: 'Diego', whatsapp: '59899000002', codigo: 'DEMO12' },
            { id: 'demo0003', estado: 'completa', fecha: d(6), hora_salida: '15:00', hora_regreso: '19:30', puerto: 'Puerto de Piriápolis', embarcacion: 'Crucero de 32 pies', lugares: '3', nivel: 'algo', aporte: 'Gastos compartidos', descripcion: 'Salida de tarde hasta la Isla de Lobos según el pronóstico.', patron: 'Andrés', whatsapp: '59899000003', codigo: 'DEMO12' }
        ];
        return demoDatos;
    }

    function demoResponder(datos) {
        var lista = demoSalidas();
        var buscar = function (id, codigo) {
            var s = lista.filter(function (x) { return x.id === id; })[0];
            if (!s) return { error: 'No se encontró esa salida.' };
            if (s.codigo !== String(codigo).toUpperCase()) return { error: 'El código no coincide.' };
            return { s: s };
        };
        var limpiar = function (s) { var c = {}; for (var k in s) if (k !== 'codigo') c[k] = s[k]; return c; };
        if (!datos) {
            return { ok: true, salidas: lista.filter(function (s) { return s.estado !== 'cancelada'; }).map(limpiar) };
        }
        if (datos.accion === 'publicar') {
            var s = datos.salida, w = s.whatsapp.replace(/\D/g, '');
            if (/^0?9\d{7}$/.test(w)) w = '598' + w.replace(/^0/, '');
            var nuevo = Object.assign({}, s, { id: 'demo' + String(lista.length + 1).padStart(4, '0'), estado: 'abierta', whatsapp: w, codigo: 'DEMO12', lugares: String(parseInt(s.lugares, 10)) });
            lista.push(nuevo);
            lista.sort(function (a, b) { return (a.fecha + a.hora_salida).localeCompare(b.fecha + b.hora_salida); });
            return { ok: true, id: nuevo.id, codigo: 'DEMO12' };
        }
        var f = buscar(datos.id, datos.codigo);
        if (f.error) return { ok: false, error: f.error };
        if (datos.accion === 'leer') return { ok: true, salida: limpiar(f.s) };
        if (datos.accion === 'editar') { Object.assign(f.s, datos.salida); return { ok: true }; }
        if (datos.accion === 'estado') { f.s.estado = datos.estado; return { ok: true }; }
        return { ok: false, error: 'Acción desconocida.' };
    }

    /* ---------- inicio ---------- */
    $('#aviso-demo').hidden = !DEMO;
    var q = new URLSearchParams(location.search);
    if (q.get('editar')) ir('editar', { id: q.get('editar') });
    else ir('salidas');
})();
