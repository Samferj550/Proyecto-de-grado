window._hayProveedores = false;

function actualizarTooltipProveedores() {
  const sinProv = !window._hayProveedores;
  document.querySelectorAll('.btn-tooltip-wrap').forEach(w => {
    w.classList.toggle('sin-proveedor', sinProv);
  });
}

// ── inicializarDashboard (called from wizard) ──────────────────
async function inicializarDashboard(sesion) {
  if (sesion) {
    const fruta = sesion.fruta;
    if (fruta) {
      const iconoEl = document.getElementById('selector-fruta-icono');
      const nombreEl = document.getElementById('selector-fruta-nombre');
      if (iconoEl) iconoEl.textContent = (fruta.icono && fruta.icono !== '??' ? fruta.icono : '🍍');
      if (nombreEl) nombreEl.textContent = t(fruta.nombre);
    }
  }
  await cargarSelectorFrutas();
}

// ── Provider Switcher ─────────────────────────────────────────
async function cargarSelectorProveedores(autoSelect) {
  try {
    const res = await fetch(API + '?endpoint=proveedores_listar');
    const provs = await res.json();
    const uls = ['dropdown-proveedores', 'dropdown-proveedores-aro'].map(id => document.getElementById(id)).filter(Boolean);
    if (uls.length === 0) return;
    window._hayProveedores = Array.isArray(provs) && provs.length > 0;
    const sinProv = !window._hayProveedores;
    actualizarTooltipProveedores();
    if (sinProv) {
      document.querySelectorAll('.selector-proveedor-nombre').forEach(el => el.textContent = t('Sin Proveedores'));
      document.querySelectorAll('.btn-selector-proveedor').forEach(btn => {
        btn.querySelector('.chevron').style.display = 'none';
      });
    } else {
      document.querySelectorAll('.btn-selector-proveedor').forEach(btn => {
        btn.querySelector('.chevron').style.display = '';
      });
    }
    const html = sinProv ? ''
      : provs.map(p => `<li data-id="${p.id}">${escapeHtml(p.nombre)}</li>`).join('');
    uls.forEach(ul => {
      ul.innerHTML = html;
      ul.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', () => {
          const p = provs.find(x => x.id == li.dataset.id);
          if (p) cambiarProveedorDashboard(p);
        });
      });
    });
    if (!autoSelect) return;
    const savedId = localStorage.getItem('colorimetria_proveedor_id');
    const firstUl = uls[0];
    if (!firstUl) return;
    const match = savedId ? firstUl.querySelector(`li[data-id="${savedId}"]`) : null;
    if (match) {
      const p = provs.find(x => x.id == savedId);
      if (p) await cambiarProveedorDashboard(p, true);
      else if (provs.length > 0) await cambiarProveedorDashboard(provs[0], true);
    } else if (provs.length > 0) {
      await cambiarProveedorDashboard(provs[0], true);
    }
  } catch (e) { console.error('Error cargando selector proveedores:', e); }
}

async function cambiarProveedorDashboard(proveedor, skipDataLoad) {
  if (!proveedor) return;
  _proveedorIdFiltro = proveedor.id;
  localStorage.setItem('colorimetria_proveedor_id', proveedor.id);
  document.querySelectorAll('.selector-proveedor-nombre').forEach(el => {
    el.textContent = proveedor.nombre;
  });
  ['dropdown-proveedores', 'dropdown-proveedores-aro'].forEach(id => {
    document.getElementById(id)?.setAttribute('hidden', '');
  });
  if (!skipDataLoad) {
    await cargarTodoElDashboard();
  }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  idiomaInicial();
  await cargarKpisFrutas();
  await cargarKpisAromaticas();

  let hayProveedores = false;
  try {
    const res = await fetch(API + '?endpoint=proveedores_listar');
    const provs = await res.json();
    hayProveedores = Array.isArray(provs) && provs.length > 0;
  } catch {}

  const hayDatos = (window.totalFrutas || 0) > 0 || (window.totalAromaticas || 0) > 0;

  if (!hayDatos && !hayProveedores) {
    if (typeof volverAlWizard === 'function') {
      volverAlWizard(true);
    }
  } else {
    await cargarSelectorProveedores(true);
    await cargarSelectorAromaticas();
    await cargarTodoElDashboard();
  }

  function ocultarOtrosDropdowns(exceptIds) {
    const todos = ['dropdown-frutas','dropdown-proveedores','dropdown-proveedores-aro','dropdown-aromaticas','dropdown-idioma','dropdown-idioma-aro'];
    todos.forEach(id => {
      if (!exceptIds.includes(id)) document.getElementById(id)?.setAttribute('hidden', '');
    });
  }

  const btnSelector = document.getElementById('btn-selector-fruta');
  const dropdown = document.getElementById('dropdown-frutas');
  if (btnSelector && dropdown) {
    btnSelector.addEventListener('click', (e) => {
      e.stopPropagation();
      const hidden = dropdown.hasAttribute('hidden');
      ocultarOtrosDropdowns(['dropdown-frutas']);
      dropdown.toggleAttribute('hidden');
      if (hidden) cargarSelectorFrutas();
    });
    document.addEventListener('click', () => dropdown.setAttribute('hidden', ''));
    dropdown.addEventListener('click', (e) => e.stopPropagation());
  }

  const btnProvSelector = document.getElementById('btn-selector-proveedor');
  const dropdownProv = document.getElementById('dropdown-proveedores');
  if (btnProvSelector && dropdownProv) {
    btnProvSelector.addEventListener('click', (e) => {
      if (!window._hayProveedores) return;
      e.stopPropagation();
      const hidden = dropdownProv.hasAttribute('hidden');
      ocultarOtrosDropdowns(['dropdown-proveedores']);
      dropdownProv.toggleAttribute('hidden');
      if (hidden) cargarSelectorProveedores(false);
    });
    document.addEventListener('click', () => dropdownProv.setAttribute('hidden', ''));
    dropdownProv.addEventListener('click', (e) => e.stopPropagation());
  }

  // ── Provider selector (aromáticas) ──
  const btnProvSelectorAro = document.getElementById('btn-selector-proveedor-aro');
  const dropdownProvAro = document.getElementById('dropdown-proveedores-aro');
  if (btnProvSelectorAro && dropdownProvAro) {
    btnProvSelectorAro.addEventListener('click', (e) => {
      if (!window._hayProveedores) return;
      e.stopPropagation();
      const hidden = dropdownProvAro.hasAttribute('hidden');
      ocultarOtrosDropdowns(['dropdown-proveedores-aro']);
      dropdownProvAro.toggleAttribute('hidden');
      if (hidden) cargarSelectorProveedores(false);
    });
    document.addEventListener('click', () => dropdownProvAro.setAttribute('hidden', ''));
    dropdownProvAro.addEventListener('click', (e) => e.stopPropagation());
  }

  // ── Aromáticas plant selector ──
  const btnSelectorAro = document.getElementById('btn-selector-aro');
  const dropdownAro = document.getElementById('dropdown-aromaticas');
  if (btnSelectorAro && dropdownAro) {
    btnSelectorAro.addEventListener('click', (e) => {
      e.stopPropagation();
      const hidden = dropdownAro.hasAttribute('hidden');
      ocultarOtrosDropdowns(['dropdown-aromaticas']);
      dropdownAro.toggleAttribute('hidden');
      if (hidden) cargarSelectorAromaticas();
    });
    document.addEventListener('click', () => dropdownAro.setAttribute('hidden', ''));
    dropdownAro.addEventListener('click', (e) => e.stopPropagation());
  }

  // ── Language selector ──
  function initIdiomaSelector(btnId, dropId) {
    const btn = document.getElementById(btnId);
    const drop = document.getElementById(dropId);
    if (!btn || !drop) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const hidden = drop.hasAttribute('hidden');
      ocultarOtrosDropdowns([dropId]);
      drop.toggleAttribute('hidden');
    });
    drop.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      cambiarIdioma(li.dataset.lang);
      drop.setAttribute('hidden', '');
    });
    document.addEventListener('click', () => drop.setAttribute('hidden', ''));
    drop.addEventListener('click', (e) => e.stopPropagation());
  }
  initIdiomaSelector('btn-selector-idioma', 'dropdown-idioma');
  initIdiomaSelector('btn-selector-idioma-aro', 'dropdown-idioma-aro');

  document.querySelectorAll('.nav label[for="page-fruta"], .nav label[for="page-aromaticas"]').forEach(l => {
    l.addEventListener('click', () => {
      const db = document.getElementById('dashboard-main');
      if (db) db.style.display = '';
    });
  });

  document.querySelector('.nav label[for="page-config"]')?.addEventListener('click', () => {
    cargarTablaProveedores();
  });

  initConfigTabs();
  cargarTablaProveedores();

  const modalProv = document.getElementById('modal-proveedor');
  if (modalProv) {
    modalProv.addEventListener('click', (e) => {
      if (e.target === modalProv) cerrarModalProveedor();
    });
  }

  await cargarSelectorProveedores(true);
  await cargarSelectorAromaticas();
});
