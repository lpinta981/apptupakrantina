// --- VERIFICACIÓN DE SEGURIDAD INICIAL ---
// Si el usuario no ha iniciado sesión, lo redirige a la página de login.
if (sessionStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbxlZrCscxBTkC54oDpQfns3f6-rD2gY54oSBg4Ufdrnz2XekO39FTg_3PH3cbrgBGXlzg/exec';
    const SECRET_TOKEN = 'TUPAK_RANTINA_SUPER_SECRETO_2025';

    // --- ELEMENTOS DEL DOM ---
    const mainContent = document.getElementById('contenido-principal');
    const moduleTitle = document.getElementById('module-title');
    const navLinks = document.querySelectorAll('.nav-link');
    const screenBlocker = document.getElementById('screen-blocker');
    const appHeader = document.querySelector('header'); // Seleccionamos la cabecera

    // --- MANEJO DE EVENTOS ---
    
    // Evento para cerrar sesión (usando delegación de eventos)
    if (appHeader) {
        appHeader.addEventListener('click', (e) => {
            // Comprueba si el elemento clickeado es el botón de logout o está dentro de él
            if (e.target.closest('#logout-btn')) {
                sessionStorage.removeItem('isLoggedIn');
                window.location.href = 'login.html';
            }
        });
    }

    // Eventos para la navegación de módulos
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const module = e.currentTarget.id.split('-')[1];
            
            navLinks.forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');

            loadModule(module);
        });
    });

    // --- NAVEGACIÓN Y CARGA DE MÓDULOS ---
    const loadModule = async (moduleName) => {
        try {
            const response = await fetch(`${moduleName}.html`);
            if (!response.ok) throw new Error(`No se pudo cargar el módulo: ${moduleName}`);
            
            mainContent.innerHTML = await response.text();
            moduleTitle.textContent = `Módulo de ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`;
            
            if (moduleName === 'socios') initSociosModule();

        } catch (error) {
            mainContent.innerHTML = `<p class="text-red-500">Error al cargar el módulo: ${error.message}</p>`;
        }
    };

    // --- LÓGICA DEL MÓDULO DE SOCIOS ---
    const initSociosModule = () => {
        const addSocioBtn = document.getElementById('add-socio-btn');
        const modal = document.getElementById('socio-modal');
        const cancelBtn = document.getElementById('cancel-btn');
        const socioForm = document.getElementById('socio-form');
        const modalTitle = document.getElementById('modal-title');

        const openModal = () => modal.classList.replace('hidden', 'flex');
        const closeModal = () => {
            modal.classList.replace('flex', 'hidden');
            socioForm.reset();
            document.getElementById('ID_Socio').value = '';
        };

        addSocioBtn.addEventListener('click', () => {
            modalTitle.textContent = 'Añadir Nuevo Socio';
            openModal();
        });
        cancelBtn.addEventListener('click', closeModal);

        socioForm.addEventListener('submit', handleSocioSubmit);
        
        loadSocios();
    };

    const loadSocios = async () => {
        const tableBody = document.getElementById('socios-table-body');
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center p-8">Cargando socios...</td></tr>';

        try {
            const response = await fetch(`${API_URL}?ruta=getSocios&token=${SECRET_TOKEN}`);
            const result = await response.json();

            if (result.status !== 'success') throw new Error(result.message);

            renderSocios(result.data);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-red-500">Error: ${error.message}</td></tr>`;
        }
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
                <td class="py-4 px-6">
                    <span class="px-2 py-1 font-semibold leading-tight ${socio.Estado_Socio === 'Activo' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'} rounded-full">
                        ${socio.Estado_Socio}
                    </span>
                </td>
                <td class="py-4 px-6">
                    <button class="edit-btn font-medium text-blue-600 hover:underline" data-socio-id="${socio.ID_Socio}">Editar</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const socioId = e.target.dataset.socioId;
                const socioData = socios.find(s => s.ID_Socio === socioId);
                if (socioData) openEditModal(socioData);
            });
        });
    };
    
    const openEditModal = (socio) => {
        const modalTitle = document.getElementById('modal-title');
        modalTitle.textContent = 'Editar Información del Socio';
        
        document.getElementById('ID_Socio').value = socio.ID_Socio;
        document.getElementById('nombres').value = socio.Nombres_Completos;
        document.getElementById('apellidos').value = socio.Apellidos_Completos;
        document.getElementById('cedula').value = socio.Cedula_Identidad;
        document.getElementById('fechaNacimiento').value = socio.Fecha_Nacimiento ? new Date(socio.Fecha_Nacimiento).toISOString().split('T')[0] : '';
        document.getElementById('telefono').value = socio.Telefono_Celular;
        document.getElementById('email').value = socio.Correo_Electronico;
        document.getElementById('direccion').value = socio.Direccion_Domicilio;

        document.getElementById('socio-modal').classList.replace('hidden', 'flex');
    };

    const handleSocioSubmit = async (e) => {
        e.preventDefault();
        screenBlocker.classList.remove('hidden'); // Acción: Mostrar bloqueador
        const form = e.target;
        const id = form.querySelector('#ID_Socio').value;

        const socioData = {
            ID_Socio: id,
            Nombres_Completos: form.querySelector('#nombres').value,
            Apellidos_Completos: form.querySelector('#apellidos').value,
            Cedula_Identidad: form.querySelector('#cedula').value,
            Fecha_Nacimiento: form.querySelector('#fechaNacimiento').value,
            Direccion_Domicilio: form.querySelector('#direccion').value,
            Telefono_Celular: form.querySelector('#telefono').value,
            Correo_Electronico: form.querySelector('#email').value
        };

        const payload = {
            token: SECRET_TOKEN,
            ruta: id ? 'updateSocio' : 'addSocio',
            data: id ? socioData : {
                nombres: socioData.Nombres_Completos,
                apellidos: socioData.Apellidos_Completos,
                cedula: socioData.Cedula_Identidad,
                fechaNacimiento: socioData.Fecha_Nacimiento,
                direccion: socioData.Direccion_Domicilio,
                telefono: socioData.Telefono_Celular,
                email: socioData.Correo_Electronico
            }
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.status !== 'success') throw new Error(result.message);
            
            document.getElementById('socio-modal').classList.replace('flex', 'hidden');
            form.reset();
            loadSocios();

        } catch (error) {
            alert(`Error al guardar: ${error.message}`);
        } finally {
            screenBlocker.classList.add('hidden'); // Acción: Ocultar bloqueador
        }
    };

    // --- INICIALIZACIÓN ---
    document.getElementById('nav-socios').click();
});
