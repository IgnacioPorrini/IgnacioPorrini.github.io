// charts.js — wrapper liviano sobre Chart.js (cargado vía CDN en index.html).

const instances = new Map();

function getChartLib() {
    if (typeof window.Chart === 'undefined') return null;
    return window.Chart;
}

function renderChart(canvasId, config) {
    const Chart = getChartLib();
    const canvas = document.getElementById(canvasId);
    if (!Chart || !canvas) return null;

    const existing = instances.get(canvasId);
    if (existing) existing.destroy();

    const chart = new Chart(canvas, config);
    instances.set(canvasId, chart);
    return chart;
}

const PALETTE = ['#25d399', '#20a151', '#e0b93c', '#e05656', '#5691e0', '#b366e0'];

/** Ingresos vs gastos, agrupados por moneda. totalesPorMoneda: { UYU: {ingreso, gasto}, USD: {...} } */
export function renderIngresosGastosChart(canvasId, totalesPorMoneda) {
    const monedas = Object.keys(totalesPorMoneda);
    return renderChart(canvasId, {
        type: 'bar',
        data: {
            labels: monedas,
            datasets: [
                { label: 'Ingresos', data: monedas.map(m => totalesPorMoneda[m].ingreso || 0), backgroundColor: '#25d399' },
                { label: 'Gastos', data: monedas.map(m => totalesPorMoneda[m].gasto || 0), backgroundColor: '#e05656' }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#e6e6e6' } } },
            scales: {
                x: { ticks: { color: '#b3b3b3' }, grid: { color: 'rgba(255,255,255,0.06)' } },
                y: { ticks: { color: '#b3b3b3' }, grid: { color: 'rgba(255,255,255,0.06)' } }
            }
        }
    });
}

/** Distribución de estados de pago (pagado/pendiente/atrasado). conteo: { pagado, pendiente, atrasado } */
export function renderMoraChart(canvasId, conteo) {
    const labels = ['Pagado', 'Pendiente', 'Atrasado'];
    const data = [conteo.pagado || 0, conteo.pendiente || 0, conteo.atrasado || 0];
    return renderChart(canvasId, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data, backgroundColor: ['#25d399', '#e0b93c', '#e05656'] }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { color: '#e6e6e6' } } }
        }
    });
}

/** Totales por propiedad (una moneda a la vez). items: [{ label, monto }] */
export function renderTotalesPorPropiedadChart(canvasId, items) {
    return renderChart(canvasId, {
        type: 'bar',
        data: {
            labels: items.map(i => i.label),
            datasets: [{ label: 'Total', data: items.map(i => i.monto), backgroundColor: PALETTE }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#b3b3b3' }, grid: { color: 'rgba(255,255,255,0.06)' } },
                y: { ticks: { color: '#b3b3b3' }, grid: { display: false } }
            }
        }
    });
}

export function destroyChart(canvasId) {
    const existing = instances.get(canvasId);
    if (existing) {
        existing.destroy();
        instances.delete(canvasId);
    }
}
