import { getClient, clearTokens, saveTokens, tryRefresh, COLLECTION, PRIMARY_KEY, getSavedTokens } from './config.js';
import { readItems, createItem, updateItem, deleteItem } from 'https://cdn.jsdelivr.net/npm/@directus/sdk@latest/+esm';

const saved = JSON.parse(localStorage.getItem('directus_auth') || 'null');
if (!saved?.access_token || !saved?.refresh_token) {
  location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', async () => {
  const client = getClient();

  // Valida sesión haciendo una petición protegida; si 401, intenta refresh vía REST
  async function ensureSession() {
    try {
      await client.request(readItems(COLLECTION, { limit: 1 }));
    } catch (e) {
      // intenta renovar tokens
      const ok = await tryRefresh(client);
      if (!ok) {
        try { await client.logout(); } catch {}
        clearTokens();
        location.href = 'login.html';
        throw e;
      }
    }
  }

  await ensureSession();

  // --- estado central ---
  const app = {
    activeModule: null,
    modules: { socios: { container: null, data: [], page: 1, pageSize: 8 }, aportes: { container: null, data: [] } }
  };

  // --- DOM refs ---
  const mainContent   = document.getElementById('contenido-principal');
  const moduleTitle   = document.getElementById('module-title');
  const navLinks      = document.querySelectorAll('.nav-link');
  const screenBlocker = document.getElementById('screen-blocker');
  const logoutBtn     = document.getElementById('logout-btn');

  // --- logout ---
  logoutBtn.addEventListener('click', async () => {
    try { await client.logout(); } catch {}
    clearTokens();
    location.href = 'login.html';
  });

  // --- nav ---
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const moduleName = e.currentTarget.id.split('-')[1];
      switchView(moduleName);
    });
  });

  const switchView = async (moduleName) => {
    if (app.activeModule === moduleName) return;

    if (app.activeModule && app.modules[app.activeModule]?.container) {
      app.modules[app.activeModule].container.classList.add('hidden');
    }

    app.activeModule = moduleName;
    const module = app.modules[moduleName];

    if (module && module.container) {
      module.container.classList.remove('hidden');
      if (moduleName === 'socios') fetchAndRenderSocios(true);
    } else {
      try {
        const response = await fetch(`${moduleName}.html`);
        if (!response.ok) {
          mainContent.innerHTML = `<div class="p-4 text-center text-slate-500">El módulo "${moduleName}" aún no ha sido creado.</div>`;
          return;
        }
        const moduleHtml = await response.text();
        const container = document.createElement('div');
        container.id = `module-${moduleName}`;
        container.innerHTML = moduleHtml;
        mainContent.appendChild(container);
        if (module) module.container = container;
        if (moduleName === 'socios') initSociosModule();
      } catch (error) {
        console.error(`Error al cargar el módulo ${moduleName}:`, error);
      }
    }

    moduleTitle.textContent = `Módulo de ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`;
    navLinks.forEach(l => l.classList.toggle('active', l.id === `nav-${moduleName}`));
  };

  // Intenta extraer el ID del mensaje de realtime en múltiples formatos
function extractIdFromMsg(msg) {
  const d = msg?.data;
  if (Array.isArray(d) && d.length) {
    const first = d[0];
    if (typeof first === 'object' && first != null) {
      return first[PRIMARY_KEY] ?? first.id ?? undefined;
    } else if (typeof first === 'number' || typeof first === 'string') {
      return first;
    }
  }

  const k = msg?.keys ?? d?.keys;
  if (Array.isArray(k) && k.length) {
    return k[0];
  } else if (typeof k === 'object' && k != null) {
    return k[PRIMARY_KEY] ?? k.id ?? undefined;
  }

  if (d && typeof d === 'object' && d != null) {
    return d[PRIMARY_KEY] ?? d.id ?? undefined;
  }

  return undefined;
}


  // ===== SOCIOS =====
  const FIELDS = [
    'ID_Socio', 'Nombres_Completos', 'Apellidos_Completos', 'Cedula_Identidad',
    'Fecha_Nacimiento', 'Direccion_Domicilio', 'Telefono_Celular',
    'Correo_Electronico', 'Fecha_Ingreso', 'Estado_Socio',
  ];

  const initSociosModule = () => {
    const container = app.modules.socios.container;
    container.querySelector('#add-socio-btn').addEventListener('click', () => openEditModal(null));
    container.querySelector('#socio-form').addEventListener('submit', handleSocioSubmit);
    container.querySelector('#cancel-btn').addEventListener('click', () => container.querySelector('#socio-modal').classList.replace('flex', 'hidden'));
    ensurePager(container);
    fetchAndRenderSocios();
    connectRealtimeOrPoll();
  };

  function ensurePager(container){
    if (container.querySelector('#pager')) return;
    const pager = document.createElement('div');
    pager.id = 'pager';
    pager.className = 'flex items-center justify-between mt-4 text-sm text-slate-600';
    pager.innerHTML = `
      <div><span id="total-reg"></span></div>
      <div class="flex items-center gap-2">
        <button id="prev-page" class="px-3 py-1 rounded bg-slate-200 hover:bg-slate-300">Anterior</button>
        <span id="page-indicator" class="px-2"></span>
        <button id="next-page" class="px-3 py-1 rounded bg-slate-200 hover:bg-slate-300">Siguiente</button>
        <select id="page-size" class="ml-3 border rounded px-2 py-1">
          <option value="5">5</option>
          <option value="8" selected>8</option>
          <option value="10">10</option>
          <option value="20">20</option>
        </select>
      </div>`;
    container.querySelector('.bg-white.p-6').appendChild(pager);

    pager.querySelector('#prev-page').addEventListener('click', () => { changePage(-1); });
    pager.querySelector('#next-page').addEventListener('click', () => { changePage(+1); });
    pager.querySelector('#page-size').addEventListener('change', (e) => {
      app.modules.socios.pageSize = Number(e.target.value) || 8;
      app.modules.socios.page = 1;
      renderSocios(app.modules.socios.data);
    });
  }
  function changePage(delta){
    const m = app.modules.socios;
    const totalPages = Math.max(1, Math.ceil(m.data.length / m.pageSize));
    m.page = Math.min(totalPages, Math.max(1, m.page + delta));
    renderSocios(m.data);
  }

  async function fetchAndRenderSocios(isBackgroundRefresh = false) {
    if (!isBackgroundRefresh) renderSkeleton();
    try {
      const data = await client.request(readItems(COLLECTION, { fields: FIELDS, sort: ['-ID_Socio'], limit: 500 }));
      const m = app.modules.socios;
      m.data = data ?? [];
      const totalPages = Math.max(1, Math.ceil(m.data.length / m.pageSize));
      if (m.page > totalPages) m.page = totalPages;
      renderSocios(m.data);
    } catch (e) {
      console.error('Error al obtener socios:', e?.message);
      const tableBody = app.modules.socios.container?.querySelector('#socios-table-body');
      if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-red-500">Error al cargar datos.</td></tr>`;
    }
  }

  function renderSocios(allSocios) {
  const container = app.modules.socios.container;
  const tableBody = container?.querySelector('#socios-table-body');
  if (!tableBody) return;

  const m = app.modules.socios;
  const total = allSocios.length;
  const totalPages = Math.max(1, Math.ceil(total / m.pageSize));
  const start = (m.page - 1) * m.pageSize;
  const pageRows = allSocios.slice(start, start + m.pageSize);

  const totalEl = container.querySelector('#total-reg');
  const indEl   = container.querySelector('#page-indicator');
  if (totalEl) totalEl.textContent = `Total: ${total}`;
  if (indEl)   indEl.textContent   = `Página ${m.page} / ${totalPages}`;

  tableBody.innerHTML = '';
  if (!pageRows || pageRows.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center p-8">No hay socios registrados.</td></tr>';
    return;
  }

  pageRows.forEach((socio) => {
    // --------- FALLBACKS para evitar "undefined undefined" ----------
    const fullName = `${socio?.Nombres_Completos ?? ''} ${socio?.Apellidos_Completos ?? ''}`.trim() || '—';
    const cedula   = socio?.Cedula_Identidad ?? '';
    const tel      = socio?.Telefono_Celular ?? '';
    const fechaIng = socio?.Fecha_Ingreso ? new Date(socio.Fecha_Ingreso).toLocaleDateString() : '';
    const estado   = (socio?.Estado_Socio ?? 'Activo'); // fallback visual a Activo
    // ----------------------------------------------------------------

    const tr = document.createElement('tr');
    tr.className = 'bg-white border-b hover:bg-slate-50';
    tr.innerHTML = `
      <td class="py-4 px-6 font-medium text-slate-900">${fullName}</td>
      <td class="py-4 px-6">${cedula}</td>
      <td class="py-4 px-6">${tel}</td>
      <td class="py-4 px-6">${fechaIng}</td>
      <td class="py-4 px-6">
        <span class="px-2 py-1 font-semibold leading-tight ${estado === 'Activo' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'} rounded-full">
          ${estado}
        </span>
      </td>
      <td class="py-4 px-6 flex gap-3">
        <button class="edit-btn font-medium text-blue-600 hover:underline">Editar</button>
        <button class="del-btn font-medium text-red-600 hover:underline">Eliminar</button>
      </td>
    `;
    tr.querySelector('.edit-btn').addEventListener('click', () => openEditModal(socio));
    tr.querySelector('.del-btn').addEventListener('click', () => confirmDelete(socio));
    tableBody.appendChild(tr);
  });
}


  function renderSkeleton(rows = 5) {
    const container = app.modules.socios.container;
    const tableBody = container?.querySelector('#socios-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    for (let i = 0; i < rows; i++) {
      const tr = document.createElement('tr');
      tr.className = 'bg-white border-b skeleton-row';
      tr.innerHTML = `
        <td class="py-4 px-6"><div class="skeleton h-4 w-3/4"></div></td>
        <td class="py-4 px-6"><div class="skeleton h-4 w-full"></div></td>
        <td class="py-4 px-6"><div class="skeleton h-4 w-full"></div></td>
        <td class="py-4 px-6"><div class="skeleton h-4 w-full"></div></td>
        <td class="py-4 px-6"><div class="skeleton h-4 w-1/2"></div></td>
        <td class="py-4 px-6"><div class="skeleton h-4 w-1/4"></div></td>`;
      tableBody.appendChild(tr);
    }
  }

  function openEditModal(socio) {
    const container = app.modules.socios.container;
    const modal = container.querySelector('#socio-modal');
    const form = container.querySelector('#socio-form');
    form.reset();
    container.querySelector('#modal-title').textContent = socio ? 'Editar Socio' : 'Añadir Nuevo Socio';
        if (!socio) {
  form.querySelector('#ID_Socio').value = '';
}
    if (socio) {
      form.querySelector('#ID_Socio').value          = socio.ID_Socio;
      form.querySelector('#nombres').value           = socio.Nombres_Completos ?? '';
      form.querySelector('#apellidos').value         = socio.Apellidos_Completos ?? '';
      form.querySelector('#cedula').value            = socio.Cedula_Identidad ?? '';
      form.querySelector('#fechaNacimiento').value   = socio.Fecha_Nacimiento ?? '';
      form.querySelector('#telefono').value          = socio.Telefono_Celular ?? '';
      form.querySelector('#email').value             = socio.Correo_Electronico ?? '';
      form.querySelector('#direccion').value         = socio.Direccion_Domicilio ?? '';
    }
    modal.classList.replace('hidden', 'flex');
  }

  async function handleSocioSubmit(e) {
    e.preventDefault();
    screenBlocker.classList.remove('hidden');
    const form = e.target;
    const id = form.querySelector('#ID_Socio').value;
    const socioData = {
      Nombres_Completos:  form.querySelector('#nombres').value,
      Apellidos_Completos:form.querySelector('#apellidos').value,
      Cedula_Identidad:   form.querySelector('#cedula').value,
      Fecha_Nacimiento:   form.querySelector('#fechaNacimiento').value || null,
      Direccion_Domicilio:form.querySelector('#direccion').value,
      Telefono_Celular:   form.querySelector('#telefono').value,
      Correo_Electronico: form.querySelector('#email').value,
    };

    try {
      if (id) {
        await client.request(updateItem(COLLECTION, id, socioData, { keys: { primary: PRIMARY_KEY } }));
      } else {
        socioData.Fecha_Ingreso = new Date().toISOString();
        await client.request(createItem(COLLECTION, socioData));
      }
      app.modules.socios.container.querySelector('#socio-modal').classList.replace('flex', 'hidden');
      await fetchAndRenderSocios();
    } catch (err) {
      alert('Error al guardar: ' + (err?.message || 'desconocido'));
      console.error(err);
    } finally {
      screenBlocker.classList.add('hidden');
    }
  }

  function confirmDelete(socio){
    if (!confirm(`¿Eliminar al socio #${socio[PRIMARY_KEY]} (${socio.Nombres_Completos} ${socio.Apellidos_Completos})?`)) return;
    doDelete(socio[PRIMARY_KEY]);
  }
  async function doDelete(idVal){
    try{
      await client.request(deleteItem(COLLECTION, idVal, { keys: { primary: PRIMARY_KEY } }));
      await fetchAndRenderSocios(true);
    }catch(err){
      console.error(err);
      alert('Error al eliminar. Revisa permisos y PRIMARY_KEY.');
    }
  }


// ===== Realtime robusto (WS + watchdog + polling de respaldo) =====
let pollTimer = null;
const POLL_MS = 10000;

async function connectRealtimeOrPoll() {
  stopPolling();

  let wsOpen = false;
  let lastEventAt = 0;

  try {
    await client.connect();
    wsOpen = true;
    console.info('[RT] WebSocket conectado');

    // Suscribir con la sintaxis más compatible (sin query)
const mkSub = async (event) => {
  try {
    const { subscription } = await client.subscribe(COLLECTION, {
      event,
      query: { fields: FIELDS }  // Use your existing FIELDS array for the needed data
    });
    return subscription;
  } catch {
    const { subscription } = await client.subscribe('items', {
      collection: COLLECTION,
      event,
      query: { fields: FIELDS }
    });
    return subscription;
  }
};

    const subs = await Promise.all(['create', 'update', 'delete'].map(mkSub));

    // helpers
    const upsertRow = (row) => {
      const m = app.modules.socios;
      const i = m.data.findIndex(r => r[PRIMARY_KEY] === row[PRIMARY_KEY]);
      if (i >= 0) m.data[i] = row; else m.data.unshift(row);
      renderSocios(m.data);
    };
    const removeRow = (id) => {
      const m = app.modules.socios;
      m.data = m.data.filter(r => r[PRIMARY_KEY] !== id);
      renderSocios(m.data);
    };
    const fetchOneById = async (id) => {
      const rows = await client.request(readItems(COLLECTION, {
        fields: [
          'ID_Socio','Nombres_Completos','Apellidos_Completos','Cedula_Identidad',
          'Fecha_Nacimiento','Direccion_Domicilio','Telefono_Celular',
          'Correo_Electronico','Fecha_Ingreso','Estado_Socio',
        ],
        filter: { [PRIMARY_KEY]: { _eq: id } },
        limit: 1
      }));
      return rows?.[0] ?? null;
    };

    // consumir eventos
subs.forEach((subscription, k) => {
  (async () => {
    for await (const msg of subscription) {
      lastEventAt = Date.now();
      const evt = msg?.event;
      const id = extractIdFromMsg(msg);  // Make sure this is the only ID source
      console.info('[RT] evento:', evt, 'id:', id);

      if (!evt || !id) continue;

if (evt === 'delete') {
  removeRow(id);
} else {
  const full = msg?.data?.[0];  // Directus sends data as [item]
  if (full && typeof full === 'object') {
    upsertRow(full);
  } else {
    console.warn('[RT] No full data in msg, fallback fetch', id);
    try {
      const fetched = await fetchOneById(id);
      if (fetched) upsertRow(fetched);
    } catch (e) {
      console.warn('[RT] rehidrata falló', id, e);
    }
  }
}
    }
  })().catch(e => console.warn('[RT] stream error', e));
});

    // watchdog: si en 12 s no llegó nada, activa polling
    setTimeout(() => {
      if (!lastEventAt) {
        console.warn('[RT] sin eventos tras 12s → activo polling');
        startPolling();
      }
    }, 12000);

    // si el socket cae → polling
client.onWebSocket?.('close', async () => {
  console.warn('[RT] WS cerrado');
  await tryRefresh(client); // Intenta renovar antes de reconectar
  connectRealtimeOrPoll(); // Reintenta la conexión
});

  } catch (e) {
    console.warn('[RT] no se pudo conectar al WS, uso polling:', e?.message);
    startPolling();
  }
}

function startPolling() {
  stopPolling();
  console.info('[POLL] activo cada', POLL_MS/1000, 's');
  pollTimer = setInterval(() => {
    if (app.activeModule === 'socios') fetchAndRenderSocios(true);
  }, POLL_MS);
}
function stopPolling() {
  if (pollTimer) clearInterval(pollTimer), (pollTimer = null);
}

async function monitorToken() {
  while (true) {
    const saved = getSavedTokens();
    if (saved?.access_token) {
      try {
        await tryRefresh(client);
        console.info('[RT] Token renovado');
      } catch (e) {
        console.warn('[RT] Fallo al renovar el token, redirigiendo al login', e);
        clearTokens();
        location.href = 'login.html';
        break;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // Revisa cada 5 minutos
  }
}

// Inicia el monitoreo después de la verificación inicial de la sesión
await ensureSession();
monitorToken();

  // init
  switchView('socios');
});
