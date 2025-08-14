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
    let currentSubscription = null; // Rastrea la suscripción en tiempo real activa

    // --- ELEMENTOS DEL DOM ---
    const mainContent = document.getElementById('contenido-principal');
    const moduleTitle = document.getElementById('module-title');
    const navLinks = document.querySelectorAll('.nav-link');
    const screenBlocker = document.getElementById('screen-blocker');
    const logoutBtn = document.getElementById('logout-btn');

    // --- MANEJO DE EVENTOS ---
    logoutBtn.addEventListener('click', async () => {
        if (currentSubscription) {
            supabase.removeChannel(currentSubscription);
        }
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
        // 1. Limpiar la suscripción anterior antes de cambiar de vista
        if (currentSubscription) {
            supabase.removeChannel(currentSubscription);
            currentSubscription = null;
            console.log("Suscripción anterior eliminada.");
        }

        // 2. Ocultar todos los módulos
        Array.from(mainContent.children).forEach(child => child.classList.add('hidden'));

        // 3. Mostrar o cargar el módulo solicitado
        if (moduleCache[moduleName]) {
            moduleCache[moduleName].container.classList.remove('hidden');
        } else {
            loadModule(moduleName);
        }
        
        // 4. Si el nuevo módulo es 'socios', iniciar una nueva suscripción
        if (moduleName === 'socios') {
            listenForSocioChanges();
        }

        // 5. Actualizar UI
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
        loadSocios();
    };

    const listenForSocioChanges = () => {
        console.log("Creando nueva suscripción al canal 'public:socios'...");
        const channel = supabase.channel('public:socios')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'socios' }, payload => {
                console.log('Cambio en tiempo real recibido!', payload);
                loadSocios(); // Recargar la lista de socios al recibir un cambio
            })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('¡Conectado al canal de socios!');
                }
                if (status === 'CHANNEL_ERROR') {
                    console.error('Error de conexión en el canal:', err);
                }
            });
        
        currentSubscription = channel; // Guardar la nueva suscripción como la actual
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

    const loadSocios = async () => {
        const tableBody = document.getElementById('socios-table-body');
        if (tableBody.children.length === 0) {
            renderSkeleton();
        }
        const { data: socios, error } = await supabase.from('socios').select('*').order('Nombres_Completos', { ascending: true });
        if (error) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-red-500">Error: ${error.message}</td></tr>`;
            return;
        }
        renderSocios(socios);
    };

    const renderSocios = (socios) => {
        const tableBody = document.getElementById('socios-table-body');
        tableBody.innerHTML = '';
        if (socios.length === 0) {
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
        }
        screenBlocker.classList.add('hidden');
    };

    // --- INICIALIZACIÓN ---
    document.getElementById('nav-socios').click();
});
