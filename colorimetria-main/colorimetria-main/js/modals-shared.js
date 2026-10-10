// ── Modal Cargar Muestra (individual) ──────────────────────
let _muestraContexto = null;
let _muestraSeleccionada = null;
let _archivoImagenSeleccionado = null;
let _rutaImagenSubida = null;

async function cargarEstadosModal(containerId, contexto) {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  let frutaId = null;
  if (contexto !== 'pina') {
    if (typeof _aroDashboardActiva !== 'undefined' && _aroDashboardActiva?.id) {
      frutaId = _aroDashboardActiva.id;
    }
  } else {
    try {
      const sesion = JSON.parse(sessionStorage.getItem('sesion_colorimetria'));
      frutaId = sesion?.fruta?.id || null;
    } catch {}
  }
  if (!frutaId) {
    const tipo = contexto === 'pina' ? 'frutas' : 'aromaticas';
    try {
      const resTipos = await fetch(`${API}?endpoint=config_${tipo}_listar`);
      const tipos = await resTipos.json();
      frutaId = Array.isArray(tipos) ? tipos[0]?.id : null;
    } catch {}
  }
  if (!frutaId) return;
  const cat = contexto === 'pina' ? 'frutas' : 'aromaticas';
  try {
    const resEst = await fetch(`${API}?endpoint=config_estados_fruta&fruta_id=${frutaId}&categoria=${cat}`);
    const est = await resEst.json();
    cont.innerHTML = (Array.isArray(est) ? est : []).map(e => {
        const nombre = e.nombre === 'Óptima' || /^Madura/u.test(e.nombre) && e.nombre !== 'Maduración Óptima'
            ? t('Maduración Óptima') : t(e.nombre);
        return `<span class="chip-estado-info" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:9999px;font-size:.8rem;font-weight:600;background:${e.color_badge}1a;color:${e.color_badge};border:1px solid ${e.color_badge}40;">
            ${(e && e.emoji && e.emoji !== '??' && e.emoji !== '?') ? e.emoji : '●'} ${nombre}
        </span>`;
    }).join('');
  } catch {}
}

function abrirModalMuestra(contexto, nombreMuestra = '') {
  if (!window._hayProveedores) return;
  _muestraContexto = contexto;
  _muestraSeleccionada = nombreMuestra;
  _archivoImagenSeleccionado = null;
  _rutaImagenSubida = null;
  _csvFileIndividual = null;
  _modalIndNombreOriginal = '';

  document.getElementById('modal-muestra-titulo').textContent =
    contexto === 'pina' ? t('Cargar muestra de piña') : t('Cargar muestra de aromática');

  const d = new Date();
  const hoy = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  const fechaInput = document.getElementById('modal-fecha-sesion');
  if (fechaInput) { fechaInput.max = hoy; fechaInput.value = hoy; }

  document.getElementById('modal-nombre-muestra').value = nombreMuestra;
  document.getElementById('wrapper-nombre-individual-modal').style.display = 'none';
  document.getElementById('msg-formato-individual-modal').style.display = 'none';
  document.getElementById('preview-img').style.display = 'none';
  document.getElementById('upload-placeholder').style.display = 'block';
  document.getElementById('btn-cargar-muestra').disabled = true;
  document.getElementById('modal-msg').textContent = '';
  document.getElementById('modal-msg').className = 'modal-msg';
  document.getElementById('input-imagen-muestra').value = '';
  document.getElementById('input-csv-individual').value = '';
  document.getElementById('csv-info-individual').textContent = t('Ningún archivo seleccionado');
  document.getElementById('btn-quitar-csv-individual').style.display = 'none';

  cargarEstadosModal('grid-estados-maduracion-individual', contexto);

  document.getElementById('modal-cargar-muestra').style.display = 'flex';
}

function habilitarEdicionNombreModal() {
  const input = document.getElementById('modal-nombre-muestra');
  if (!input) return;
  const btn = input.nextElementSibling;
  if (input.disabled) {
    input.disabled = false;
    input.focus();
    btn.textContent = t('💾 Guardar');
  } else {
    const val = input.value.trim();
    if (!val) return;
    input.disabled = true;
    btn.textContent = t('✏️ Editar');
    const msg = document.getElementById('msg-formato-individual-modal');
    if (msg) {
      msg.style.display = /^[a-zA-ZñÑ]+\.?\d+\.\d+\.\d+$/.test(val) ? '' : 'none';
    }
  }
}

function cerrarModalMuestra() {
  document.getElementById('modal-cargar-muestra').style.display = 'none';
}

function previsualizarImagen(event) {
  const archivo = event.target.files?.[0];
  if (!archivo) return;

  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
  if (!tiposPermitidos.includes(archivo.type)) {
    mostrarMensajeModal(t('Formato no permitido. Usa JPG, PNG o WEBP.'), 'error');
    return;
  }
  if (archivo.size > 5 * 1024 * 1024) {
    mostrarMensajeModal(t('La imagen supera el límite de 5MB.'), 'error');
    return;
  }

  _archivoImagenSeleccionado = archivo;
  const errEl = document.getElementById('error-imagen-individual-modal');
  if (errEl) errEl.style.display = 'none';

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
  const btn = document.getElementById('btn-cargar-muestra');
  const completo = _archivoImagenSeleccionado && _csvFileIndividual;
  btn.disabled = !completo;
}

function mostrarMensajeModal(texto, tipo) {
  const el = document.getElementById('modal-msg');
  el.textContent = texto;
  el.className = `modal-msg ${tipo}`;
}

function obtenerFechaSesion(tipo) {
  const id = tipo === 'lote' ? 'modal-fecha-sesion-lote' : 'modal-fecha-sesion';
  const el = document.getElementById(id);
  if (el && el.value) return el.value;
  try {
    const s = sessionStorage.getItem('sesion_colorimetria');
    if (s) {
      const obj = JSON.parse(s);
      return obj.fecha || null;
    }
  } catch {}
  return null;
}

async function guardarMuestra() {
  document.querySelectorAll('.modal-muestra-box .error-msg').forEach(e => e.style.display = 'none');
  let valido = true;
  if (!_csvFileIndividual) { document.getElementById('error-csv-individual-modal').style.display = ''; valido = false; }
  if (!_archivoImagenSeleccionado) { document.getElementById('error-imagen-individual-modal').style.display = ''; valido = false; }
  if (!valido) return;

  const btn = document.getElementById('btn-cargar-muestra');
  btn.disabled = true;

  mostrarMensajeModal(t('Importando datos…'), '');
  try {
    const endpoint = _muestraContexto === 'pina' ? 'importar_csv_fruta_promedio' : 'importar_csv_aromaticas_promedio';
    const fd = new FormData();
    fd.append('csv', _csvFileIndividual);
    fd.append('imagen', _archivoImagenSeleccionado);
    const nombreMuestra = document.getElementById('modal-nombre-muestra')?.value?.trim();
    fd.append('nombre_muestra', nombreMuestra || '');
    const fechaSesion = obtenerFechaSesion('individual');
    let frutaIdModal = null;
    if (_muestraContexto === 'aromaticas' && typeof _aroDashboardActiva !== 'undefined' && _aroDashboardActiva?.id) {
      frutaIdModal = _aroDashboardActiva.id;
    } else if (typeof _frutaDashboardActiva !== 'undefined' && _frutaDashboardActiva?.id) {
      frutaIdModal = _frutaDashboardActiva.id;
    }
    if (!frutaIdModal) {
      try {
        const r = await fetch(`${API}?endpoint=config_frutas_listar`);
        const frutas = await r.json();
        if (Array.isArray(frutas) && frutas.length > 0) {
          frutaIdModal = (frutas.find(f => f.slug === 'pina') || frutas[0]).id;
        }
      } catch {}
    }
    if (frutaIdModal) fd.append('fruta_id', frutaIdModal);
    if (_proveedorIdFiltro) fd.append('proveedor_id', _proveedorIdFiltro);
    if (fechaSesion) fd.append('fecha_sesion', fechaSesion);

    const res = await fetch(`${API}?endpoint=${endpoint}`, { method: 'POST', body: fd });
    const data = await res.json();
    if (data.error) {
      mostrarMensajeModal(data.mensaje || t('Error al importar datos.'), 'error');
      btn.disabled = false;
      return;
    }

    mostrarMensajeModal(`✓ ${data.mensaje}`, 'success');
    if (_muestraContexto === 'pina') {
      await cargarKpisFrutas(); await cargarCardsFrutas(); await cargarTablaFrutas();
      await cargarDetalleColorFrutas(); await cargarReflectanciasFrutas(); await cargarArchivosFrutas();
      await actualizarKpisFrutas();
    } else {
      await cargarKpisAromaticas(); await cargarCardsAromaticas(); await cargarTablaAromaticas();
      await cargarDetalleColorAromaticas(); await cargarReflectanciasAromaticas(); await cargarArchivosAromaticas();
      await actualizarKpisAromaticas();
    }
    await refrescarDonutsConEstados();
    if (typeof cargarTablaProveedores === 'function') cargarTablaProveedores();
    _csvFileIndividual = null;
    _archivoImagenSeleccionado = null;
    setTimeout(cerrarModalMuestra, 1500);
  } catch (e) {
    console.error('Error al guardar muestra:', e);
    mostrarMensajeModal(t('Error de conexión con el servidor.'), 'error');
    btn.disabled = false;
  }
}

// ── Lote ──────────────────────────────────────────────────
let _loteContexto = null;
let _loteImagenes = [];
let _loteMuestras = [];
let _loteAsignaciones = {};
let _loteNombresExtraidos = [];
let _loteNombresOriginales = [];
let _modalIndNombreOriginal = '';

function abrirModalLote(contexto) {
  if (!window._hayProveedores) return;
  _loteContexto = contexto;
  _loteImagenes = [];
  _loteMuestras = [];
  _loteAsignaciones = {};
  _loteCSVs = [];
  _loteCSVRows = [];
  _loteNombresExtraidos = [];
  _loteNombresOriginales = [];
  document.getElementById('modal-lote-titulo').textContent =
    contexto === 'pina' ? t('Cargar Varias Muestras — Piña') : t('Cargar Varias Muestras — Aromáticas');

  const d = new Date();
  const hoy = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  const fechaInput = document.getElementById('modal-fecha-sesion-lote');
  if (fechaInput) { fechaInput.max = hoy; fechaInput.value = hoy; }

  document.getElementById('modal-nombre-lote').value = '';
  document.getElementById('wrapper-nombre-lote-modal').style.display = 'none';
  document.getElementById('msg-formato-lote-modal').style.display = 'none';
  document.getElementById('lote-grid-imagenes').innerHTML = '';
  document.getElementById('lote-info-imagenes').textContent = t('Ninguna imagen seleccionada');
  document.getElementById('lote-tabla-cuerpo').innerHTML = '<tr><td colspan="3" class="lote-empty">' + t('Carga un CSV para ver las muestras') + '</td></tr>';
  document.getElementById('lote-validacion-texto').textContent = t('Carga un CSV con los datos de las muestras');
  document.getElementById('lote-validacion-msg').className = 'lote-validacion';
  document.getElementById('btn-guardar-lote').disabled = true;
  document.getElementById('input-imagenes-lote').value = '';
  document.getElementById('input-csv-lote').value = '';
  document.getElementById('csv-info-lote').textContent = t('Ningún archivo seleccionado');
  document.getElementById('csv-preview-lote-wrap').style.display = 'none';
  document.getElementById('csv-preview-lote-wrap').innerHTML = '';

  cargarEstadosModal('grid-estados-maduracion-lote', contexto);

  document.getElementById('modal-asignar-lote').style.display = 'flex';

  cargarMuestrasSinImagen();
}

function habilitarEdicionNombreLoteModal() {
  const input = document.getElementById('modal-nombre-lote');
  if (!input) return;
  const btn = input.nextElementSibling;
  if (input.disabled) {
    input.disabled = false;
    input.focus();
    btn.textContent = t('💾 Guardar');
  } else {
    const val = input.value.trim();
    if (!val) return;
    input.disabled = true;
    btn.textContent = t('✏️ Editar');
    const msg = document.getElementById('msg-formato-lote-modal');
    if (msg) {
      msg.style.display = /^[a-zA-ZñÑ]+\.?\d+\.\d+\.\d+$/.test(val) ? '' : 'none';
    }
  }
}

function cerrarModalLote() {
  document.getElementById('modal-asignar-lote').style.display = 'none';
  _loteNombresExtraidos = [];
  _loteNombresOriginales = [];
}

async function cargarMuestrasSinImagen() {
  const endpoint = _loteContexto === 'pina' ? 'muestras_sin_imagen_fruta' : 'muestras_sin_imagen_aromaticas';
  try {
    const res = await fetch(`${API}?endpoint=${endpoint}`);
    const data = await res.json();
    if (!Array.isArray(data)) {
      if (_loteCSVRows.length === 0) {
        document.getElementById('lote-tabla-cuerpo').innerHTML = '<tr><td colspan="3" class="lote-empty">' + t('Error al cargar muestras') + '</td></tr>';
      }
      return;
    }
    if (_loteCSVRows.length === 0) {
      _loteMuestras = data;
      renderAsignacionesLote();
    }
  } catch (e) {
    console.error('Error cargando muestras sin imagen:', e);
    if (_loteCSVRows.length === 0) {
      document.getElementById('lote-tabla-cuerpo').innerHTML = '<tr><td colspan="3" class="lote-empty">' + t('Error de conexión') + '</td></tr>';
    }
  }
}

function seleccionarImagenesLote(event) {
  const errEl = document.getElementById('error-imagenes-lote-modal');
  if (errEl) errEl.style.display = 'none';
  const files = event.target.files;
  if (!files || files.length === 0) return;

  for (const f of files) {
    _loteImagenes.push(f);
  }

  const nuevas = {};
  for (const [muestraIdx, imgIdx] of Object.entries(_loteAsignaciones)) {
    nuevas[muestraIdx] = imgIdx;
  }
  _loteAsignaciones = nuevas;

  for (let i = 0; i < _loteMuestras.length; i++) {
    if (_loteAsignaciones[i] === undefined && i < _loteImagenes.length) {
      _loteAsignaciones[i] = i;
    }
  }

  event.target.value = '';
  renderThumbnailsLote();
  renderAsignacionesLote();
  validarLote();
}

function eliminarImagenLote(index) {
  _loteImagenes.splice(index, 1);
  const nuevas = {};
  for (const [muestraIdx, imgIdx] of Object.entries(_loteAsignaciones)) {
    if (imgIdx === index) continue;
    nuevas[muestraIdx] = imgIdx > index ? imgIdx - 1 : imgIdx;
  }
  _loteAsignaciones = nuevas;
  for (let i = 0; i < _loteMuestras.length; i++) {
    if (_loteAsignaciones[i] === undefined && i < _loteImagenes.length) {
      _loteAsignaciones[i] = i;
    }
  }
  renderThumbnailsLote();
  renderAsignacionesLote();
  validarLote();
}

function renderThumbnailsLote() {
  const container = document.getElementById('lote-grid-imagenes');
  const info = document.getElementById('lote-info-imagenes');
  info.textContent = `${_loteImagenes.length}${t(' imagen(es) seleccionada(s)')}`;

  container.innerHTML = _loteImagenes.map((file, i) => {
    const url = URL.createObjectURL(file);
    return `<div class="lote-thumb">
      <span class="lote-thumb-num">#${i + 1}</span>
      <button class="lote-thumb-x" onclick="eliminarImagenLote(${i})" title="${t('Eliminar')}">✕</button>
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
      (tieneCSV ? t('Cargando datos…') : t('Carga un CSV para ver las muestras')) +
      '</td></tr>';
    return;
  }

  if (totalImgs === 0 && !tieneCSV) {
    tbody.innerHTML = '<tr><td colspan="4" class="lote-empty">' + t('Carga un CSV con los datos de las muestras') + '</td></tr>';
    return;
  }

  const tieneFilasCSV = _loteCSVRows.length > 0;
  const patron = /^[a-zA-ZñÑ]+\.?\d+\.\d+\.\d+$/;
  tbody.innerHTML = _loteMuestras.map((m, idx) => {
    let selectHtml = '<td style="color:#9ca3af;font-size:.8rem;">—</td>';
    if (totalImgs > 0) {
      const valorActual = _loteAsignaciones[idx] !== undefined ? _loteAsignaciones[idx] : '';
      let options = '';
      for (let i = 0; i < totalImgs; i++) {
        const sel = _loteAsignaciones[idx] === i ? 'selected' : '';
        options += `<option value="${i}" ${sel}>${t('Imagen #')}${i + 1}</option>`;
      }
      selectHtml = `<td><select onchange="onChangeAsignacionLote(${idx}, this.value)">${options}</select></td>`;
    }
    if (tieneFilasCSV && idx < _loteCSVs.length) {
      const nombreActual = _loteNombresExtraidos[idx] || _loteNombresOriginales[idx] || '';
      const showMsg = patron.test(nombreActual);
      const nombreArchivo = _loteCSVs[idx]?.name || '—';
      return `<tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(nombreArchivo)}</td>
        <td>
          <input type="text" id="lote-name-input-${idx}" value="${escapeHtml(nombreActual)}" disabled style="width:100%;max-width:140px;padding:3px 6px;font-size:.8rem;border:1px solid #d1d5db;border-radius:4px;background:#f9fafb;">
          <button class="btn-secondary" style="padding:2px 6px;font-size:.72rem;border:1px solid transparent;" onclick="editarNombreLoteModal(${idx})">✏️</button>
          <p id="lote-name-msg-${idx}" style="margin:2px 0 0;font-size:.7rem;color:#16a34a;${showMsg ? '' : 'display:none;'}">${t('Nombre Muestra con formato fruta1.1.1')}</p>
        </td>
        ${selectHtml}
      </tr>`;
    }
    return `<tr>
      <td>${idx + 1}</td>
      <td style="color:#9ca3af;font-size:.8rem;">—</td>
      <td>${escapeHtml(m.nombre_muestra)}</td>
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

function editarNombreLoteModal(idx) {
  const input = document.getElementById('lote-name-input-' + idx);
  if (!input) return;
  if (input.disabled) {
    input.disabled = false;
    input.focus();
  } else {
    const val = input.value.trim();
    if (!val) { input.focus(); return; }
    input.disabled = true;
    _loteNombresExtraidos[idx] = val;
    if (_loteMuestras[idx]) {
      _loteMuestras[idx].nombre_muestra = val;
    }
    const msg = document.getElementById('lote-name-msg-' + idx);
    if (msg) {
      const patron = /^[a-zA-ZñÑ]+\.?\d+\.\d+\.\d+$/;
      msg.style.display = patron.test(val) ? '' : 'none';
    }
    renderAsignacionesLote();
  }
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

  if (tieneCSV) {
    if (totalImgs === 0) {
      msg.textContent = `⚠ ${t('Selecciona al menos una imagen (obligatorio)')}`;
      box.className = 'lote-validacion error';
      btn.disabled = true;
      return;
    }
    if (totalImgs !== totalMuestras) {
      msg.textContent = `⚠ ${t('La cantidad de imágenes (')}${totalImgs}${t(') debe ser igual a la cantidad de archivos CSV (')}${totalMuestras})`;
      box.className = 'lote-validacion error';
      btn.disabled = true;
      return;
    }
    if (asignadas === 0) {
      msg.textContent = `⚠ ${t('Asigna las imagenes con su respectiva muestra')}`;
      box.className = 'lote-validacion error';
      btn.disabled = true;
      return;
    }
    if (asignadas < totalMuestras) {
      msg.textContent = `⚠ ${t('Faltan ')}${totalMuestras - asignadas}${t(' archivo(s) CSV por asignar una imagen')}`;
      box.className = 'lote-validacion error';
      btn.disabled = true;
      return;
    }
    if (duplicados) {
      msg.textContent = t('⚠ No puedes asignar la misma imagen a dos archivos CSV distintos');
      box.className = 'lote-validacion error';
      btn.disabled = true;
      return;
    }
    msg.textContent = `✓ ${totalImgs}${t(' imágenes asignadas a ')}${totalMuestras}${t(' archivos CSV')}`;
    box.className = 'lote-validacion ok';
    btn.disabled = false;
    return;
  }

  if (totalImgs === 0) {
    msg.textContent = t('Carga un CSV con los datos de las muestras');
    box.className = 'lote-validacion';
    btn.disabled = true;
    return;
  }

  if (totalImgs !== totalMuestras) {
    msg.textContent = `⚠ ${t('La cantidad de imágenes (')}${totalImgs}${t(') debe ser igual a la cantidad de muestras pendientes (')}${totalMuestras})`;
    box.className = 'lote-validacion error';
    btn.disabled = true;
    return;
  }

  if (asignadas < totalImgs) {
    msg.textContent = `⚠ ${t('Faltan ')}${totalImgs - asignadas}${t(' imagen(es) por asignar')}`;
    box.className = 'lote-validacion error';
    btn.disabled = true;
    return;
  }

  if (duplicados) {
    msg.textContent = `⚠ ${t('No puedes asignar la misma imagen a dos muestras distintas')}`;
    box.className = 'lote-validacion error';
    btn.disabled = true;
    return;
  }

  msg.textContent = `✓ ${totalImgs}${t(' imágenes asignadas correctamente a ')}${totalMuestras}${t(' muestras')}`;
  box.className = 'lote-validacion ok';
  btn.disabled = false;
}

async function guardarLote() {
  document.querySelectorAll('.modal-lote-box .error-msg').forEach(e => e.style.display = 'none');
  let valido = true;
  if (_loteCSVs.length === 0) { document.getElementById('error-csv-lote-modal').style.display = ''; valido = false; }
  if (_loteImagenes.length === 0) { document.getElementById('error-imagenes-lote-modal').style.display = ''; valido = false; }
  if (!valido) return;

  const btn = document.getElementById('btn-guardar-lote');
  const msgTexto = document.getElementById('lote-validacion-texto');
  const msgBox = document.getElementById('lote-validacion-msg');

  const valores = Object.values(_loteAsignaciones);
  if (valores.length !== new Set(valores).size) {
    msgTexto.textContent = `⚠ ${t('No puedes asignar la misma imagen a dos archivos distintos')}`;
    msgBox.className = 'lote-validacion error';
    return;
  }

  btn.disabled = true;

  if (_loteCSVRows.length > 0) {
    msgTexto.textContent = t('Importando muestras…');
    msgBox.className = 'lote-validacion';

    try {
      const endpoint = _loteContexto === 'pina' ? 'importar_csv_fruta_promedio' : 'importar_csv_aromaticas_promedio';
      let totalOK = 0;
      const fechaSesionLote = obtenerFechaSesion('lote');

      const primerNombreOrig = _loteNombresOriginales[0] || '';
      const matchPrefijo = primerNombreOrig.match(/^([\p{L}]+)/u);
      const prefijoPlantas = matchPrefijo ? matchPrefijo[1] : 'Muestra';

      for (let csvIdx = 0; csvIdx < _loteCSVs.length; csvIdx++) {
        const csvFile = _loteCSVs[csvIdx];
        const imgIdx = _loteAsignaciones[csvIdx];
        const imgFile = imgIdx !== undefined ? _loteImagenes[imgIdx] : null;

        let nombreMuestra = '';
        if (_loteNombresExtraidos[csvIdx] !== _loteNombresOriginales[csvIdx]) {
          nombreMuestra = _loteNombresExtraidos[csvIdx];
        } else {
          nombreMuestra = `${prefijoPlantas} ${csvIdx + 1}`;
        }

        let frutaIdLote = null;
        if (_loteContexto === 'aromaticas' && typeof _aroDashboardActiva !== 'undefined' && _aroDashboardActiva?.id) {
          frutaIdLote = _aroDashboardActiva.id;
        } else if (typeof _frutaDashboardActiva !== 'undefined' && _frutaDashboardActiva?.id) {
          frutaIdLote = _frutaDashboardActiva.id;
        }
        if (!frutaIdLote) {
          try {
            const r = await fetch(`${API}?endpoint=config_frutas_listar`);
            const frutas = await r.json();
            if (Array.isArray(frutas) && frutas.length > 0) {
              frutaIdLote = (frutas.find(f => f.slug === 'pina') || frutas[0]).id;
            }
          } catch {}
        }

        const fd = new FormData();
        fd.append('csv', csvFile);
        if (imgFile) fd.append('imagen', imgFile);
        fd.append('nombre_muestra', nombreMuestra);
        if (frutaIdLote) fd.append('fruta_id', frutaIdLote);
        if (_proveedorIdFiltro) fd.append('proveedor_id', _proveedorIdFiltro);
        if (fechaSesionLote) fd.append('fecha_sesion', fechaSesionLote);

        const res = await fetch(`${API}?endpoint=${endpoint}`, { method: 'POST', body: fd });
        const data = await res.json();
        if (data.error) {
          msgTexto.textContent = `${t('Error en CSV #')}${csvIdx + 1}: ${data.mensaje}`;
          msgBox.className = 'lote-validacion error';
          btn.disabled = false;
          return;
        }
        totalOK++;
      }

      if (_loteContexto === 'pina') {
        await cargarKpisFrutas(); await cargarCardsFrutas(); await cargarTablaFrutas();
        await cargarDetalleColorFrutas(); await cargarReflectanciasFrutas(); await cargarArchivosFrutas();
        await actualizarKpisFrutas();
      } else {
        await cargarKpisAromaticas(); await cargarCardsAromaticas(); await cargarTablaAromaticas();
        await cargarDetalleColorAromaticas(); await cargarReflectanciasAromaticas(); await cargarArchivosAromaticas();
        await actualizarKpisAromaticas();
      }
      await refrescarDonutsConEstados();
      if (typeof cargarTablaProveedores === 'function') cargarTablaProveedores();
      if (typeof cargarSelectorProveedores === 'function') cargarSelectorProveedores(false);

      msgTexto.textContent = `✓ ${totalOK}${t(' CSV(s) importados correctamente.')}`;
      msgBox.className = 'lote-validacion ok';
      _loteCSVs = [];
      _loteCSVRows = [];
      _loteImagenes = [];
      _loteAsignaciones = {};
      setTimeout(cerrarModalLote, 1500);
      return;
    } catch (e) {
      console.error('Error en guardarLote (CSV):', e);
      msgTexto.textContent = t('Error de conexión con el servidor');
      msgBox.className = 'lote-validacion error';
      btn.disabled = false;
      if (typeof cargarSelectorProveedores === 'function') cargarSelectorProveedores(false);
      return;
    }
  }

  msgTexto.textContent = t('Subiendo imágenes…');
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
      msgTexto.textContent = dataSubida.mensaje || t('Error al subir imágenes');
      msgBox.className = 'lote-validacion error';
      btn.disabled = false;
      return;
    }

    msgTexto.textContent = t('Guardando asignaciones…');

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
      msgTexto.textContent = dataGuardar.mensaje || t('Error al guardar asignaciones');
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
    if (typeof cargarTablaProveedores === 'function') cargarTablaProveedores();
    if (typeof cargarSelectorProveedores === 'function') cargarSelectorProveedores(false);

    setTimeout(cerrarModalLote, 1500);
  } catch (e) {
    console.error('Error en guardarLote:', e);
    msgTexto.textContent = t('Error de conexión con el servidor');
    msgBox.className = 'lote-validacion error';
    btn.disabled = false;
    if (typeof cargarSelectorProveedores === 'function') cargarSelectorProveedores(false);
  }
}

// ── CSV inline ──────────────────────────────────────────────
let _csvFileIndividual = null;

function seleccionarCSVIndividual(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  _csvFileIndividual = file;
  const errEl = document.getElementById('error-csv-individual-modal');
  if (errEl) errEl.style.display = 'none';
  document.getElementById('csv-info-individual').textContent = `📄 ${file.name}`;
  document.getElementById('btn-quitar-csv-individual').style.display = 'inline-block';

  const reader = new FileReader();
  reader.onload = (e) => {
    const texto = e.target.result;
    const lineas = texto.trim().split('\n');
    if (lineas.length >= 2) {
      const headers = lineas[0].split(',').map(h => h.trim().toLowerCase());
      const idxName = headers.indexOf('name');
      if (idxName !== -1) {
        const primerValor = lineas[1].split(',')[idxName]?.trim();
        if (primerValor) {
          _modalIndNombreOriginal = primerValor;
          const wrapper = document.getElementById('wrapper-nombre-individual-modal');
          if (wrapper) wrapper.style.display = '';
          const nombreInput = document.getElementById('modal-nombre-muestra');
          if (nombreInput) {
            nombreInput.value = primerValor;
            const msg = document.getElementById('msg-formato-individual-modal');
            if (msg) msg.style.display = /^[a-zA-ZñÑ]+\.?\d+\.\d+\.\d+$/.test(primerValor) ? '' : 'none';
          }
        }
      }
    }
  };
  reader.readAsText(file);
  validarFormularioMuestra();
}

function quitarCSVIndividual() {
  _csvFileIndividual = null;
  document.getElementById('input-csv-individual').value = '';
  document.getElementById('csv-info-individual').textContent = t('Ningún archivo seleccionado');
  document.getElementById('btn-quitar-csv-individual').style.display = 'none';
  validarFormularioMuestra();
}

function quitarCSVLote(csvIdx) {
  _loteCSVs.splice(csvIdx, 1);
  _loteCSVRows.splice(csvIdx, 1);
  _loteNombresExtraidos.splice(csvIdx, 1);
  _loteNombresOriginales.splice(csvIdx, 1);
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

let _loteCSVs = [];
let _loteCSVRows = [];

function parseCSVText(texto) {
  const lineas = texto.split('\n').filter(l => l.trim());
  if (lineas.length < 2) return null;
  const encabezados = lineas[0].split(',').map(h => h.trim().toLowerCase());
  const nameIdx = encabezados.indexOf('name');
  const lIdx = encabezados.indexOf('l');
  const aIdx = encabezados.indexOf('a');
  const bIdx = encabezados.indexOf('b');
  if (nameIdx === -1 || lIdx === -1 || aIdx === -1 || bIdx === -1) return null;
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
  const errEl = document.getElementById('error-csv-lote-modal');
  if (errEl) errEl.style.display = 'none';
  const files = event.target.files;
  if (!files || files.length === 0) return;

  let pendientes = files.length;
  let archivosLeidos = 0;

  for (const file of files) {
    _loteCSVs.push(file);
    _loteNombresExtraidos.push('');
    _loteNombresOriginales.push('');
    const reader = new FileReader();
    reader.fileName = file.name;
    reader.fileIndex = _loteCSVRows.length;
    _loteCSVRows.push(null);
    reader.onload = (e) => {
      const texto = e.target.result;
      const filas = parseCSVText(texto) || [];
      _loteCSVRows[reader.fileIndex] = filas;
      // Extract first row name
      if (filas.length > 0 && filas[0].nombre_muestra) {
        _loteNombresOriginales[reader.fileIndex] = filas[0].nombre_muestra;
        _loteNombresExtraidos[reader.fileIndex] = filas[0].nombre_muestra;
      }
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
      ? `📄 ${totalArchivos}${t(' archivo(s), ')}${totalFilas}${t(' muestra(s) en total')}`
      : t('Ningún archivo seleccionado');

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
      <span>${escapeHtml(file.name)} (${rows.length}${t(' muestras')})</span>
      <button class="csv-remove-btn" onclick="quitarCSVLote(${csvIdx})" title="${t('Quitar CSV')}">✕</button>
    </div>`;
    const mostrar = Math.min(3, rows.length);
    if (mostrar > 0) {
      html += `<table class="csv-preview-tabla"><thead><tr><th>#</th><th>${t('Muestra')}</th><th>L</th><th>a</th><th>b</th></tr></thead><tbody>`;
      for (let i = 0; i < mostrar; i++) {
        const r = rows[i];
        html += `<tr><td>${i + 1}</td><td>${escapeHtml(r.nombre_muestra)}</td><td>${escapeHtml(r.l)}</td><td>${escapeHtml(r.a)}</td><td>${escapeHtml(r.b)}</td></tr>`;
      }
      if (rows.length > mostrar) {
        html += `<tr><td colspan="5" style="text-align:center;color:#9ca3af;font-size:.78rem;">…${t(' y ')}${rows.length - mostrar}${t(' más')}</td></tr>`;
      }
      html += '</tbody></table>';
    }
  });
  container.innerHTML = html;

  _loteMuestras = _loteCSVs.map((file, idx) => {
    return {
      nombre_muestra: _loteNombresOriginales[idx] || `📄 ${file.name} (${_loteCSVRows[idx].length}${t(' muestras')})`,
      csvIdx: idx
    };
  });
  for (let i = 0; i < _loteMuestras.length; i++) {
    if (_loteAsignaciones[i] === undefined && i < _loteImagenes.length) {
      _loteAsignaciones[i] = i;
    }
  }
  renderAsignacionesLote();
  validarLote();
}

// ── Eliminar Muestras ─────────────────────────────────────────
let _eliminarContexto = null;
let _eliminarSeleccion = new Set();
let _totalCardsEliminar = 0;

function abrirModalEliminar(contexto) {
  _eliminarContexto = contexto;
  _eliminarSeleccion.clear();
  _totalCardsEliminar = 0;

  const titulo = contexto === 'fruta' ? t('Seleccionar muestras de piña a eliminar') : t('Seleccionar muestras de aromáticas a eliminar');
  document.getElementById('modal-eliminar-titulo').textContent = titulo;
  document.getElementById('modal-eliminar-cards').innerHTML = '<p class="lote-empty">' + t('Cargando muestras…') + '</p>';
  document.getElementById('modal-eliminar-msg').textContent = '';
  document.getElementById('modal-eliminar-msg').className = 'modal-msg';
  document.getElementById('btn-eliminar-guardar').disabled = true;
  const btnSel = document.getElementById('btn-seleccionar-todas');
  if (btnSel) { btnSel.style.display = 'none'; btnSel.textContent = t('Seleccionar todas'); }
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
  if (btn) { btn.disabled = false; btn.textContent = t('🗑️ Eliminar'); }
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
      document.getElementById('modal-eliminar-cards').innerHTML = '<p class="lote-empty">' + t('Error al cargar muestras') + '</p>';
      return;
    }
    const esFruta = contexto === 'fruta';
    const frutaId = contexto === 'fruta'
      ? (rows.length > 0 ? rows[0].fruta_id : null)
      : (typeof _frutaIdAro !== 'undefined' && _frutaIdAro ? _frutaIdAro : null);
    if (frutaId && typeof cargarEstadosFruta === 'function') {
      await cargarEstadosFruta(frutaId, esFruta ? 'frutas' : 'aromaticas');
    }
    renderCardsEliminar(rows, contexto);
  } catch (e) {
    console.error('Error cargando muestras para eliminar:', e);
    document.getElementById('modal-eliminar-cards').innerHTML = '<p class="lote-empty">' + t('Error de conexión') + '</p>';
  }
}

function renderCardsEliminar(rows, contexto) {
  const container = document.getElementById('modal-eliminar-cards');
  if (!rows || rows.length === 0) {
    container.innerHTML = '<p class="lote-empty">' + t('No hay muestras para mostrar') + '</p>';
    return;
  }

  const esFruta = contexto === 'fruta';
  const frutaId = rows.length > 0 ? (esFruta ? rows[0].fruta_id : rows[0].aromatica_id) : null;
  const cacheKey = frutaId ? frutaId + '_' + (esFruta ? 'frutas' : 'aromaticas') : '';
  const estados = (frutaId && _estadosCache[cacheKey]) ? _estadosCache[cacheKey] : [];
  _totalCardsEliminar = rows.length;
  const btnSel = document.getElementById('btn-seleccionar-todas');
  if (btnSel) {
    btnSel.style.display = _totalCardsEliminar > 0 ? 'inline-block' : 'none';
    btnSel.textContent = t('Seleccionar todas');
  }
  const totalMsg = document.getElementById('eliminar-total-msg');
  if (totalMsg) totalMsg.textContent = `${_totalCardsEliminar} ${t('muestra(s)')}`;
  container.innerHTML = rows.map(r => {
    const nivel = Number.parseFloat(r.nivel_maduracion);
    const displayName = formatearNombreMuestra(r.nombre_muestra) || '–';
    const fotoHtml = r.imagen_muestra
      ? `<div class="fruit-visual"><img src="${escapeHtml(IMG_BASE + r.imagen_muestra)}" alt=""></div>`
      : `<div class="fruit-visual ${esFruta ? 'pineapple-a' : 'aromatic-a'}">${esFruta ? '🍍' : '🌿'}</div>`;
    const estadoHTML = r.estado_nombre && r.estado_color_badge
      ? `<span class="status" style="background:${r.estado_color_badge}1a;color:${r.estado_color_badge};border:1px solid ${r.estado_color_badge}30;flex-shrink:0;">${escapeHtml(t(r.estado_nombre))}</span>`
      : (estados.length > 0 ? estadoHtmlDinamico(nivel, estados) : (esFruta ? estadoPorNivelFruta(nivel) : estadoPorNivelAromatica(nivel)));
    const confianza = Number.isFinite(Number(r.confianza)) ? `${fmt(r.confianza)}%` : '–';
    const fillClass = nivel >= 7 ? 'green' : nivel >= 4 ? 'yellow' : 'red';
    const porcentaje = Number.isFinite(nivel) ? Math.max(0, Math.min(100, nivel * 10)) : 0;

    return `<div class="eliminar-card" onclick="toggleEliminarCard(this, ${escapeHtml(r.id)})">
      <input type="checkbox" name="eliminar-check" value="${escapeHtml(r.id)}" style="display:none;">
      <div class="fruit-card" style="margin:0;width:100%;max-width:none;">
        ${fotoHtml}
        <div class="fruit-head">
          <div>
            <span class="card-label">${t('Nombre de la muestra:')}</span>
            <strong>${escapeHtml(displayName)}</strong>
          </div>
          ${estadoHTML}
        </div>
        <div class="level-block">
          <span>${esFruta ? t('Nivel de maduración') : t('Nivel de pigmentación')}</span>
          <strong>${fmtDecimal(nivel, 1)} / 10</strong>
          <div class="progress"><span class="fill ${fillClass}" style="width:${porcentaje}%"></span></div>
        </div>
        <div class="mini-stats">
          <div><span>${t('Confianza del modelo')}</span><strong>${escapeHtml(confianza)}</strong></div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function toggleSeleccionarTodas() {
  const btn = document.getElementById('btn-seleccionar-todas');
  const todas = btn.textContent === t('Seleccionar todas');
  document.querySelectorAll('#modal-eliminar-cards .eliminar-card').forEach(card => {
    const cb = card.querySelector('input[type="checkbox"]');
    if (cb) { cb.checked = todas; }
    card.classList.toggle('checked', todas);
  });
  btn.textContent = todas ? t('Deseleccionar todas') : t('Seleccionar todas');
  actualizarSeleccionEliminar();
}

function toggleEliminarCard(el, id) {
  const cb = el.querySelector('input[type="checkbox"]');
  cb.checked = !cb.checked;
  el.classList.toggle('checked', cb.checked);
  const btnSel = document.getElementById('btn-seleccionar-todas');
  if (btnSel && _totalCardsEliminar > 0) {
    const todasChecked = document.querySelectorAll('#modal-eliminar-cards .eliminar-card.checked').length === _totalCardsEliminar;
    btnSel.textContent = todasChecked ? t('Deseleccionar todas') : t('Seleccionar todas');
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
    msg.textContent = `${n}${t(' de ')}${_totalCardsEliminar}${t(' muestra(s) seleccionada(s)')}`;
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
  btn.textContent = t('Eliminando…');

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
      
      btn.disabled = false;
      btn.textContent = t('🗑️ Eliminar');
      return;
    }

    cerrarModalEliminar();

    if (_eliminarContexto === 'fruta') {
      await cargarKpisFrutas(); await cargarTablaFrutas(); await cargarCardsFrutas();
      await cargarDetalleColorFrutas(); await cargarReflectanciasFrutas(); await cargarArchivosFrutas();
      await actualizarKpisFrutas();
      await refrescarDonutsConEstados();
    } else {
      await cargarKpisAromaticas(); await cargarTablaAromaticas(); await cargarCardsAromaticas();
      await cargarDetalleColorAromaticas(); await cargarReflectanciasAromaticas(); await cargarArchivosAromaticas();
      await actualizarKpisAromaticas();
      await refrescarDonutsConEstados();
    }
  } catch (e) {
    clearTimeout(timeoutId);
    console.error('Error eliminando muestras:', e);
    if (e.name === 'AbortError') {
      
    } else {
      
    }
    btn.disabled = false;
    btn.textContent = t('🗑️ Eliminar');
  }
}

// ── Individual Sample Analysis Modal ─────────────────────────
let _individualContexto = null;
let _individualRows = [];
let _individualFrutaId = null;
let _individualEstados = [];
let _mostrarSoloAlertasIndividual = false;
let _individualImagen = null;

function abrirModalIndividual(contexto, data) {
  _individualContexto = contexto;
  _individualFrutaId = data.fruta_id || null;
  _individualRows = [];
  _individualEstados = [];
  _mostrarSoloAlertasIndividual = false;
  _individualImagen = data.imagen_muestra || null;

  const nombreDisplay = formatearNombreMuestra(data.nombre_muestra_personalizado || data.nombre_muestra || '');
  const nivelLabel = contexto === 'fruta' ? t('Maduración') : t('Pigmentación');
  document.getElementById('modal-individual-title').textContent =
    `${t('Análisis individual de muestra: ')}${nombreDisplay}`;
  document.querySelectorAll('.individual-nivel-label').forEach(el => {
    el.textContent = nivelLabel;
  });

  document.getElementById('tbody-individual').innerHTML = '<tr><td colspan="5" class="lote-empty">' + t('Cargando…') + '</td></tr>';
  document.querySelector('.individual-donut-total').textContent = '–';
  document.getElementById('legend-individual').innerHTML = '';
  document.getElementById('filter-individual-muestra').value = '';
  document.getElementById('filter-individual-estado').value = '';
  document.getElementById('filter-individual-confianza').value = '';
  document.getElementById('modal-individual').style.display = 'flex';

  const imgContainer = document.getElementById('individual-imagen-muestra');
  if (imgContainer) {
    if (_individualImagen) {
      imgContainer.innerHTML = `<img src="${IMG_BASE + _individualImagen}" alt="${t('Muestra')}" style="max-width:100%;max-height:240px;border-radius:8px;border:1px solid #e5e7eb;box-shadow:0 1px 4px rgba(0,0,0,.08);">`;
    } else {
      imgContainer.innerHTML = '';
    }
  }

  cargarDetalleIndividual(contexto, data.archivo_origen, data.fruta_id);
}

function cerrarModalIndividual() {
  document.getElementById('modal-individual').style.display = 'none';
  _individualContexto = null;
  _individualRows = [];
  _individualFrutaId = null;
  _individualEstados = [];
  _mostrarSoloAlertasIndividual = false;
  _individualImagen = null;
}

async function cargarDetalleIndividual(contexto, archivoOrigen, frutaId) {
  const endpoint = contexto === 'fruta' ? 'detalle_individual_fruta' : 'detalle_individual_aromatica';
  try {
    const res = await fetch(`${API}?endpoint=${endpoint}&archivo_origen=${encodeURIComponent(archivoOrigen)}`);
    const data = await res.json();
    if (!Array.isArray(data)) {
      document.getElementById('tbody-individual').innerHTML = '<tr><td colspan="5" class="lote-empty">' + t('Error al cargar datos') + '</td></tr>';
      return;
    }
    _individualRows = data;

    if (!frutaId && data.length > 0) {
      _individualFrutaId = data[0].fruta_id || null;
    }

    const categoria = contexto === 'fruta' ? 'frutas' : 'aromaticas';
    const estados = await cargarEstadosFruta(_individualFrutaId || 0, categoria);
    _individualEstados = estados;

    // Populate estado filter
    const estadoSelect = document.getElementById('filter-individual-estado');
    if (estadoSelect) {
      const actual = estadoSelect.value;
      estadoSelect.innerHTML = '<option value="">' + t('Todos los estados') + '</option>' +
        (estados.length > 0
          ? estados.map(e => `<option value="${escapeHtml(e.nombre)}">${escapeHtml(t(e.nombre))}</option>`).join('')
          : [t('Óptima'),t('En Proceso'),t('No Madura'),t('Pigmentación Óptima'),t('Baja Pigmentación')]
              .map(n => `<option value="${n}">${n}</option>`).join(''));
      if (Array.from(estadoSelect.options).some(o => o.value === actual)) estadoSelect.value = actual;
    }

    renderIndividualDonut(data, estados);
    renderTablaIndividual(data, contexto, estados);
  } catch (e) {
    console.error('Error cargando detalle individual:', e);
    document.getElementById('tbody-individual').innerHTML = '<tr><td colspan="5" class="lote-empty">' + t('Error de conexión') + '</td></tr>';
  }
}

function renderIndividualDonut(rows, estados) {
  const donutEl = document.querySelector('.donut-individual');
  const legendEl = document.getElementById('legend-individual');
  const totalEl = document.querySelector('.individual-donut-total');

  if (!rows || rows.length === 0) {
    if (totalEl) totalEl.textContent = '0';
    if (donutEl) donutEl.style.background = '#ddd';
    if (legendEl) legendEl.innerHTML = '';
    return;
  }

  if (estados.length > 0) {
    const segmentos = contarPorEstado(rows, estados);
    const total = segmentos.reduce((s, e) => s + e.count, 0);
    if (totalEl) totalEl.textContent = fmt(total);
    if (donutEl) actualizarDonutN(donutEl, segmentos, total);
    if (legendEl) renderLegend(legendEl, segmentos, total);
  } else {
    // Fallback to 3-tier
    const optimas = rows.filter(r => Number(r.nivel_maduracion) >= 7).length;
    const proceso = rows.filter(r => Number(r.nivel_maduracion) >= 4 && Number(r.nivel_maduracion) < 7).length;
    const bajas = rows.filter(r => Number(r.nivel_maduracion) < 4).length;
    const total = rows.length;
    if (totalEl) totalEl.textContent = fmt(total);
    if (donutEl) actualizarDonut(donutEl, optimas, proceso, bajas, total);
    if (legendEl) {
      const pct = (v) => total > 0 ? ((v / total) * 100).toFixed(1) + '%' : '0.0%';
      legendEl.innerHTML = `
        <div><span class="dot" style="background:var(--green)"></span> ${t('Óptima')} <strong>${pct(optimas)}</strong> <small>(${fmt(optimas)})</small></div>
        <div><span class="dot" style="background:var(--yellow)"></span> ${t('En Proceso')} <strong>${pct(proceso)}</strong> <small>(${fmt(proceso)})</small></div>
        <div><span class="dot" style="background:var(--red)"></span> ${t('Baja')} <strong>${pct(bajas)}</strong> <small>(${fmt(bajas)})</small></div>
      `;
    }
  }
}

function estadoTextoIndividual(nivel, estados) {
  if (estados.length > 0) {
    const est = obtenerEstadoDinamico(nivel, estados);
    return est ? t(est.nombre) : '';
  }
  const n = Number(nivel);
  if (n >= 7) return _individualContexto === 'fruta' ? t('Maduración Óptima') : t('Pigmentación Óptima');
  if (n >= 4) return t('En Proceso');
  return _individualContexto === 'fruta' ? t('No Madura') : t('Baja Pigmentación');
}

function estadoHtmlIndividual(nivel, estados) {
  if (estados.length > 0) {
    return estadoHtmlDinamico(nivel, estados);
  }
  if (_individualContexto === 'fruta') return estadoPorNivelFruta(nivel);
  return estadoPorNivelAromatica(nivel);
}

function renderTablaIndividual(rows, contexto, estados) {
  const tbody = document.getElementById('tbody-individual');
  if (!tbody) return;
  if (!rows || rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="lote-empty">' + t('No hay datos individuales') + '</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(r => {
    const nivel = Number.parseFloat(r.nivel_maduracion);
    const confianza = Number.isFinite(Number(r.confianza)) ? `${fmt(r.confianza)}%` : '–';
    const nombreMuestra = formatearNombreMuestra(r.nombre_muestra) || '–';
    const lVal = Number(r.l);
    const umbral = contexto === 'fruta' ? 15 : 20;
    const esAnomaliaL = lVal > 0 && lVal < umbral;
    const esFalsoOptimo = r.alerta_falso_optimo === true || r.alerta_falso_optimo === '1';
    const tieneAlerta = esAnomaliaL || esFalsoOptimo;
    let warningTitle = '';
    if (tieneAlerta) {
      const msgs = [];
      if (esAnomaliaL) {
        msgs.push(contexto === 'fruta'
          ? `⚠ L*=${escapeHtml(String(r.l))} — ${t('medición en zona oscura. Revisar posicionamiento del colorímetro.')}`
          : `⚠ L*=${escapeHtml(String(r.l))} — ${t('medición atípica para aromáticas. Verificar posicionamiento del colorímetro.')}`);
      }
      if (esFalsoOptimo) {
        msgs.push(contexto === 'fruta'
          ? `⚠ Hue° bajo (${escapeHtml(r.hue_angle ?? '?')}°): ${t('la madurez del tejido interno puede diferir de la cáscara. Verificar visualmente.')}`
          : `⚠ Hue° bajo (${escapeHtml(r.hue_angle ?? '?')}°): ${t('la pigmentación medida puede no reflejar el estado visual. Verificar.')}`);
      }
      warningTitle = ` title="${escapeHtml(msgs.join(' | '))}"`;
    }
    const warningHtml = tieneAlerta ? `<span class="warning-icon"${warningTitle}>⚠️</span>` : '';
    return `<tr>
      <td title="${escapeHtml(nombreMuestra)}">${escapeHtml(nombreMuestra)}</td>
      <td>${fmtDecimal(nivel, 1)} / 10</td>
      <td>${estadoHtmlIndividual(nivel, estados)}</td>
      <td>${escapeHtml(confianza)}</td>
      <td class="cell-warning">${warningHtml}</td>
    </tr>`;
  }).join('');
}

function filtrarTablaIndividual() {
  const busqueda = (document.getElementById('filter-individual-muestra')?.value ?? '').toLowerCase();
  const estado = document.getElementById('filter-individual-estado')?.value ?? '';
  const confianza = document.getElementById('filter-individual-confianza')?.value ?? '';
  let filtradas = _individualRows.filter(r => {
    const nombre = (r.nombre_muestra ?? '').toLowerCase();
    const nivel = Number.parseFloat(r.nivel_maduracion);
    const conf = Number(r.confianza);
    if (busqueda && !nombre.includes(busqueda)) return false;
    if (estado && estadoTextoIndividual(nivel, _individualEstados) !== estado) return false;
    if (confianza === 'alta' && conf < 80) return false;
    if (confianza === 'media' && (conf < 50 || conf >= 80)) return false;
    if (confianza === 'baja' && conf >= 50) return false;
    return true;
  });
  if (_mostrarSoloAlertasIndividual) {
    filtradas = filtradas.filter(r => {
      const lVal = Number(r.l);
      const umbral = _individualContexto === 'fruta' ? 15 : 20;
      return (lVal > 0 && lVal < umbral) || (r.alerta_falso_optimo === true || r.alerta_falso_optimo === '1');
    });
  }
  renderTablaIndividual(filtradas, _individualContexto, _individualEstados);
}

function limpiarFiltrosIndividual() {
  ['filter-individual-muestra', 'filter-individual-estado', 'filter-individual-confianza']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  _mostrarSoloAlertasIndividual = false;
  renderTablaIndividual(_individualRows, _individualContexto, _individualEstados);
}

// ── Click-to-close individual modal on overlay click ────────
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modal-individual');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) cerrarModalIndividual();
    });
  }
});
