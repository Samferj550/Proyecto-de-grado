const API      = 'http://localhost/colorimetria/api.php';
const IMG_BASE = 'http://localhost/colorimetria/';
const _estadosCache = {};

let _proveedorIdFiltro = null;
let _mostrarSoloAlertasFruta            = false;
let _mostrarSoloAlertasAro              = false;
let _mostrarSoloAlertasAnalizarFruta    = false;
let _mostrarSoloAlertasAnalizarAro      = false;

let _rowsFrutas      = [];
let _rowsAromaticas  = [];
let _rowsColorFrutas = [];
let _rowsColorAro    = [];
let _rowsReflFrutas  = [];
let _rowsReflAro     = [];

const ZONAS_REFL_PINAS = {
  uv:      Array.from({ length: 6  }, (_, i) => 380 + i * 10),
  visible: Array.from({ length: 19 }, (_, i) => 440 + i * 10),
  rojo:    Array.from({ length: 16 }, (_, i) => 630 + i * 10),
};
const ZONAS_REFL_ARO = {
  uv:      Array.from({ length: 5  }, (_, i) => 390 + i * 10),
  visible: Array.from({ length: 19 }, (_, i) => 440 + i * 10),
  rojo:    Array.from({ length: 9  }, (_, i) => 630 + i * 10),
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function formatearFecha(fecha) {
  if (!fecha) return '–';
  const texto = String(fecha).trim();
  if (!texto) return '–';
  let d = new Date(texto.replace(' ', 'T'));
  if (isNaN(d.getTime())) {
    const partes = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    if (partes) {
      const [, dd, mm, yyyy, hh, min] = partes;
      d = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00`);
    }
  }
  if (isNaN(d.getTime())) return '–';
  return d.toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatearFechaCorta(fecha) {
  if (!fecha) return '–';
  const texto = String(fecha).trim();
  let d = new Date(texto.replace(' ', 'T'));
  if (isNaN(d.getTime())) {
    const partes = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    if (partes) {
      const [, dd, mm, yyyy, hh, min] = partes;
      d = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00`);
    }
  }
  if (isNaN(d.getTime())) return '–';
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const año = String(d.getFullYear()).slice(-2);
  return `${dia}/${mes}/${año}, ${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatearSoloFecha(fechaStr) {
  if (!fechaStr) return '—';
  const p = String(fechaStr).trim().split('-');
  if (p.length === 3) return `${p[2]}/${p[1]}/${p[0].slice(2)}`;
  return String(fechaStr).trim();
}

function poblarSelectNombresMuestra(selectId, rows) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const actual = select.value;
  const nombres = [...new Set(
    rows
      .map(r => formatearNombreMuestra(r.nombre_muestra))
      .filter(n => n && n !== '–')
  )].sort((a, b) => a.localeCompare(b, 'es'));
  select.innerHTML = '<option value="">' + t('Por Nombre Muestra') + '</option>' +
    nombres.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  if (nombres.includes(actual)) select.value = actual;
}

function fmt(n) {
  return n !== null && n !== undefined && n !== '' && !Number.isNaN(Number(n))
    ? Number(n).toLocaleString('es-CO') : '–';
}

function fmtDecimal(n, digits = 1) {
  const num = Number(n);
  return Number.isFinite(num) ? num.toFixed(digits) : '–';
}

function estadoPorNivelFruta(nivel) {
  const n = Number(nivel);
  if (!Number.isFinite(n)) return `<span class="status bad">${t('Sin dato')}</span>`;
  if (n >= 7) return `<span class="status ok" title="${t('Hue < 62° — color naranja-amarillo intenso')}">${t('Maduración Óptima')}</span>`;
  if (n >= 4) return `<span class="status process" title="${t('Hue 62°–70° — transición verde-amarillo')}">${t('En Proceso')}</span>`;
  return        `<span class="status bad" title="${t('Hue > 70° o medición anómala (L* bajo)')}">${t('No Madura')}</span>`;
}

function badgeConfianza(confianza, row) {
  const c = Number(confianza);
  if (!Number.isFinite(c)) return `<span class="badge-conf conf-nd" title="${t('Sin dato')}">–</span>`;
  let cls, label, title;
  if (c >= 75) {
    cls = 'conf-alta'; label = c + '%'; title = t('Confianza alta: medición espectralmente estable');
  } else if (c >= 45) {
    cls = 'conf-media'; label = c + '%'; title = t('Confianza media: revisar datos espectrales');
  } else {
    cls = 'conf-baja'; label = c + '%'; title = t('Confianza baja: posible error de medición');
  }
  const sinEspectro = row?.sin_espectro ? ' ⚠️' : '';
  const falsoOptimo = row?.alerta_falso_optimo ? ' 🚨' : '';
  return `<span class="badge-conf ${cls}" title="${title}">${label}${sinEspectro}${falsoOptimo}</span>`;
}

function estadoPorNivelAromatica(nivel) {
  const n = Number(nivel);
  if (!Number.isFinite(n)) return `<span class="status bad">${t('Sin dato')}</span>`;
  if (n >= 7) return `<span class="status ok" title="${t('Hue > 143° — alta concentración de clorofila')}">${t('Pigmentación Óptima')}</span>`;
  if (n >= 4) return `<span class="status process" title="${t('Hue 122°–143° — pigmentación en desarrollo')}">${t('En Proceso')}</span>`;
  return        `<span class="status bad" title="${t('Hue < 122° — baja concentración de clorofila')}">${t('Baja Pigmentación')}</span>`;
}

function estadoTextoFruta(nivel) {
  const n = Number(nivel);
  if (!Number.isFinite(n)) return '';
  if (n >= 7) return t('Maduración Óptima');
  if (n >= 4) return t('En Proceso');
  return t('No Madura');
}

function estadoTextoAromatica(nivel) {
  const n = Number(nivel);
  if (!Number.isFinite(n)) return '';
  if (n >= 7) return t('Pigmentación Óptima');
  if (n >= 4) return t('En Proceso');
  return t('Baja Pigmentación');
}

async function cargarEstadosFruta(frutaId, categoria = 'frutas') {
  const cacheKey = frutaId + '_' + categoria;
  if (!_estadosCache[cacheKey]) {
    try {
      const res = await fetch(API + `?endpoint=config_estados_fruta&fruta_id=${frutaId}&categoria=${categoria}`);
      _estadosCache[cacheKey] = await res.json();
    } catch { _estadosCache[cacheKey] = []; }
  }
  return _estadosCache[cacheKey] || [];
}

function contarPorEstado(rows, estados) {
  if (estados.length === 0) return [];
  const counts = {};
  estados.forEach(e => { counts[e.numero] = 0; });
  const usarEstadoId = rows.some(r => r.estado_id != null);
  const step = 10 / estados.length;
  rows.forEach(r => {
    if (usarEstadoId && r.estado_id != null) {
      const estadoId = Number(r.estado_id);
      if (Number.isFinite(estadoId) && estadoId in counts) {
        counts[estadoId]++;
      }
    } else {
      const nivel = Number(r.nivel_maduracion);
      if (Number.isFinite(nivel)) {
        const idx = Math.min(estados.length - 1, Math.floor(nivel / step));
        const estadoNum = estados[idx]?.numero;
        if (estadoNum !== undefined) counts[estadoNum]++;
      }
    }
  });
  return estados.map(e => ({
    nombre: e.nombre,
    color: e.color_badge,
    count: counts[e.numero] || 0,
    numero: e.numero
  })).sort((a, b) => a.numero - b.numero);
}

function actualizarDonutN(donutEl, segmentos, total) {
  if (!donutEl) return;
  if (total <= 0) { donutEl.style.background = '#ddd'; return; }
  const parts = [];
  let current = 0;
  segmentos.forEach(seg => {
    if (seg.count > 0) {
      const start = current.toFixed(1);
      current += (seg.count / total) * 100;
      parts.push(`${seg.color} ${start}% ${current.toFixed(1)}%`);
    }
  });
  donutEl.style.background = parts.length > 0
    ? `conic-gradient(${parts.join(', ')})`
    : '#ddd';
}

function renderLegend(container, segmentos, total) {
  if (!container) return;
  container.innerHTML = '';
  segmentos.forEach(seg => {
    const pct = total > 0 ? ((seg.count / total) * 100).toFixed(1) + '%' : '0.0%';
    const div = document.createElement('div');
    div.innerHTML = `<span class="dot" style="background:${seg.color}"></span> ${escapeHtml(t(seg.nombre))} <strong>${pct}</strong> <small>(${fmt(seg.count)})</small>`;
    container.appendChild(div);
  });
}

function actualizarDonut(donutEl, optimas, proceso, bajas, total) {
  if (!donutEl) return;
  if (total <= 0) { donutEl.style.background = '#ddd'; return; }
  const pOpt  = (optimas / total) * 100;
  const pProc = (proceso / total) * 100;
  const stop1 = pOpt.toFixed(1);
  const stop2 = (pOpt + pProc).toFixed(1);
  donutEl.style.background =
    `conic-gradient(var(--green) 0 ${stop1}%, var(--yellow) ${stop1}% ${stop2}%, var(--red) ${stop2}% 100%)`;
}

function toggleFiltroAlertas(contexto) {
  if (contexto === 'fruta') {
    _mostrarSoloAlertasFruta = !_mostrarSoloAlertasFruta;
    const btn = document.getElementById('filter-frutas-alertas');
    if (btn) btn.classList.toggle('active', _mostrarSoloAlertasFruta);
    filtrarTablaFrutas();
  } else if (contexto === 'aromatica') {
    _mostrarSoloAlertasAro = !_mostrarSoloAlertasAro;
    const btn = document.getElementById('filter-aro-alertas');
    if (btn) btn.classList.toggle('active', _mostrarSoloAlertasAro);
    filtrarTablaAromaticas();
  } else if (contexto === 'analizar-fruta') {
    _mostrarSoloAlertasAnalizarFruta = !_mostrarSoloAlertasAnalizarFruta;
    const btn = document.getElementById('filter-analizar-frutas-alertas');
    if (btn) btn.classList.toggle('active', _mostrarSoloAlertasAnalizarFruta);
    filtrarAnalizarCardsFrutas();
  } else if (contexto === 'analizar-aro') {
    _mostrarSoloAlertasAnalizarAro = !_mostrarSoloAlertasAnalizarAro;
    const btn = document.getElementById('filter-analizar-aro-alertas');
    if (btn) btn.classList.toggle('active', _mostrarSoloAlertasAnalizarAro);
    filtrarAnalizarCardsAromaticas();
  }
}

async function refrescarDonutsConEstados() {
  let frutaId = _rowsFrutas.length > 0 ? _rowsFrutas[0].fruta_id : null;
  let frutaIdAro  = _rowsAromaticas.length > 0 ? _rowsAromaticas[0].aromatica_id : null;
  if (!frutaId || !frutaIdAro) {
    try {
      const res = await fetch(API + '?endpoint=config_frutas_listar');
      const frutas = await res.json();
      if (Array.isArray(frutas)) {
        if (!frutaId) frutaId = frutas.find(f => f.slug === 'pina')?.id || frutas[0]?.id;
      }
    } catch {}
    try {
      const res = await fetch(API + '?endpoint=config_aromaticas_listar');
      const aroms = await res.json();
      if (Array.isArray(aroms) && !frutaIdAro) {
        frutaIdAro = aroms[0]?.id;
      }
    } catch {}
  }

  if (frutaId) {
    const estados = await cargarEstadosFruta(frutaId, 'frutas');
    if (estados.length > 0) {
      const segmentos = contarPorEstado(_rowsFrutas, estados);
      const total = segmentos.reduce((s, e) => s + e.count, 0);

      document.querySelectorAll('.donut-fruta-duplicado:not(.donut-fruta-dinamico)').forEach(c => {
        const d = c.querySelector('.donut-fruta');
        if (d) actualizarDonutN(d, segmentos, total);
        c.querySelector('.donut-total').textContent = fmt(total);
        const lg = c.querySelector('.legend');
        if (lg) renderLegend(lg, segmentos, total);
      });

      if (typeof actualizarDonutDinamicoFruta === 'function') actualizarDonutDinamicoFruta();
    }
  }

  if (frutaIdAro) {
    const estados = await cargarEstadosFruta(frutaIdAro, 'aromaticas');
    if (estados.length > 0) {
      const segmentos = contarPorEstado(_rowsAromaticas, estados).reverse();
      const total = segmentos.reduce((s, e) => s + e.count, 0);

      document.querySelectorAll('.donut-aro-duplicado:not(.donut-aro-dinamico)').forEach(c => {
        const d = c.querySelector('.donut-aromaticas');
        if (d) actualizarDonutN(d, segmentos, total);
        c.querySelector('.donut-total').textContent = fmt(total);
        const lg = c.querySelector('.legend');
        if (lg) renderLegend(lg, segmentos, total);
      });

      if (typeof actualizarDonutDinamicoAro === 'function') actualizarDonutDinamicoAro();
    }
  }
}

function obtenerEstadoDinamico(nivel, estados) {
  if (!estados || estados.length === 0) return null;
  const n = Number(nivel);
  if (!Number.isFinite(n)) return null;
  const step = 10 / estados.length;
  const idx = Math.min(estados.length - 1, Math.floor(n / step));
  return estados[idx] || null;
}

function estadoHtmlDinamico(nivel, estados) {
  const estado = obtenerEstadoDinamico(nivel, estados);
  if (!estado) return estadoPorNivelFruta(nivel);
  const color = estado.color_badge || '#6b7280';
  return `<span class="status" style="background:${color}1a;color:${color};border:1px solid ${color}30;flex-shrink:0;">${escapeHtml(t(estado.nombre))}</span>`;
}

function estadoTextoDinamico(nivel, estados) {
  const estado = obtenerEstadoDinamico(nivel, estados);
  return estado ? t(estado.nombre) : estadoTextoFruta(nivel);
}

function estadoHtmlDesdeRow(r, estados, fallbackFn) {
  if (r.estado_nombre && r.estado_color_badge) {
    const c = r.estado_color_badge;
    return `<span class="status" style="background:${c}1a;color:${c};border:1px solid ${c}30;flex-shrink:0;">${escapeHtml(t(r.estado_nombre))}</span>`;
  }
  const nivel = Number.parseFloat(r.nivel_maduracion);
  if (fallbackFn) return fallbackFn(nivel, estados);
  return estados.length > 0 ? estadoHtmlDinamico(nivel, estados) : '';
}

function estadoTextoDesdeRow(r, estados, fallbackFn) {
  if (r.estado_nombre) return t(r.estado_nombre);
  const nivel = Number.parseFloat(r.nivel_maduracion);
  if (fallbackFn) return fallbackFn(nivel, estados);
  return estados.length > 0 ? estadoTextoDinamico(nivel, estados) : '';
}

async function poblarSelectEstados(selectId, frutaId, categoria = 'frutas') {
  const select = document.getElementById(selectId);
  if (!select) return;
  const estados = await cargarEstadosFruta(frutaId, categoria);
  const valorActual = select.value;
  select.innerHTML = '<option value="">' + t('Todos los estados') + '</option>' +
    estados.map(e =>
      `<option value="${escapeHtml(e.nombre)}">${escapeHtml(t(e.nombre))}</option>`
    ).join('');
  if (estados.some(e => e.nombre === valorActual)) select.value = valorActual;
}

async function cargarTodoElDashboard() {
  await cargarKpisFrutas();
  await cargarTablaFrutas();
  await cargarCardsFrutas();
  await cargarDetalleColorFrutas();
  await cargarReflectanciasFrutas();
  await cargarArchivosFrutas();

  await cargarKpisAromaticas();
  await cargarTablaAromaticas();
  await cargarCardsAromaticas();
  await cargarDetalleColorAromaticas();
  await cargarReflectanciasAromaticas();
  await cargarArchivosAromaticas();

  await refrescarDonutsConEstados();
  await actualizarKpisFrutas();
  await actualizarKpisAromaticas();

  mostrarDashboardFruta();
  mostrarDashboardAromaticas();
}

function emojiEstadoFruta(e) {
  if (!e || !e.numero) return '●';
  const mapa = { 1: '🔴', 2: '🟠', 3: '🟡', 4: '🟨', 5: '🟩', 6: '🟢' };
  return mapa[e.numero] || '●';
}
