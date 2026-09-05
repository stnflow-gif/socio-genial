/**
 * POST/GET /api/registro — guarda un registro de la landing de lanzamiento.
 *
 * La landing manda los datos por query string y con mode:'no-cors', asi que
 * nunca llega a leer la respuesta: si esto falla, el visitante igual ve la
 * pantalla de exito. Por eso la funcion tiene que ser lo mas dificil de
 * romper posible, y por eso todo error se loguea aunque el cuerpo se pierda.
 */

import { TABLA, faltanSecrets, pedir, json } from "./_supabase.js";

export { onRequestOptions } from "./_supabase.js";

const LIMITES = { invitadosMax: 20, nombreMin: 2, telefonoMinDigitos: 7 };

function normalizar(params, request) {
  const nombre = (params.get("nombre") || "").trim().slice(0, 120);
  const telefono = (params.get("telefono") || "").replace(/[^\d+]/g, "").slice(0, 24);

  const invitadosCrudo = parseInt(params.get("invitados") || "0", 10);
  const invitados = Number.isFinite(invitadosCrudo)
    ? Math.min(Math.max(invitadosCrudo, 0), LIMITES.invitadosMax)
    : 0;

  return {
    nombre,
    telefono,
    invitados,
    personas: invitados + 1,
    origen: (params.get("origen") || "directo").trim().slice(0, 80) || "directo",
    user_agent: (request.headers.get("user-agent") || "").slice(0, 300),
    updated_at: new Date().toISOString(),
  };
}

function validar(fila) {
  if (fila.nombre.length < LIMITES.nombreMin) return "nombre demasiado corto";
  if (fila.telefono.replace(/\D/g, "").length < LIMITES.telefonoMinDigitos) {
    return "telefono demasiado corto";
  }
  return null;
}

async function guardar(request, env, params) {
  if (faltanSecrets(env)) {
    console.error("registro: faltan SUPABASE_URL o SUPABASE_SERVICE_KEY");
    return json({ ok: false, error: "backend sin configurar" }, 500);
  }

  const fila = normalizar(params, request);
  const problema = validar(fila);
  if (problema) return json({ ok: false, error: problema }, 400);

  // merge-duplicates + indice unico en telefono: registrarse dos veces
  // actualiza el registro en vez de duplicar el cupo.
  const res = await pedir(env, `${TABLA}?on_conflict=telefono`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(fila),
  });

  if (!res.ok) {
    console.error("registro: supabase respondio", res.status, await res.text());
    return json({ ok: false, error: "no se pudo guardar" }, 502);
  }

  return json({ ok: true, personas: fila.personas });
}

export async function onRequestGet({ request, env }) {
  return guardar(request, env, new URL(request.url).searchParams);
}

export async function onRequestPost({ request, env }) {
  const tipo = request.headers.get("content-type") || "";
  let params;

  if (tipo.includes("application/json")) {
    const cuerpo = await request.json().catch(() => ({}));
    params = new URLSearchParams(
      Object.entries(cuerpo).map(([k, v]) => [k, v == null ? "" : String(v)])
    );
  } else {
    params = new URLSearchParams(await request.text());
  }

  return guardar(request, env, params);
}
