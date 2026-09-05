/**
 * GET /api/confirmados — lista publica de quienes ya se registraron.
 *
 * La consume tipicos.online/lanzamiento/confirmados/ con un poll cada 8s.
 * Solo sale primer nombre + inicial del apellido y cuantas personas trae cada
 * uno: el telefono no cruza nunca el borde de esta funcion.
 */

import { TABLA, faltanSecrets, pedir, json } from "./_supabase.js";

export { onRequestOptions } from "./_supabase.js";

const TOPE = 300;

/** "Juan Carlos Perez" -> "Juan P." ; "Juan" -> "Juan" */
function anonimizar(nombre) {
  const partes = String(nombre || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "Alguien";
  const primero = partes[0];
  if (partes.length === 1) return primero;
  return `${primero} ${partes[partes.length - 1][0].toUpperCase()}.`;
}

export async function onRequestGet({ env }) {
  const vacio = { personas: 0, total: 0, lista: [] };

  if (faltanSecrets(env)) {
    console.error("confirmados: faltan SUPABASE_URL o SUPABASE_SERVICE_KEY");
    return json(vacio, 200, { "cache-control": "no-store" });
  }

  const res = await pedir(
    env,
    `${TABLA}?select=nombre,personas&order=created_at.asc&limit=${TOPE}`
  );

  if (!res.ok) {
    console.error("confirmados: supabase respondio", res.status, await res.text());
    // La sublanding no tiene manejo de error: mejor una lista vacia que un
    // fetch que revienta y deja los contadores congelados.
    return json(vacio, 200, { "cache-control": "no-store" });
  }

  const filas = await res.json();

  return json(
    {
      personas: filas.reduce((suma, f) => suma + (Number(f.personas) || 1), 0),
      total: filas.length,
      lista: filas.map((f) => ({
        nombre: anonimizar(f.nombre),
        personas: Number(f.personas) || 1,
      })),
    },
    200,
    { "cache-control": "no-store" }
  );
}
