document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const submitButton = loginForm.querySelector('button[type="submit"]');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = 'Verificando...';
        errorMessage.classList.add('hidden');

        const { error } = await supabase.auth.signInWithPassword({
            email: emailInput.value,
            password: passwordInput.value,
        });

        if (error) {
            errorMessage.textContent = 'Error: ' + error.message;
            errorMessage.classList.remove('hidden');
            submitButton.disabled = false;
            submitButton.textContent = 'Ingresar';
        } else {
            window.location.href = 'app.html';
        }
    });
});
