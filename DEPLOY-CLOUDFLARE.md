# Deploy de tipicos.online en Cloudflare Pages

## Que es esto

`docs/` es la raiz del sitio publico `tipicos.online`: la landing de lanzamiento,
la sublanding de confirmados y las ~100 invitaciones personalizadas. Es HTML
plano, no hay build.

`functions/` son las Pages Functions que le dan backend a la landing de
lanzamiento. Estan **fuera** de `docs/` a proposito: si vivieran adentro,
Cloudflare las serviria tambien como archivos estaticos y quedaria el codigo
fuente publicado.

| Ruta | Que hace |
|---|---|
| `functions/api/registro.js` | `GET`/`POST /api/registro` — guarda un registro |
| `functions/api/confirmados.js` | `GET /api/confirmados` — lista publica, sin telefonos |
| `functions/api/_supabase.js` | credenciales y helpers compartidos |

## Configuracion del proyecto de Pages

En Workers & Pages, proyecto `tipicos`:

| Campo | Valor |
|---|---|
| Root directory | (vacio — la raiz del repo) |
| Build command | (vacio) |
| Build output directory | `docs` |

**Si hoy el "Root directory" dice `docs`, hay que cambiarlo a vacio y poner
`docs` en "Build output directory".** Con root en `docs`, Cloudflare busca las
functions en `docs/functions/` y no las va a encontrar, y `/api/registro`
responde 404 sin que nadie se entere (ver mas abajo).

## Secrets

Las functions escriben en Supabase con la service key, nunca con la anon:
la tabla tiene RLS activo y cero politicas, asi que los telefonos no son
legibles ni sabiendo la anon key.

```bash
wrangler pages secret put SUPABASE_URL         --project-name=tipicos
# https://hpzvyzzhpaulhfzccsfr.supabase.co

wrangler pages secret put SUPABASE_SERVICE_KEY --project-name=tipicos
# Supabase > Project Settings > API > service_role (secret)
```

## Antes del primer deploy: la tabla

```bash
cd ../stnflow
supabase link --project-ref hpzvyzzhpaulhfzccsfr
supabase db push   # aplica 20260905130000_sg_registro_lanzamiento.sql
```

## Deploy manual

Desde la raiz del repo, para que `wrangler` encuentre `functions/`:

```bash
wrangler pages deploy docs --project-name=tipicos --branch=main
```

## Probarlo local antes de subir

```bash
npx wrangler pages dev docs \
  --binding SUPABASE_URL=https://hpzvyzzhpaulhfzccsfr.supabase.co \
            SUPABASE_SERVICE_KEY=<service-key>

curl "http://localhost:8788/api/registro?nombre=Prueba%20Test&telefono=%2B59170000000&invitados=1"
curl  http://localhost:8788/api/confirmados
```

## Ojo con esto: el registro falla en silencio

La landing manda el registro asi:

```js
fetch(CONFIG.ENDPOINT + '?' + qs, { mode:'no-cors' }).catch(() => {})
```

Con `mode:'no-cors'` la respuesta es opaca, y el `.catch()` se traga cualquier
error. **Si `/api/registro` esta caido, el visitante ve igual la pantalla de
exito y se va al grupo de WhatsApp, y nosotros nos quedamos sin el dato.**

Por eso, despues de cada deploy, verificar a mano que la ruta responda:

```bash
curl -i "https://tipicos.online/api/registro?nombre=Prueba%20Deploy&telefono=%2B59170000001&invitados=0"
curl -i  https://tipicos.online/api/confirmados
```

Un 404 ahi significa que las functions no se desplegaron (casi siempre por el
"Root directory" mal configurado). Un `{"ok":false,"error":"backend sin
configurar"}` significa que faltan los secrets.

Los registros de prueba se borran despues con:

```sql
delete from sg_registro_lanzamiento where nombre like 'Prueba %';
```

## Contrato de la API

`GET /api/registro` — parametros de query, tal cual los manda la landing:

| Param | Obligatorio | Regla |
|---|---|---|
| `nombre` | si | 2 caracteres minimo |
| `telefono` | si | 7 digitos minimo, con prefijo |
| `invitados` | no | 0 a 20, se capa solo |
| `origen` | no | default `directo` |

Registrarse dos veces con el mismo telefono **actualiza** el registro, no lo
duplica (indice unico + `resolution=merge-duplicates`).

`GET /api/confirmados`:

```json
{ "personas": 27, "total": 3, "lista": [ { "nombre": "Juan P.", "personas": 5 } ] }
```

`nombre` sale siempre anonimizado a primer nombre + inicial. El telefono no
cruza nunca el borde de la function.
