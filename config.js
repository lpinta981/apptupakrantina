// config.js — Directus con tokens (Bearer) y refresh vía REST
export const DIRECTUS_URL = 'https://directus.luispinta.com';
export const COLLECTION   = 'socios';
export const PRIMARY_KEY  = 'ID_Socio';

import {
  createDirectus, rest, authentication, realtime
} from 'https://cdn.jsdelivr.net/npm/@directus/sdk@latest/+esm';

export function getClient() {
  const c = createDirectus(DIRECTUS_URL)
    .with(rest())
    .with(authentication())   // tokens (Bearer)
    .with(realtime());

  const saved = getSavedTokens();
  if (saved?.access_token) c.setToken(saved.access_token);     // ✅ sólo setToken
  // ⚠️ NO llamar a setRefreshToken (no existe en tu build)

  return c;
}

export function saveTokens({ access_token, refresh_token }) {
  localStorage.setItem('directus_auth', JSON.stringify({ access_token, refresh_token }));
}
export function clearTokens() {
  localStorage.removeItem('directus_auth');
}
export function getSavedTokens() {
  try { return JSON.parse(localStorage.getItem('directus_auth') || 'null'); }
  catch { return null; }
}

/**
 * Refresca tokens usando /auth/refresh (REST). Devuelve true si renovó.
 */
export async function tryRefresh(client) {
  const saved = getSavedTokens();
  if (!saved?.refresh_token) return false;

  const url = `${DIRECTUS_URL.replace(/\/$/,'')}/auth/refresh`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: saved.refresh_token }),
  });
  if (!res.ok) return false;

  const json = await res.json().catch(() => ({}));
  const access_token  = json?.data?.access_token  ?? json?.access_token  ?? null;
  const refresh_token = json?.data?.refresh_token ?? json?.refresh_token ?? null;
  if (!access_token || !refresh_token) return false;

  saveTokens({ access_token, refresh_token });
  client.setToken?.(access_token);   // carga el nuevo access token en el cliente
  return true;
}
