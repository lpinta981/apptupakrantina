// --- VERIFICACIÓN DE SEGURIDAD INICIAL ---
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    }
}
checkAuth();

document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO CENTRALIZADO DE LA APLICACIÓN ---
    const app = {
        activeModule: null,
        modules: {
            socios: { container: null, data: [] },
            aportes: { container: null, data: [] }
            // Aquí se añadirán los futuros módulos
        }
    };

    // --- ELEMENTOS PRINCIPALES DEL DOM ---
    const mainContent = document.getElementById('contenido-principal');
    const moduleTitle = document.getElementById('module-title');
    const navLinks = document.querySelectorAll('.nav-link');
    const screenBlocker = document.getElementById('screen-blocker');
    const logoutBtn = document.getElementById('logout-btn');

    // --- MANEJO DE EVENTOS PRINCIPALES ---
    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const moduleName = e.currentTarget.id.split('-')[1];
            switchView(moduleName);
        });
    });

    // --- LÓGICA CENTRAL PARA CAMBIAR DE VISTA ---
    const switchView = async (moduleName) => {
        if (app.activeModule === moduleName) return; // No hacer nada si ya está activa

        // Ocultar el módulo que estaba activo
        if (app.activeModule && app.modules[app.activeModule]?.container) {
            app.modules[app.activeModule].container.classList.add('hidden');
        }

        app.activeModule = moduleName;
        const module = app.modules[moduleName];

        if (module && module.container) {
            // Si el módulo ya fue cargado, simplemente se muestra
            module.container.classList.remove('hidden');
        } else {
            // Si es la primera vez, se carga el HTML y se inicializa
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

                // Inicializar la lógica específica de cada módulo
                if (moduleName === 'socios') initSociosModule();
                // if (moduleName === 'aportes') initAportesModule(); // Ejemplo para el futuro

            } catch (error) {
                console.error(`Error al cargar el módulo ${moduleName}:`, error);
            }
        }

        // Actualizar la UI (título y menú)
        moduleTitle.textContent = `Módulo de ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`;
        navLinks.forEach(l => l.classList.toggle('active', l.id === `nav-${moduleName}`));
    };

    // --- LÓGICA ESPECÍFICA DEL MÓDULO DE SOCIOS ---
    const initSociosModule = () => {
        const container = app.modules.socios.container;
        container.querySelector('#add-socio-btn').addEventListener('click', () => openEditModal(null));
        container.querySelector('#socio-form').addEventListener('submit', handleSocioSubmit);
        container.querySelector('#cancel-btn').addEventListener('click', () => container.querySelector('#socio-modal').classList.replace('flex', 'hidden'));
        fetchAndRenderSocios(); // Carga inicial de datos
    };

    const fetchAndRenderSocios = async (isBackgroundRefresh = false) => {
        if (!isBackgroundRefresh) renderSkeleton();
        
        const { data, error } = await supabase.from('socios').select('*').order('Nombres_Completos');
        
        if (error) {
            console.error("Error al obtener socios:", error.message);
            const tableBody = app.modules.socios.container.querySelector('#socios-table-body');
            if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-red-500">Error al cargar datos.</td></tr>`;
            return;
        }
        
        app.modules.socios.data = data; // Guardar los datos en el estado de la app
        renderSocios(data);
    };
    
    const renderSocios = (socios) => {
        const container = app.modules.socios.container;
        if (!container) return;
        const tableBody = container.querySelector('#socios-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        if (!socios || socios.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center p-8">No hay socios registrados.</td></tr>';
            return;
        }
        socios.forEach(socio => {
            const tr = document.createElement('tr');
            tr.className = 'bg-white border-b hover:bg-slate-50';
            tr.innerHTML = `
                <td class="py-4 px-6 font-medium text-slate-900">${socio.Nombres_Completos} ${socio.Apellidos_Completos}</td>
                <td class="py-4 px-6">${socio.Cedula_Identidad}</td>
                <td class="py-4 px-6">${socio.Telefono_Celular}</td>
                <td class="py-4 px-6">${new Date(socio.Fecha_Ingreso).toLocaleDateString()}</td>
                <td class="py-4 px-6"><span class="px-2 py-1 font-semibold leading-tight ${socio.Estado_Socio === 'Activo' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'} rounded-full">${socio.Estado_Socio}</span></td>
                <td class="py-4 px-6"><button class="edit-btn font-medium text-blue-600 hover:underline">Editar</button></td>`;
            tr.querySelector('.edit-btn').addEventListener('click', () => openEditModal(socio));
            tableBody.appendChild(tr);
        });
    };
    
    const renderSkeleton = (rows = 5) => {
        const container = app.modules.socios.container;
        if (!container) return;
        const tableBody = container.querySelector('#socios-table-body');
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
                <td class="py-4 px-6"><div class="skeleton h-4 w-1/4"></div></td>
            `;
            tableBody.appendChild(tr);
        }
    };
    
    const openEditModal = (socio) => {
        const container = app.modules.socios.container;
        if (!container) return;
        const modal = container.querySelector('#socio-modal');
        const form = container.querySelector('#socio-form');
        form.reset();
        container.querySelector('#modal-title').textContent = socio ? 'Editar Socio' : 'Añadir Nuevo Socio';
        if (socio) {
            form.querySelector('#ID_Socio').value = socio.ID_Socio;
            form.querySelector('#nombres').value = socio.Nombres_Completos;
            form.querySelector('#apellidos').value = socio.Apellidos_Completos;
            form.querySelector('#cedula').value = socio.Cedula_Identidad;
            form.querySelector('#fechaNacimiento').value = socio.Fecha_Nacimiento;
            form.querySelector('#telefono').value = socio.Telefono_Celular;
            form.querySelector('#email').value = socio.Correo_Electronico;
            form.querySelector('#direccion').value = socio.Direccion_Domicilio;
        }
        modal.classList.replace('hidden', 'flex');
    };

    const handleSocioSubmit = async (e) => {
        e.preventDefault();
        screenBlocker.classList.remove('hidden');
        const form = e.target;
        const id = form.querySelector('#ID_Socio').value;
        const socioData = {
            Nombres_Completos: form.querySelector('#nombres').value,
            Apellidos_Completos: form.querySelector('#apellidos').value,
            Cedula_Identidad: form.querySelector('#cedula').value,
            Fecha_Nacimiento: form.querySelector('#fechaNacimiento').value,
            Direccion_Domicilio: form.querySelector('#direccion').value,
            Telefono_Celular: form.querySelector('#telefono').value,
            Correo_Electronico: form.querySelector('#email').value,
        };

        let error;
        if (id) {
            const { error: updateError } = await supabase.from('socios').update(socioData).eq('ID_Socio', id);
            error = updateError;
        } else {
            socioData.ID_Socio = `SOC-${Date.now()}`;
            socioData.Fecha_Ingreso = new Date().toISOString();
            const { error: insertError } = await supabase.from('socios').insert(socioData);
            error = insertError;
        }

        if (error) {
            alert('Error al guardar: ' + error.message);
        } else {
            app.modules.socios.container.querySelector('#socio-modal').classList.replace('flex', 'hidden');
            fetchAndRenderSocios(); // Forzar recarga de datos después de guardar
        }
        screenBlocker.classList.add('hidden');
    };

    // --- ACTUALIZADOR AUTOMÁTICO EN SEGUNDO PLANO ---
    setInterval(() => {
        if (app.activeModule === 'socios') {
            console.log("Actualización automática de socios...");
            fetchAndRenderSocios(true); // true indica que es una actualización de fondo
        }
    }, 30000); // Cada 30 segundos

    // --- INICIALIZACIÓN DE LA APP ---
    switchView('socios');
});
