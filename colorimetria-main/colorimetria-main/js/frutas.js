// ── Selector de Fruta (dashboard) ──────────────────────────────
let _frutaDashboardActiva = null;
let _frutaIdFruta = null;

async function cargarSelectorFrutas() {
  try {
    const res = await fetch(API + '?endpoint=config_frutas_listar');
    const frutas = await res.json();
    const ul = document.getElementById('dropdown-frutas');
    if (!ul) return;
    ul.innerHTML = '';
    if (!Array.isArray(frutas) || frutas.length === 0) {
      ul.innerHTML = '<li class="dropdown-empty">' + t('No hay frutas') + '</li>';
      return;
    }
    frutas.forEach(f => {
      const li = document.createElement('li');
      li.innerHTML = `${(f.icono && f.icono !== '??' ? f.icono : '🍍')} ${escapeHtml(t(f.nombre))}`;
      li.dataset.id = f.id;
      li.dataset.nombre = f.nombre;
      li.dataset.icono = (f.icono && f.icono !== '??' ? f.icono : '🍍');
      li.addEventListener('click', () => cambiarFrutaDashboard(f));
      ul.appendChild(li);
    });
    if (!_frutaDashboardActiva && frutas.length > 0) {
      let defaultFruta = frutas.find(f => f.nombre.toLowerCase() === 'piña') || frutas[0];
      try {
        const sesion = JSON.parse(sessionStorage.getItem('sesion_colorimetria'));
        if (sesion?.fruta?.nombre) {
          const match = frutas.find(f => f.nombre.toLowerCase() === sesion.fruta.nombre.toLowerCase());
          if (match) defaultFruta = match;
        }
      } catch (_) {}
      cambiarFrutaDashboard(defaultFruta, true);
    }
  } catch (e) {
    console.error('Error cargando selector frutas:', e);
  }
}

function cambiarFrutaDashboard(fruta, mantenerDropdown) {
  _frutaDashboardActiva = fruta;
  const iconoEl = document.getElementById('selector-fruta-icono');
  const nombreEl = document.getElementById('selector-fruta-nombre');
  if (iconoEl) iconoEl.textContent = (fruta.icono && fruta.icono !== '??' ? fruta.icono : '🍍');
  if (nombreEl) nombreEl.textContent = t(fruta.nombre);
  if (!mantenerDropdown) document.getElementById('dropdown-frutas')?.setAttribute('hidden', '');
  if (fruta.nombre.toLowerCase() === 'piña') {
    mostrarDashboardFruta();
    cargarKpisFrutas();
    cargarTablaFrutas();
    cargarCardsFrutas();
    cargarDetalleColorFrutas();
    cargarReflectanciasFrutas();
    cargarArchivosFrutas();
    cargarKpisAromaticas();
    cargarTablaAromaticas();
    cargarCardsAromaticas();
    cargarDetalleColorAromaticas();
    cargarReflectanciasAromaticas();
    cargarArchivosAromaticas();
    actualizarKpisFrutas();
    refrescarDonutsConEstados();
  } else {
    limpiarDashboardFruta();
  }
}

function limpiarDashboardFruta() {
  const data = document.getElementById('fruta-dashboard-data');
  const blank = document.getElementById('fruta-dashboard-blank');
  if (data) data.style.display = 'none';
  if (blank) blank.style.display = '';
}

function mostrarDashboardFruta() {
  const data = document.getElementById('fruta-dashboard-data');
  const blank = document.getElementById('fruta-dashboard-blank');
  if (data) data.style.display = 'flex';
  if (blank) blank.style.display = 'none';
}

function limpiarDashboardAromaticas() {
  const data = document.getElementById('aro-dashboard-data');
  const blank = document.getElementById('aro-dashboard-blank');
  if (data) data.style.display = 'none';
  if (blank) blank.style.display = '';
}

function mostrarDashboardAromaticas() {
  const data = document.getElementById('aro-dashboard-data');
  const blank = document.getElementById('aro-dashboard-blank');
  if (data) data.style.display = 'flex';
  if (blank) blank.style.display = 'none';
}

// ── KPIs Piñas ────────────────────────────────────────────────
async function cargarKpisFrutas() {
  try {
    const url  = API + '?endpoint=kpis_frutas' + (_proveedorIdFiltro ? `&proveedor_id=${_proveedorIdFiltro}` : '');
    const res  = await fetch(url);
    const data = await res.json();
    if (data.error) { console.warn('KPIs piñas:', data.mensaje); return; }
    window.totalFrutas = Number(data.total) || 0;
  } catch (e) { console.error('Error KPIs piñas:', e); }
}

async function actualizarKpisFrutas() {
  const grid = document.getElementById('kpi-grid-frutas');
  if (!grid) return;

  let frutaId = _rowsFrutas.length > 0 ? _rowsFrutas[0].fruta_id : null;
  if (!frutaId) {
    try {
      const res = await fetch(API + '?endpoint=config_frutas_listar');
      const frutas = await res.json();
      frutaId = Array.isArray(frutas) ? (frutas.find(f => f.slug === 'pina')?.id || frutas[0]?.id) : null;
    } catch { return; }
  }
  if (!frutaId) return;
  _frutaIdFruta = frutaId;

  const estados = await cargarEstadosFruta(frutaId);
  const segmentos = contarPorEstado(_rowsFrutas, estados);
  const total = segmentos.reduce((s, e) => s + e.count, 0);

  let html = `<article class="kpi-card">
    <div class="kpi-icon blue">📊</div>
    <div>
      <span class="kpi-label">${t('Total Analizadas')}</span>
      <strong class="kpi-value">${fmt(total)}</strong>
    </div>
  </article>`;

  segmentos.forEach(seg => {
    const e = estados.find(x => x.numero === seg.numero);
    const icono = emojiEstadoFruta(e);
    html += `<article class="kpi-card">
      <div class="kpi-icon" style="background:${seg.color}">${icono}</div>
      <div>
        <span class="kpi-label">${t(seg.nombre)}</span>
        <strong class="kpi-value">${fmt(seg.count)}</strong>
      </div>
    </article>`;
  });

  grid.innerHTML = html;
}

// ── Tabla Piñas ───────────────────────────────────────────────
async function cargarTablaFrutas() {
  try {
    const snapshotId = typeof _frutaDashboardActiva !== 'undefined' ? _frutaDashboardActiva?.id : undefined;
    const url  = API + '?endpoint=tabla_frutas&limite=9999' + (_proveedorIdFiltro ? `&proveedor_id=${_proveedorIdFiltro}` : '');
    const res  = await fetch(url);
    const rows = await res.json();
    if (!Array.isArray(rows)) { console.warn('Tabla piñas inválida'); return; }
    const currentId = typeof _frutaDashboardActiva !== 'undefined' ? _frutaDashboardActiva?.id : undefined;
    if (currentId !== snapshotId) return;
    _rowsFrutas = rows;

    let frutaId = rows.length > 0 ? rows[0].fruta_id : null;
    if (!frutaId) {
      if (snapshotId !== undefined && snapshotId) {
        frutaId = snapshotId;
      } else {
        const resFrutas = await fetch(API + '?endpoint=config_frutas_listar');
        const frutas = await resFrutas.json();
        frutaId = Array.isArray(frutas) ? (frutas.find(f => f.slug === 'pina')?.id || frutas[0]?.id) : null;
      }
    }
    _frutaIdFruta = frutaId;
    if (frutaId) {
      await poblarSelectEstados('filter-frutas-estado', frutaId);
      await poblarSelectEstados('filter-analizar-frutas-estado', frutaId);
      await poblarSelectEstados('fd3-fruta-estado', frutaId);
    }

    poblarSelectNombresMuestra('filter-frutas-nombre-muestra', rows);
    poblarSelectNombresMuestra('filter-analizar-frutas-nombre-muestra', rows);
    poblarSelectNombresMuestra('fd3-fruta-nombre', rows);
    renderTablaFrutas(rows);
    renderAnalizarCardsFrutas(rows);
    actualizarDonutDinamicoFruta();
    actualizarDonutConfianzaFruta();
  } catch (e) { console.error('Error tabla piñas:', e); }
}

function renderTablaFrutas(rows) {
  const tbody = document.getElementById('tbody-frutas');
  if (!tbody) return;
  const estados = (_frutaIdFruta && _estadosCache[_frutaIdFruta + '_frutas']) ? _estadosCache[_frutaIdFruta + '_frutas'] : [];
  tbody.innerHTML = rows.map(r => {
    const nivel     = Number.parseFloat(r.nivel_maduracion);
    const confianza = Number.isFinite(Number(r.confianza)) ? `${fmt(r.confianza)}%` : '–';
    const fotoHtml = r.imagen_muestra
      ? `<div class="mini-photo"><img src="${escapeHtml(IMG_BASE + r.imagen_muestra)}" alt=""></div>`
      : `<div class="mini-photo pineapple-a">🍍</div>`;
    const nombreMuestra = formatearNombreMuestra(r.nombre_muestra) || '–';
    const lVal = Number(r.l);
    const tieneAlerta = (lVal > 0 && lVal < 15) || (r.alerta_falso_optimo === true || r.alerta_falso_optimo === '1');
    const warningHtml = tieneAlerta ? `<span class="warning-icon">⚠️</span>` : '';
    const fechaMostrar = r.fecha_sesion ? formatearSoloFecha(r.fecha_sesion) : '—';
    const estadoHTML = estadoHtmlDesdeRow(r, estados, estadoHtmlDinamico);
    return `<tr>
      <td>${escapeHtml(fechaMostrar)}</td>
      <td title="${escapeHtml(nombreMuestra)}">${escapeHtml(nombreMuestra)}</td>
      <td>${fotoHtml}</td>
      <td>${fmtDecimal(nivel, 1)} / 10</td>
      <td>${estadoHTML}</td>
      <td>${escapeHtml(confianza)}</td>
      <td class="cell-warning">${warningHtml}</td>
    </tr>`;
  }).join('');
}

function filtrarTablaFrutas() {
  const busqueda      = (document.getElementById('filter-frutas-muestra')?.value ?? '').toLowerCase();
  const nombreMuestra = document.getElementById('filter-frutas-nombre-muestra')?.value ?? '';
  const estado        = document.getElementById('filter-frutas-estado')?.value ?? '';
  const confianza     = document.getElementById('filter-frutas-confianza')?.value ?? '';
  const estados = (_frutaIdFruta && _estadosCache[_frutaIdFruta + '_frutas']) ? _estadosCache[_frutaIdFruta + '_frutas'] : [];
  let filtradas = _rowsFrutas.filter(r => {
    const nombre = (r.nombre_muestra ?? '').toLowerCase();
    const nivel  = Number.parseFloat(r.nivel_maduracion);
    const conf   = Number(r.confianza);
    if (busqueda && !nombre.includes(busqueda)) return false;
    if (nombreMuestra && formatearNombreMuestra(r.nombre_muestra) !== nombreMuestra) return false;
    if (estado && estadoTextoDesdeRow(r, estados, estadoTextoDinamico) !== estado) return false;
    if (confianza === 'alta'  && conf < 70)               return false;
    if (confianza === 'media' && (conf < 45 || conf >= 70)) return false;
    if (confianza === 'baja'  && conf >= 45)              return false;
    return true;
  });
  if (_mostrarSoloAlertasFruta) {
    filtradas = filtradas.filter(r => {
      const lVal = Number(r.l);
      return (lVal > 0 && lVal < 15) || (r.alerta_falso_optimo === true || r.alerta_falso_optimo === '1');
    });
  }
  renderTablaFrutas(filtradas);
}

function limpiarFiltrosFrutas() {
  ['filter-frutas-muestra', 'filter-frutas-nombre-muestra', 'filter-frutas-estado', 'filter-frutas-confianza']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  _mostrarSoloAlertasFruta = false;
  const btn = document.getElementById('filter-frutas-alertas');
  if (btn) btn.classList.remove('active');
  renderTablaFrutas(_rowsFrutas);
}

// ── Cards Piñas ───────────────────────────────────────────────
async function cargarCardsFrutas() {
  try {
    const url  = API + '?endpoint=tabla_frutas&limite=9999' + (_proveedorIdFiltro ? `&proveedor_id=${_proveedorIdFiltro}` : '');
    const res  = await fetch(url);
    const rows = await res.json();
    if (!Array.isArray(rows)) return;
    const container = document.getElementById('cards-frutas');
    if (!container) return;
    let frutaId = _frutaIdFruta;
    if (!frutaId) {
      frutaId = rows.length > 0 ? rows[0].fruta_id : null;
      if (!frutaId) {
        try {
          const resFrutas = await fetch(API + '?endpoint=config_frutas_listar');
          const frutas = await resFrutas.json();
          frutaId = Array.isArray(frutas) ? (frutas.find(f => f.slug === 'pina')?.id || frutas[0]?.id) : null;
        } catch {}
      }
      if (frutaId) _frutaIdFruta = frutaId;
    }
    const estados = frutaId ? await cargarEstadosFruta(frutaId) : [];
    container.innerHTML = rows.map(r => {
      const nivel      = Number.parseFloat(r.nivel_maduracion);
      const estadoHTML = estadoHtmlDesdeRow(r, estados, estadoHtmlDinamico);
      const porcentaje = Number.isFinite(nivel) ? Math.max(0, Math.min(100, nivel * 10)) : 0;
      const confianza = Number.isFinite(Number(r.confianza)) ? `${fmt(r.confianza)}%` : '–';
      const fillClass  = nivel >= 7 ? 'green' : nivel >= 4 ? 'yellow' : 'red';
      const lVal        = Number(r.l);
      const esAnomaliaL = lVal > 0 && lVal < 15;
      const esFalsoOptimo = r.alerta_falso_optimo === true || r.alerta_falso_optimo === '1';
      const alertas = [];
      if (esAnomaliaL) {
        alertas.push(`⚠ L*=${escapeHtml(String(r.l))} — medición en zona oscura. Revisar posicionamiento del colorímetro.`);
      }
      if (esFalsoOptimo) {
        alertas.push(`⚠ Hue° bajo (${escapeHtml(r.hue_angle ?? '?')}°): la madurez del tejido interno puede diferir de la cáscara. Verificar visualmente.`);
      }
      const alertaHtml  = alertas.length > 0
        ? `<div style="margin:6px 0 2px;padding:5px 8px;background:#fef2f2;
             border-left:3px solid #ef4444;border-radius:3px;font-size:0.73rem;color:#b91c1c;">
             ${alertas.join('<br>')}
           </div>`
        : '';
      const fotoHtml = r.imagen_muestra
        ? `<div class="fruit-visual"><img src="${escapeHtml(IMG_BASE + r.imagen_muestra)}" alt=""></div>`
        : `<div class="fruit-visual pineapple-a">🍍</div>`;
      const displayName = formatearNombreMuestra(r.nombre_muestra) || '–';
      return `<div class="fruit-card"
        data-archivo="${escapeHtml(r.archivo_origen||'')}"
        data-fruta-id="${r.fruta_id||''}"
        data-nombre="${escapeHtml(r.nombre_muestra||'')}"
        data-imagen="${escapeHtml(r.imagen_muestra||'')}"
        onclick="abrirModalIndividual('fruta',{archivo_origen:this.dataset.archivo,fruta_id:this.dataset.frutaId,nombre_muestra:this.dataset.nombre,imagen_muestra:this.dataset.imagen})"
        style="cursor:pointer">
        ${fotoHtml}
        <div class="fruit-head">
          <div>
            <span class="card-label">${t('Nombre de la muestra:')}</span>
            <strong>${escapeHtml(displayName)}</strong>
          </div>
          ${estadoHTML}
        </div>
        <div class="level-block">
          <span>${t('Nivel de maduración')}</span>
          <strong>${fmtDecimal(nivel, 1)} / 10</strong>
          <div class="progress"><span class="fill ${fillClass}" style="width:${porcentaje}%"></span></div>
        </div>
        ${alertaHtml}
        <div class="mini-stats">
          <div><span>${t('Confianza del modelo')}</span><strong>${escapeHtml(confianza)}</strong></div>
        </div>
      </div>`;
    }).join('');
  } catch (e) { console.error('Error cards piñas:', e); }
}

// ── Parámetros Colorimétricos Piñas ──────────────────────────
async function cargarDetalleColorFrutas() {
  try {
    const url  = API + '?endpoint=detalle_color_frutas&limite=9999' + (_proveedorIdFiltro ? `&proveedor_id=${_proveedorIdFiltro}` : '');
    const res  = await fetch(url);
    const rows = await res.json();
    if (!Array.isArray(rows)) return;
    _rowsColorFrutas = rows;
    poblarSelectNombresMuestra('filter-color-frutas-nombre-muestra', rows);
    renderColorFrutas(rows);
  } catch (e) { console.error('Error color piñas:', e); }
}

function renderColorFrutas(rows) {
  const tbody = document.getElementById('tbody-detalle-color-frutas');
  if (!tbody) return;
  tbody.innerHTML = rows.map(r => `<tr>
    <td>${escapeHtml(formatearNombreMuestra(r.nombre_muestra) || '–')}</td>
    <td>${escapeHtml(r.l       ?? '–')}</td>
    <td>${escapeHtml(r.a       ?? '–')}</td>
    <td>${escapeHtml(r.b       ?? '–')}</td>
    <td>${escapeHtml(r.delta_e ?? '–')}</td>
    <td>${escapeHtml(r.hue_angle ?? '–')}</td>
    <td>${escapeHtml(r.chroma ?? '–')}</td>
  </tr>`).join('');
  const counter = document.getElementById('counter-color-frutas');
  if (counter) counter.textContent = t('Total: ') + rows.length + t(' muestras');
}

function filtrarColorFrutas() {
  const busqueda      = (document.getElementById('filter-color-frutas-muestra')?.value ?? '').toLowerCase();
  const nombreMuestra = document.getElementById('filter-color-frutas-nombre-muestra')?.value ?? '';
  const rangoL        = document.getElementById('filter-color-frutas-rango-l')?.value ?? '';
  const tono          = document.getElementById('filter-color-frutas-tono')?.value ?? '';

  const filtradas = _rowsColorFrutas.filter(r => {
    const nombre = (r.nombre_muestra ?? '').toLowerCase();
    const lv     = Number(r.l);
    const hue    = Number(r.hue_angle);

    if (busqueda && !nombre.includes(busqueda)) return false;
    if (nombreMuestra && formatearNombreMuestra(r.nombre_muestra) !== nombreMuestra) return false;

    if (rangoL === 'oscuro' && !(lv < 40))           return false;
    if (rangoL === 'medio'  && !(lv >= 40 && lv < 70)) return false;
    if (rangoL === 'claro'  && !(lv >= 70))           return false;

    if (tono === 'amarillo' && !(hue >= 70  && hue <= 110)) return false;
    if (tono === 'verde'    && !(hue >= 110 && hue <= 160)) return false;
    if (tono === 'otro'     && (hue >= 70   && hue <= 160)) return false;

    return true;
  });
  renderColorFrutas(filtradas);
}

function limpiarFiltrosColorFrutas() {
  ['filter-color-frutas-muestra', 'filter-color-frutas-nombre-muestra', 'filter-color-frutas-rango-l', 'filter-color-frutas-tono']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderColorFrutas(_rowsColorFrutas);
}

// ── Reflectancias Piñas ───────────────────────────────────────
async function cargarReflectanciasFrutas() {
  try {
    const url  = API + '?endpoint=reflectancias_frutas&limite=9999' + (_proveedorIdFiltro ? `&proveedor_id=${_proveedorIdFiltro}` : '');
    const res  = await fetch(url);
    const rows = await res.json();
    if (!Array.isArray(rows)) return;
    _rowsReflFrutas = rows;
    poblarSelectNombresMuestra('filter-refl-frutas-nombre-muestra', rows);
    renderReflFrutas(rows, null);
  } catch (e) { console.error('Error reflectancias piñas:', e); }
}

function colsReflFrutas(zona) {
  if (!zona) return Array.from({ length: 41 }, (_, i) => 380 + i * 10);
  return ZONAS_REFL_PINAS[zona] ?? Array.from({ length: 41 }, (_, i) => 380 + i * 10);
}

function renderReflFrutas(rows, zona) {
  const cols  = colsReflFrutas(zona);
  const thead = document.getElementById('thead-refl-frutas');
  const tbody = document.getElementById('tbody-reflectancias-frutas');
  if (!thead || !tbody) return;

  thead.innerHTML = `<tr>
    <th>${t('Nombre Muestra')}</th>
    ${cols.map(nm => `<th>${nm}</th>`).join('')}
  </tr>`;

  tbody.innerHTML = rows.map(r => `<tr>
    <td>${escapeHtml(formatearNombreMuestra(r.nombre_muestra) || '–')}</td>
    ${cols.map(nm => renderCeldaRefl(r[`nm${nm}`])).join('')}
  </tr>`).join('');
  const counter = document.getElementById('counter-refl-frutas');
  if (counter) counter.textContent = t('Total: ') + rows.length + t(' muestras');
}

function renderCeldaRefl(valor) {
  if (valor === null || valor === undefined || valor === '') return '<td class="cell-null">—</td>';
  const n = Number(valor);
  return `<td>${Number.isFinite(n) ? n.toFixed(2) : '—'}</td>`;
}

function filtrarReflFrutas() {
  const busqueda      = (document.getElementById('filter-refl-frutas-muestra')?.value ?? '').toLowerCase();
  const nombreMuestra = document.getElementById('filter-refl-frutas-nombre-muestra')?.value ?? '';
  const zona          = document.getElementById('filter-refl-frutas-zona')?.value ?? '';
  const filtradas = _rowsReflFrutas.filter(r => {
    if (busqueda && !(r.nombre_muestra ?? '').toLowerCase().includes(busqueda)) return false;
    if (nombreMuestra && formatearNombreMuestra(r.nombre_muestra) !== nombreMuestra) return false;
    return true;
  });
  renderReflFrutas(filtradas, zona || null);
}

function limpiarFiltrosReflFrutas() {
  ['filter-refl-frutas-muestra', 'filter-refl-frutas-nombre-muestra', 'filter-refl-frutas-zona']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderReflFrutas(_rowsReflFrutas, null);
}

// ── Archivos Piñas ────────────────────────────────────────────
async function cargarArchivosFrutas() {
  try {
    const url  = API + '?endpoint=archivos_frutas&limite=9999' + (_proveedorIdFiltro ? `&proveedor_id=${_proveedorIdFiltro}` : '');
    const res  = await fetch(url);
    const rows = await res.json();
    if (!Array.isArray(rows)) return;
    const tbody = document.getElementById('tbody-archivos-frutas');
    if (!tbody) return;
    tbody.innerHTML = rows.map(r => `<tr>
      <td>${escapeHtml(formatearNombreMuestra(r.nombre_muestra) || '–')}</td>
      <td>${escapeHtml(r.archivo_origen ?? '–')}</td>
    </tr>`).join('');
  } catch (e) { console.error('Error archivos piñas:', e); }
}

// ── Analizar Muestras Frutas (cards con filtros) ────────────────
function renderAnalizarCardsFrutas(rows) {
  const container = document.getElementById('cards-analizar-frutas');
  if (!container) return;
  const estados = (_frutaIdFruta && _estadosCache[_frutaIdFruta + '_frutas']) ? _estadosCache[_frutaIdFruta + '_frutas'] : [];
  container.innerHTML = rows.map(r => {
    const nivel      = Number.parseFloat(r.nivel_maduracion);
    const estadoHTML = estadoHtmlDesdeRow(r, estados, estadoHtmlDinamico);
    const porcentaje = Number.isFinite(nivel) ? Math.max(0, Math.min(100, nivel * 10)) : 0;
    const confianza  = Number.isFinite(Number(r.confianza)) ? `${fmt(r.confianza)}%` : '–';
    const fillClass  = nivel >= 7 ? 'green' : nivel >= 4 ? 'yellow' : 'red';
    const lVal        = Number(r.l);
    const esAnomaliaL = lVal > 0 && lVal < 15;
    const esFalsoOptimo = r.alerta_falso_optimo === true || r.alerta_falso_optimo === '1';
    const alertas = [];
    if (esAnomaliaL) {
      alertas.push(`⚠ L*=${escapeHtml(String(r.l))} — medición en zona oscura. Revisar posicionamiento del colorímetro.`);
    }
    if (esFalsoOptimo) {
      alertas.push(`⚠ Hue° bajo (${escapeHtml(r.hue_angle ?? '?')}°): la madurez del tejido interno puede diferir de la cáscara. Verificar visualmente.`);
    }
    const alertaHtml = alertas.length > 0
      ? `<div style="margin:6px 0 2px;padding:5px 8px;background:#fef2f2;border-left:3px solid #ef4444;border-radius:3px;font-size:0.73rem;color:#b91c1c;">${alertas.join('<br>')}</div>`
      : '';
    const fotoHtml = r.imagen_muestra
      ? `<div class="fruit-visual"><img src="${escapeHtml(IMG_BASE + r.imagen_muestra)}" alt=""></div>`
      : `<div class="fruit-visual pineapple-a">🍍</div>`;
    const displayName = formatearNombreMuestra(r.nombre_muestra) || '–';
    return `<div class="fruit-card"
      data-archivo="${escapeHtml(r.archivo_origen||'')}"
      data-fruta-id="${r.fruta_id||''}"
      data-nombre="${escapeHtml(r.nombre_muestra||'')}"
      data-imagen="${escapeHtml(r.imagen_muestra||'')}"
      onclick="abrirModalIndividual('fruta',{archivo_origen:this.dataset.archivo,fruta_id:this.dataset.frutaId,nombre_muestra:this.dataset.nombre,imagen_muestra:this.dataset.imagen})"
      style="cursor:pointer">
      ${fotoHtml}
      <div class="fruit-head">
        <div>
          <span class="card-label">${t('Nombre de la muestra:')}</span>
          <strong>${escapeHtml(displayName)}</strong>
        </div>
        ${estadoHTML}
      </div>
      <div class="level-block">
        <span>${t('Nivel de maduración')}</span>
        <strong>${fmtDecimal(nivel, 1)} / 10</strong>
        <div class="progress"><span class="fill ${fillClass}" style="width:${porcentaje}%"></span></div>
      </div>
      ${alertaHtml}
      <div class="mini-stats">
        <div><span>${t('Confianza del modelo')}</span><strong>${escapeHtml(confianza)}</strong></div>
      </div>
    </div>`;
  }).join('');
}

function obtenerFilasFiltradasAnalizarFruta(excluirConfianza = false) {
  const busqueda      = (document.getElementById('filter-analizar-frutas-muestra')?.value ?? '').toLowerCase();
  const nombreMuestra = document.getElementById('filter-analizar-frutas-nombre-muestra')?.value ?? '';
  const estado        = document.getElementById('filter-analizar-frutas-estado')?.value ?? '';
  const confianza     = document.getElementById('filter-analizar-frutas-confianza')?.value ?? '';
  const estados = (_frutaIdFruta && _estadosCache[_frutaIdFruta + '_frutas']) ? _estadosCache[_frutaIdFruta + '_frutas'] : [];
  let filtradas = _rowsFrutas.filter(r => {
    const nombre = (r.nombre_muestra ?? '').toLowerCase();
    const nivel  = Number.parseFloat(r.nivel_maduracion);
    const conf   = Number(r.confianza);
    if (busqueda && !nombre.includes(busqueda) &&
        !formatearNombreMuestra(r.nombre_muestra).toLowerCase().includes(busqueda)) return false;
    if (nombreMuestra && formatearNombreMuestra(r.nombre_muestra) !== nombreMuestra) return false;
    if (estado && estadoTextoDesdeRow(r, estados, estadoTextoDinamico) !== estado) return false;
    if (!excluirConfianza) {
      if (confianza === 'alta'  && conf < 80)               return false;
      if (confianza === 'media' && (conf < 50 || conf >= 80)) return false;
      if (confianza === 'baja'  && conf >= 50)              return false;
    }
    return true;
  });
  if (_mostrarSoloAlertasAnalizarFruta) {
    filtradas = filtradas.filter(r => {
      const lVal = Number(r.l);
      return (lVal > 0 && lVal < 15) || (r.alerta_falso_optimo === true || r.alerta_falso_optimo === '1');
    });
  }
  return filtradas;
}

function filtrarAnalizarCardsFrutas() {
  const filtradas = obtenerFilasFiltradasAnalizarFruta(false);
  renderAnalizarCardsFrutas(filtradas);
  actualizarDonutConfianzaFruta();
}

function limpiarAnalizarCardsFrutas() {
  ['filter-analizar-frutas-muestra', 'filter-analizar-frutas-nombre-muestra',
   'filter-analizar-frutas-estado',  'filter-analizar-frutas-confianza']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  _mostrarSoloAlertasAnalizarFruta = false;
  const btn = document.getElementById('filter-analizar-frutas-alertas');
  if (btn) btn.classList.remove('active');
  renderAnalizarCardsFrutas(_rowsFrutas);
  actualizarDonutConfianzaFruta();
}

function actualizarDonutConfianzaFruta() {
  const filtradas = obtenerFilasFiltradasAnalizarFruta(true);
  const total = filtradas.length;
  const alta  = filtradas.filter(r => Number(r.confianza) >= 80).length;
  const media = filtradas.filter(r => { const c = Number(r.confianza); return c >= 50 && c < 80; }).length;
  const baja  = filtradas.filter(r => Number(r.confianza) < 50).length;

  const totalEl   = document.querySelector('.donut-confianza-total');
  const porcAlta  = document.querySelector('.donut-confianza-porc-alta');
  const porcMedia = document.querySelector('.donut-confianza-porc-media');
  const porcBaja  = document.querySelector('.donut-confianza-porc-baja');
  const cantAlta  = document.querySelector('.donut-confianza-cant-alta');
  const cantMedia = document.querySelector('.donut-confianza-cant-media');
  const cantBaja  = document.querySelector('.donut-confianza-cant-baja');

  if (totalEl) totalEl.textContent = fmt(total);

  const safePorc = (n) => total > 0 ? ((n / total) * 100).toFixed(1) + '%' : '0.0%';
  const safeCant = (n) => '(' + fmt(n) + ')';

  if (porcAlta)  porcAlta.textContent  = safePorc(alta);
  if (porcMedia) porcMedia.textContent = safePorc(media);
  if (porcBaja)  porcBaja.textContent  = safePorc(baja);
  if (cantAlta)  cantAlta.textContent  = safeCant(alta);
  if (cantMedia) cantMedia.textContent = safeCant(media);
  if (cantBaja)  cantBaja.textContent  = safeCant(baja);

  const donutEl = document.querySelector('.donut-confianza');
  if (donutEl) {
    if (total <= 0) {
      donutEl.style.background = '#e5e7eb';
    } else {
      const segmentos = [
        { color: '#4caf50', count: alta },
        { color: '#ffbb17', count: media },
        { color: '#f15252', count: baja },
      ].filter(s => s.count > 0);
      let current = 0;
      const parts = segmentos.map(s => {
        const start = current.toFixed(1);
        current += (s.count / total) * 100;
        return `${s.color} ${start}% ${current.toFixed(1)}%`;
      });
      donutEl.style.background = `conic-gradient(${parts.join(', ')})`;
    }
  }
}

// ── Donut Dinámico (Frutas) ────────────────────────────────────
let _d3FrutaWarning = false;

function toggleWarningD3Fruta() {
  _d3FrutaWarning = document.getElementById('d3-fruta-warning')?.checked ?? false;
  actualizarDonutDinamicoFruta();
}

function limpiarFiltrosD3Fruta() {
  ['fd3-fruta-nombre', 'fd3-fruta-estado']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  actualizarDonutDinamicoFruta();
}

function actualizarDonutDinamicoFruta() {
  const nombre = document.getElementById('fd3-fruta-nombre')?.value ?? '';
  const estado = document.getElementById('fd3-fruta-estado')?.value ?? '';

  let estados = (_frutaIdFruta && _estadosCache[_frutaIdFruta + '_frutas']) ? _estadosCache[_frutaIdFruta + '_frutas'] : [];

  let filtradas = _rowsFrutas.filter(r => {
    if (nombre && formatearNombreMuestra(r.nombre_muestra) !== nombre) return false;
    if (estado && estadoTextoDesdeRow(r, estados, estadoTextoDinamico) !== estado) return false;
    if (!_d3FrutaWarning) {
      const lVal = Number(r.l);
      const tieneAlerta = (lVal > 0 && lVal < 15) || (r.alerta_falso_optimo === true || r.alerta_falso_optimo === '1');
      if (tieneAlerta) return false;
    }
    return true;
  });

  const total = filtradas.length;
  estados = (_frutaIdFruta && _estadosCache[_frutaIdFruta + '_frutas']) ? _estadosCache[_frutaIdFruta + '_frutas'] : [];
  const segmentos = estados.length > 0 ? contarPorEstado(filtradas, estados) : [];

  document.querySelector('.d3-total').textContent = fmt(total);
  const donutEl = document.querySelector('.donut-fruta-dinamico .donut-fruta');
  if (segmentos.length > 0) {
    if (donutEl) actualizarDonutN(donutEl, segmentos, total);
    const lg = document.getElementById('legend-fruta-dinamico');
    if (lg) renderLegend(lg, segmentos, total);
  } else {
    if (donutEl) actualizarDonut(donutEl, 0, 0, 0, total);
  }
}
