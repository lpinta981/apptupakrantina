// config.js

// Credenciales para la conexión con tu proyecto de Supabase.
const SUPABASE_URL = 'https://lpsupabase.luispinta.com'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.c9lDffnJrU-JBqtYYh8WgUpEaN4HoUk5ecnZgBKX8OA';

// Inicializa el cliente de Supabase. No es necesario modificar esta línea.
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
