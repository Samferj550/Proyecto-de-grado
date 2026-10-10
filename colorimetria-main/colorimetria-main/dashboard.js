const API = 'http://localhost/colorimetria/api.php';
const IMG_BASE = 'http://localhost/colorimetria/';

// ── Helpers ───────────────────────────────────────────────────
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

function poblarSelectNombresMuestra(selectId, rows) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const actual = select.value;
  const nombres = [...new Set(
    rows
      .map(r => formatearNombreMuestra(r.nombre_muestra))
      .filter(n => n && n !== '–')
  )].sort((a, b) => a.localeCompare(b, 'es'));
  select.innerHTML = '<option value="">Por Nombre Muestra</option>' +
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
  if (!Number.isFinite(n)) return '<span class="status bad">Sin dato</span>';
  if (n >= 7) return '<span class="status ok" title="Hue < 62° — color naranja-amarillo intenso">Óptima</span>';
  if (n >= 4) return '<span class="status process" title="Hue 62°–70° — transición verde-amarillo">En Proceso</span>';
  return        '<span class="status bad" title="Hue > 70° o medición anómala (L* bajo)">No Madura</span>';
}

function estadoPorNivelAromatica(nivel) {
  const n = Number(nivel);
  if (!Number.isFinite(n)) return '<span class="status bad">Sin dato</span>';
  if (n >= 7) return '<span class="status ok" title="Hue > 143° — alta concentración de clorofila">Pigmentación Óptima</span>';
  if (n >= 4) return '<span class="status process" title="Hue 122°–143° — pigmentación en desarrollo">En Proceso</span>';
  return        '<span class="status bad" title="Hue < 122° — baja concentración de clorofila">Baja Pigmentación</span>';
}

function estadoTextoFruta(nivel) {
  const n = Number(nivel);
  if (!Number.isFinite(n)) return '';
  if (n >= 7) return 'Óptima';
  if (n >= 4) return 'En Proceso';
  return 'No Madura';
}

function estadoTextoAromatica(nivel) {
  const n = Number(nivel);
  if (!Number.isFinite(n)) return '';
  if (n >= 7) return 'Pigmentación Óptima';
  if (n >= 4) return 'En Proceso';
  return 'Baja Pigmentación';
}

// ── Dynamic N-segment donut ──────────────────────────────────
const _estadosCache = {};

async function cargarEstadosFruta(frutaId) {
  if (!_estadosCache[frutaId]) {
    try {
      const res = await fetch(API + `?endpoint=config_estados_fruta&fruta_id=${frutaId}`);
      _estadosCache[frutaId] = await res.json();
    } catch { _estadosCache[frutaId] = []; }
  }
  return _estadosCache[frutaId] || [];
}

function contarPorEstado(rows, estados) {
  if (estados.length === 0) return [];
  const counts = {};
  estados.forEach(e => { counts[e.numero] = 0; });
  const usarEstadoId = rows.some(r => r.estado_id != null);
  if (usarEstadoId) {
    rows.forEach(r => {
      const estadoId = Number(r.estado_id);
      if (Number.isFinite(estadoId) && estadoId in counts) {
        counts[estadoId]++;
      }
    });
  } else {
    const step = 10 / estados.length;
    rows.forEach(r => {
      const nivel = Number(r.nivel_maduracion);
      if (Number.isFinite(nivel)) {
        const idx = Math.min(estados.length - 1, Math.floor(nivel / step));
        const estadoNum = estados[idx]?.numero;
        if (estadoNum !== undefined) counts[estadoNum]++;
      }
    });
  }
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
    div.innerHTML = `<span class="dot" style="background:${seg.color}"></span> ${seg.nombre} <strong>${pct}</strong> <small>(${fmt(seg.count)})</small>`;
    container.appendChild(div);
  });
}

// Fallback old donut (3 segments) for backward compat
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

// ── Modal Cargar Muestra ────────────────────────────────────────
let _muestraContexto = null;
let _muestraSeleccionada = null;
let _archivoImagenSeleccionado = null;
let _rutaImagenSubida = null;

function abrirModalMuestra(contexto, nombreMuestra = '') {
  _muestraContexto = contexto;
  _muestraSeleccionada = nombreMuestra;
  _archivoImagenSeleccionado = null;
  _rutaImagenSubida = null;
  _csvFileIndividual = null;

  document.getElementById('modal-muestra-titulo').textContent =
    contexto === 'pina' ? 'Cargar muestra de piña' : 'Cargar muestra de aromática';

  document.getElementById('modal-nombre-muestra').value = nombreMuestra;
  document.getElementById('modal-nombre-muestra').placeholder =
    contexto === 'pina' ? 'Ej: Fruta Dia 1' : 'Ej: Aromática Dia 1';
  document.getElementById('preview-img').style.display = 'none';
  document.getElementById('upload-placeholder').style.display = 'block';
  document.getElementById('btn-cargar-muestra').disabled = true;
  document.getElementById('modal-msg').textContent = '';
  document.getElementById('modal-msg').className = 'modal-msg';
  document.getElementById('input-imagen-muestra').value = '';
  document.getElementById('input-csv-individual').value = '';
  document.getElementById('csv-info-individual').textContent = 'Ningún archivo seleccionado';
  document.getElementById('btn-quitar-csv-individual').style.display = 'none';

  document.getElementById('modal-cargar-muestra').style.display = 'flex';
}

function cerrarModalMuestra() {
  document.getElementById('modal-cargar-muestra').style.display = 'none';
}

function previsualizarImagen(event) {
  const archivo = event.target.files?.[0];
  if (!archivo) return;

  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
  if (!tiposPermitidos.includes(archivo.type)) {
    mostrarMensajeModal('Formato no permitido. Usa JPG, PNG o WEBP.', 'error');
    return;
  }
  if (archivo.size > 5 * 1024 * 1024) {
    mostrarMensajeModal('La imagen supera el límite de 5MB.', 'error');
    return;
  }

  _archivoImagenSeleccionado = archivo;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.getElementById('preview-img');
    img.src = e.target.result;
    img.style.display = 'block';
    document.getElementById('upload-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(archivo);

  validarFormularioMuestra();
}

function validarFormularioMuestra() {
  const nombre = document.getElementById('modal-nombre-muestra').value.trim();
  const btn = document.getElementById('btn-cargar-muestra');
  const msg = document.getElementById('modal-msg');

  if (!nombre && !_archivoImagenSeleccionado && !_csvFileIndividual) {
    msg.textContent = 'Ingresa un nombre, una imagen y un archivo CSV';
    msg.className = 'modal-msg error';
    btn.disabled = true;
    return;
  }
  if (!nombre) {
    msg.textContent = 'Ingresa un nombre para la muestra';
    msg.className = 'modal-msg error';
    btn.disabled = true;
    return;
  }
  if (!_archivoImagenSeleccionado) {
    msg.textContent = 'Selecciona una imagen (obligatorio)';
    msg.className = 'modal-msg error';
    btn.disabled = true;
    return;
  }
  if (!_csvFileIndividual) {
    msg.textContent = 'Selecciona un archivo CSV (obligatorio)';
    msg.className = 'modal-msg error';
    btn.disabled = true;
    return;
  }

  msg.textContent = '';
  msg.className = 'modal-msg';
  btn.disabled = false;
}

function mostrarMensajeModal(texto, tipo) {
  const el = document.getElementById('modal-msg');
  el.textContent = texto;
  el.className = `modal-msg ${tipo}`;
}

async function guardarMuestra() {
  const nombre = document.getElementById('modal-nombre-muestra').value.trim();
  if (!_archivoImagenSeleccionado || !_csvFileIndividual || !nombre) {
    mostrarMensajeModal('Debes seleccionar una imagen, un CSV y un nombre de muestra.', 'error');
    return;
  }

  const btn = document.getElementById('btn-cargar-muestra');
  btn.disabled = true;

  // ── Subir imagen ──
  mostrarMensajeModal('Subiendo imagen…', '');
  try {
    const endpointSubida = _muestraContexto === 'pina'
      ? 'subir_imagen_fruta'
      : 'subir_imagen_aromaticas';
    const fd = new FormData();
    fd.append('imagen', _archivoImagenSeleccionado);
    fd.append('nombre_muestra', nombre);
    const resImg = await fetch(`${API}?endpoint=${endpointSubida}`, { method: 'POST', body: fd });
    const dataImg = await resImg.json();
    if (dataImg.error) {
      mostrarMensajeModal(dataImg.mensaje || 'Error al subir la imagen.', 'error');
      btn.disabled = false;
      return;
    }

    // ── Importar CSV + imagen ──
    mostrarMensajeModal('Importando datos del CSV…', '');
    const texto = await _csvFileIndividual.text();
    const filas = parseCSVText(texto);
    if (!filas || filas.length === 0) {
      mostrarMensajeModal('El CSV no contiene datos válidos.', 'error');
      btn.disabled = false;
      return;
    }

    const endpoint = _muestraContexto === 'pina' ? 'importar_json_fruta' : 'importar_json_aromaticas';
    const rutaImg = dataImg.ruta;
    const asignaciones = {};
    for (let i = 0; i < filas.length; i++) {
      asignaciones[String(i)] = rutaImg;
    }
    const payload = {
      rows: filas.map(r => {
        const row = { nombre_muestra: r.nombre_muestra, l: r.l, a: r.a, b: r.b, nombre_muestra_personalizado: nombre };
        Object.keys(r).forEach(k => { if (/^nm\d+$/.test(k)) row[k] = r[k]; });
        return row;
      }),
      asignaciones: asignaciones,
      archivo_origen: _csvFileIndividual?.name ?? null
    };
    const res = await fetch(`${API}?endpoint=${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.error) {
      mostrarMensajeModal(data.mensaje || 'Error al importar datos.', 'error');
      btn.disabled = false;
      return;
    }

    mostrarMensajeModal(`✓ ${data.mensaje}`, 'success');
    if (_muestraContexto === 'pina') {
      await cargarKpisFrutas(); await cargarCardsFrutas(); await cargarTablaFrutas();
      await cargarDetalleColorFrutas(); await cargarReflectanciasFrutas(); await cargarArchivosFrutas();
    } else {
      await cargarKpisAromaticas(); await cargarCardsAromaticas(); await cargarTablaAromaticas();
      await cargarDetalleColorAromaticas(); await cargarReflectanciasAromaticas(); await cargarArchivosAromaticas();
    }
    _csvFileIndividual = null;
    _archivoImagenSeleccionado = null;
    setTimeout(cerrarModalMuestra, 1500);
  } catch (e) {
    console.error('Error al guardar muestra:', e);
    mostrarMensajeModal('Error de conexión con el servidor.', 'error');
    btn.disabled = false;
  }
}

// ── Lote: Asignar imágenes por lote ────────────────────────────
let _loteContexto = null;
let _loteImagenes = [];
let _loteMuestras = [];
let _loteAsignaciones = {};

function abrirModalLote(contexto) {
  _loteContexto = contexto;
  _loteImagenes = [];
  _loteMuestras = [];
  _loteAsignaciones = {};
  _loteCSVs = [];
  _loteCSVRows = [];
  _loteNombresPersonalizados = [];

  document.getElementById('modal-lote-titulo').textContent =
    contexto === 'pina' ? 'Cargar Varias Muestras — Piña' : 'Cargar Varias Muestras — Aromáticas';

  document.getElementById('lote-grid-imagenes').innerHTML = '';
  document.getElementById('lote-info-imagenes').textContent = 'Ninguna imagen seleccionada';
  document.getElementById('lote-tabla-cuerpo').innerHTML = '<tr><td colspan="4" class="lote-empty">Carga un CSV para ver las muestras</td></tr>';
  document.getElementById('lote-validacion-texto').textContent = 'Carga un CSV con los datos de las muestras';
  document.getElementById('lote-validacion-msg').className = 'lote-validacion';
  document.getElementById('btn-guardar-lote').disabled = true;
  document.getElementById('input-imagenes-lote').value = '';
  document.getElementById('input-csv-lote').value = '';
  document.getElementById('csv-info-lote').textContent = 'Ningún archivo seleccionado';
  document.getElementById('csv-preview-lote-wrap').style.display = 'none';
  document.getElementById('csv-preview-lote-wrap').innerHTML = '';

  document.getElementById('modal-asignar-lote').style.display = 'flex';

  cargarMuestrasSinImagen();
}

function cerrarModalLote() {
  document.getElementById('modal-asignar-lote').style.display = 'none';
}

async function cargarMuestrasSinImagen() {
  const endpoint = _loteContexto === 'pina' ? 'muestras_sin_imagen_fruta' : 'muestras_sin_imagen_aromaticas';
  try {
    const res = await fetch(`${API}?endpoint=${endpoint}`);
    const data = await res.json();
    if (!Array.isArray(data)) {
      if (_loteCSVRows.length === 0) {
        document.getElementById('lote-tabla-cuerpo').innerHTML = '<tr><td colspan="4" class="lote-empty">Error al cargar muestras</td></tr>';
      }
      return;
    }
    // Solo sobrescribir si el usuario aún no ha cargado un CSV
    if (_loteCSVRows.length === 0) {
      _loteMuestras = data;
      renderAsignacionesLote();
    }
  } catch (e) {
    console.error('Error cargando muestras sin imagen:', e);
    if (_loteCSVRows.length === 0) {
      document.getElementById('lote-tabla-cuerpo').innerHTML = '<tr><td colspan="4" class="lote-empty">Error de conexión</td></tr>';
    }
  }
}

function seleccionarImagenesLote(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  const anteriores = _loteImagenes.length;
  for (const f of files) {
    _loteImagenes.push(f);
  }

  // Re-index asignaciones existentes
  const nuevas = {};
  for (const [muestraIdx, imgIdx] of Object.entries(_loteAsignaciones)) {
    nuevas[muestraIdx] = imgIdx;
  }
  _loteAsignaciones = nuevas;

  event.target.value = '';
  renderThumbnailsLote();
  renderAsignacionesLote();
  validarLote();
}

function eliminarImagenLote(index) {
  _loteImagenes.splice(index, 1);
  // Ajustar asignaciones: si alguna apuntaba a un índice >= index, restar 1
  const nuevas = {};
  for (const [muestraIdx, imgIdx] of Object.entries(_loteAsignaciones)) {
    if (imgIdx === index) continue;
    nuevas[muestraIdx] = imgIdx > index ? imgIdx - 1 : imgIdx;
  }
  _loteAsignaciones = nuevas;
  renderThumbnailsLote();
  renderAsignacionesLote();
  validarLote();
}

function renderThumbnailsLote() {
  const container = document.getElementById('lote-grid-imagenes');
  const info = document.getElementById('lote-info-imagenes');
  info.textContent = `${_loteImagenes.length} imagen(es) seleccionada(s)`;

  container.innerHTML = _loteImagenes.map((file, i) => {
    const url = URL.createObjectURL(file);
    return `<div class="lote-thumb">
      <span class="lote-thumb-num">#${i + 1}</span>
      <button class="lote-thumb-x" onclick="eliminarImagenLote(${i})" title="Eliminar">✕</button>
      <img src="${url}" alt="">
      <div class="lote-thumb-name">${escapeHtml(file.name)}</div>
    </div>`;
  }).join('');
}

function renderAsignacionesLote() {
  const tbody = document.getElementById('lote-tabla-cuerpo');
  const totalImgs = _loteImagenes.length;
  const tieneCSV = _loteCSVRows.length > 0;

  if (_loteMuestras.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="lote-empty">' +
      (tieneCSV ? 'Cargando datos…' : 'Carga un CSV arriba para ver las muestras') +
      '</td></tr>';
    return;
  }

  if (totalImgs === 0 && !tieneCSV) {
    tbody.innerHTML = '<tr><td colspan="4" class="lote-empty">Carga un CSV con los datos de las muestras</td></tr>';
    return;
  }

  tbody.innerHTML = _loteMuestras.map((m, idx) => {
    const nameVal = _loteNombresPersonalizados[idx] || '';
    const tieneCSVLocal = m.csvIdx !== undefined;
    const placeholderLote = _loteContexto === 'pina' ? 'Ej: Fruta Dia 1' : 'Ej: Aromática Dia 1';
    let nameHtml = tieneCSVLocal
      ? `<td><input class="lote-name-input" type="text" placeholder="${placeholderLote}" value="${escapeHtml(nameVal)}" oninput="onChangeNombreLote(${idx}, this.value)"></td>`
      : `<td style="color:#9ca3af;font-size:.8rem;">—</td>`;

    let selectHtml = '<td style="color:#9ca3af;font-size:.8rem;">—</td>';
    if (totalImgs > 0) {
      const valorActual = _loteAsignaciones[idx] !== undefined ? _loteAsignaciones[idx] : '';
      let options = `<option value="" ${valorActual === '' ? 'selected' : ''}>Sin imagen</option>`;
      for (let i = 0; i < totalImgs; i++) {
        const sel = _loteAsignaciones[idx] === i ? 'selected' : '';
        options += `<option value="${i}" ${sel}>Imagen #${i + 1}</option>`;
      }
      selectHtml = `<td><select onchange="onChangeAsignacionLote(${idx}, this.value)">${options}</select></td>`;
    }
    return `<tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(m.nombre_muestra)}</td>
      ${nameHtml}
      ${selectHtml}
    </tr>`;
  }).join('');
}

function onChangeAsignacionLote(muestraIndex, imageIndex) {
  if (imageIndex === '') {
    delete _loteAsignaciones[muestraIndex];
  } else {
    _loteAsignaciones[muestraIndex] = parseInt(imageIndex, 10);
  }
  renderAsignacionesLote();
  validarLote();
}

function onChangeNombreLote(idx, val) {
  _loteNombresPersonalizados[idx] = val;
  validarLote();
}

function validarLote() {
  const totalImgs = _loteImagenes.length;
  const totalMuestras = _loteMuestras.length;
  const tieneCSV = _loteCSVRows.length > 0;
  const asignadas = Object.keys(_loteAsignaciones).length;
  const valores = Object.values(_loteAsignaciones);
  const duplicados = valores.length !== new Set(valores).size;
  const msg = document.getElementById('lote-validacion-texto');
  const box = document.getElementById('lote-validacion-msg');
  const btn = document.getElementById('btn-guardar-lote');

  // CSV cargado → validar nombres personalizados e imágenes obligatorias
  if (tieneCSV) {
    const faltanNombres = _loteNombresPersonalizados.some(n => !n || !n.trim());
    if (faltanNombres) {
      msg.textContent = '⚠ Completa el "Nombre de la muestra" para cada archivo CSV';
      box.className = 'lote-validacion error';
      btn.disabled = true;
      return;
    }
    if (totalImgs === 0) {
      msg.textContent = '⚠ Selecciona al menos una imagen (obligatorio)';
      box.className = 'lote-validacion error';
      btn.disabled = true;
      return;
    }
    // CSV + imágenes: mostrar advertencia si hay imágenes sin asignar
    if (totalImgs > 0 && asignadas === 0) {
      msg.textContent = '⚠ Asigna las imagenes con su respectiva muestra';
      box.className = 'lote-validacion error';
      btn.disabled = true;
      return;
    }
    // CSV + imágenes: validar que cada CSV tenga una imagen asignada
    if (asignadas < totalMuestras) {
      msg.textContent = `⚠ Faltan ${totalMuestras - asignadas} archivo(s) CSV por asignar una imagen`;
      box.className = 'lote-validacion error';
      btn.disabled = true;
      return;
    }
    if (duplicados) {
      msg.textContent = '⚠ No puedes asignar la misma imagen a dos archivos CSV distintos';
      box.className = 'lote-validacion error';
      btn.disabled = true;
      return;
    }
    msg.textContent = `✓ ${totalImgs} imágenes asignadas a ${totalMuestras} archivos CSV`;
    box.className = 'lote-validacion ok';
    btn.disabled = false;
    return;
  }

  // Sin CSV: flujo solo imágenes para muestras existentes
  if (totalImgs === 0) {
    msg.textContent = 'Carga un CSV con los datos de las muestras';
    box.className = 'lote-validacion';
    btn.disabled = true;
    return;
  }

  if (totalImgs !== totalMuestras) {
    msg.textContent = `⚠ La cantidad de imágenes (${totalImgs}) debe ser igual a la cantidad de muestras pendientes (${totalMuestras})`;
    box.className = 'lote-validacion error';
    btn.disabled = true;
    return;
  }

  if (asignadas < totalImgs) {
    msg.textContent = `⚠ Faltan ${totalImgs - asignadas} imagen(es) por asignar`;
    box.className = 'lote-validacion error';
    btn.disabled = true;
    return;
  }

  if (duplicados) {
    msg.textContent = '⚠ No puedes asignar la misma imagen a dos muestras distintas';
    box.className = 'lote-validacion error';
    btn.disabled = true;
    return;
  }

  msg.textContent = `✓ ${totalImgs} imágenes asignadas correctamente a ${totalMuestras} muestras`;
  box.className = 'lote-validacion ok';
  btn.disabled = false;
}

async function guardarLote() {
  const btn = document.getElementById('btn-guardar-lote');
  btn.disabled = true;

  const msgTexto = document.getElementById('lote-validacion-texto');
  const msgBox = document.getElementById('lote-validacion-msg');

  // ── Flujo combinado: CSV + Imágenes ──────────────────────────
  if (_loteCSVRows.length > 0) {
    msgTexto.textContent = 'Subiendo imágenes…';
    msgBox.className = 'lote-validacion';

    try {
      let rutasImagenes = [];

      // 1) Subir imágenes si hay
      if (_loteImagenes.length > 0) {
        const endpointSubida = _loteContexto === 'pina'
          ? 'subir_imagenes_lote_fruta'
          : 'subir_imagenes_lote_aromaticas';

        const formData = new FormData();
        _loteImagenes.forEach(file => formData.append('imagenes[]', file));

        const resSubida = await fetch(`${API}?endpoint=${endpointSubida}`, {
          method: 'POST',
          body: formData
        });
        const dataSubida = await resSubida.json();

        if (dataSubida.error || !dataSubida.archivos) {
          msgTexto.textContent = dataSubida.mensaje || 'Error al subir imágenes';
          msgBox.className = 'lote-validacion error';
          btn.disabled = false;
          return;
        }
        rutasImagenes = dataSubida.archivos.map(a => a.ruta);
      }

      // 2) Por cada archivo CSV, importar sus filas con su imagen asignada
      msgTexto.textContent = 'Importando muestras…';
      const endpoint = _loteContexto === 'pina' ? 'importar_json_fruta' : 'importar_json_aromaticas';
      let totalInsertados = 0;

      for (let csvIdx = 0; csvIdx < _loteCSVRows.length; csvIdx++) {
        const rows = _loteCSVRows[csvIdx];
        const imgIdx = _loteAsignaciones[csvIdx];
        const rutaImg = imgIdx !== undefined ? rutasImagenes[imgIdx] : null;
        const nombrePersonalizado = (_loteNombresPersonalizados[csvIdx] || '').trim();

        // Construir asignaciones: misma imagen para todas las filas de este CSV
        const asignaciones = {};
        if (rutaImg) {
          for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
            asignaciones[String(rowIdx)] = rutaImg;
          }
        }

        const payload = {
          rows: rows.map(r => {
            const row = {
              nombre_muestra: r.nombre_muestra,
              l: r.l, a: r.a, b: r.b,
              nombre_muestra_personalizado: nombrePersonalizado
            };
            Object.keys(r).forEach(k => { if (/^nm\d+$/.test(k)) row[k] = r[k]; });
            return row;
          }),
          asignaciones: asignaciones,
          archivo_origen: _loteCSVs[csvIdx]?.name ?? null
        };

        const res = await fetch(`${API}?endpoint=${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.error) {
          msgTexto.textContent = `Error en CSV #${csvIdx + 1}: ${data.mensaje}`;
          msgBox.className = 'lote-validacion error';
          btn.disabled = false;
          return;
        }
        totalInsertados += parseInt(data.mensaje) || rows.length;
      }

      msgTexto.textContent = `✓ ${totalInsertados} muestras importadas correctamente`;
      msgBox.className = 'lote-validacion ok';

      if (_loteContexto === 'pina') {
        await cargarKpisFrutas(); await cargarCardsFrutas(); await cargarTablaFrutas();
        await cargarDetalleColorFrutas(); await cargarReflectanciasFrutas(); await cargarArchivosFrutas();
      } else {
        await cargarKpisAromaticas(); await cargarCardsAromaticas(); await cargarTablaAromaticas();
        await cargarDetalleColorAromaticas(); await cargarReflectanciasAromaticas(); await cargarArchivosAromaticas();
      }

      _loteCSVs = [];
      _loteCSVRows = [];
      _loteImagenes = [];
      _loteAsignaciones = {};
      _loteNombresPersonalizados = [];
      setTimeout(cerrarModalLote, 1500);
      return;
    } catch (e) {
      console.error('Error en guardarLote (CSV):', e);
      msgTexto.textContent = 'Error de conexión con el servidor';
      msgBox.className = 'lote-validacion error';
      btn.disabled = false;
      return;
    }
  }

  // ── Flujo solo imágenes (asignar a muestras existentes sin imagen) ──
  msgTexto.textContent = 'Subiendo imágenes…';
  msgBox.className = 'lote-validacion';

  try {
    const endpointSubida = _loteContexto === 'pina'
      ? 'subir_imagenes_lote_fruta'
      : 'subir_imagenes_lote_aromaticas';

    const formData = new FormData();
    _loteImagenes.forEach(file => formData.append('imagenes[]', file));

    const resSubida = await fetch(`${API}?endpoint=${endpointSubida}`, {
      method: 'POST',
      body: formData
    });
    const dataSubida = await resSubida.json();

    if (dataSubida.error || !dataSubida.archivos) {
      msgTexto.textContent = dataSubida.mensaje || 'Error al subir imágenes';
      msgBox.className = 'lote-validacion error';
      btn.disabled = false;
      return;
    }

    msgTexto.textContent = 'Guardando asignaciones…';

    const asignaciones = Object.entries(_loteAsignaciones).map(([muestraIdx, imgIdx]) => ({
      id: _loteMuestras[parseInt(muestraIdx)].id,
      ruta_imagen: dataSubida.archivos[imgIdx].ruta
    }));

    const endpointGuardar = _loteContexto === 'pina'
      ? 'guardar_asignaciones_fruta'
      : 'guardar_asignaciones_aromaticas';

    const resGuardar = await fetch(`${API}?endpoint=${endpointGuardar}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(asignaciones)
    });
    const dataGuardar = await resGuardar.json();

    if (dataGuardar.error) {
      msgTexto.textContent = dataGuardar.mensaje || 'Error al guardar asignaciones';
      msgBox.className = 'lote-validacion error';
      btn.disabled = false;
      return;
    }

    msgTexto.textContent = `✓ ${dataGuardar.mensaje}`;
    msgBox.className = 'lote-validacion ok';

    if (_loteContexto === 'pina') {
      await cargarCardsFrutas();
      await cargarTablaFrutas();
    } else {
      await cargarCardsAromaticas();
      await cargarTablaAromaticas();
    }

    setTimeout(cerrarModalLote, 1500);
  } catch (e) {
    console.error('Error en guardarLote:', e);
    msgTexto.textContent = 'Error de conexión con el servidor';
    msgBox.className = 'lote-validacion error';
    btn.disabled = false;
  }
}

// ── CSV inline (individual) ─────────────────────────────────────
let _csvFileIndividual = null;

function seleccionarCSVIndividual(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  _csvFileIndividual = file;
  document.getElementById('csv-info-individual').textContent = `📄 ${file.name}`;
  document.getElementById('btn-quitar-csv-individual').style.display = 'inline-block';
  validarFormularioMuestra();
}

function quitarCSVIndividual() {
  _csvFileIndividual = null;
  document.getElementById('input-csv-individual').value = '';
  document.getElementById('csv-info-individual').textContent = 'Ningún archivo seleccionado';
  document.getElementById('btn-quitar-csv-individual').style.display = 'none';
  validarFormularioMuestra();
}

function quitarCSVLote(csvIdx) {
  _loteCSVs.splice(csvIdx, 1);
  _loteCSVRows.splice(csvIdx, 1);
  _loteNombresPersonalizados.splice(csvIdx, 1);
  // Reindexar asignaciones: eliminar la entrada de este CSV y restar índices mayores
  const nuevas = {};
  for (const [key, val] of Object.entries(_loteAsignaciones)) {
    const k = Number(key);
    if (k === csvIdx) continue;
    nuevas[String(k > csvIdx ? k - 1 : k)] = val;
  }
  _loteAsignaciones = nuevas;
  document.getElementById('input-csv-lote').value = '';
  actualizarLoteCSV();
}
let _loteCSVs = [];       // array de File objects
let _loteCSVRows = [];    // array de arrays: _loteCSVRows[csvIdx] = [{nombre_muestra, l, a, b}, ...]
let _loteNombresPersonalizados = [];  // array de strings: _loteNombresPersonalizados[csvIdx] = "Nombre de la muestra"

function parseCSVText(texto) {
  const lineas = texto.split('\n').filter(l => l.trim());
  if (lineas.length < 2) return null;
  const encabezados = lineas[0].split(',').map(h => h.trim().toLowerCase());
  const nameIdx = encabezados.indexOf('name');
  const lIdx = encabezados.indexOf('l');
  const aIdx = encabezados.indexOf('a');
  const bIdx = encabezados.indexOf('b');
  if (nameIdx === -1 || lIdx === -1 || aIdx === -1 || bIdx === -1) return null;
  // Detect nm columns (e.g. nm380, 380nm)
  const nmCols = {};
  encabezados.forEach((h, i) => {
    const m = h.match(/^nm(\d+)$/) || h.match(/^(\d+)nm$/);
    if (m) nmCols[i] = 'nm' + m[1];
  });
  const filas = [];
  for (let i = 1; i < lineas.length; i++) {
    const vals = lineas[i].split(',').map(v => v.trim());
    const nombre = vals[nameIdx] || '';
    if (!nombre) continue;
    const fila = { nombre_muestra: nombre, l: vals[lIdx], a: vals[aIdx], b: vals[bIdx] };
    for (const [colIdx, colName] of Object.entries(nmCols)) {
      fila[colName] = vals[parseInt(colIdx)] || '';
    }
    fila._raw = vals;
    fila._headers = encabezados;
    filas.push(fila);
  }
  return filas;
}

function seleccionarCSVLote(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  let pendientes = files.length;
  let archivosLeidos = 0;

  for (const file of files) {
    _loteCSVs.push(file);
    const reader = new FileReader();
    reader.fileName = file.name;
    reader.fileIndex = _loteCSVRows.length; // índice donde se insertarán las filas
    _loteCSVRows.push(null); // placeholder
    reader.onload = (e) => {
      const texto = e.target.result;
      const filas = parseCSVText(texto) || [];
      _loteCSVRows[reader.fileIndex] = filas;
      archivosLeidos++;
      if (archivosLeidos >= pendientes) {
        _loteCSVRows = _loteCSVRows.filter(r => r !== null);
        actualizarLoteCSV();
      }
    };
    reader.readAsText(file);
  }

  event.target.value = '';
}

function actualizarLoteCSV() {
  const totalArchivos = _loteCSVs.length;
  const totalFilas = _loteCSVRows.reduce((s, r) => s + r.length, 0);

  document.getElementById('csv-info-lote').textContent =
    totalArchivos > 0
      ? `📄 ${totalArchivos} archivo(s), ${totalFilas} muestra(s) en total`
      : 'Ningún archivo seleccionado';

  // Preview: encabezado por cada archivo
  const container = document.getElementById('csv-preview-lote-wrap');
  if (_loteCSVRows.length === 0) {
    container.style.display = 'none';
    _loteMuestras = [];
    renderAsignacionesLote();
    validarLote();
    return;
  }
  container.style.display = 'block';
  let html = '';
  _loteCSVRows.forEach((rows, csvIdx) => {
    const file = _loteCSVs[csvIdx];
    html += `<div style="font-weight:700;font-size:.82rem;padding:6px 0 4px;color:#374151;display:flex;align-items:center;justify-content:space-between;">
      <span>${escapeHtml(file.name)} (${rows.length} muestras)</span>
      <button class="csv-remove-btn" onclick="quitarCSVLote(${csvIdx})" title="Quitar CSV">✕</button>
    </div>`;
    const mostrar = Math.min(3, rows.length);
    if (mostrar > 0) {
      html += `<table class="csv-preview-tabla"><thead><tr><th>#</th><th>Muestra</th><th>L</th><th>a</th><th>b</th></tr></thead><tbody>`;
      for (let i = 0; i < mostrar; i++) {
        const r = rows[i];
        html += `<tr><td>${i + 1}</td><td>${escapeHtml(r.nombre_muestra)}</td><td>${escapeHtml(r.l)}</td><td>${escapeHtml(r.a)}</td><td>${escapeHtml(r.b)}</td></tr>`;
      }
      if (rows.length > mostrar) {
        html += `<tr><td colspan="5" style="text-align:center;color:#9ca3af;font-size:.78rem;">… y ${rows.length - mostrar} más</td></tr>`;
      }
      html += '</tbody></table>';
    }
  });
  container.innerHTML = html;

  // 1 entrada por archivo CSV en _loteMuestras
  _loteMuestras = _loteCSVs.map((file, idx) => {
    if (!_loteNombresPersonalizados[idx]) _loteNombresPersonalizados[idx] = '';
    return {
      nombre_muestra: `📄 ${file.name} (${_loteCSVRows[idx].length} muestras)`,
      csvIdx: idx
    };
  });
  renderAsignacionesLote();
  validarLote();
}

// ── Datos en memoria ──────────────────────────────────────────
let _rowsFrutas        = [];
let _rowsAromaticas   = [];
let _mostrarSoloAlertasFruta = false;
let _mostrarSoloAlertasAro = false;
let _mostrarSoloAlertasAnalizarFruta = false;
let _mostrarSoloAlertasAnalizarAro = false;
let _rowsColorFrutas   = [];
let _rowsColorAro     = [];
let _rowsReflFrutas    = [];
let _rowsReflAro      = [];

// Rangos nm para reflectancias por zona (piñas 380-780, aromáticas 390-710)
const ZONAS_REFL_PINAS = {
  uv:      Array.from({ length: 6  }, (_, i) => 380 + i * 10),  // 380–430
  visible: Array.from({ length: 19 }, (_, i) => 440 + i * 10),  // 440–620
  rojo:    Array.from({ length: 16 }, (_, i) => 630 + i * 10),  // 630–780
};
const ZONAS_REFL_ARO = {
  uv:      Array.from({ length: 5  }, (_, i) => 390 + i * 10),  // 390–430
  visible: Array.from({ length: 19 }, (_, i) => 440 + i * 10),  // 440–620
  rojo:    Array.from({ length: 9  }, (_, i) => 630 + i * 10),  // 630–710
};

// ── KPIs Piñas ────────────────────────────────────────────────
async function cargarKpisFrutas() {
  try {
    const res  = await fetch(API + '?endpoint=kpis_frutas');
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

  const estados = await cargarEstadosFruta(frutaId);
  const segmentos = contarPorEstado(_rowsFrutas, estados);
  const total = segmentos.reduce((s, e) => s + e.count, 0);

  let html = `<article class="kpi-card">
    <div class="kpi-icon blue">📊</div>
    <div>
      <span class="kpi-label">Total Analizadas</span>
      <strong class="kpi-value">${fmt(total)}</strong>
    </div>
  </article>`;

  segmentos.forEach(seg => {
    const e = estados.find(x => x.numero === seg.numero);
    const icono = emojiEstadoFruta(e);
    html += `<article class="kpi-card">
      <div class="kpi-icon" style="background:${seg.color}">${icono}</div>
      <div>
        <span class="kpi-label">${seg.nombre}</span>
        <strong class="kpi-value">${fmt(seg.count)}</strong>
      </div>
    </article>`;
  });

  grid.innerHTML = html;
}

// ── Tabla Piñas ───────────────────────────────────────────────
async function cargarTablaFrutas() {
  try {
    const res  = await fetch(API + '?endpoint=tabla_frutas&limite=9999');
    const rows = await res.json();
    if (!Array.isArray(rows)) { console.warn('Tabla piñas inválida'); return; }
    _rowsFrutas = rows;
    poblarSelectNombresMuestra('filter-frutas-nombre-muestra', rows);
    poblarSelectNombresMuestra('filter-analizar-frutas-nombre-muestra', rows);
    poblarSelectNombresMuestra('fd3-fruta-nombre', rows);
    const frutas = [...new Set(rows.map(r => r.nombre_muestra).filter(Boolean))].sort();
    const selFruta = document.getElementById('fd3-fruta');
    if (selFruta) {
      selFruta.innerHTML = '<option value="">Por Fruta</option>' +
        frutas.map(f => '<option value="' + escapeHtml(f) + '">' + escapeHtml(formatearNombreMuestra(f)) + '</option>').join('');
    }
    renderTablaFrutas(rows);
    renderAnalizarCardsFrutas(rows);
    actualizarDonutDinamicoFruta();
    actualizarDonutConfianzaFruta();
  } catch (e) { console.error('Error tabla piñas:', e); }
}

function renderTablaFrutas(rows) {
  const tbody = document.getElementById('tbody-frutas');
  if (!tbody) return;
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
    return `<tr>
      <td>${escapeHtml(formatearFechaCorta(r.fecha))}</td>
      <td title="${escapeHtml(nombreMuestra)}">${escapeHtml(nombreMuestra)}</td>
      <td>${fotoHtml}</td>
      <td>${fmtDecimal(nivel, 1)} / 10</td>
      <td>${estadoPorNivelFruta(nivel)}</td>
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
  let filtradas = _rowsFrutas.filter(r => {
    const nombre = (r.nombre_muestra ?? '').toLowerCase();
    const nivel  = Number.parseFloat(r.nivel_maduracion);
    const conf   = Number(r.confianza);
    if (busqueda && !nombre.includes(busqueda)) return false;
    if (nombreMuestra && formatearNombreMuestra(r.nombre_muestra) !== nombreMuestra) return false;
    if (estado   && estadoTextoFruta(nivel) !== estado) return false;
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
    const res  = await fetch(API + '?endpoint=tabla_frutas&limite=9999');
    const rows = await res.json();
    if (!Array.isArray(rows)) return;
    const container = document.getElementById('cards-frutas');
    if (!container) return;
    container.innerHTML = rows.map(r => {
      const nivel      = Number.parseFloat(r.nivel_maduracion);
      const estadoHTML = estadoPorNivelFruta(nivel);
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
        onclick="abrirModalIndividual('fruta',{archivo_origen:this.dataset.archivo,fruta_id:this.dataset.frutaId,nombre_muestra:this.dataset.nombre})"
        style="cursor:pointer">
        ${fotoHtml}
        <div class="fruit-head">
          <div>
            <span class="card-label">Nombre de la muestra:</span>
            <strong>${escapeHtml(displayName)}</strong>
          </div>
          ${estadoHTML}
        </div>
        <div class="level-block">
          <span>Nivel de maduración</span>
          <strong>${fmtDecimal(nivel, 1)} / 10</strong>
          <div class="progress"><span class="fill ${fillClass}" style="width:${porcentaje}%"></span></div>
        </div>
        ${alertaHtml}
        <div class="mini-stats">
          <div><span>Confianza del modelo</span><strong>${escapeHtml(confianza)}</strong></div>
        </div>
      </div>`;
    }).join('');
  } catch (e) { console.error('Error cards piñas:', e); }
}

// ── KPIs Aromáticas ───────────────────────────────────────────
async function cargarKpisAromaticas() {
  try {
    const res  = await fetch(API + '?endpoint=kpis_aromaticas');
    const data = await res.json();
    if (data.error) { console.warn('KPIs aromáticas:', data.mensaje); return; }

    document.getElementById('kpi-aro-total').textContent   = fmt(data.total);
    document.getElementById('kpi-aro-optimas').textContent = fmt(data.optimas);
    document.getElementById('kpi-aro-proceso').textContent = fmt(data.en_proceso);
    document.getElementById('kpi-aro-bajas').textContent   = fmt(data.bajas);
    window.totalAromaticas = Number(data.total) || 0;

    const total = Number(data.total) || 0;
    const opt = Number(data.optimas), proc = Number(data.en_proceso), baj = Number(data.bajas);
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

// ── Tabla Aromáticas ──────────────────────────────────────────
async function cargarTablaAromaticas() {
  try {
    const res  = await fetch(API + '?endpoint=tabla_aromaticas&limite=9999');
    const rows = await res.json();
    if (!Array.isArray(rows)) { console.warn('Tabla aromáticas inválida'); return; }
    _rowsAromaticas = rows;
    poblarSelectNombresMuestra('filter-aro-nombre-muestra', rows);
    poblarSelectNombresMuestra('filter-analizar-aro-nombre-muestra', rows);
    poblarSelectNombresMuestra('fd3-aro-nombre', rows);
    renderTablaAromaticas(rows);
    renderAnalizarCardsAromaticas(rows);
    actualizarDonutDinamicoAro();
  } catch (e) { console.error('Error tabla aromáticas:', e); }
}

function renderTablaAromaticas(rows) {
  const tbody = document.getElementById('tbody-aromaticas');
  if (!tbody) return;
  const emoji    = { 'Naranjo': '🍊', 'Hierbabuena': '🌿', 'Eucalipto': '🌳' };
  const cssClass = { 'Naranjo': 'aromatic-a', 'Hierbabuena': 'aromatic-b', 'Eucalipto': 'aromatic-c' };
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
    return `<tr>
      <td>${escapeHtml(formatearFechaCorta(r.fecha))}</td>
      <td title="${escapeHtml(nombreMuestra)}">${escapeHtml(nombreMuestra)}</td>
      <td>${fotoHtml}</td>
      <td>${fmtDecimal(nivel, 1)} / 10</td>
      <td>${estadoPorNivelAromatica(nivel)}</td>
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
  let filtradas = _rowsAromaticas.filter(r => {
    const nombre = (r.nombre_muestra ?? '').toLowerCase();
    const nivel  = Number.parseFloat(r.nivel_maduracion);
    const conf   = Number(r.confianza);
    if (busqueda && !nombre.includes(busqueda)) return false;
    if (nombreMuestra && formatearNombreMuestra(r.nombre_muestra) !== nombreMuestra) return false;
    if (estado   && estadoTextoAromatica(nivel) !== estado) return false;
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

// ── Cards Aromáticas ──────────────────────────────────────────
async function cargarCardsAromaticas() {
  try {
    const res  = await fetch(API + '?endpoint=tabla_aromaticas&limite=9999');
    const rows = await res.json();
    if (!Array.isArray(rows)) return;
    const container = document.getElementById('cards-aromaticas');
    if (!container) return;
    const emoji    = { 'Naranjo': '🍊', 'Hierbabuena': '🌿', 'Eucalipto': '🌳' };
    const cssClass = { 'Naranjo': 'aromatic-a', 'Hierbabuena': 'aromatic-b', 'Eucalipto': 'aromatic-c' };
    container.innerHTML = rows.map(r => {
      const planta     = Object.keys(emoji).find(k => (r.nombre_muestra ?? '').includes(k)) ?? '';
      const ico        = emoji[planta]    ?? '🌿';
      const cls        = cssClass[planta] ?? 'aromatic-a';
      const nivel      = Number.parseFloat(r.nivel_maduracion);
      const estadoHTML = estadoPorNivelAromatica(nivel);
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
        onclick="abrirModalIndividual('aromatica',{archivo_origen:this.dataset.archivo,fruta_id:this.dataset.frutaId,nombre_muestra:this.dataset.nombre})"
        style="cursor:pointer">
        ${fotoHtml}
        <div class="fruit-head">
          <div>
            <span class="card-label">Nombre de la muestra:</span>
            <strong>${escapeHtml(displayName)}</strong>
          </div>
          ${estadoHTML}
        </div>
        <div class="level-block">
          <span>Nivel de pigmentación</span>
          <strong>${fmtDecimal(nivel, 1)} / 10</strong>
          <div class="progress"><span class="fill ${fillClass}" style="width:${porcentaje}%"></span></div>
        </div>
        ${alertaHtml}
        <div class="mini-stats">
          <div><span>Confianza del modelo</span><strong>${escapeHtml(confianza)}</strong></div>
        </div>
      </div>`;
    }).join('');
  } catch (e) { console.error('Error cards aromáticas:', e); }
}

// ── Parámetros Colorimétricos Piñas ──────────────────────────
async function cargarDetalleColorFrutas() {
  try {
    const res  = await fetch(API + '?endpoint=detalle_color_frutas&limite=9999');
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

// ── Parámetros Colorimétricos Aromáticas ─────────────────────
async function cargarDetalleColorAromaticas() {
  try {
    const res  = await fetch(API + '?endpoint=detalle_color_aromaticas&limite=9999');
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

// ── Reflectancias Piñas ───────────────────────────────────────
async function cargarReflectanciasFrutas() {
  try {
    const res  = await fetch(API + '?endpoint=reflectancias_frutas&limite=9999');
    const rows = await res.json();
    if (!Array.isArray(rows)) return;
    _rowsReflFrutas = rows;
    poblarSelectNombresMuestra('filter-refl-frutas-nombre-muestra', rows);
    renderReflFrutas(rows, null);
  } catch (e) { console.error('Error reflectancias piñas:', e); }
}

// columnas visibles según zona (null = todas)
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
    <th>Nombre Muestra</th>
    ${cols.map(nm => `<th>${nm}</th>`).join('')}
  </tr>`;

  tbody.innerHTML = rows.map(r => `<tr>
    <td>${escapeHtml(formatearNombreMuestra(r.nombre_muestra) || '–')}</td>
    ${cols.map(nm => `<td>${escapeHtml(r[`nm${nm}`] ?? '–')}</td>`).join('')}
  </tr>`).join('');
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

// ── Reflectancias Aromáticas ──────────────────────────────────
async function cargarReflectanciasAromaticas() {
  try {
    const res  = await fetch(API + '?endpoint=reflectancias_aromaticas&limite=9999');
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
    <th>Nombre Muestra</th>
    ${cols.map(nm => `<th>${nm}</th>`).join('')}
  </tr>`;

  tbody.innerHTML = rows.map(r => `<tr>
    <td>${escapeHtml(formatearNombreMuestra(r.nombre_muestra) || '–')}</td>
    ${cols.map(nm => `<td>${escapeHtml(r[`nm${nm}`] ?? '–')}</td>`).join('')}
  </tr>`).join('');
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

// ── Archivos Piñas ────────────────────────────────────────────
async function cargarArchivosFrutas() {
  try {
    const res  = await fetch(API + '?endpoint=archivos_frutas&limite=9999');
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

// ── Archivos Aromáticas ───────────────────────────────────────
async function cargarArchivosAromaticas() {
  try {
    const res  = await fetch(API + '?endpoint=archivos_aromaticas&limite=9999');
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

// ── Eliminar Muestras ─────────────────────────────────────────
let _eliminarContexto = null;
let _eliminarSeleccion = new Set();
let _totalCardsEliminar = 0;

function abrirModalEliminar(contexto) {
  _eliminarContexto = contexto;
  _eliminarSeleccion.clear();
  _totalCardsEliminar = 0;

  const titulo = contexto === 'fruta' ? 'Seleccionar muestras de piña a eliminar' : 'Seleccionar muestras de aromáticas a eliminar';
  document.getElementById('modal-eliminar-titulo').textContent = titulo;
  document.getElementById('modal-eliminar-cards').innerHTML = '<p class="lote-empty">Cargando muestras…</p>';
  document.getElementById('modal-eliminar-msg').textContent = '';
  document.getElementById('modal-eliminar-msg').className = 'modal-msg';
  document.getElementById('btn-eliminar-guardar').disabled = true;
  const btnSel = document.getElementById('btn-seleccionar-todas');
  if (btnSel) { btnSel.style.display = 'none'; btnSel.textContent = 'Seleccionar todas'; }
  const totalMsg = document.getElementById('eliminar-total-msg');
  if (totalMsg) totalMsg.textContent = '';

  document.getElementById('modal-eliminar').style.display = 'flex';

  cargarCardsEliminar(contexto);
}

function cerrarModalEliminar() {
  document.getElementById('modal-eliminar').style.display = 'none';
  document.getElementById('modal-confirmar-eliminar').style.display = 'none';
  _eliminarSeleccion.clear();
  _totalCardsEliminar = 0;
  const btn = document.querySelector('#modal-confirmar-eliminar .btn-danger');
  if (btn) { btn.disabled = false; btn.textContent = '🗑️ Eliminar'; }
}

async function cargarCardsEliminar(contexto) {
  const endpoint = contexto === 'fruta' ? 'tabla_frutas' : 'tabla_aromaticas';
  try {
    const url = `${API}?endpoint=${endpoint}&limite=9999`
      + (_proveedorIdFiltro ? `&proveedor_id=${_proveedorIdFiltro}` : '')
      + (contexto !== 'fruta' && typeof _frutaIdAro !== 'undefined' && _frutaIdAro ? `&fruta_id=${_frutaIdAro}` : '');
    const res = await fetch(url);
    const rows = await res.json();
    if (!Array.isArray(rows)) {
      document.getElementById('modal-eliminar-cards').innerHTML = '<p class="lote-empty">Error al cargar muestras</p>';
      return;
    }
    const esFruta = contexto === 'fruta';
    const frutaId = esFruta ? (rows.length > 0 ? rows[0].fruta_id : null) : (typeof _frutaIdAro !== 'undefined' && _frutaIdAro ? _frutaIdAro : null);
    if (frutaId && typeof cargarEstadosFruta === 'function') {
      await cargarEstadosFruta(frutaId, esFruta ? 'frutas' : 'aromaticas');
    }
    renderCardsEliminar(rows, contexto);
  } catch (e) {
    console.error('Error cargando muestras para eliminar:', e);
    document.getElementById('modal-eliminar-cards').innerHTML = '<p class="lote-empty">Error de conexión</p>';
  }
}

function renderCardsEliminar(rows, contexto) {
  const container = document.getElementById('modal-eliminar-cards');
  if (!rows || rows.length === 0) {
    container.innerHTML = '<p class="lote-empty">No hay muestras para mostrar</p>';
    return;
  }

  const esFruta = contexto === 'fruta';
  _totalCardsEliminar = rows.length;
  const btnSel = document.getElementById('btn-seleccionar-todas');
  if (btnSel) {
    btnSel.style.display = _totalCardsEliminar > 0 ? 'inline-block' : 'none';
    btnSel.textContent = 'Seleccionar todas';
  }
  const totalMsg = document.getElementById('eliminar-total-msg');
  if (totalMsg) totalMsg.textContent = `${_totalCardsEliminar} muestra(s)`;
  container.innerHTML = rows.map(r => {
    const nivel = Number.parseFloat(r.nivel_maduracion);
    const displayName = formatearNombreMuestra(r.nombre_muestra) || '–';
    const fotoHtml = r.imagen_muestra
      ? `<div class="fruit-visual"><img src="${escapeHtml(IMG_BASE + r.imagen_muestra)}" alt=""></div>`
      : `<div class="fruit-visual ${esFruta ? 'pineapple-a' : 'aromatic-a'}">${esFruta ? '🍍' : '🌿'}</div>`;
    const estadoHTML = esFruta ? estadoPorNivelFruta(nivel) : estadoPorNivelAromatica(nivel);
    const confianza = Number.isFinite(Number(r.confianza)) ? `${fmt(r.confianza)}%` : '–';
    const fillClass = nivel >= 7 ? 'green' : nivel >= 4 ? 'yellow' : 'red';
    const porcentaje = Number.isFinite(nivel) ? Math.max(0, Math.min(100, nivel * 10)) : 0;

    return `<div class="eliminar-card" onclick="toggleEliminarCard(this, ${escapeHtml(r.id)})">
      <input type="checkbox" name="eliminar-check" value="${escapeHtml(r.id)}" style="display:none;">
      <div class="fruit-card" style="margin:0;width:100%;max-width:none;">
        ${fotoHtml}
        <div class="fruit-head">
          <div>
            <span class="card-label">Nombre de la muestra:</span>
            <strong>${escapeHtml(displayName)}</strong>
          </div>
          ${estadoHTML}
        </div>
        <div class="level-block">
          <span>${esFruta ? 'Nivel de maduración' : 'Nivel de pigmentación'}</span>
          <strong>${fmtDecimal(nivel, 1)} / 10</strong>
          <div class="progress"><span class="fill ${fillClass}" style="width:${porcentaje}%"></span></div>
        </div>
        <div class="mini-stats">
          <div><span>Confianza del modelo</span><strong>${escapeHtml(confianza)}</strong></div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function toggleSeleccionarTodas() {
  const btn = document.getElementById('btn-seleccionar-todas');
  const todas = btn.textContent === 'Seleccionar todas';
  document.querySelectorAll('#modal-eliminar-cards .eliminar-card').forEach(card => {
    const cb = card.querySelector('input[type="checkbox"]');
    if (cb) { cb.checked = todas; }
    card.classList.toggle('checked', todas);
  });
  btn.textContent = todas ? 'Deseleccionar todas' : 'Seleccionar todas';
  actualizarSeleccionEliminar();
}

function toggleEliminarCard(el, id) {
  const cb = el.querySelector('input[type="checkbox"]');
  cb.checked = !cb.checked;
  el.classList.toggle('checked', cb.checked);
  const btnSel = document.getElementById('btn-seleccionar-todas');
  if (btnSel && _totalCardsEliminar > 0) {
    const todasChecked = document.querySelectorAll('#modal-eliminar-cards .eliminar-card.checked').length === _totalCardsEliminar;
    btnSel.textContent = todasChecked ? 'Deseleccionar todas' : 'Seleccionar todas';
  }
  actualizarSeleccionEliminar();
}

function actualizarSeleccionEliminar() {
  _eliminarSeleccion.clear();
  document.querySelectorAll('#modal-eliminar-cards .eliminar-card.checked').forEach(card => {
    const cb = card.querySelector('input[type="checkbox"]');
    if (cb) _eliminarSeleccion.add(Number(cb.value));
  });
  const btn = document.getElementById('btn-eliminar-guardar');
  btn.disabled = _eliminarSeleccion.size === 0;
  const msg = document.getElementById('modal-eliminar-msg');
  const n = _eliminarSeleccion.size;
  if (n > 0) {
    msg.textContent = `${n} de ${_totalCardsEliminar} muestra${n !== 1 ? 's' : ''} seleccionada${n !== 1 ? 's' : ''}`;
    msg.className = 'modal-msg';
  } else {
    msg.textContent = '';
    msg.className = 'modal-msg';
  }
}

function onChangeEliminarCheck() {
  actualizarSeleccionEliminar();
}

function confirmarEliminacion() {
  if (_eliminarSeleccion.size === 0) return;
  document.getElementById('confirmar-cantidad').textContent = _eliminarSeleccion.size;
  document.getElementById('modal-eliminar').style.display = 'none';
  document.getElementById('modal-confirmar-eliminar').style.display = 'flex';
}

function volverAtras() {
  document.getElementById('modal-confirmar-eliminar').style.display = 'none';
  document.getElementById('modal-eliminar').style.display = 'flex';
}

async function ejecutarEliminacion() {
  if (_eliminarSeleccion.size === 0) return;

  const btn = document.querySelector('#modal-confirmar-eliminar .btn-danger');
  btn.disabled = true;
  btn.textContent = 'Eliminando…';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const endpoint = _eliminarContexto === 'fruta' ? 'eliminar_muestras_fruta' : 'eliminar_muestras_aromaticas';
    const res = await fetch(`${API}?endpoint=${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(_eliminarSeleccion) }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await res.json();

    if (data.error) {
      alert('Error: ' + (data.mensaje || 'No se pudieron eliminar las muestras'));
      btn.disabled = false;
      btn.textContent = '🗑️ Eliminar';
      return;
    }

    cerrarModalEliminar();

    if (_eliminarContexto === 'fruta') {
      await cargarKpisFrutas(); await cargarCardsFrutas(); await cargarTablaFrutas();
      await cargarDetalleColorFrutas(); await cargarReflectanciasFrutas(); await cargarArchivosFrutas();
    } else {
      await cargarKpisAromaticas(); await cargarCardsAromaticas(); await cargarTablaAromaticas();
      await cargarDetalleColorAromaticas(); await cargarReflectanciasAromaticas(); await cargarArchivosAromaticas();
    }
  } catch (e) {
    clearTimeout(timeoutId);
    console.error('Error eliminando muestras:', e);
    if (e.name === 'AbortError') {
      alert('La solicitud tardó demasiado. Intenta de nuevo.');
    } else {
      alert('Error de conexión con el servidor');
    }
    btn.disabled = false;
    btn.textContent = '🗑️ Eliminar';
  }
}

// ── Selector de Fruta (dashboard) ──────────────────────────────
let _frutaDashboardActiva = null;

async function cargarSelectorFrutas() {
  try {
    const res = await fetch(API + '?endpoint=frutas_con_datos');
    const frutas = await res.json();
    const ul = document.getElementById('dropdown-frutas');
    if (!ul) return;
    ul.innerHTML = '';
    if (!Array.isArray(frutas) || frutas.length === 0) {
      ul.innerHTML = '<li class="dropdown-empty">No hay datos</li>';
      return;
    }
    frutas.forEach(f => {
      const li = document.createElement('li');
      li.innerHTML = `${(f.icono && f.icono !== '??' ? f.icono : '🍍')} ${escapeHtml(f.nombre)} <small>(${f.total_registros})</small>`;
      li.dataset.id = f.id;
      li.dataset.nombre = f.nombre;
      li.dataset.icono = (f.icono && f.icono !== '??' ? f.icono : '🍍');
      li.addEventListener('click', () => cambiarFrutaDashboard(f));
      ul.appendChild(li);
    });
    // Select first if none active
    if (!_frutaDashboardActiva && frutas.length > 0) {
      cambiarFrutaDashboard(frutas[0]);
    }
  } catch (e) {
    console.error('Error cargando selector frutas:', e);
  }
}

function cambiarFrutaDashboard(fruta) {
  _frutaDashboardActiva = fruta;
  const iconoEl = document.getElementById('selector-fruta-icono');
  const nombreEl = document.getElementById('selector-fruta-nombre');
      if (iconoEl) iconoEl.textContent = (fruta.icono && fruta.icono !== '??' ? fruta.icono : '🍍');
  if (nombreEl) nombreEl.textContent = fruta.nombre;
  document.getElementById('dropdown-frutas')?.setAttribute('hidden', '');
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
}

// ── inicializarDashboard (called from wizard) ──────────────────
async function inicializarDashboard(sesion) {
  if (sesion) {
    const fruta = sesion.fruta;
    if (fruta) {
      const iconoEl = document.getElementById('selector-fruta-icono');
      const nombreEl = document.getElementById('selector-fruta-nombre');
  if (iconoEl) iconoEl.textContent = (fruta.icono && fruta.icono !== '??' ? fruta.icono : '🍍');
      if (nombreEl) nombreEl.textContent = fruta.nombre;
    }
  }
  await cargarSelectorFrutas();
}

// ── Config Panel: Tabs ─────────────────────────────────────────
function initConfigTabs() {
  document.querySelectorAll('.config-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.config-panel').forEach(p => p.classList.add('hidden'));
      tab.classList.add('active');
      const panel = document.getElementById('tab-' + tab.dataset.tab);
      if (panel) panel.classList.remove('hidden');
      if (tab.dataset.tab === 'proveedores') cargarTablaProveedores();
      if (tab.dataset.tab === 'frutas') cargarConfigFrutas();
      if (tab.dataset.tab === 'aromaticas') cargarConfigAromaticas();
    });
  });
}

// ── Config Panel: Proveedores CRUD ─────────────────────────────
async function cargarTablaProveedores() {
  try {
    const res = await fetch(API + '?endpoint=proveedores_listar');
    const data = await res.json();
    const tbody = document.querySelector('#tabla-proveedores tbody');
    if (!tbody) return;
    tbody.innerHTML = (Array.isArray(data) ? data : []).map(p => `
      <tr>
        <td style="width:36px;text-align:center;"><input type="checkbox" class="check-proveedor" value="${escapeHtml(p.id)}" onchange="actualizarBtnEliminarProveedores()"></td>
        <td>${escapeHtml(p.nombre)}</td>
        <td>${escapeHtml(p.nit ?? '–')}</td>
        <td>${escapeHtml(p.contacto ?? '–')}</td>
        <td>${escapeHtml(p.ciudad ?? '–')}</td>
        <td class="acciones">
          <button onclick="abrirModalProveedor(${p.id})" title="Editar">✏️</button>
          <button onclick="eliminarProveedor(${p.id})" title="Eliminar" class="btn-danger-sm">🗑️</button>
        </td>
      </tr>
    `).join('');
    document.getElementById('check-proveedores-all').checked = false;
    actualizarBtnEliminarProveedores();
  } catch (e) { console.error('Error cargando proveedores:', e); }
}

async function abrirModalProveedor(id) {
  const overlay = document.getElementById('modal-proveedor');
  if (!overlay) return;
  overlay.style.display = 'flex';
  const titulo = document.getElementById('modal-proveedor-titulo');
  const nombre = document.getElementById('input-proveedor-nombre');
  const nit = document.getElementById('input-proveedor-nit');
  const contacto = document.getElementById('input-proveedor-contacto');
  const telefono = document.getElementById('input-proveedor-telefono');
  const ciudad = document.getElementById('input-proveedor-ciudad');
  const notas = document.getElementById('input-proveedor-notas');
  const idInput = document.getElementById('input-proveedor-id');

  if (!id || id === 'null' || id === '0') {
    titulo.textContent = 'Nuevo Proveedor';
    nombre.value = ''; nit.value = ''; contacto.value = ''; telefono.value = ''; ciudad.value = ''; notas.value = '';
    idInput.value = '';
    overlay.style.display = 'flex';
    return;
  }

  try {
    const res = await fetch(API + '?endpoint=proveedores_listar');
    const data = await res.json();
    const p = (Array.isArray(data) ? data : []).find(x => x.id == id);
    if (!p) return;
    titulo.textContent = 'Editar Proveedor';
    nombre.value = p.nombre || '';
    nit.value = p.nit || '';
    contacto.value = p.contacto || '';
    telefono.value = p.telefono || '';
    ciudad.value = p.ciudad || '';
    notas.value = p.notas || '';
    idInput.value = p.id;
  } catch (e) { console.error('Error cargando proveedor:', e); }
}

function cerrarModalProveedor() {
  const el = document.getElementById('modal-proveedor');
  if (el) el.style.display = 'none';
}

async function guardarProveedor() {
  const id = document.getElementById('input-proveedor-id')?.value || '';
  const nombre = document.getElementById('input-proveedor-nombre')?.value?.trim();
  if (!nombre) { alert('El nombre es obligatorio'); return; }
  const payload = {
    nombre,
    nit: document.getElementById('input-proveedor-nit')?.value?.trim() || null,
    contacto: document.getElementById('input-proveedor-contacto')?.value?.trim() || null,
    telefono: document.getElementById('input-proveedor-telefono')?.value?.trim() || null,
    ciudad: document.getElementById('input-proveedor-ciudad')?.value?.trim() || null,
    notas: document.getElementById('input-proveedor-notas')?.value?.trim() || null,
  };
  if (id) { payload.id = parseInt(id, 10); }
  const endpoint = id ? 'proveedores_editar' : 'proveedores_crear';
  try {
    const res = await fetch(API + '?endpoint=' + endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.error) { alert('Error: ' + (data.mensaje || '')); return; }
    cerrarModalProveedor();
    await cargarTablaProveedores();
    await cargarProveedores();
  } catch (e) { console.error('Error guardando proveedor:', e); alert('Error de conexión'); }
}

async function eliminarProveedor(id) {
  if (!confirm('¿Eliminar este proveedor?')) return;
  try {
    const res = await fetch(API + '?endpoint=proveedores_eliminar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (data.error) { alert('Error: ' + (data.mensaje || '')); return; }
    await cargarTablaProveedores();
    await cargarProveedores();
  } catch (e) { console.error('Error eliminando proveedor:', e); }
}

function actualizarBtnEliminarProveedores() {
  const checks = document.querySelectorAll('.check-proveedor:checked');
  const btn = document.getElementById('btn-eliminar-proveedores');
  if (btn) btn.disabled = checks.length === 0;
}

function toggleTodosProveedores(el) {
  document.querySelectorAll('.check-proveedor').forEach(c => c.checked = el.checked);
  actualizarBtnEliminarProveedores();
}

async function eliminarProveedoresSeleccionados() {
  const checks = document.querySelectorAll('.check-proveedor:checked');
  const ids = Array.from(checks).map(c => parseInt(c.value, 10));
  if (ids.length === 0) return;
  if (!confirm(`¿Eliminar ${ids.length} proveedor(es) seleccionado(s)?`)) return;
  try {
    for (const id of ids) {
      const res = await fetch(API + '?endpoint=proveedores_eliminar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.error) { console.error('Error eliminando proveedor', id, data.mensaje); }
    }
    await cargarTablaProveedores();
    await cargarProveedores();
  } catch (e) { console.error('Error eliminando proveedores:', e); alert('Error de conexión'); }
}

// ── Config Panel: Frutas / Aromáticas ──────────────────────────
async function cargarConfigFrutas() {
  try {
    const res = await fetch(API + '?endpoint=config_frutas_listar');
    const data = await res.json();
    const grid = document.getElementById('grid-config-frutas');
    if (!grid) return;
    grid.innerHTML = (Array.isArray(data) ? data : []).map(f => `
      <div class="config-item-card">
        <span class="item-icono">${(f.icono && f.icono !== '??' ? f.icono : '🍍')}</span>
        <span class="item-nombre" title="${escapeHtml(f.nombre)}">${escapeHtml(f.nombre)}</span>
        ${f.coming_soon == 1 ? '<span class="badge-soon">En Desarrollo</span>' : '<span class="badge-active">Activo</span>'}
      </div>
    `).join('');
  } catch (e) { console.error('Error cargando frutas:', e); }
}

async function cargarConfigAromaticas() {
  try {
    const res = await fetch(API + '?endpoint=config_aromaticas_listar');
    const data = await res.json();
    const grid = document.getElementById('grid-config-aromaticas');
    if (!grid) return;
    grid.innerHTML = (Array.isArray(data) ? data : []).map(f => `
      <div class="config-item-card">
        <span class="item-icono">${(f.icono && f.icono !== '??' ? f.icono : '🌿')}</span>
        <span class="item-nombre" title="${escapeHtml(f.nombre)}">${escapeHtml(f.nombre)}</span>
        ${f.coming_soon == 1 ? '<span class="badge-soon">En Desarrollo</span>' : '<span class="badge-active">Activo</span>'}
      </div>
    `).join('');
  } catch (e) { console.error('Error cargando aromáticas:', e); }
}

// ── Refresh all donuts with N-segment dynamic estados ──
async function refrescarDonutsConEstados() {
  let frutaId = _rowsFrutas.length > 0 ? _rowsFrutas[0].fruta_id : null;
  let frutaIdAro  = _rowsAromaticas.length > 0 ? _rowsAromaticas[0].fruta_id : null;
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

  // Piña donuts
  if (frutaId) {
    const estados = await cargarEstadosFruta(frutaId);
    if (estados.length > 0) {
      const segmentos = contarPorEstado(_rowsFrutas, estados);
      const total = segmentos.reduce((s, e) => s + e.count, 0);

      // Static Piña donuts
      document.querySelectorAll('.donut-fruta-duplicado:not(.donut-fruta-dinamico)').forEach(c => {
        const d = c.querySelector('.donut-fruta');
        if (d) actualizarDonutN(d, segmentos, total);
        c.querySelector('.donut-total').textContent = fmt(total);
        const lg = c.querySelector('.legend');
        if (lg) renderLegend(lg, segmentos, total);
      });

      // Dynamic Piña donut (Filtro 3)
      if (typeof actualizarDonutDinamicoFruta === 'function') actualizarDonutDinamicoFruta();
    }
  }

  // Aromáticas donuts
  if (frutaIdAro) {
    const estados = await cargarEstadosFruta(frutaIdAro);
    if (estados.length > 0) {
      const segmentos = contarPorEstado(_rowsAromaticas, estados);
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

// ── Cargar todo el dashboard (después de importación inicial) ──
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
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Cargar solo KPIs para detectar si hay datos
  await cargarKpisFrutas();
  await cargarKpisAromaticas();

  const hayDatos = (window.totalFrutas || 0) > 0 || (window.totalAromaticas || 0) > 0;

  if (!hayDatos) {
    // DB vacía → mostrar wizard modal popup (sin botón de cerrar)
    if (typeof volverAlWizard === 'function') {
      volverAlWizard(true);
    }
  } else {
    // DB con datos → carga completa
    await cargarTodoElDashboard();
  }

  // Selector de fruta dropdown toggle (una sola vez)
  const btnSelector = document.getElementById('btn-selector-fruta');
  const dropdown = document.getElementById('dropdown-frutas');
  if (btnSelector && dropdown) {
    btnSelector.addEventListener('click', (e) => {
      e.stopPropagation();
      const hidden = dropdown.hasAttribute('hidden');
      dropdown.toggleAttribute('hidden');
      if (hidden) cargarSelectorFrutas();
    });
    document.addEventListener('click', () => dropdown.setAttribute('hidden', ''));
    dropdown.addEventListener('click', (e) => e.stopPropagation());
  }

  // Ensure dashboard shows when clicking frutas/aromaticas nav
  document.querySelectorAll('.nav label[for="page-fruta"], .nav label[for="page-aromaticas"]').forEach(l => {
    l.addEventListener('click', () => {
      const db = document.getElementById('dashboard-main');
      if (db) db.style.display = '';
    });
  });

  // Config tabs (siempre, para acceso desde sidebar)
  initConfigTabs();
  // Cargar proveedores en el tab activo por defecto
  cargarTablaProveedores();

  // Modal proveedor: cerrar al hacer clic fuera
  const modalProv = document.getElementById('modal-proveedor');
  if (modalProv) {
    modalProv.addEventListener('click', (e) => {
      if (e.target === modalProv) cerrarModalProveedor();
    });
  }
});

// ── Analizar Muestras Frutas (cards con filtros) ────────────────

function renderAnalizarCardsFrutas(rows) {
  const container = document.getElementById('cards-analizar-frutas');
  if (!container) return;
  container.innerHTML = rows.map(r => {
    const nivel      = Number.parseFloat(r.nivel_maduracion);
    const estadoHTML = estadoPorNivelFruta(nivel);
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
      onclick="abrirModalIndividual('fruta',{archivo_origen:this.dataset.archivo,fruta_id:this.dataset.frutaId,nombre_muestra:this.dataset.nombre})"
      style="cursor:pointer">
      ${fotoHtml}
      <div class="fruit-head">
        <div>
          <span class="card-label">Nombre de la muestra:</span>
          <strong>${escapeHtml(displayName)}</strong>
        </div>
        ${estadoHTML}
      </div>
      <div class="level-block">
        <span>Nivel de maduración</span>
        <strong>${fmtDecimal(nivel, 1)} / 10</strong>
        <div class="progress"><span class="fill ${fillClass}" style="width:${porcentaje}%"></span></div>
      </div>
      ${alertaHtml}
      <div class="mini-stats">
        <div><span>Confianza del modelo</span><strong>${escapeHtml(confianza)}</strong></div>
      </div>
    </div>`;
  }).join('');
}

function obtenerFilasFiltradasAnalizarFruta(excluirConfianza = false) {
  const busqueda      = (document.getElementById('filter-analizar-frutas-muestra')?.value ?? '').toLowerCase();
  const nombreMuestra = document.getElementById('filter-analizar-frutas-nombre-muestra')?.value ?? '';
  const estado        = document.getElementById('filter-analizar-frutas-estado')?.value ?? '';
  const confianza     = document.getElementById('filter-analizar-frutas-confianza')?.value ?? '';
  let filtradas = _rowsFrutas.filter(r => {
    const nombre = (r.nombre_muestra ?? '').toLowerCase();
    const nivel  = Number.parseFloat(r.nivel_maduracion);
    const conf   = Number(r.confianza);
    if (busqueda && !nombre.includes(busqueda) &&
        !formatearNombreMuestra(r.nombre_muestra).toLowerCase().includes(busqueda)) return false;
    if (nombreMuestra && formatearNombreMuestra(r.nombre_muestra) !== nombreMuestra) return false;
    if (estado   && estadoTextoFruta(nivel) !== estado) return false;
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

  if (total > 0) {
    if (porcAlta)  porcAlta.textContent  = ((alta  / total) * 100).toFixed(1) + '%';
    if (porcMedia) porcMedia.textContent = ((media / total) * 100).toFixed(1) + '%';
    if (porcBaja)  porcBaja.textContent  = ((baja  / total) * 100).toFixed(1) + '%';
    if (cantAlta)  cantAlta.textContent  = '(' + fmt(alta)  + ')';
    if (cantMedia) cantMedia.textContent = '(' + fmt(media) + ')';
    if (cantBaja)  cantBaja.textContent  = '(' + fmt(baja)  + ')';
  } else {
    if (porcAlta)  porcAlta.textContent  = '0.0%';
    if (porcMedia) porcMedia.textContent = '0.0%';
    if (porcBaja)  porcBaja.textContent  = '0.0%';
    if (cantAlta)  cantAlta.textContent  = '(0)';
    if (cantMedia) cantMedia.textContent = '(0)';
    if (cantBaja)  cantBaja.textContent  = '(0)';
  }

  const donutEl = document.querySelector('.donut-confianza');
  if (donutEl) actualizarDonut(donutEl, alta, media, baja, total);
}

// ── Analizar Muestras Aromáticas (cards con filtros) ────────────

function renderAnalizarCardsAromaticas(rows) {
  const container = document.getElementById('cards-analizar-aromaticas');
  if (!container) return;
  const emoji    = { 'Naranjo': '🍊', 'Hierbabuena': '🌿', 'Eucalipto': '🌳' };
  const cssClass = { 'Naranjo': 'aromatic-a', 'Hierbabuena': 'aromatic-b', 'Eucalipto': 'aromatic-c' };
  container.innerHTML = rows.map(r => {
    const planta     = Object.keys(emoji).find(k => (r.nombre_muestra ?? '').includes(k)) ?? '';
    const ico        = emoji[planta]    ?? '🌿';
    const cls        = cssClass[planta] ?? 'aromatic-a';
    const nivel      = Number.parseFloat(r.nivel_maduracion);
    const estadoHTML = estadoPorNivelAromatica(nivel);
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
      onclick="abrirModalIndividual('aromatica',{archivo_origen:this.dataset.archivo,fruta_id:this.dataset.frutaId,nombre_muestra:this.dataset.nombre})"
      style="cursor:pointer">
      ${fotoHtml}
      <div class="fruit-head">
        <div>
          <span class="card-label">Nombre de la muestra:</span>
          <strong>${escapeHtml(displayName)}</strong>
        </div>
        ${estadoHTML}
      </div>
      <div class="level-block">
        <span>Nivel de pigmentación</span>
        <strong>${fmtDecimal(nivel, 1)} / 10</strong>
        <div class="progress"><span class="fill ${fillClass}" style="width:${porcentaje}%"></span></div>
      </div>
      ${alertaHtml}
      <div class="mini-stats">
        <div><span>Confianza del modelo</span><strong>${escapeHtml(confianza)}</strong></div>
      </div>
    </div>`;
  }).join('');
}

function filtrarAnalizarCardsAromaticas() {
  const busqueda      = (document.getElementById('filter-analizar-aro-muestra')?.value ?? '').toLowerCase();
  const nombreMuestra = document.getElementById('filter-analizar-aro-nombre-muestra')?.value ?? '';
  const estado        = document.getElementById('filter-analizar-aro-estado')?.value ?? '';
  const confianza     = document.getElementById('filter-analizar-aro-confianza')?.value ?? '';
  let filtradas = _rowsAromaticas.filter(r => {
    const nombre = (r.nombre_muestra ?? '').toLowerCase();
    const nivel  = Number.parseFloat(r.nivel_maduracion);
    const conf   = Number(r.confianza);
    if (busqueda && !nombre.includes(busqueda) &&
        !formatearNombreMuestra(r.nombre_muestra).toLowerCase().includes(busqueda)) return false;
    if (nombreMuestra && formatearNombreMuestra(r.nombre_muestra) !== nombreMuestra) return false;
    if (estado   && estadoTextoAromatica(nivel) !== estado) return false;
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
}

function limpiarAnalizarCardsAromaticas() {
  ['filter-analizar-aro-muestra', 'filter-analizar-aro-nombre-muestra',
   'filter-analizar-aro-estado',  'filter-analizar-aro-confianza']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  _mostrarSoloAlertasAnalizarAro = false;
  const btn = document.getElementById('filter-analizar-aro-alertas');
  if (btn) btn.classList.remove('active');
  renderAnalizarCardsAromaticas(_rowsAromaticas);
}

// ── Donut Dinámico (Frutas) ────────────────────────────────────
let _d3FrutaWarning = false;

function toggleWarningD3Fruta() {
  _d3FrutaWarning = document.getElementById('d3-fruta-warning')?.checked ?? false;
  actualizarDonutDinamicoFruta();
}

function limpiarFiltrosD3Fruta() {
  ['fd3-fruta-nombre', 'fd3-fruta', 'fd3-fruta-estado']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  actualizarDonutDinamicoFruta();
}

function actualizarDonutDinamicoFruta() {
  const nombre = document.getElementById('fd3-fruta-nombre')?.value ?? '';
  const variedad = document.getElementById('fd3-fruta')?.value ?? '';
  const estado = document.getElementById('fd3-fruta-estado')?.value ?? '';

  let filtradas = _rowsFrutas.filter(r => {
    if (nombre && formatearNombreMuestra(r.nombre_muestra) !== nombre) return false;
    if (variedad  && (r.nombre_muestra ?? '') !== variedad) return false;
    if (estado && estadoTextoFruta(Number(r.nivel_maduracion)) !== estado) return false;
    if (!_d3FrutaWarning) {
      const lVal = Number(r.l);
      const tieneAlerta = (lVal > 0 && lVal < 15) || (r.alerta_falso_optimo === true || r.alerta_falso_optimo === '1');
      if (tieneAlerta) return false;
    }
    return true;
  });

  const total = filtradas.length;
  const frutaId = filtradas.length > 0 ? filtradas[0].fruta_id : (_rowsFrutas.length > 0 ? _rowsFrutas[0].fruta_id : null);
  const estados = frutaId ? (_estadosCache[frutaId] || []) : [];
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

function actualizarDonutDinamicoAro() {
  const nombre = document.getElementById('fd3-aro-nombre')?.value ?? '';
  const estado = document.getElementById('fd3-aro-estado')?.value ?? '';

  let filtradas = _rowsAromaticas.filter(r => {
    if (nombre && formatearNombreMuestra(r.nombre_muestra) !== nombre) return false;
    if (estado && estadoTextoAromatica(Number(r.nivel_maduracion)) !== estado) return false;
    if (!_d3AroWarning) {
      const lVal = Number(r.l);
      const tieneAlerta = (lVal > 0 && lVal < 20) || (r.alerta_falso_optimo === true || r.alerta_falso_optimo === '1');
      if (tieneAlerta) return false;
    }
    return true;
  });

  const total = filtradas.length;
  const frutaId = filtradas.length > 0 ? filtradas[0].fruta_id : (_rowsAromaticas.length > 0 ? _rowsAromaticas[0].fruta_id : null);
  const estados = frutaId ? (_estadosCache[frutaId] || []) : [];
  const segmentos = estados.length > 0 ? contarPorEstado(filtradas, estados) : [];

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