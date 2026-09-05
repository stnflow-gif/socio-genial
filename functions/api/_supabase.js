/**
 * Acceso a Supabase desde las Pages Functions.
 *
 * Las dos variables se cargan como secrets del proyecto de Pages:
 *   wrangler pages secret put SUPABASE_URL         --project-name=tipicos
 *   wrangler pages secret put SUPABASE_SERVICE_KEY --project-name=tipicos
 *
 * Se usa la service key y no la anon: la tabla tiene RLS activo sin politicas,
 * asi que nadie puede leer los telefonos ni siquiera sabiendo la anon key.
 */

export const TABLA = "sg_registro_lanzamiento";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function faltanSecrets(env) {
  return !env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY;
}

export function pedir(env, ruta, init = {}) {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${ruta}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

export function json(cuerpo, status = 200, headers = {}) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS, ...headers },
  });
}

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });
