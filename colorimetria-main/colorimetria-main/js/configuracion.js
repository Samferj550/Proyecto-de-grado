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
let _proveedorConfigTiposCache = {};
let _proveedorConfigSeleccion = [];

async function cargarTiposConfigProveedor() {
  try {
    const [frutas, aroms] = await Promise.all([
      fetch(API + '?endpoint=config_frutas_listar').then(r => r.json()),
      fetch(API + '?endpoint=config_aromaticas_listar').then(r => r.json())
    ]);
    _proveedorConfigTiposCache = {
      frutas: Array.isArray(frutas) ? frutas : [],
      aromaticas: Array.isArray(aroms) ? aroms : []
    };
  } catch (e) { console.error('Error loading tipos for config:', e); }
}

function renderTiposProveedor(categoria) {
  const container = document.getElementById('tipos-' + categoria + '-proveedor');
  if (!container) return;
  const tipos = _proveedorConfigTiposCache[categoria] || [];
  container.innerHTML = tipos.map(tipo => {
    const checked = _proveedorConfigSeleccion.some(s => s.categoria === categoria && s.tipo_id === tipo.id);
    return `<label><input type="checkbox" data-categoria="${categoria}" data-tipo-id="${tipo.id}" ${checked ? 'checked' : ''} onchange="actualizarConfigSeleccion()"> ${escapeHtml(t(tipo.nombre))}</label>`;
  }).join('');
}

function toggleCategoriaProveedor(cat) {
  const container = document.getElementById('tipos-' + cat + '-proveedor');
  if (container) container.style.display = document.querySelector(`.check-categoria-proveedor[value="${cat}"]`)?.checked ? 'block' : 'none';
  if (document.querySelector(`.check-categoria-proveedor[value="${cat}"]`)?.checked) {
    renderTiposProveedor(cat);
  }
}

function actualizarConfigSeleccion() {
  _proveedorConfigSeleccion = [];
  document.querySelectorAll('.tipo-checkbox-grid input[type="checkbox"]:checked').forEach(cb => {
    _proveedorConfigSeleccion.push({
      categoria: cb.dataset.categoria,
      tipo_id: parseInt(cb.dataset.tipoId, 10)
    });
  });
}

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
          <button onclick="abrirWizardEditarProveedor(${p.id})" title="${t('Editar')}">✏️</button>
          <button onclick="eliminarProveedor(${p.id})" title="${t('Eliminar')}" class="btn-danger-sm">🗑️</button>
        </td>
      </tr>
    `).join('');
    document.getElementById('check-proveedores-all').checked = false;
    actualizarBtnEliminarProveedores();
    if (typeof cargarSelectorProveedores === 'function') await cargarSelectorProveedores(false);
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

  await cargarTiposConfigProveedor();

  if (!id || id === 'null' || id === '0') {
    titulo.textContent = t('Nuevo Proveedor');
    nombre.value = ''; nit.value = ''; contacto.value = ''; telefono.value = ''; ciudad.value = ''; notas.value = '';
    idInput.value = '';
    _proveedorConfigSeleccion = [];
    document.querySelectorAll('.check-categoria-proveedor').forEach(c => c.checked = false);
    document.querySelectorAll('.tipo-checkbox-grid').forEach(g => g.style.display = 'none');
    document.querySelectorAll('.tipo-checkbox-grid input[type="checkbox"]').forEach(c => c.checked = false);
    overlay.style.display = 'flex';
    return;
  }

  try {
    const res = await fetch(API + '?endpoint=proveedores_listar');
    const data = await res.json();
    const p = (Array.isArray(data) ? data : []).find(x => x.id == id);
    if (!p) return;
    titulo.textContent = t('Editar Proveedor');
    nombre.value = p.nombre || '';
    nit.value = p.nit || '';
    contacto.value = p.contacto || '';
    telefono.value = p.telefono || '';
    ciudad.value = p.ciudad || '';
    notas.value = p.notas || '';
    idInput.value = p.id;

    const resCfg = await fetch(API + `?endpoint=proveedor_config_obtener&proveedor_id=${p.id}`);
    const cfg = await resCfg.json();
    _proveedorConfigSeleccion = Array.isArray(cfg) ? cfg.map(c => ({ categoria: c.categoria, tipo_id: c.tipo_id })) : [];
    document.querySelectorAll('.check-categoria-proveedor').forEach(cb => {
      const cat = cb.value;
      const hasAny = _proveedorConfigSeleccion.some(s => s.categoria === cat);
      cb.checked = hasAny;
    });
    document.querySelectorAll('.check-categoria-proveedor').forEach(cb => {
      toggleCategoriaProveedor(cb.value);
    });
  } catch (e) { console.error('Error cargando proveedor:', e); }
}

function cerrarModalProveedor() {
  limpiarErroresProveedor();
  const el = document.getElementById('modal-proveedor');
  if (el) el.style.display = 'none';
}

function limpiarErroresProveedor() {
  ['modal-proveedor-error','error-nit-proveedor','error-tel-proveedor'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.style.display = 'none'; }
  });
}

function validarNit(valor) {
  if (!valor) return '';
  if (!/^\d+$/.test(valor)) return t('El NIT solo debe contener números.');
  if (valor.length > 10) return t('El NIT no puede tener más de 10 dígitos.');
  return '';
}

function validarTelefono(valor) {
  if (!valor) return '';
  if (!/^\d+$/.test(valor)) return t('El teléfono solo debe contener números.');
  if (valor.length < 7 || valor.length > 10) return t('El teléfono debe tener entre 7 y 10 dígitos.');
  return '';
}

async function guardarProveedor() {
  limpiarErroresProveedor();
  const id = document.getElementById('input-proveedor-id')?.value || '';
  const nombre = document.getElementById('input-proveedor-nombre')?.value?.trim();
  const nitVal = document.getElementById('input-proveedor-nit')?.value?.trim();
  const telVal = document.getElementById('input-proveedor-telefono')?.value?.trim();
  if (!nombre) {
    const el = document.getElementById('modal-proveedor-error');
    if (el) { el.textContent = t('El nombre es obligatorio'); el.style.display = 'block'; }
    return;
  }
  if (!nitVal) {
    const el = document.getElementById('error-nit-proveedor');
    if (el) { el.textContent = t('El NIT es obligatorio'); el.style.display = 'block'; }
    return;
  }
  const errN = validarNit(nitVal);
  if (errN) {
    const el = document.getElementById('error-nit-proveedor');
    if (el) { el.textContent = errN; el.style.display = 'block'; }
    return;
  }
  const errT = validarTelefono(telVal);
  if (errT) {
    const el = document.getElementById('error-tel-proveedor');
    if (el) { el.textContent = errT; el.style.display = 'block'; }
    return;
  }
  actualizarConfigSeleccion();
  const payload = {
    nombre,
    nit: nitVal || null,
    contacto: document.getElementById('input-proveedor-contacto')?.value?.trim() || null,
    telefono: telVal || null,
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
    if (data.error) {
      const el = document.getElementById('modal-proveedor-error');
      if (el) { el.textContent = t('Error: ') + (data.mensaje || ''); el.style.display = 'block'; }
      return;
    }
    const proveedorId = id ? parseInt(id, 10) : (data.id || null);
    if (proveedorId && _proveedorConfigSeleccion.length > 0) {
      await fetch(API + '?endpoint=proveedor_config_guardar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proveedor_id: proveedorId, configuracion: _proveedorConfigSeleccion })
      });
    }
    cerrarModalProveedor();
    await cargarTablaProveedores();
    await cargarProveedores();
    if (typeof cargarSelectorProveedores === 'function') await cargarSelectorProveedores(false);
  } catch (e) {
    console.error('Error guardando proveedor:', e);
    const el = document.getElementById('modal-proveedor-error');
    if (el) { el.textContent = t('Error de conexión'); el.style.display = 'block'; }
  }
}

function cerrarModalProveedorProtegido() {
  document.getElementById('modal-proveedor-protegido').style.display = 'none';
}

async function eliminarProveedor(id) {
  try {
    const resCheck = await fetch(`${API}?endpoint=proveedor_tiene_muestras&id=${id}`);
    const dataCheck = await resCheck.json();

    if (dataCheck.tiene_muestras) {
      const resLista = await fetch(API + '?endpoint=proveedores_listar');
      const lista = await resLista.json();
      const prov = (Array.isArray(lista) ? lista : []).find(x => x.id == id);
      const nombre = prov?.nombre ?? 'seleccionado';

      const msg = document.getElementById('modal-protegido-msg');
      if (msg) {
        const detalle = [];
        if (dataCheck.frutas > 0) {
          if (Array.isArray(dataCheck.frutas_detalle) && dataCheck.frutas_detalle.length > 0) {
            const parts = dataCheck.frutas_detalle.map(d => `${d.cnt}${t(' muestra(s) de ')}${d.nombre}`);
            detalle.push(parts.join(', ') + t(' (frutas)'));
          } else {
            detalle.push(dataCheck.frutas + t(' muestra(s) de fruta (frutas)'));
          }
        }
        if (dataCheck.aromaticas > 0) {
          if (Array.isArray(dataCheck.aro_detalle) && dataCheck.aro_detalle.length > 0) {
            const parts = dataCheck.aro_detalle.map(d => `${d.cnt}${t(' muestra(s) de ')}${d.nombre}`);
            detalle.push(parts.join(', ') + t(' (aromáticas)'));
          } else {
            detalle.push(dataCheck.aromaticas + t(' muestra(s) de aromáticas (aromáticas)'));
          }
        }
        if (dataCheck.sin_proveedor > 0) detalle.push(dataCheck.sin_proveedor + t(' muestra(s) sin proveedor asignado'));
        msg.innerHTML = t('El proveedor ') + `<strong>${escapeHtml(nombre)}</strong>` + t(' tiene datos asociados:') +
          `<br><br><strong>${detalle.join(t(' y '))}</strong><br><br>` +
          t('Elimina primero las muestras desde el módulo correspondiente antes de borrar el proveedor.');
      }
      document.getElementById('modal-proveedor-protegido').style.display = 'flex';
      return;
    }

    abrirConfirmEliminarProveedor(
      t('¿Estás seguro de que deseas eliminar este proveedor?'),
      async () => {
        await _ejecutarEliminarProveedor([id]);
      }
    );
  } catch (e) {
    console.error('Error verificando muestras del proveedor:', e);
  }
}

function abrirConfirmEliminarProveedor(mensaje, onConfirm) {
  const modal = document.getElementById('modal-confirm-eliminar-proveedor');
  const msg   = document.getElementById('modal-confirm-eliminar-msg');
  const btn   = document.getElementById('btn-confirm-eliminar-proveedor');
  if (!modal || !msg || !btn) return;
  msg.innerHTML = mensaje;
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', async () => {
    modal.style.display = 'none';
    await onConfirm();
  });
  modal.style.display = 'flex';
}

async function _ejecutarEliminarProveedor(ids) {
  const teniaElActivo = ids.some(id => id === _proveedorIdFiltro);
  for (const id of ids) {
    try {
      const res = await fetch(API + '?endpoint=proveedores_eliminar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.error) console.error('Error eliminando proveedor', id, data.mensaje);
    } catch (e) { console.error('Error de conexión eliminando proveedor:', e); }
  }
  await cargarTablaProveedores();
  await cargarProveedores();
  if (typeof cargarSelectorProveedores === 'function') await cargarSelectorProveedores(true);
  if (teniaElActivo && typeof cargarTodoElDashboard === 'function') await cargarTodoElDashboard();
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

  const resLista = await fetch(API + '?endpoint=proveedores_listar');
  const lista = await resLista.json();

  const conMuestras = [];
  const sinMuestras = [];

  for (const id of ids) {
    try {
      const resCheck = await fetch(`${API}?endpoint=proveedor_tiene_muestras&id=${id}`);
      const dataCheck = await resCheck.json();
      const prov = (Array.isArray(lista) ? lista : []).find(x => x.id == id);
      const nombre = prov?.nombre ?? `ID ${id}`;

      if (dataCheck.tiene_muestras) {
        conMuestras.push({
          nombre,
          frutas: dataCheck.frutas ?? 0,
          aromaticas: dataCheck.aromaticas ?? 0,
          frutas_detalle: dataCheck.frutas_detalle ?? [],
          aro_detalle: dataCheck.aro_detalle ?? []
        });
      } else {
        sinMuestras.push(id);
      }
    } catch {}
  }

  if (sinMuestras.length === 0 && conMuestras.length > 0) {
    const lista_html = conMuestras.map(p => {
      const detalle = [];
      if (p.frutas > 0) {
        if (Array.isArray(p.frutas_detalle) && p.frutas_detalle.length > 0) {
          const parts = p.frutas_detalle.map(d => `${d.cnt}${t(' muestra(s) de ')}${d.nombre}`);
          detalle.push(parts.join(', ') + t(' (frutas)'));
        } else {
          detalle.push(p.frutas + t(' muestra(s) de fruta (frutas)'));
        }
      }
      if (p.aromaticas > 0) {
        if (Array.isArray(p.aro_detalle) && p.aro_detalle.length > 0) {
          const parts = p.aro_detalle.map(d => `${d.cnt}${t(' muestra(s) de ')}${d.nombre}`);
          detalle.push(parts.join(', ') + t(' (aromáticas)'));
        } else {
          detalle.push(p.aromaticas + t(' muestra(s) de aromáticas'));
        }
      }
      return `<li><strong>${escapeHtml(p.nombre)}</strong> — ${detalle.join(', ')}</li>`;
    }).join('');
    const msg = document.getElementById('modal-protegido-msg');
    if (msg) msg.innerHTML = t('Los siguientes proveedores tienen datos asociados y <strong>no pueden eliminarse</strong>:') +
      `<br><br><ul style="text-align:left;margin:0 auto;display:inline-block;">${lista_html}</ul><br>` +
      t('Elimina primero sus muestras desde el módulo correspondiente.');
    document.getElementById('modal-proveedor-protegido').style.display = 'flex';
    return;
  }

  let mensaje = '';
  if (sinMuestras.length > 0 && conMuestras.length > 0) {
    const lista_bloq = conMuestras.map(p => `<li><strong>${escapeHtml(p.nombre)}</strong></li>`).join('');
    mensaje = t('Se eliminarán ') + `<strong>${sinMuestras.length}</strong>` +
      t(' proveedor(es) sin datos.') +
      `<br><br>` + t('Los siguientes <strong>no</strong> se eliminarán porque tienen muestras asociadas:') +
      `<ul style="text-align:left;margin:8px auto 0;display:inline-block;">${lista_bloq}</ul>`;
  } else {
    mensaje = t('¿Eliminar ') + sinMuestras.length + t(' proveedor(es) seleccionado(s)? Esta acción no se puede deshacer.');
  }

  abrirConfirmEliminarProveedor(mensaje, async () => {
    await _ejecutarEliminarProveedor(sinMuestras);
    if (conMuestras.length > 0) {
      const lista_bloq = conMuestras.map(p => `<li><strong>${escapeHtml(p.nombre)}</strong></li>`).join('');
      const msg = document.getElementById('modal-protegido-msg');
      if (msg) msg.innerHTML = t('Los proveedores sin datos fueron eliminados correctamente.') +
        `<br><br>` + t('Los siguientes proveedores <strong>no se eliminaron</strong> porque tienen muestras:') +
        `<ul style="text-align:left;margin:8px auto 0;display:inline-block;">${lista_bloq}</ul>`;
      document.getElementById('modal-proveedor-protegido').style.display = 'flex';
    }
  });
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
        <span class="item-nombre" title="${escapeHtml(t(f.nombre))}">${escapeHtml(t(f.nombre))}</span>
        ${f.coming_soon == 1 ? '<span class="badge-soon">' + t('En Desarrollo') + '</span>' : '<span class="badge-active">' + t('Activo') + '</span>'}
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
        <span class="item-nombre" title="${escapeHtml(t(f.nombre))}">${escapeHtml(t(f.nombre))}</span>
        <span class="badge-active">${t('Activo')}</span>
      </div>
    `).join('');
  } catch (e) { console.error('Error cargando aromáticas:', e); }
}
