// js/wizard.js
let _modoInicial = false;
let _editandoProveedorId = null;
let _editRestore = null;
let _creandoProveedor = false;
let _pendienteCrearProveedor = false;
let _wizardImagenesLote = [];
let _wizardCsvFiles = [];
let _wizardCsvNombresExtraidos = [];
let _wizardCsvNombresOriginales = [];
let _wizardAsignaciones = {};
let _wizardIndNombreOriginal = '';
let _dirtyIndividual = false;
let _dirtyLote = false;

window.addEventListener('beforeunload', e => {
    if (_dirtyIndividual || _dirtyLote) {
        e.preventDefault();
        e.returnValue = '';
    }
});

const sesion = {
    proveedor:    null,
    categoria:    null,
    fruta:        null,
    fecha:        null,
    nMuestras:    null,
    imagen:       null,
    estadosFiltro: []
};

const VISTAS = ['vista-proveedor','vista-categoria','vista-fruta',
                'vista-sesion','dashboard-main'];

function mostrarVista(id) {
    VISTAS.forEach(v => {
        const el = document.getElementById(v);
        if (el) el.style.display = (v === id) ? '' : 'none';
    });
    actualizarStepper(id);
    actualizarTituloWizard(id);
}

function actualizarTituloWizard(id) {
    const titulo = _modoInicial ? t('Configuración inicial') : t('Nuevo proveedor');
    document.querySelectorAll('#wizard-modal section[id^="vista-"] h1').forEach(h => {
        h.textContent = '📋 ' + titulo;
    });
}

// ── Modo inicial / navegación ──────────────────────────────────
function abrirWizard() {
    volverAlWizard(true);
}

function volverAlWizard(modoInicial) {
    _modoInicial = modoInicial === true;
    if (_modoInicial) {
        const browserLang = (navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'en';
        idiomaActual = browserLang;
        localStorage.removeItem('colorimetria_idioma');
        if (typeof actualizarSelectorIdioma === 'function') actualizarSelectorIdioma();
        if (typeof traducirDOM === 'function') traducirDOM();
    }
    sessionStorage.removeItem('sesion_colorimetria');
    document.querySelectorAll('.wizard-close').forEach(el => {
        el.classList.toggle('hidden', _modoInicial);
    });
    mostrarVista('vista-proveedor');
    const overlay = document.getElementById('wizard-modal');
    if (overlay) overlay.style.display = 'flex';
    cargarProveedores();
}

function abrirWizardNuevoProveedor() {
    _creandoProveedor = true;
    _editandoProveedorId = null;
    _modoInicial = false;
    sessionStorage.removeItem('sesion_colorimetria');
    document.querySelectorAll('.wizard-close').forEach(el => {
        el.classList.remove('hidden');
    });
    mostrarVista('vista-proveedor');
    const overlay = document.getElementById('wizard-modal');
    if (overlay) overlay.style.display = 'flex';
    const grid = document.getElementById('grid-proveedores');
    const form = document.getElementById('form-crear-proveedor');
    if (grid) grid.style.display = 'none';
    if (form) form.classList.add('visible');
    document.getElementById('btn-cancelar-proveedor').style.display = 'none';
    const guardarBtn = form?.querySelector('.btn-next');
    if (guardarBtn) {
        guardarBtn.textContent = t('Siguiente');
        guardarBtn.onclick = guardarNuevoProveedor;
    }
}

function cancelarCrearProveedor() {
    _editandoProveedorId = null;
    document.getElementById('error-nombre').textContent = '';
    document.getElementById('error-nit').textContent = '';
    document.getElementById('error-telefono').textContent = '';
    const form = document.getElementById('form-crear-proveedor');
    if (form) form.classList.remove('visible');
    const guardarBtn = form?.querySelector('.btn-next');
    if (guardarBtn) {
        guardarBtn.textContent = t('Siguiente');
        guardarBtn.onclick = guardarNuevoProveedor;
    }
    const grid = document.getElementById('grid-proveedores');
    if (grid) grid.style.display = '';
    cargarProveedores();
}

async function cancelarWizard() {
    _creandoProveedor = false;
    if (_modoInicial) return;
    const overlay = document.getElementById('wizard-modal');
    if (overlay) overlay.style.display = 'none';
    mostrarVista('dashboard-main');
    if (sesion.proveedor?.id && typeof cambiarProveedorDashboard === 'function') {
        await cambiarProveedorDashboard(sesion.proveedor);
    } else if (typeof cargarSelectorProveedores === 'function') {
        await cargarSelectorProveedores(true);
    }
}

function irAtras(vistaActual) {
    const orden = ['vista-proveedor','vista-categoria','vista-fruta','vista-sesion'];
    const idx = orden.indexOf(vistaActual);
    if (idx > 0) {
        mostrarVista(orden[idx - 1]);
        if (orden[idx - 1] === 'vista-categoria') {
            _categoriaSeleccionada = null;
            document.getElementById('btn-next-categoria').disabled = true;
            document.querySelectorAll('.categoria-card').forEach(el => el.classList.remove('selected'));
            if (sesion.categoria) cargarTiposFruta(sesion.categoria).catch(() => {});
        }
        if (orden[idx - 1] === 'vista-proveedor') {
            if (_creandoProveedor && sesion.proveedor) {
                const grid = document.getElementById('grid-proveedores');
                const form = document.getElementById('form-crear-proveedor');
                if (grid) grid.style.display = 'none';
                if (form) form.classList.add('visible');
                document.getElementById('btn-cancelar-proveedor').style.display = 'none';
                const p = sesion.proveedor;
                document.getElementById('input-nuevo-proveedor-nombre').value = p.nombre || '';
                document.getElementById('input-nuevo-proveedor-nit').value = p.nit || '';
                document.getElementById('input-nuevo-proveedor-ciudad').value = p.ciudad || '';
                document.getElementById('input-nuevo-proveedor-contacto').value = p.contacto || '';
                document.getElementById('input-nuevo-proveedor-telefono').value = p.telefono || '';
            } else {
                cargarProveedores().then(() => {
                    if (sesion.proveedor) elegirProveedor(sesion.proveedor);
                });
            }
        }
    }
}

// ── Paso 1: Proveedor ──────────────────────────────────────────
async function cargarProveedores() {
    const res  = await fetch('api.php?endpoint=proveedores_listar');
    const data = await res.json();
    const grid = document.getElementById('grid-proveedores');
    const form = document.getElementById('form-crear-proveedor');
    if (!grid) return;
    grid.style.display = '';
    grid.innerHTML = '';
    const provs = Array.isArray(data) ? data : [];

    document.getElementById('btn-cancelar-proveedor').style.display = provs.length > 0 ? '' : 'none';

    if (provs.length === 0) {
        if (form) form.classList.add('visible');
        grid.style.display = 'none';
        return;
    }

    if (form) form.classList.remove('visible');

    if (provs.length === 1) {
        provs.forEach(p => {
            const card = document.createElement('div');
            card.className = 'proveedor-card';
            card.innerHTML = `
                <h3>${p.nombre}</h3>
                <p>${p.ciudad ?? ''} ${p.nit ? 'NIT: '+p.nit : ''}</p>`;
        card.addEventListener('click', () => {
            elegirProveedor(p);
            mostrarVista('vista-categoria');
        });
            grid.appendChild(card);
        });
        elegirProveedor(provs[0]);
        mostrarVista('vista-categoria');
        return;
    }

    provs.forEach(p => {
        const card = document.createElement('div');
        card.className = 'proveedor-card';
        card.innerHTML = `
            <h3>${p.nombre}</h3>
            <p>${p.ciudad ?? ''} ${p.nit ? 'NIT: '+p.nit : ''}</p>`;
        card.addEventListener('click', () => elegirProveedor(p));
        grid.appendChild(card);
    });
}

function elegirProveedor(p) {
    sesion.proveedor = p;
    document.querySelectorAll('.proveedor-card').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.grid-proveedores > .proveedor-card').forEach(c => {
        const h3 = c.querySelector('h3');
        if (h3 && h3.textContent === p.nombre) c.classList.add('selected');
    });
    _categoriaSeleccionada = null;
    document.getElementById('btn-next-categoria').disabled = true;
    document.querySelectorAll('.categoria-card').forEach(el => el.classList.remove('selected'));
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

async function guardarNuevoProveedor() {
    const errorNombre = document.getElementById('error-nombre');
    const errorNit = document.getElementById('error-nit');
    const errorTel = document.getElementById('error-telefono');
    errorNombre.textContent = '';
    errorNit.textContent = '';
    errorTel.textContent = '';
    const nombre = document.getElementById('input-nuevo-proveedor-nombre')?.value?.trim();
    const nitVal = document.getElementById('input-nuevo-proveedor-nit')?.value?.trim();
    const telVal = document.getElementById('input-nuevo-proveedor-telefono')?.value?.trim();
    if (!nombre) { errorNombre.textContent = t('El nombre es obligatorio.'); return; }
    if (!nitVal) { errorNit.textContent = t('El NIT es obligatorio.'); return; }
    const errNit = validarNit(nitVal);
    if (errNit) { errorNit.textContent = errNit; return; }
    const errTel = validarTelefono(telVal);
    if (errTel) { errorTel.textContent = errTel; return; }
    _creandoProveedor = true;
    sesion.proveedor = {
        nombre,
        nit: nitVal || null,
        ciudad: document.getElementById('input-nuevo-proveedor-ciudad')?.value?.trim() || null,
        contacto: document.getElementById('input-nuevo-proveedor-contacto')?.value?.trim() || null,
        telefono: telVal || null
    };
    mostrarVista('vista-categoria');
    renderizarCategorias();
    sesion.categoria = null;
    _categoriaSeleccionada = null;
    document.querySelectorAll('.categoria-card').forEach(el => el.classList.remove('selected'));
    document.getElementById('btn-next-categoria').disabled = true;
}

async function crearProveedorPendiente() {
    if (!_creandoProveedor || !sesion.proveedor?.nombre || sesion.proveedor?.id) return;
    try {
        const res = await fetch('api.php?endpoint=proveedores_crear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: sesion.proveedor.nombre,
                nit: sesion.proveedor.nit || null,
                ciudad: sesion.proveedor.ciudad || null,
                contacto: sesion.proveedor.contacto || null,
                telefono: sesion.proveedor.telefono || null
            })
        });
        const data = await res.json();
        if (data.error) { console.error('Error al crear proveedor:', data.mensaje); return; }
        sesion.proveedor.id = data.id;
        _proveedorIdFiltro = data.id;
    } catch (e) { console.error('Error en crearProveedorPendiente:', e); }
}

// ── Editar proveedor (desde configuración) ─────────────────────
async function abrirWizardEditarProveedor(id) {
    _editandoProveedorId = id;
    const res = await fetch('api.php?endpoint=proveedores_listar');
    const data = await res.json();
    const p = (Array.isArray(data) ? data : []).find(x => x.id == id);
    if (!p) return;

    document.getElementById('input-nuevo-proveedor-nombre').value = p.nombre || '';
    document.getElementById('input-nuevo-proveedor-nit').value = p.nit || '';
    document.getElementById('input-nuevo-proveedor-ciudad').value = p.ciudad || '';
    document.getElementById('input-nuevo-proveedor-contacto').value = p.contacto || '';
    document.getElementById('input-nuevo-proveedor-telefono').value = p.telefono || '';
    document.getElementById('error-nombre').textContent = '';
    document.getElementById('error-nit').textContent = '';
    document.getElementById('error-telefono').textContent = '';

    const overlay = document.getElementById('wizard-modal');
    if (overlay) overlay.style.display = 'flex';

    const section = document.getElementById('vista-proveedor');
    if (!section) return;
    section.style.display = '';
    _editRestore = [];

    const header = section.querySelector(':scope > div:first-child');
    if (header) { _editRestore.push({el:header, display:header.style.display}); header.style.display = 'none'; }

    const steps = section.querySelector('.step-indicator');
    if (steps) { _editRestore.push({el:steps, display:steps.style.display}); steps.style.display = 'none'; }

    const grid = document.getElementById('grid-proveedores');
    if (grid) { _editRestore.push({el:grid, display:grid.style.display}); grid.style.display = 'none'; }

    const navs = section.querySelectorAll(':scope > .wizard-nav');
    navs.forEach(n => { _editRestore.push({el:n, display:n.style.display}); n.style.display = 'none'; });

    const form = document.getElementById('form-crear-proveedor');
    if (form) {
        form.classList.add('visible');
        const h3 = form.querySelector('h3');
        if (h3) h3.textContent = t('✏️ Editar proveedor');
        const btnVolver = document.getElementById('btn-cancelar-proveedor');
        if (btnVolver) { btnVolver.style.display = ''; btnVolver.onclick = cerrarWizardEditarProveedor; }
        const guardarBtn = form.querySelector('.btn-next');
        if (guardarBtn) {
            guardarBtn.textContent = t('💾 Guardar Cambios');
            guardarBtn.onclick = guardarEditarProveedor;
        }
    }

    const closeBtn = document.querySelector('.wizard-close');
    if (closeBtn) { closeBtn.classList.remove('hidden'); closeBtn.onclick = cerrarWizardEditarProveedor; }
}

async function guardarEditarProveedor() {
    const errorNombre = document.getElementById('error-nombre');
    const errorNit = document.getElementById('error-nit');
    const errorTel = document.getElementById('error-telefono');
    errorNombre.textContent = '';
    errorNit.textContent = '';
    errorTel.textContent = '';
    const nombre = document.getElementById('input-nuevo-proveedor-nombre')?.value?.trim();
    const nitVal = document.getElementById('input-nuevo-proveedor-nit')?.value?.trim();
    const telVal = document.getElementById('input-nuevo-proveedor-telefono')?.value?.trim();
    if (!nombre) { errorNombre.textContent = t('El nombre es obligatorio.'); return; }
    if (!nitVal) { errorNit.textContent = t('El NIT es obligatorio.'); return; }
    const errNit = validarNit(nitVal);
    if (errNit) { errorNit.textContent = errNit; return; }
    const errTel = validarTelefono(telVal);
    if (errTel) { errorTel.textContent = errTel; return; }
    const payload = {
        id: _editandoProveedorId,
        nombre,
        nit: nitVal || null,
        ciudad: document.getElementById('input-nuevo-proveedor-ciudad')?.value?.trim() || null,
        contacto: document.getElementById('input-nuevo-proveedor-contacto')?.value?.trim() || null,
        telefono: telVal || null
    };
    try {
        const res = await fetch('api.php?endpoint=proveedores_editar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.error) {
            errorNombre.textContent = data.mensaje || t('Error al guardar.');
            return;
        }
        cerrarWizardEditarProveedor();
        if (typeof cargarTablaProveedores === 'function') await cargarTablaProveedores();
    } catch (e) {
        errorNombre.textContent = t('Error de conexión.');
    }
}

function cerrarWizardEditarProveedor() {
    _editandoProveedorId = null;
    if (_editRestore) {
        _editRestore.forEach(item => { item.el.style.display = item.display; });
        _editRestore = null;
    }
    const overlay = document.getElementById('wizard-modal');
    if (overlay) overlay.style.display = 'none';
    const form = document.getElementById('form-crear-proveedor');
    if (form) {
        form.classList.remove('visible');
        const h3 = form.querySelector('h3');
        if (h3) h3.textContent = t('➕ Crear nuevo proveedor');
        const btnVolver = document.getElementById('btn-cancelar-proveedor');
        if (btnVolver) { btnVolver.onclick = cancelarCrearProveedor; }
        const guardarBtn = form.querySelector('.btn-next');
        if (guardarBtn) {
            guardarBtn.textContent = t('Siguiente');
            guardarBtn.onclick = guardarNuevoProveedor;
        }
    }
    const closeBtn = document.querySelector('.wizard-close');
    if (closeBtn) { closeBtn.onclick = cancelarWizard; }
}

// ── Paso 2: Categoría ──────────────────────────────────────────
let _categoriaSeleccionada = null;

function seleccionarCategoria(cat) {
    _categoriaSeleccionada = cat;
    document.querySelectorAll('.categoria-card').forEach(el => {
        el.classList.toggle('selected', el.dataset.categoria === cat);
    });
    document.getElementById('btn-next-categoria').disabled = false;
}

async function elegirCategoria(cat) {
    console.log('elegirCategoria called with', cat);
    sesion.categoria = cat;
    console.log('about to call cargarTiposFruta');
    await cargarTiposFruta(cat);
    console.log('cargarTiposFruta done, calling mostrarVista');
    mostrarVista('vista-fruta');
    console.log('mostrarVista done');
}

function renderizarCategorias() {
  const grid = document.getElementById('grid-categorias') || document.getElementById('categoria-selector');
  if (!grid) return;
  if (grid.children.length > 0) return;
  const cats = [
    { id: 'frutas',     label: t('Frutas'),      emoji: '🍓' },
    { id: 'aromaticas', label: t('Aromáticas'),   emoji: '🌿' }
  ];
  grid.innerHTML = cats.map(c => `
    <div class="categoria-card" data-categoria="${c.id}"
         onclick="seleccionarCategoria('${c.id}')">
      <span class="categoria-icono">${c.emoji}</span>
      <span class="categoria-nombre">${c.label}</span>
    </div>
  `).join('');
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-next-categoria')?.addEventListener('click', async () => {
    try {
      if (_categoriaSeleccionada) {
        await elegirCategoria(_categoriaSeleccionada);
      }
    } catch(e) { console.error('btn-next-categoria error:', e); }
  });
});

// ── Paso 3: Tipo Fruta ─────────────────────────────────────────
let _frutaSeleccionada = null;

async function cargarTiposFruta(cat) {
    console.log('cargarTiposFruta called with', cat);
    const contenedor = document.getElementById('grid-tipo-fruta');
    console.log('contenedor found:', !!contenedor);
    if (!contenedor) return;
    contenedor.innerHTML = `<p style="color:#6b7280;">${t('Cargando tipos…')}</p>`;
    _frutaSeleccionada = null;
    const btnNextFruta = document.getElementById('btn-next-fruta');
    console.log('btn-next-fruta found:', !!btnNextFruta);
    if (btnNextFruta) btnNextFruta.disabled = true;
    else { console.error('btn-next-fruta NOT FOUND!'); }

    const endpoint = cat === 'frutas' ? 'config_frutas_listar' : 'config_aromaticas_listar';
    let lista = [];
    try {
        const res   = await fetch(`api.php?endpoint=${endpoint}`);
        lista = await res.json();
        if (!Array.isArray(lista)) lista = [];
    } catch (e) { console.error('Error cargando tipos:', e); }

    contenedor.innerHTML = '';
    if (!Array.isArray(lista) || lista.length === 0) {
        contenedor.innerHTML = `<div style="padding:20px;text-align:center;color:#b91c1c;">
            ⚠️ No hay tipos de ${cat === 'frutas' ? 'fruta' : 'planta aromática'} registrados.
            Asegúrate de ejecutar el script <code>colorimetria_full_backup.sql</code>
            para poblar las tablas <code>tipo_frutas</code> / <code>tipo_aromaticas</code>.
        </div>`;
        return;
    }
    lista.forEach(f => {
        const btn = document.createElement('button');
        btn.className = 'btn-tipo-fruta' + (f.coming_soon == 1 && cat === 'frutas' ? ' disabled' : '');
        btn.disabled  = f.coming_soon == 1 && cat === 'frutas';
        btn.innerHTML = `
            <span class="tipo-icono">${iconoFruta(f.slug)}</span>
            <span class="tipo-nombre">${t(f.nombre)}</span>
            ${f.coming_soon == 1 && cat === 'frutas' ? `<span class="badge-soon">${t('En Desarrollo')}</span>` : ''}`;
        btn.addEventListener('click', () => {
            _frutaSeleccionada = f;
            document.querySelectorAll('.btn-tipo-fruta').forEach(b => b.removeAttribute('style'));
            btn.style.borderColor = 'var(--accent, #f8c400)';
            btn.style.background = '#fffbeb';
            document.getElementById('btn-next-fruta').disabled = false;
            document.getElementById('btn-next-fruta').onclick = () => {
                elegirFruta(_frutaSeleccionada);
            };
        });
        contenedor.appendChild(btn);
    });
}

function elegirFruta(f) {
    sesion.fruta = f;
    inicializarFormSesion();
    mostrarVista('vista-sesion');
}

// ── Paso 4: Sesión ─────────────────────────────────────────────
function inicializarFormSesion() {
    const d = new Date();
    const hoy = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    const inputFecha = document.getElementById('input-fecha-sesion');
    if (inputFecha) {
        inputFecha.max   = hoy;
        inputFecha.value = hoy;
    }
    const inputFecha2 = document.getElementById('input-fecha-sesion2');
    if (inputFecha2) {
        inputFecha2.max   = hoy;
        inputFecha2.value = hoy;
    }
    sesion.fecha = hoy;
    const titulo = document.getElementById('titulo-sesion-fruta');
    if (titulo) titulo.textContent = `${iconoFruta(sesion.fruta.slug)} ${t('Configuración de sesión')} – ${t(sesion.fruta.nombre)}`;
    if (sesion.fruta) {
        cargarEstadosMaduracion(sesion.fruta.id, 'grid-estados-maduracion');
        cargarEstadosMaduracion(sesion.fruta.id, 'grid-estados-maduracion-individual-wizard');
    }
    activarTabCarga('individual');
    ['error-csv-lote-wizard', 'error-imagenes-lote-wizard', 'error-estados-lote-wizard'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.textContent = ''; }
    });
    // Reset CSV/wrapper state when re-entering step 4
    ['input-archivo-csv','input-muestra-csv'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    ['wrapper-nombre-lote','wrapper-nombre-individual'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    ['csv-info-lote-wizard','csv-info-individual-wizard'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = t('Ningún archivo seleccionado');
    });
    const previewWrap = document.getElementById('csv-preview-lote-wizard');
    if (previewWrap) { previewWrap.style.display = 'none'; previewWrap.innerHTML = ''; }
    const msgEl = document.getElementById('msg-lote-wizard');
    if (msgEl) { msgEl.style.display = 'none'; msgEl.textContent = ''; }
    _wizardImagenesLote = [];
    _wizardCsvFiles = [];
    _wizardAsignaciones = {};
    _dirtyIndividual = false;
    _dirtyLote = false;
    renderImagenesLoteWizard();
    // Reset imagen individual
    const inputImg = document.getElementById('input-muestra-imagen');
    if (inputImg) inputImg.value = '';
    const preview = document.getElementById('preview-img-individual');
    if (preview) { preview.src = ''; preview.style.display = 'none'; }
    const placeholder = document.getElementById('upload-placeholder-individual');
    if (placeholder) placeholder.style.display = '';
    // Reset imágenes de lote
    const inputImgsLote = document.getElementById('input-imagenes-csv');
    if (inputImgsLote) inputImgsLote.value = '';
    const infoImgs = document.getElementById('csv-info-imagenes-wizard');
    if (infoImgs) infoImgs.textContent = t('Ninguna imagen seleccionada');
}

function iconoFruta(slug) {
    const map = { pina:'🍍', aguacate:'🥑', fresa:'🍓', albahaca:'🌿', manzanilla:'🌼', romero:'🌿', menta:'🌱', hierbabuena:'🌱' };
    return map[slug] || '🍍';
}

async function cargarEstadosMaduracion(frutaId, containerId, categoria) {
    const cat = categoria || (sesion?.categoria === 'aromaticas' ? 'aromaticas' : 'frutas');
    const res = await fetch(`api.php?endpoint=config_estados_fruta&fruta_id=${frutaId}&categoria=${cat}`);
    const estados = await res.json();
    const cont   = document.getElementById(containerId || 'grid-estados-maduracion');
    if (!cont) return;
    cont.innerHTML = estados.map(e => {
        const nombre = e.nombre === 'Óptima' || /^Madura/u.test(e.nombre) && e.nombre !== 'Maduración Óptima'
            ? t('Maduración Óptima') : t(e.nombre);
        return `<span class="chip-estado-info" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:9999px;font-size:.8rem;font-weight:600;background:${e.color_badge}1a;color:${e.color_badge};border:1px solid ${e.color_badge}40;">
            ${(e && e.emoji && e.emoji !== '??' && e.emoji !== '?') ? e.emoji : '●'} ${nombre}
        </span>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    const inputFecha = document.getElementById('input-fecha-sesion');
    if (inputFecha) {
        inputFecha.addEventListener('change', e => { sesion.fecha = e.target.value; });
    }
    const inputFecha2 = document.getElementById('input-fecha-sesion2');
    if (inputFecha2) {
        inputFecha2.addEventListener('change', e => { sesion.fecha = e.target.value; });
    }
    // Real-time validation for NIT
    const inputNit = document.getElementById('input-nuevo-proveedor-nit');
    const errorNit = document.getElementById('error-nit');
    if (inputNit && errorNit) {
        inputNit.addEventListener('input', () => {
            const val = inputNit.value.trim();
            if (!val) { errorNit.textContent = ''; return; }
            if (val.length > 10) {
                errorNit.textContent = t('El NIT no puede tener más de 10 dígitos.');
                inputNit.value = val.slice(0, 10);
            } else if (!/^\d*$/.test(val)) {
                errorNit.textContent = t('El NIT solo debe contener números.');
            } else {
                errorNit.textContent = '';
            }
        });
    }
});

async function confirmarSesionYCargarDashboard() {
    _creandoProveedor = false;
    if (!sesion.fecha) { return; }
    sessionStorage.setItem('sesion_colorimetria', JSON.stringify(sesion));
    const overlay = document.getElementById('wizard-modal');
    if (overlay) overlay.style.display = 'none';
    mostrarVista('dashboard-main');
    // Set _aroDashboardActiva before loading data so that
    // downstream fetches use the correct fruta_id filter
    if (sesion.categoria === 'aromaticas' && sesion.fruta) {
        _aroDashboardActiva = sesion.fruta;
        _frutaIdAro = sesion.fruta.id;
        document.getElementById('page-aromaticas').checked = true;
        mostrarDashboardAromaticas();
        const aroIconoEl = document.getElementById('selector-aro-icono');
        const aroNombreEl = document.getElementById('selector-aro-nombre');
        if (aroIconoEl) aroIconoEl.textContent = (sesion.fruta.icono && sesion.fruta.icono !== '??' ? sesion.fruta.icono : '🌿');
        if (aroNombreEl) aroNombreEl.textContent = t(sesion.fruta.nombre);
        if (typeof cargarSelectorAromaticas === 'function') {
            await cargarSelectorAromaticas();
        }
    } else if (sesion?.fruta) {
        const iconoEl = document.getElementById('selector-fruta-icono');
        const nombreEl = document.getElementById('selector-fruta-nombre');
        if (iconoEl) iconoEl.textContent = (sesion.fruta.icono && sesion.fruta.icono !== '??' ? sesion.fruta.icono : '🍍');
        if (nombreEl) nombreEl.textContent = t(sesion.fruta.nombre);
        if (typeof cargarSelectorFrutas === 'function') {
            await cargarSelectorFrutas();
        }
    }
    if (sesion.proveedor?.id) {
        _proveedorIdFiltro = sesion.proveedor.id;
        localStorage.setItem('colorimetria_proveedor_id', sesion.proveedor.id);
        document.querySelectorAll('.selector-proveedor-nombre').forEach(el => {
            el.textContent = sesion.proveedor.nombre;
        });
        ['dropdown-proveedores', 'dropdown-proveedores-aro'].forEach(id => {
            document.getElementById(id)?.setAttribute('hidden', '');
        });
    }
    if (typeof cargarTodoElDashboard === 'function') {
        await cargarTodoElDashboard();
    } else if (typeof cargarSelectorProveedores === 'function') {
        await cargarSelectorProveedores(true);
    }
}

function activarTabCarga(tab) {
    document.getElementById('form-carga-lote').style.display = tab === 'lote' ? '' : 'none';
    document.getElementById('form-carga-individual').style.display = tab === 'individual' ? '' : 'none';
    document.getElementById('tab-carga-lote').classList.toggle('active', tab === 'lote');
    document.getElementById('tab-carga-individual').classList.toggle('active', tab === 'individual');
    if (tab === 'lote') {
        const msg = document.getElementById('msg-lote-wizard');
        if (msg) { msg.style.display = 'none'; msg.textContent = ''; }
    }
}

function confirmarCambios(mensaje) {
    return new Promise(resolve => {
        const overlay = document.getElementById('modal-confirm-cambios');
        document.getElementById('modal-confirm-cambios-msg').textContent = mensaje;
        overlay.style.display = 'flex';
        const continuar = document.getElementById('btn-confirm-cambios-continuar');
        const cancelar = () => { overlay.style.display = 'none'; resolve(false); };
        document.querySelectorAll('#modal-confirm-cambios .modal-close, #modal-confirm-cambios .btn-secondary').forEach(el => {
            el.onclick = cancelar;
        });
        continuar.onclick = () => { overlay.style.display = 'none'; resolve(true); };
    });
}

function cerrarConfirmCambios() {
    document.getElementById('modal-confirm-cambios').style.display = 'none';
}

function validarAsignacionesWizard() {
    const valores = Object.values(_wizardAsignaciones);
    const duplicados = valores.length !== new Set(valores).size;
    const msgEl = document.getElementById('msg-lote-wizard');
    if (!msgEl) return true;
    if (duplicados) {
        msgEl.style.display = 'block';
        msgEl.style.background = '#fee2e2';
        msgEl.style.color = '#b91c1c';
        msgEl.style.border = '1px solid #fecaca';
        msgEl.textContent = t('⚠ No puedes asignar la misma imagen a dos archivos CSV distintos');
        return false;
    }
    msgEl.style.display = 'none';
    msgEl.textContent = '';
    return true;
}

async function importarCSV() {
    if (_dirtyIndividual) {
        const ok = await confirmarCambios(t('Hay cambios sin guardar en "Cargar Muestra Individual". Se perderán. ¿Continuar?'));
        if (!ok) return;
    }
    document.querySelectorAll('#form-carga-lote .error-msg').forEach(e => e.style.display = 'none');
    const msgEl = document.getElementById('msg-lote-wizard');
    if (msgEl) { msgEl.style.display = 'none'; msgEl.textContent = ''; }

    let valido = true;
    if (_wizardCsvFiles.length === 0) { document.getElementById('error-csv-lote-wizard').style.display = ''; valido = false; }
    if (_wizardImagenesLote.length !== _wizardCsvFiles.length) {
        const errImg = document.getElementById('error-imagenes-lote-wizard');
        if (errImg) {
            const dif = _wizardCsvFiles.length - _wizardImagenesLote.length;
            if (dif > 0) {
                errImg.textContent = `${t('Hay más archivos CSV que imágenes')} (${_wizardCsvFiles.length} CSV, ${_wizardImagenesLote.length} imágenes), ${t('cada CSV debe tener una imagen asociada')}`;
            } else {
                errImg.textContent = `${t('Hay más imágenes que archivos CSV')} (${_wizardCsvFiles.length} CSV, ${_wizardImagenesLote.length} imágenes), ${t('debe haber la misma cantidad')}`;
            }
            errImg.style.display = '';
        }
        valido = false;
    }
    if (!valido) return;

    if (!validarAsignacionesWizard()) return;

    if (!sesion.fruta?.id) {
        try {
            const res = await fetch(API + '?endpoint=config_frutas_listar');
            const frutas = await res.json();
            if (Array.isArray(frutas) && frutas.length > 0) {
                sesion.fruta = frutas.find(f => f.slug === 'pina') || frutas[0];
            }
        } catch {}
    }

    await crearProveedorPendiente();

    let totalInsertados = 0;
    let errores = [];

    const endpointLote = sesion.categoria === 'aromaticas' ? 'importar_csv_aromaticas_promedio' : 'importar_csv_fruta_promedio';

    for (let i = 0; i < _wizardCsvFiles.length; i++) {
        const csvFile = _wizardCsvFiles[i];
        const imgIdx = _wizardAsignaciones[i] !== undefined ? _wizardAsignaciones[i] : i;
        const imgFile = _wizardImagenesLote[imgIdx] || null;

        let nombreMuestra = '';
        if (_wizardCsvNombresExtraidos[i] !== _wizardCsvNombresOriginales[i]) {
            nombreMuestra = _wizardCsvNombresExtraidos[i];
        } else {
            nombreMuestra = csvFile.name.replace(/\.[^.]+$/, '');
        }

        const formData = new FormData();
        formData.append('csv', csvFile);
        formData.append('proveedor_id', _proveedorIdFiltro || sesion.proveedor?.id || '');
        formData.append('fruta_id', sesion.fruta?.id || '');
        formData.append('fecha_sesion', sesion.fecha ?? '');
        formData.append('nombre_muestra', nombreMuestra);
        if (imgFile) formData.append('imagen', imgFile);

        try {
            const res = await fetch(`api.php?endpoint=${endpointLote}`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.error) {
                errores.push(`${csvFile.name}: ${data.mensaje}`);
            } else {
                totalInsertados++;
            }
        } catch(e) {
            errores.push(`${csvFile.name}: ${t('Error de red')}`);
        }
    }

    if (msgEl) {
        msgEl.style.display = 'block';
        if (errores.length > 0) {
            msgEl.style.background = '#fee2e2';
            msgEl.style.color = '#b91c1c';
            msgEl.style.border = '1px solid #fecaca';
            msgEl.textContent = `${t('Importados: ')}${totalInsertados}. ${t('Errores:')}\n${errores.join('\n')}`;
        } else {
            msgEl.style.background = '#dcfce7';
            msgEl.style.color = '#166534';
            msgEl.style.border = '1px solid #bbf7d0';
            msgEl.textContent = `${totalInsertados}${t(' CSV(s) importados correctamente.')}`;
        }
    }

    _wizardCsvFiles = [];
    _wizardCsvNombresExtraidos = [];
    _wizardCsvNombresOriginales = [];

    await confirmarSesionYCargarDashboard();
    if (sesion.proveedor?.id && typeof cambiarProveedorDashboard === 'function') {
        await cambiarProveedorDashboard(sesion.proveedor, true);
    } else if (typeof cargarTodoElDashboard === 'function') {
        await cargarTodoElDashboard();
    }
    if (typeof cargarTablaProveedores === 'function') await cargarTablaProveedores();
    _dirtyLote = false;
}

async function importarMuestraIndividual() {
    if (_dirtyLote) {
        const ok = await confirmarCambios(t('Hay cambios sin guardar en "Cargar Varias Muestras". Se perderán. ¿Continuar?'));
        if (!ok) return;
    }
    const inputNombre = document.getElementById('input-nombre-individual');
    const nombre = inputNombre?.value?.trim();
    const csvFile = document.getElementById('input-muestra-csv')?.files?.[0];
    const imgFile = document.getElementById('input-muestra-imagen')?.files?.[0];
    document.querySelectorAll('#form-carga-individual .error-msg').forEach(e => e.style.display = 'none');
    let valido = true;
    if (!csvFile) { document.getElementById('error-csv-individual-wizard').style.display = ''; valido = false; }
    if (!imgFile) { document.getElementById('error-imagen-individual-wizard').style.display = ''; valido = false; }
    if (!nombre) { valido = false; }
    if (!valido) return;

    if (!sesion.fruta?.id) {
        try {
            const res = await fetch(API + '?endpoint=config_frutas_listar');
            const frutas = await res.json();
            if (Array.isArray(frutas) && frutas.length > 0) {
                sesion.fruta = frutas.find(f => f.slug === 'pina') || frutas[0];
            }
        } catch {}
    }

    await crearProveedorPendiente();

    const endpoint = sesion.categoria === 'aromaticas' ? 'importar_csv_aromaticas_promedio' : 'importar_csv_fruta_promedio';

    const fd = new FormData();
    fd.append('csv', csvFile);
    fd.append('imagen', imgFile);
    fd.append('nombre_muestra', nombre);
    if (sesion.proveedor?.id) fd.append('proveedor_id', sesion.proveedor.id);
    if (sesion.fruta?.id) fd.append('fruta_id', sesion.fruta.id);
    if (sesion.fecha) fd.append('fecha_sesion', sesion.fecha);

    const res = await fetch(`api.php?endpoint=${endpoint}`, { method:'POST', body: fd });
    const data = await res.json();
    if (data.error) { return; }

    await confirmarSesionYCargarDashboard();
    if (sesion.proveedor?.id && typeof cambiarProveedorDashboard === 'function') {
        await cambiarProveedorDashboard(sesion.proveedor, true);
    } else if (typeof cargarTodoElDashboard === 'function') {
        await cargarTodoElDashboard();
    }
    if (typeof cargarTablaProveedores === 'function') await cargarTablaProveedores();
    _dirtyIndividual = false;
}

async function actualizarNombreDesdeCSV(input, tipo) {
    const infoEl = document.getElementById(tipo === 'lote' ? 'csv-info-lote-wizard' : 'csv-info-individual-wizard');
    if (!input.files || input.files.length === 0) {
        if (infoEl) infoEl.textContent = t('Ningún archivo seleccionado');
        if (tipo === 'lote') { _wizardCsvFiles = []; renderizarCSVsLoteWizard(); }
        return;
    }
    if (tipo === 'lote') {
        _wizardCsvFiles = Array.from(input.files);
        _wizardCsvNombresExtraidos = new Array(_wizardCsvFiles.length).fill('');
        _wizardCsvNombresOriginales = new Array(_wizardCsvFiles.length).fill('');
        if (infoEl) infoEl.textContent = `${_wizardCsvFiles.length}${t(' archivo(s) seleccionado(s)')}`;
        document.getElementById('error-csv-lote-wizard').style.display = 'none';
        renderizarCSVsLoteWizard();
        _dirtyLote = true;
        let pendientes = _wizardCsvFiles.length;
        for (let i = 0; i < _wizardCsvFiles.length; i++) {
            const reader = new FileReader();
            reader.fileIndex = i;
            reader.onload = (e) => {
                try {
                    const texto = e.target.result;
                    const lineas = texto.trim().split('\n');
                    if (lineas.length >= 2) {
                        const encabezados = lineas[0].split(',').map(h => h.trim().toLowerCase());
                        const idxName = encabezados.indexOf('name');
                        if (idxName !== -1) {
                            _wizardCsvNombresOriginales[reader.fileIndex] = lineas[1].split(',')[idxName]?.trim() || '';
                            _wizardCsvNombresExtraidos[reader.fileIndex] = _wizardCsvNombresOriginales[reader.fileIndex];
                        }
                    }
                } catch (e) { console.error('Error leyendo CSV:', e); }
                pendientes--;
                if (pendientes === 0) renderizarCSVsLoteWizard();
            };
            reader.readAsText(_wizardCsvFiles[i]);
        }
        return;
    }
    if (infoEl) infoEl.textContent = input.files[0].name;
    const btnEl = document.getElementById(tipo === 'lote' ? 'btn-quitar-csv-lote-wizard' : 'btn-quitar-csv-individual-wizard');
    if (btnEl) btnEl.style.display = '';
    const errId = 'error-csv-' + tipo + '-wizard';
    const errEl = document.getElementById(errId);
    if (errEl) errEl.style.display = 'none';
    try {
        const texto = await input.files[0].text();
        const lineas = texto.trim().split('\n');
        if (lineas.length < 2) return;
        const encabezados = lineas[0].split(',').map(h => h.trim().toLowerCase());
        const idxName = encabezados.indexOf('name');
        if (idxName === -1) return;
        const primerValor = lineas[1].split(',')[idxName]?.trim();
        if (!primerValor) return;
        const wrapper = document.getElementById('wrapper-nombre-' + tipo);
        if (wrapper) wrapper.style.display = '';
        const fileNoExt = input.files[0].name.replace(/\.[^.]+$/, '');
        _wizardIndNombreOriginal = fileNoExt;
        const nombreInput = document.getElementById('input-nombre-' + tipo);
        if (nombreInput) {
            nombreInput.value = fileNoExt;
            const msg = document.getElementById('msg-formato-' + tipo);
            if (msg) {
                msg.style.display = 'none';
            }
        }
        if (tipo === 'individual') _dirtyIndividual = true;
        else _dirtyLote = true;
    } catch (e) { console.error('Error leyendo CSV:', e); }
}

function renderizarCSVsLoteWizard() {
    const container = document.getElementById('csv-preview-lote-wizard');
    const infoEl = document.getElementById('csv-info-lote-wizard');
    if (!container) return;
    if (_wizardCsvFiles.length === 0) {
        container.style.display = 'none';
        if (infoEl) infoEl.textContent = t('Ningún archivo seleccionado');
        _wizardAsignaciones = {};
        renderizarAsignacionesWizard();
        validarAsignacionesWizard();
        return;
    }
    for (let i = 0; i < _wizardCsvFiles.length; i++) {
        if (_wizardAsignaciones[i] === undefined && i < _wizardImagenesLote.length) {
            _wizardAsignaciones[i] = i;
        }
    }
    container.style.display = 'block';
    if (infoEl) infoEl.textContent = `${_wizardCsvFiles.length}${t(' archivo(s) seleccionado(s)')}`;
    container.innerHTML = _wizardCsvFiles.map((f, i) =>
        `<div style="display:flex;align-items:center;justify-content:space-between;font-size:.82rem;padding:4px 0;">
            <span>${f.name}</span>
            <button class="csv-remove-btn" onclick="quitarCSVWizardIndividual(${i})" title="${t('Quitar CSV')}">✕</button>
        </div>`
    ).join('');
    renderizarAsignacionesWizard();
    validarAsignacionesWizard();
}

function editarNombreCSVWizard(index) {
    const input = document.getElementById('wiz-asig-name-' + index);
    if (!input) return;
    if (input.disabled) {
        input.disabled = false;
        input.focus();
    } else {
        const val = input.value.trim();
        if (!val) { input.focus(); return; }
        input.disabled = true;
        _wizardCsvNombresExtraidos[index] = val;
        const msg = document.getElementById('wiz-asig-msg-' + index);
        if (msg) {
            const patron = /^[a-zA-ZñÑ]+\.?\d+\.\d+\.\d+$/;
            msg.style.display = patron.test(val) ? '' : 'none';
        }
    }
}

function quitarCSVWizardIndividual(index) {
    _wizardCsvFiles.splice(index, 1);
    _wizardCsvNombresExtraidos.splice(index, 1);
    _wizardCsvNombresOriginales.splice(index, 1);
    const nuevas = {};
    for (const [k, v] of Object.entries(_wizardAsignaciones)) {
        const ki = Number(k);
        if (ki === index) continue;
        nuevas[String(ki > index ? ki - 1 : ki)] = v;
    }
    _wizardAsignaciones = nuevas;
    document.getElementById('input-archivo-csv').value = '';
    renderizarCSVsLoteWizard();
    _dirtyLote = true;
    document.getElementById('error-csv-lote-wizard').style.display = 'none';
}

function quitarCSVWizard(tipo) {
    const inputId = tipo === 'lote' ? 'input-archivo-csv' : 'input-muestra-csv';
    const input = document.getElementById(inputId);
    if (input) input.value = '';
    const infoEl = document.getElementById(tipo === 'lote' ? 'csv-info-lote-wizard' : 'csv-info-individual-wizard');
    if (infoEl) infoEl.textContent = t('Ningún archivo seleccionado');
    if (tipo === 'lote') {
        _wizardCsvFiles = [];
        _wizardCsvNombresExtraidos = [];
        _wizardCsvNombresOriginales = [];
        _wizardAsignaciones = {};
        renderizarCSVsLoteWizard();
    }
    const wrapper = document.getElementById('wrapper-nombre-' + tipo);
    if (wrapper) wrapper.style.display = 'none';
    const nombreInput = document.getElementById('input-nombre-' + tipo);
    if (nombreInput) nombreInput.value = '';
    if (tipo === 'individual') { _dirtyIndividual = false; _wizardIndNombreOriginal = ''; }
    else _dirtyLote = false;
}

function habilitarEdicionNombre(tipo) {
    const input = document.getElementById('input-nombre-' + tipo);
    if (!input) return;
    const btn = input.nextElementSibling;
    if (input.disabled) {
        input.disabled = false;
        input.focus();
        btn.textContent = t('💾 Guardar');
    } else {
        const val = input.value.trim();
        if (!val) { return; }
        input.disabled = true;
        btn.textContent = t('✏️ Editar');
        const msg = document.getElementById('msg-formato-' + tipo);
        if (msg) {
            const patron = /^[a-zA-ZñÑ]+\.?\d+\.\d+\.\d+$/;
            msg.style.display = patron.test(val) ? '' : 'none';
        }
    }
}

function previsualizarImagenIndividual(event) {
    const archivo = event.target.files?.[0];
    if (!archivo) return;
    _dirtyIndividual = true;
    const errEl = document.getElementById('error-imagen-individual-wizard');
    if (errEl) errEl.style.display = 'none';
    const img = document.getElementById('preview-img-individual');
    const placeholder = document.getElementById('upload-placeholder-individual');
    if (img && placeholder) {
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
            img.style.display = 'block';
            placeholder.style.display = 'none';
        };
        reader.readAsDataURL(archivo);
    }
}

function seleccionarImagenesLoteWizard(event) {
    const errEl = document.getElementById('error-imagenes-lote-wizard');
    if (errEl) errEl.style.display = 'none';
    const files = event.target.files;
    if (files) {
        for (const f of files) {
            _wizardImagenesLote.push(f);
        }
        for (let i = 0; i < _wizardCsvFiles.length; i++) {
            if (_wizardAsignaciones[i] === undefined && i < _wizardImagenesLote.length) {
                _wizardAsignaciones[i] = i;
            }
        }
        _dirtyLote = true;
    }
    event.target.value = '';
    renderImagenesLoteWizard();
    renderizarAsignacionesWizard();
}

function renderImagenesLoteWizard() {
    const info = document.getElementById('csv-info-imagenes-wizard');
    const grid = document.getElementById('lote-grid-imagenes-wizard');
    if (!info || !grid) return;
    if (_wizardImagenesLote.length === 0) {
        info.textContent = t('Ninguna imagen seleccionada');
        grid.innerHTML = '';
        renderizarAsignacionesWizard();
        validarAsignacionesWizard();
        return;
    }
    info.textContent = `${_wizardImagenesLote.length}${t(' imagen(es) seleccionada(s)')}`;
    grid.innerHTML = _wizardImagenesLote.map((f, i) => {
        const url = URL.createObjectURL(f);
        return `<div class="lote-thumb" style="display:inline-flex;flex-direction:column;align-items:center;margin:4px;width:80px;">
            <span class="lote-thumb-num">#${i+1}</span>
            <button class="lote-thumb-x" onclick="quitarImagenLoteWizard(${i})" title="Eliminar">✕</button>
            <img src="${url}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;">
            <span class="lote-thumb-name">${f.name}</span>
        </div>`;
    }).join('');
    renderizarAsignacionesWizard();
    validarAsignacionesWizard();
}

function quitarImagenLoteWizard(index) {
    _wizardImagenesLote.splice(index, 1);
    const nuevas = {};
    for (const [csvi, imgi] of Object.entries(_wizardAsignaciones)) {
        if (imgi === index) continue;
        nuevas[csvi] = imgi > index ? imgi - 1 : imgi;
    }
    _wizardAsignaciones = nuevas;
    for (let i = 0; i < _wizardCsvFiles.length; i++) {
        if (_wizardAsignaciones[i] === undefined && i < _wizardImagenesLote.length) {
            _wizardAsignaciones[i] = i;
        }
    }
    renderImagenesLoteWizard();
}

function renderizarAsignacionesWizard() {
    const wrap = document.getElementById('wizard-asignaciones-wrap');
    const tbody = document.getElementById('wizard-tabla-asignaciones');
    if (!wrap || !tbody) return;
    if (_wizardCsvFiles.length === 0 || _wizardImagenesLote.length === 0) {
        wrap.style.display = 'none';
        return;
    }
    wrap.style.display = '';
    const patron = /^[a-zA-ZñÑ]+\.?\d+\.\d+\.\d+$/;
    tbody.innerHTML = _wizardCsvFiles.map((csv, i) => {
        const imgCount = _wizardImagenesLote.length;
        let selectHtml = '<td style="color:#9ca3af;font-size:.8rem;">—</td>';
        if (imgCount > 0) {
            const valorActual = _wizardAsignaciones[i] !== undefined ? _wizardAsignaciones[i] : '';
            let options = '';
            for (let j = 0; j < imgCount; j++) {
                const sel = (valorActual === j || (valorActual === '' && j === 0)) ? 'selected' : '';
                options += `<option value="${j}" ${sel}>Imagen #${j + 1}</option>`;
            }
            selectHtml = `<td><select onchange="cambiarAsignacionWizard(${i}, this.value)">${options}</select></td>`;
        }
        const nombreActual = _wizardCsvNombresExtraidos[i] || _wizardCsvNombresOriginales[i] || '';
        const showMsg = patron.test(nombreActual);
        return `<tr>
            <td>${i + 1}</td>
            <td>${csv.name}</td>
            <td>
                <input type="text" id="wiz-asig-name-${i}" value="${escapeHtml(nombreActual)}" disabled style="width:100%;max-width:140px;padding:3px 6px;font-size:.8rem;border:1px solid #d1d5db;border-radius:4px;background:#f9fafb;">
                <button class="btn-secondary" style="padding:2px 6px;font-size:.72rem;border:1px solid transparent;" onclick="editarNombreCSVWizard(${i})">✏️</button>
                <p id="wiz-asig-msg-${i}" style="margin:2px 0 0;font-size:.7rem;color:#16a34a;${showMsg ? '' : 'display:none;'}">${t('Nombre Muestra con formato fruta1.1.1')}</p>
            </td>
            ${selectHtml}
        </tr>`;
    }).join('');
}

function cambiarAsignacionWizard(csvIdx, imgIdx) {
    _wizardAsignaciones[csvIdx] = parseInt(imgIdx, 10);
    renderizarAsignacionesWizard();
    validarAsignacionesWizard();
}

function actualizarStepper(id) {
    document.querySelectorAll('.step-indicator .step').forEach(el => {
        el.classList.toggle('active', el.dataset.view === id);
    });
}
