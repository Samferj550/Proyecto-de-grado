// ── KPIs Aromáticas ───────────────────────────────────────────
let _frutaIdAro = null;

async function cargarKpisAromaticas() {
  try {
    const snapshotId = typeof _aroDashboardActiva !== 'undefined' ? _aroDashboardActiva?.id : undefined;
    const url  = API + '?endpoint=kpis_aromaticas' + (_proveedorIdFiltro ? `&proveedor_id=${_proveedorIdFiltro}` : '') + (_frutaIdAro ? `&fruta_id=${_frutaIdAro}` : '');
    const res  = await fetch(url);
    const data = await res.json();
    if (data.error) { console.warn('KPIs aromáticas:', data.mensaje); return; }
    const currentId = typeof _aroDashboardActiva !== 'undefined' ? _aroDashboardActiva?.id : undefined;
    if (currentId !== snapshotId) return;

    window.totalAromaticas = Number(data.total) || 0;

    const total = Number(data.total) || 0;
    const opt = Number(data.optimas), proc = Number(data.en_proceso), baj = Number(data.bajas);

    // Update static KPI cards (fallback when categoria column doesn't exist yet)
    const elTotal = document.getElementById('kpi-aro-total');
    if (elTotal) elTotal.textContent = fmt(total);
    const elOpt = document.getElementById('kpi-aro-optimas');
    if (elOpt) elOpt.textContent = fmt(opt);
    const elProc = document.getElementById('kpi-aro-proceso');
    if (elProc) elProc.textContent = fmt(proc);
    const elBaj = document.getElementById('kpi-aro-bajas');
    if (elBaj) elBaj.textContent = fmt(baj);

    document.querySelectorAll('.donut-aro-duplicado:not(.donut-aro-dinamico)').forEach(c => {
      c.querySelector('.donut-total').textContent = fmt(total);
      const o = c.querySelector('.donut-porc-optimas');
      const p = c.querySelector('.donut-porc-proceso');
      const b = c.querySelector('.donut-porc-bajas');
      const co = c.querySelector('.donut-cant-optimas');
      const cp = c.querySelector('.donut-cant-proceso');
      const cb = c.querySelector('.donut-cant-bajas');
      if (total > 0) {
        if (o) o.textContent = ((opt / total) * 100).toFixed(1) + '%';
        if (p) p.textContent = ((proc / total) * 100).toFixed(1) + '%';
        if (b) b.textContent = ((baj / total) * 100).toFixed(1) + '%';
        if (co) co.textContent = '(' + fmt(opt) + ')';
        if (cp) cp.textContent = '(' + fmt(proc) + ')';
        if (cb) cb.textContent = '(' + fmt(baj) + ')';
      } else {
        if (o) o.textContent = '0.0%';
        if (p) p.textContent = '0.0%';
        if (b) b.textContent = '0.0%';
        if (co) co.textContent = '(0)';
        if (cp) cp.textContent = '(0)';
        if (cb) cb.textContent = '(0)';
      }
      const d = c.querySelector('.donut-aromaticas');
      if (d) actualizarDonut(d, opt, proc, baj, total);
    });
  } catch (e) { console.error('Error KPIs aromáticas:', e); }
}

async function actualizarKpisAromaticas() {
  try {
    const gridAro = document.querySelector('#aro-dashboard-data > .kpi-grid');
    if (!gridAro) { console.warn('actualizarKpisAromaticas: gridAro no encontrado'); return; }

    let frutaId = _frutaIdAro;
    if (!frutaId && typeof _aroDashboardActiva !== 'undefined' && _aroDashboardActiva?.id) {
      frutaId = _aroDashboardActiva.id;
    }

    let html = `<article class="kpi-card">
      <div class="kpi-icon blue">📊</div>
      <div>
        <span class="kpi-label">${t('Total Analizadas')}</span>
        <strong class="kpi-value">${fmt(_rowsAromaticas.length)}</strong>
      </div>
    </article>`;

    if (frutaId) {
      const estados = await cargarEstadosFruta(frutaId, 'aromaticas');
      if (estados.length > 0) {
        const segmentos = contarPorEstado(_rowsAromaticas, estados).reverse();
        segmentos.forEach(seg => {
          const e = estados.find(x => x.numero === seg.numero);
          const icono = (e && e.emoji && e.emoji !== '??' && e.emoji !== '?') ? e.emoji : '●';
          html += `<article class="kpi-card">
            <div class="kpi-icon" style="background:${seg.color}">${icono}</div>
            <div>
              <span class="kpi-label">${t(seg.nombre)}</span>
              <strong class="kpi-value">${fmt(seg.count)}</strong>
            </div>
          </article>`;
        });
      }
    }

    gridAro.innerHTML = html;
  } catch (e) {
    console.error('Error en actualizarKpisAromaticas:', e);
  }
}

// ── Tabla Aromáticas ──────────────────────────────────────────
async function cargarTablaAromaticas() {
  try {
    const snapshotId = typeof _aroDashboardActiva !== 'undefined' ? _aroDashboardActiva?.id : undefined;
    let url  = API + '?endpoint=tabla_aromaticas&limite=9999' + (_proveedorIdFiltro ? `&proveedor_id=${_proveedorIdFiltro}` : '');
    let frutaIdAro = null;
    if (snapshotId !== undefined && snapshotId) {
      frutaIdAro = snapshotId;
      url += `&fruta_id=${frutaIdAro}`;
    }
    const res  = await fetch(url);
    const rows = await res.json();
    if (!Array.isArray(rows)) { console.warn('Tabla aromáticas inválida'); return; }
    const currentId = typeof _aroDashboardActiva !== 'undefined' ? _aroDashboardActiva?.id : undefined;
    if (currentId !== snapshotId) return;
    _rowsAromaticas = rows;

    if (!frutaIdAro) {
      frutaIdAro = rows.length > 0 ? rows[0].aromatica_id : null;
      if (!frutaIdAro) {
        if (snapshotId !== undefined && snapshotId) {
          frutaIdAro = snapshotId;
        } else {
          const resArom = await fetch(API + '?endpoint=config_aromaticas_listar');
          const aroms = await resArom.json();
          frutaIdAro = Array.isArray(aroms) ? (aroms[0]?.id) : null;
        }
      }
    }
    if (frutaIdAro) {
      _frutaIdAro = frutaIdAro;
      await poblarSelectEstados('filter-aro-estado', frutaIdAro, 'aromaticas');
      await poblarSelectEstados('filter-analizar-aro-estado', frutaIdAro, 'aromaticas');
      await poblarSelectEstados('fd3-aro-estado', frutaIdAro, 'aromaticas');
    }

    poblarSelectNombresMuestra('filter-aro-nombre-muestra', rows);
    poblarSelectNombresMuestra('filter-analizar-aro-nombre-muestra', rows);
    poblarSelectNombresMuestra('fd3-aro-nombre', rows);
    renderTablaAromaticas(rows);
    renderAnalizarCardsAromaticas(rows);
    actualizarDonutDinamicoAro();
    actualizarDonutConfianzaAromaticas();
  } catch (e) { console.error('Error tabla aromáticas:', e); }
}

function renderTablaAromaticas(rows) {
  const tbody = document.getElementById('tbody-aromaticas');
  if (!tbody) return;
  const emoji    = { 'Naranjo': '🍊', 'Hierbabuena': '🌿', 'Eucalipto': '🌳' };
  const cssClass = { 'Naranjo': 'aromatic-a', 'Hierbabuena': 'aromatic-b', 'Eucalipto': 'aromatic-c' };
  const estados = (_frutaIdAro && _estadosCache[_frutaIdAro + '_aromaticas']) ? _estadosCache[_frutaIdAro + '_aromaticas'] : [];
  tbody.innerHTML = rows.map(r => {
    const planta    = Object.keys(emoji).find(k => (r.nombre_muestra ?? '').includes(k)) ?? '';
    const ico       = emoji[planta]    ?? '🌿';
    const cls       = cssClass[planta] ?? 'aromatic-a';
    const nivel     = Number.parseFloat(r.nivel_maduracion);
    const confianza = Number.isFinite(Number(r.confianza)) ? `${fmt(r.confianza)}%` : '–';
    const fotoHtml = r.imagen_muestra
      ? `<div class="mini-photo"><img src="${escapeHtml(IMG_BASE + r.imagen_muestra)}" alt=""></div>`
      : `<div class="mini-photo ${cls}">${ico}</div>`;
    const nombreMuestra = formatearNombreMuestra(r.nombre_muestra) || '–';
    const lVal = Number(r.l);
    const tieneAlerta = (lVal > 0 && lVal < 20) || (r.alerta_falso_optimo === true || r.alerta_falso_optimo === '1');
    const warningHtml = tieneAlerta ? `<span class="warning-icon">⚠️</span>` : '';
    const fechaMostrarAro = r.fecha_sesion ? formatearSoloFecha(r.fecha_sesion) : '—';
    const estadoHTML = estadoHtmlDesdeRow(r, estados, estadoHtmlDinamico);
    return `<tr>
      <td>${escapeHtml(fechaMostrarAro)}</td>
      <td title="${escapeHtml(nombreMuestra)}">${escapeHtml(nombreMuestra)}</td>
      <td>${fotoHtml}</td>
      <td>${fmtDecimal(nivel, 1)} / 10</td>
      <td>${estadoHTML}</td>
      <td>${escapeHtml(confianza)}</td>
      <td class="cell-warning">${warningHtml}</td>
    </tr>`;
  }).join('');
}

function filtrarTablaAromaticas() {
  const busqueda      = (document.getElementById('filter-aro-muestra')?.value ?? '').toLowerCase();
  const nombreMuestra = document.getElementById('filter-aro-nombre-muestra')?.value ?? '';
  const estado        = document.getElementById('filter-aro-estado')?.value ?? '';
  const confianza     = document.getElementById('filter-aro-confianza')?.value ?? '';
  const estados = (_frutaIdAro && _estadosCache[_frutaIdAro + '_aromaticas']) ? _estadosCache[_frutaIdAro + '_aromaticas'] : [];
  let filtradas = _rowsAromaticas.filter(r => {
    const nombre = (r.nombre_muestra ?? '').toLowerCase();
    const nivel  = Number.parseFloat(r.nivel_maduracion);
    const conf   = Number(r.confianza);
    if (busqueda && !nombre.includes(busqueda)) return false;
    if (nombreMuestra && formatearNombreMuestra(r.nombre_muestra) !== nombreMuestra) return false;
    if (estado && estadoTextoDesdeRow(r, estados, estadoTextoDinamico) !== estado) return false;
    if (confianza === 'alta'  && conf < 72)               return false;
    if (confianza === 'media' && (conf < 48 || conf >= 72)) return false;
    if (confianza === 'baja'  && conf >= 48)              return false;
    return true;
  });
  if (_mostrarSoloAlertasAro) {
    filtradas = filtradas.filter(r => {
      const lVal = Number(r.l);
      return (lVal > 0 && lVal < 20) || (r.alerta_falso_optimo === true || r.alerta_falso_optimo === '1');
    });
  }
  renderTablaAromaticas(filtradas);
}

function limpiarFiltrosAromaticas() {
  ['filter-aro-muestra', 'filter-aro-nombre-muestra', 'filter-aro-estado', 'filter-aro-confianza']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  _mostrarSoloAlertasAro = false;
  const btn = document.getElementById('filter-aro-alertas');
  if (btn) btn.classList.remove('active');
  renderTablaAromaticas(_rowsAromaticas);
}

// ── Cards Aromáticas ──────────────────────────────────────────
async function cargarCardsAromaticas() {
  try {
    const snapshotId = typeof _aroDashboardActiva !== 'undefined' ? _aroDashboardActiva?.id : undefined;
    let url  = API + '?endpoint=tabla_aromaticas&limite=9999' + (_proveedorIdFiltro ? `&proveedor_id=${_proveedorIdFiltro}` : '');
    if (_frutaIdAro) url += `&fruta_id=${_frutaIdAro}`;
    const res  = await fetch(url);
    const rows = await res.json();
    if (!Array.isArray(rows)) return;
    const currentId = typeof _aroDashboardActiva !== 'undefined' ? _aroDashboardActiva?.id : undefined;
    if (currentId !== snapshotId) return;
    const container = document.getElementById('cards-aromaticas');
    if (!container) return;
    const emoji    = { 'Naranjo': '🍊', 'Hierbabuena': '🌿', 'Eucalipto': '🌳' };
  const cssClass = { 'Naranjo': 'aromatic-a', 'Hierbabuena': 'aromatic-b', 'Eucalipto': 'aromatic-c' };
  let frutaIdAro = _frutaIdAro;
  if (!frutaIdAro) {
    frutaIdAro = rows.length > 0 ? rows[0].fruta_id : null;
    if (!frutaIdAro) {
      try {
        const resArom = await fetch(API + '?endpoint=config_aromaticas_listar');
        const aroms = await resArom.json();
        frutaIdAro = Array.isArray(aroms) ? (aroms[0]?.id) : null;
      } catch {}
    }
    if (frutaIdAro) _frutaIdAro = frutaIdAro;
  }
  const estados = frutaIdAro ? await cargarEstadosFruta(frutaIdAro, 'aromaticas') : [];
    container.innerHTML = rows.map(r => {
      const planta     = Object.keys(emoji).find(k => (r.nombre_muestra ?? '').includes(k)) ?? '';
      const ico        = emoji[planta]    ?? '🌿';
      const cls        = cssClass[planta] ?? 'aromatic-a';
      const nivel      = Number.parseFloat(r.nivel_maduracion);
      const estadoHTML = estadoHtmlDesdeRow(r, estados, estadoHtmlDinamico);
      const porcentaje = Number.isFinite(nivel) ? Math.max(0, Math.min(100, nivel * 10)) : 0;
      const confianza = Number.isFinite(Number(r.confianza)) ? `${fmt(r.confianza)}%` : '–';
      const fillClass  = nivel >= 7 ? 'green' : nivel >= 4 ? 'yellow' : 'red';
      const lVal        = Number(r.l);
      const esAnomaliaL = lVal > 0 && lVal < 20;
      const esFalsoOptimo = r.alerta_falso_optimo === true || r.alerta_falso_optimo === '1';
      const alertas = [];
      if (esAnomaliaL) {
        alertas.push(`⚠ L*=${escapeHtml(String(r.l))} — medición atípica para aromáticas. Verificar posicionamiento del colorímetro.`);
      }
      if (esFalsoOptimo) {
        alertas.push(`⚠ Hue° bajo (${escapeHtml(r.hue_angle ?? '?')}°): la pigmentación medida puede no reflejar el estado visual. Verificar.`);
      }
      const alertaHtml  = alertas.length > 0
        ? `<div style="margin:6px 0 2px;padding:5px 8px;background:#fef2f2;
             border-left:3px solid #ef4444;border-radius:3px;font-size:0.73rem;color:#b91c1c;">
             ${alertas.join('<br>')}
           </div>`
        : '';
      const fotoHtml = r.imagen_muestra
        ? `<div class="fruit-visual"><img src="${escapeHtml(IMG_BASE + r.imagen_muestra)}" alt=""></div>`
        : `<div class="fruit-visual ${cls}">${ico}</div>`;
      const displayName = formatearNombreMuestra(r.nombre_muestra) || '–';
      return `<div class="fruit-card"
        data-archivo="${escapeHtml(r.archivo_origen||'')}"
        data-fruta-id="${r.aromatica_id||r.fruta_id||''}"
        data-nombre="${escapeHtml(r.nombre_muestra||'')}"
        data-imagen="${escapeHtml(r.imagen_muestra||'')}"
        onclick="abrirModalIndividual('aromatica',{archivo_origen:this.dataset.archivo,fruta_id:this.dataset.frutaId,nombre_muestra:this.dataset.nombre,imagen_muestra:this.dataset.imagen})"
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
          <span>${t('Nivel de pigmentación')}</span>
          <strong>${fmtDecimal(nivel, 1)} / 10</strong>
          <div class="progress"><span class="fill ${fillClass}" style="width:${porcentaje}%"></span></div>
        </div>
        ${alertaHtml}
        <div class="mini-stats">
          <div><span>${t('Confianza del modelo')}</span><strong>${escapeHtml(confianza)}</strong></div>
        </div>
      </div>`;
    }).join('');
  } catch (e) { console.error('Error cards aromáticas:', e); }
}

// ── Parámetros Colorimétricos Aromáticas ─────────────────────
async function cargarDetalleColorAromaticas() {
  try {
    let url  = API + '?endpoint=detalle_color_aromaticas&limite=9999' + (_proveedorIdFiltro ? `&proveedor_id=${_proveedorIdFiltro}` : '');
    if (_frutaIdAro) url += `&fruta_id=${_frutaIdAro}`;
    const res  = await fetch(url);
    const rows = await res.json();
    if (!Array.isArray(rows)) return;
    _rowsColorAro = rows;
    poblarSelectNombresMuestra('filter-color-aro-nombre-muestra', rows);
    renderColorAromaticas(rows);
  } catch (e) { console.error('Error color aromáticas:', e); }
}

function renderColorAromaticas(rows) {
  const tbody = document.getElementById('tbody-detalle-color-aromaticas');
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
  const counter = document.getElementById('counter-color-aro');
  if (counter) counter.textContent = t('Total: ') + rows.length + t(' muestras');
}

function filtrarColorAromaticas() {
  const busqueda      = (document.getElementById('filter-color-aro-muestra')?.value ?? '').toLowerCase();
  const nombreMuestra = document.getElementById('filter-color-aro-nombre-muestra')?.value ?? '';
  const rangoL        = document.getElementById('filter-color-aro-rango-l')?.value ?? '';
  const tono          = document.getElementById('filter-color-aro-tono')?.value ?? '';

  const filtradas = _rowsColorAro.filter(r => {
    const nombre = (r.nombre_muestra ?? '').toLowerCase();
    const lv     = Number(r.l);
    const hue    = Number(r.hue_angle);

    if (busqueda && !nombre.includes(busqueda)) return false;
    if (nombreMuestra && formatearNombreMuestra(r.nombre_muestra) !== nombreMuestra) return false;

    if (rangoL === 'oscuro' && !(lv < 40))            return false;
    if (rangoL === 'medio'  && !(lv >= 40 && lv < 70)) return false;
    if (rangoL === 'claro'  && !(lv >= 70))            return false;

    if (tono === 'verde'    && !(hue >= 90  && hue <= 160)) return false;
    if (tono === 'amarillo' && !(hue >= 70  && hue < 90))   return false;
    if (tono === 'otro'     && (hue  >= 70  && hue <= 160)) return false;

    return true;
  });
  renderColorAromaticas(filtradas);
}

function limpiarFiltrosColorAromaticas() {
  ['filter-color-aro-muestra', 'filter-color-aro-nombre-muestra', 'filter-color-aro-rango-l', 'filter-color-aro-tono']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderColorAromaticas(_rowsColorAro);
}

// ── Reflectancias Aromáticas ──────────────────────────────────
async function cargarReflectanciasAromaticas() {
  try {
    let url  = API + '?endpoint=reflectancias_aromaticas&limite=9999' + (_proveedorIdFiltro ? `&proveedor_id=${_proveedorIdFiltro}` : '');
    if (_frutaIdAro) url += `&fruta_id=${_frutaIdAro}`;
    const res  = await fetch(url);
    const rows = await res.json();
    if (!Array.isArray(rows)) return;
    _rowsReflAro = rows;
    poblarSelectNombresMuestra('filter-refl-aro-nombre-muestra', rows);
    renderReflAro(rows, null);
  } catch (e) { console.error('Error reflectancias aromáticas:', e); }
}

function colsReflAro(zona) {
  if (!zona) return Array.from({ length: 41 }, (_, i) => 380 + i * 10);
  return ZONAS_REFL_ARO[zona] ?? Array.from({ length: 41 }, (_, i) => 380 + i * 10);
}

function renderReflAro(rows, zona) {
  const cols  = colsReflAro(zona);
  const thead = document.getElementById('thead-refl-aro');
  const tbody = document.getElementById('tbody-reflectancias-aromaticas');
  if (!thead || !tbody) return;

  thead.innerHTML = `<tr>
    <th>${t('Nombre Muestra')}</th>
    ${cols.map(nm => `<th>${nm}</th>`).join('')}
  </tr>`;

  tbody.innerHTML = rows.map(r => `<tr>
    <td>${escapeHtml(formatearNombreMuestra(r.nombre_muestra) || '–')}</td>
    ${cols.map(nm => `<td>${escapeHtml(r[`nm${nm}`] ?? '–')}</td>`).join('')}
  </tr>`).join('');
  const counter = document.getElementById('counter-refl-aro');
  if (counter) counter.textContent = t('Total: ') + rows.length + t(' muestras');
}

function filtrarReflAromaticas() {
  const busqueda      = (document.getElementById('filter-refl-aro-muestra')?.value ?? '').toLowerCase();
  const nombreMuestra = document.getElementById('filter-refl-aro-nombre-muestra')?.value ?? '';
  const zona          = document.getElementById('filter-refl-aro-zona')?.value ?? '';
  const filtradas = _rowsReflAro.filter(r => {
    if (busqueda && !(r.nombre_muestra ?? '').toLowerCase().includes(busqueda)) return false;
    if (nombreMuestra && formatearNombreMuestra(r.nombre_muestra) !== nombreMuestra) return false;
    return true;
  });
  renderReflAro(filtradas, zona || null);
}

function limpiarFiltrosReflAromaticas() {
  ['filter-refl-aro-muestra', 'filter-refl-aro-nombre-muestra', 'filter-refl-aro-zona']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderReflAro(_rowsReflAro, null);
}

// ── Archivos Aromáticas ───────────────────────────────────────
async function cargarArchivosAromaticas() {
  try {
    let url  = API + '?endpoint=archivos_aromaticas&limite=9999' + (_proveedorIdFiltro ? `&proveedor_id=${_proveedorIdFiltro}` : '');
    if (_frutaIdAro) url += `&fruta_id=${_frutaIdAro}`;
    const res  = await fetch(url);
    const rows = await res.json();
    if (!Array.isArray(rows)) return;
    const tbody = document.getElementById('tbody-archivos-aromaticas');
    if (!tbody) return;
    tbody.innerHTML = rows.map(r => `<tr>
      <td>${escapeHtml(formatearNombreMuestra(r.nombre_muestra) || '–')}</td>
      <td>${escapeHtml(r.archivo_origen ?? '–')}</td>
    </tr>`).join('');
  } catch (e) { console.error('Error archivos aromáticas:', e); }
}

// ── Analizar Muestras Aromáticas (cards con filtros) ────────────
function renderAnalizarCardsAromaticas(rows) {
  const container = document.getElementById('cards-analizar-aromaticas');
  if (!container) return;
  const emoji    = { 'Naranjo': '🍊', 'Hierbabuena': '🌿', 'Eucalipto': '🌳' };
  const cssClass = { 'Naranjo': 'aromatic-a', 'Hierbabuena': 'aromatic-b', 'Eucalipto': 'aromatic-c' };
  const estados = (_frutaIdAro && _estadosCache[_frutaIdAro + '_aromaticas']) ? _estadosCache[_frutaIdAro + '_aromaticas'] : [];
  container.innerHTML = rows.map(r => {
    const planta     = Object.keys(emoji).find(k => (r.nombre_muestra ?? '').includes(k)) ?? '';
    const ico        = emoji[planta]    ?? '🌿';
    const cls        = cssClass[planta] ?? 'aromatic-a';
    const nivel      = Number.parseFloat(r.nivel_maduracion);
    const estadoHTML = estadoHtmlDesdeRow(r, estados, estadoHtmlDinamico);
    const porcentaje = Number.isFinite(nivel) ? Math.max(0, Math.min(100, nivel * 10)) : 0;
    const confianza  = Number.isFinite(Number(r.confianza)) ? `${fmt(r.confianza)}%` : '–';
    const fillClass  = nivel >= 7 ? 'green' : nivel >= 4 ? 'yellow' : 'red';
    const lVal        = Number(r.l);
    const esAnomaliaL = lVal > 0 && lVal < 20;
    const esFalsoOptimo = r.alerta_falso_optimo === true || r.alerta_falso_optimo === '1';
    const alertas = [];
    if (esAnomaliaL) {
      alertas.push(`⚠ L*=${escapeHtml(String(r.l))} — medición atípica para aromáticas. Verificar posicionamiento del colorímetro.`);
    }
    if (esFalsoOptimo) {
      alertas.push(`⚠ Hue° bajo (${escapeHtml(r.hue_angle ?? '?')}°): la pigmentación medida puede no reflejar el estado visual. Verificar.`);
    }
    const alertaHtml = alertas.length > 0
      ? `<div style="margin:6px 0 2px;padding:5px 8px;background:#fef2f2;border-left:3px solid #ef4444;border-radius:3px;font-size:0.73rem;color:#b91c1c;">${alertas.join('<br>')}</div>`
      : '';
    const fotoHtml = r.imagen_muestra
      ? `<div class="fruit-visual"><img src="${escapeHtml(IMG_BASE + r.imagen_muestra)}" alt=""></div>`
      : `<div class="fruit-visual ${cls}">${ico}</div>`;
    const displayName = formatearNombreMuestra(r.nombre_muestra) || '–';
    return `<div class="fruit-card"
      data-archivo="${escapeHtml(r.archivo_origen||'')}"
      data-fruta-id="${r.aromatica_id||r.fruta_id||''}"
      data-nombre="${escapeHtml(r.nombre_muestra||'')}"
      data-imagen="${escapeHtml(r.imagen_muestra||'')}"
      onclick="abrirModalIndividual('aromatica',{archivo_origen:this.dataset.archivo,fruta_id:this.dataset.frutaId,nombre_muestra:this.dataset.nombre,imagen_muestra:this.dataset.imagen})"
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
        <span>${t('Nivel de pigmentación')}</span>
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

function filtrarAnalizarCardsAromaticas() {
  const busqueda      = (document.getElementById('filter-analizar-aro-muestra')?.value ?? '').toLowerCase();
  const nombreMuestra = document.getElementById('filter-analizar-aro-nombre-muestra')?.value ?? '';
  const estado        = document.getElementById('filter-analizar-aro-estado')?.value ?? '';
  const confianza     = document.getElementById('filter-analizar-aro-confianza')?.value ?? '';
  const estados = (_frutaIdAro && _estadosCache[_frutaIdAro + '_aromaticas']) ? _estadosCache[_frutaIdAro + '_aromaticas'] : [];
  let filtradas = _rowsAromaticas.filter(r => {
    const nombre = (r.nombre_muestra ?? '').toLowerCase();
    const nivel  = Number.parseFloat(r.nivel_maduracion);
    const conf   = Number(r.confianza);
    if (busqueda && !nombre.includes(busqueda) &&
        !formatearNombreMuestra(r.nombre_muestra).toLowerCase().includes(busqueda)) return false;
    if (nombreMuestra && formatearNombreMuestra(r.nombre_muestra) !== nombreMuestra) return false;
    if (estado && estadoTextoDesdeRow(r, estados, estadoTextoDinamico) !== estado) return false;
    if (confianza === 'alta'  && conf < 80)               return false;
    if (confianza === 'media' && (conf < 50 || conf >= 80)) return false;
    if (confianza === 'baja'  && conf >= 50)              return false;
    return true;
  });
  if (_mostrarSoloAlertasAnalizarAro) {
    filtradas = filtradas.filter(r => {
      const lVal = Number(r.l);
      return (lVal > 0 && lVal < 20) || (r.alerta_falso_optimo === true || r.alerta_falso_optimo === '1');
    });
  }
  renderAnalizarCardsAromaticas(filtradas);
  actualizarDonutConfianzaAromaticas();
}

function limpiarAnalizarCardsAromaticas() {
  ['filter-analizar-aro-muestra', 'filter-analizar-aro-nombre-muestra',
   'filter-analizar-aro-estado',  'filter-analizar-aro-confianza']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  _mostrarSoloAlertasAnalizarAro = false;
  const btn = document.getElementById('filter-analizar-aro-alertas');
  if (btn) btn.classList.remove('active');
  renderAnalizarCardsAromaticas(_rowsAromaticas);
  actualizarDonutConfianzaAromaticas();
}

// ── Donut Dinámico (Aromáticas) ────────────────────────────────
let _d3AroWarning = false;

function toggleWarningD3Aro() {
  _d3AroWarning = document.getElementById('d3-aro-warning')?.checked ?? false;
  actualizarDonutDinamicoAro();
}

function limpiarFiltrosD3Aro() {
  ['fd3-aro-nombre', 'fd3-aro-estado']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  actualizarDonutDinamicoAro();
}

// ── Selector de Planta Aromática (dashboard) ────────────────────
let _aroDashboardActiva = null;

async function cargarSelectorAromaticas() {
  try {
    const res = await fetch(API + '?endpoint=config_aromaticas_listar');
    const plantas = await res.json();
    const ul = document.getElementById('dropdown-aromaticas');
    if (!ul) return;
    ul.innerHTML = '';
    if (!Array.isArray(plantas) || plantas.length === 0) {
      ul.innerHTML = '<li class="dropdown-empty">' + t('No hay plantas') + '</li>';
      return;
    }
    plantas.forEach(p => {
      const li = document.createElement('li');
      li.innerHTML = `${(p.icono && p.icono !== '??' ? p.icono : '🌿')} ${escapeHtml(t(p.nombre))}`;
      li.dataset.id = p.id;
      li.dataset.nombre = p.nombre;
      li.dataset.icono = (p.icono && p.icono !== '??' ? p.icono : '🌿');
      li.addEventListener('click', () => cambiarAromaticasDashboard(p));
      ul.appendChild(li);
    });
    if (!_aroDashboardActiva && plantas.length > 0) {
      const defaultAro = plantas.find(p => p.nombre.toLowerCase() === 'albahaca') || plantas[0];
      cambiarAromaticasDashboard(defaultAro);
    }
  } catch (e) {
    console.error('Error cargando selector aromáticas:', e);
  }
}

async function cambiarAromaticasDashboard(planta) {
  _aroDashboardActiva = planta;
  const iconoEl = document.getElementById('selector-aro-icono');
  const nombreEl = document.getElementById('selector-aro-nombre');
  if (iconoEl) iconoEl.textContent = (planta.icono && planta.icono !== '??' ? planta.icono : '🌿');
  if (nombreEl) nombreEl.textContent = t(planta.nombre);
  document.getElementById('dropdown-aromaticas')?.setAttribute('hidden', '');
  _frutaIdAro = planta.id;
  mostrarDashboardAromaticas();
  await cargarKpisAromaticas();
  await cargarTablaAromaticas();
  await cargarCardsAromaticas();
  await cargarDetalleColorAromaticas();
  await cargarReflectanciasAromaticas();
  await cargarArchivosAromaticas();
  await actualizarKpisAromaticas();
  await refrescarDonutsConEstados();
}

function actualizarDonutDinamicoAro() {
  const nombre = document.getElementById('fd3-aro-nombre')?.value ?? '';
  const estado = document.getElementById('fd3-aro-estado')?.value ?? '';

  let estados = (_frutaIdAro && _estadosCache[_frutaIdAro + '_aromaticas']) ? _estadosCache[_frutaIdAro + '_aromaticas'] : [];

  let filtradas = _rowsAromaticas.filter(r => {
    if (nombre && formatearNombreMuestra(r.nombre_muestra) !== nombre) return false;
    if (estado && estadoTextoDesdeRow(r, estados, estadoTextoDinamico) !== estado) return false;
    if (!_d3AroWarning) {
      const lVal = Number(r.l);
      const tieneAlerta = (lVal > 0 && lVal < 20) || (r.alerta_falso_optimo === true || r.alerta_falso_optimo === '1');
      if (tieneAlerta) return false;
    }
    return true;
  });

  const total = filtradas.length;
  estados = (_frutaIdAro && _estadosCache[_frutaIdAro + '_aromaticas']) ? _estadosCache[_frutaIdAro + '_aromaticas'] : [];
  const segmentos = estados.length > 0 ? contarPorEstado(filtradas, estados).reverse() : [];

  document.querySelector('.d3-total-aro').textContent = fmt(total);
  const donutEl = document.querySelector('.donut-aro-dinamico .donut-aromaticas');
  if (segmentos.length > 0) {
    if (donutEl) actualizarDonutN(donutEl, segmentos, total);
    const lg = document.getElementById('legend-aro-dinamico');
    if (lg) renderLegend(lg, segmentos, total);
  } else {
    if (donutEl) actualizarDonut(donutEl, 0, 0, 0, total);
  }
}

function actualizarDonutConfianzaAromaticas() {
  const filtradas = (() => {
    const busqueda = (document.getElementById('filter-analizar-aro-muestra')?.value ?? '').toLowerCase();
    const nombreMuestra = document.getElementById('filter-analizar-aro-nombre-muestra')?.value ?? '';
    const estado = document.getElementById('filter-analizar-aro-estado')?.value ?? '';
    const estados = (_frutaIdAro && _estadosCache[_frutaIdAro + '_aromaticas']) ? _estadosCache[_frutaIdAro + '_aromaticas'] : [];
    return _rowsAromaticas.filter(r => {
      const nombre = (r.nombre_muestra ?? '').toLowerCase();
      const nivel  = Number.parseFloat(r.nivel_maduracion);
      if (busqueda && !nombre.includes(busqueda) &&
          !formatearNombreMuestra(r.nombre_muestra).toLowerCase().includes(busqueda)) return false;
      if (nombreMuestra && formatearNombreMuestra(r.nombre_muestra) !== nombreMuestra) return false;
      if (estado && estadoTextoDesdeRow(r, estados, estadoTextoDinamico) !== estado) return false;
      if (_mostrarSoloAlertasAnalizarAro) {
        const lVal = Number(r.l);
        return (lVal > 0 && lVal < 20) || (r.alerta_falso_optimo === true || r.alerta_falso_optimo === '1');
      }
      return true;
    });
  })();

  const total = filtradas.length;
  const alta  = filtradas.filter(r => Number(r.confianza) >= 80).length;
  const media = filtradas.filter(r => { const c = Number(r.confianza); return c >= 50 && c < 80; }).length;
  const baja  = filtradas.filter(r => Number(r.confianza) < 50).length;

  const totalEl   = document.querySelector('.aro-donut-confianza-total');
  const porcAlta  = document.querySelector('.aro-donut-confianza-porc-alta');
  const porcMedia = document.querySelector('.aro-donut-confianza-porc-media');
  const porcBaja  = document.querySelector('.aro-donut-confianza-porc-baja');
  const cantAlta  = document.querySelector('.aro-donut-confianza-cant-alta');
  const cantMedia = document.querySelector('.aro-donut-confianza-cant-media');
  const cantBaja  = document.querySelector('.aro-donut-confianza-cant-baja');

  if (totalEl) totalEl.textContent = fmt(total);

  const safePorc = (n) => total > 0 ? ((n / total) * 100).toFixed(1) + '%' : '0.0%';
  const safeCant = (n) => '(' + fmt(n) + ')';

  if (porcAlta)  porcAlta.textContent  = safePorc(alta);
  if (porcMedia) porcMedia.textContent = safePorc(media);
  if (porcBaja)  porcBaja.textContent  = safePorc(baja);
  if (cantAlta)  cantAlta.textContent  = safeCant(alta);
  if (cantMedia) cantMedia.textContent = safeCant(media);
  if (cantBaja)  cantBaja.textContent  = safeCant(baja);

  const donutEl = document.querySelector('.donut-aro-confianza');
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
