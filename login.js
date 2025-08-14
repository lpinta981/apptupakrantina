document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const submitButton = loginForm.querySelector('button[type="submit"]');

    // URL de nuestra API de Google Apps Script
    const API_URL = 'https://script.google.com/macros/s/AKfycbxlZrCscxBTkC54oDpQfns3f6-rD2gY54oSBg4Ufdrnz2XekO39FTg_3PH3cbrgBGXlzg/exec';

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Deshabilitar botón y mostrar carga para evitar doble click
        submitButton.disabled = true;
        submitButton.textContent = 'Verificando...';
        errorMessage.classList.add('hidden');

        const enteredPassword = passwordInput.value;

        const payload = {
            ruta: 'verifyLogin',
            data: {
                password: enteredPassword
            }
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
                redirect: 'follow'
            });

            const result = await response.json();

            if (result.status === 'success' && result.data.login === true) {
                sessionStorage.setItem('isLoggedIn', 'true');
                window.location.href = 'app.html';
            } else {
                throw new Error(result.message || 'Contraseña incorrecta.');
            }

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('hidden');
            passwordInput.focus();
        } finally {
            // Volver a habilitar el botón
            submitButton.disabled = false;
            submitButton.textContent = 'Ingresar';
        }
    });
});
