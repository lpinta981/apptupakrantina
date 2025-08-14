// config.js

// Credenciales para la conexión con tu proyecto de Supabase.
const SUPABASE_URL = 'https://lpsupabase.luispinta.com'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.Z3eWZTo01fzX-yDfKNIGpiY6q_z5W_erg_aYtqxzd_w';

// Inicializa el cliente de Supabase. No es necesario modificar esta línea.
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
