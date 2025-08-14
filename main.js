// --- VERIFICACIÓN DE SEGURIDAD INICIAL ---
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    }
}
checkAuth();

document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO DE LA APLICACIÓN ---
    const moduleCache = {}; // Almacena el HTML de los módulos

    // --- ELEMENTOS DEL DOM ---
    const mainContent = document.getElementById('contenido-principal');
    const moduleTitle = document.getElementById('module-title');
    const navLinks = document.querySelectorAll('.nav-link');
    const screenBlocker = document.getElementById('screen-blocker');
    const logoutBtn = document.getElementById('logout-btn');

    // --- MANEJO DE EVENTOS ---
    logoutBtn.addEventListener('click', async () => {
        sessionStorage.removeItem('socios_cache'); // Limpiar caché al salir
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const moduleName = e.currentTarget.id.split('-')[1];
            showModule(moduleName);
        });
    });

    // --- LÓGICA DE MÓDULOS ---
    const showModule = (moduleName) => {
        Array.from(mainContent.children).forEach(child => child.classList.add('hidden'));
        if (moduleCache[moduleName]) {
            moduleCache[moduleName].container.classList.remove('hidden');
            // Si regresamos al módulo de socios, iniciamos la actualización en segundo plano
            if (moduleName === 'socios') {
                backgroundRefreshSocios(); 
            }
        } else {
            loadModule(moduleName);
        }
        moduleTitle.textContent = `Módulo de ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`;
        navLinks.forEach(l => l.classList.toggle('active', l.id === `nav-${moduleName}`));
    };

    const loadModule = async (moduleName) => {
        try {
            const response = await fetch(`${moduleName}.html`);
            if (!response.ok) throw new Error(`Módulo no encontrado.`);
            const moduleHtml = await response.text();
            const container = document.createElement('div');
            container.innerHTML = moduleHtml;
            mainContent.appendChild(container);
            moduleCache[moduleName] = { container };
            if (moduleName === 'socios') initSociosModule();
        } catch (error) {
            mainContent.innerHTML = `<p class="text-red-500">${error.message}</p>`;
        }
    };

    // --- LÓGICA ESPECÍFICA DEL MÓDULO DE SOCIOS ---
    const initSociosModule = () => {
        document.getElementById('add-socio-btn').addEventListener('click', () => openEditModal(null));
        document.getElementById('socio-form').addEventListener('submit', handleSocioSubmit);
        document.getElementById('cancel-btn').addEventListener('click', () => document.getElementById('socio-modal').classList.replace('flex', 'hidden'));
        loadInitialSocios();
    };

    const loadInitialSocios = () => {
        const cachedSocios = sessionStorage.getItem('socios_cache');
        if (cachedSocios) {
            console.log("Cargando socios desde el caché.");
            renderSocios(JSON.parse(cachedSocios));
            backgroundRefreshSocios(); // Iniciar actualización en segundo plano
        } else {
            console.log("Caché vacío, cargando desde Supabase.");
            loadSociosFromSupabase();
        }
    };

    const backgroundRefreshSocios = async () => {
        console.log("Actualizando socios en segundo plano...");
        const { data: socios, error } = await supabase.from('socios').select('*').order('Nombres_Completos', { ascending: true });
        if (!error) {
            sessionStorage.setItem('socios_cache', JSON.stringify(socios));
            renderSocios(socios);
            console.log("Caché y vista de socios actualizados.");
        } else {
            console.error("Error en la actualización de segundo plano:", error.message);
        }
    };
    
    const loadSociosFromSupabase = async () => {
        renderSkeleton();
        const { data: socios, error } = await supabase.from('socios').select('*').order('Nombres_Completos', { ascending: true });
        if (error) {
            document.getElementById('socios-table-body').innerHTML = `<tr><td colspan="6" class="text-center p-8 text-red-500">Error: ${error.message}</td></tr>`;
            return;
        }
        sessionStorage.setItem('socios_cache', JSON.stringify(socios));
        renderSocios(socios);
    };

    const renderSkeleton = (rows = 5) => {
        const tableBody = document.getElementById('socios-table-body');
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

    const renderSocios = (socios) => {
        const tableBody = document.getElementById('socios-table-body');
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
    
    const openEditModal = (socio) => {
        const modal = document.getElementById('socio-modal');
        const form = document.getElementById('socio-form');
        form.reset();
        document.getElementById('modal-title').textContent = socio ? 'Editar Socio' : 'Añadir Nuevo Socio';
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
            document.getElementById('socio-modal').classList.replace('flex', 'hidden');
            // Forzar la actualización inmediata después de guardar
            loadSociosFromSupabase();
        }
        screenBlocker.classList.add('hidden');
    };

    // --- INICIALIZACIÓN ---
    document.getElementById('nav-socios').click();
});
