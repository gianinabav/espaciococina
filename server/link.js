// Descarga una página de recetas y saca la receta.
// Si la página trae la receta en formato schema.org (JSON-LD), usa eso,
// que es mucho más limpio que el HTML. Los videos de YouTube se leen aparte:
// primero su descripción y, si ahí no está la receta, la página que enlazan.
import dns from 'node:dns/promises'
import net from 'node:net'
import { ErrorApp } from './errores.js'
import { cache } from './libre/cache.js'
import { leerRecetaJsonLd, leerRecetaTexto, limpiarTitulo } from './libre/receta-texto.js'

const MAX_CARACTERES = 60000
const NAVEGADOR = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36'
// Una receta necesita al menos esto para no confundirla con cualquier página.
const MINIMO_INGREDIENTES = 3

function validarUrl(direccion) {
  let url
  try {
    url = new URL(direccion.trim())
  } catch {
    throw new ErrorApp('link_invalido', 'El link no es válido. Copia la dirección completa (empieza con https://).', 400)
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new ErrorApp('link_invalido', 'Solo se pueden leer links que empiecen con http:// o https://.', 400)
  }
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|0\.0\.0\.0)/.test(url.hostname)) {
    throw new ErrorApp('link_invalido', 'Ese link apunta a una dirección local.', 400)
  }
  return url
}

// Descarga una página. Si el sitio bloquea la lectura automática (protección
// anti-robots), avisa con el código "bloqueada" para probar con la copia de archive.org.
// Direcciones de redes privadas (tu router, otros equipos de tu casa, el propio servidor).
function esPrivada(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  }
  const v6 = ip.toLowerCase()
  if (v6.startsWith('::ffff:')) return esPrivada(v6.slice(7))
  return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80')
}

// Antes de abrir un link se revisa a qué dirección apunta de verdad: así nadie puede usar
// "leer receta desde un link" para entrar a la red de la casa donde corre la app.
async function verificarDestino(url) {
  let direcciones
  try {
    direcciones = net.isIP(url.hostname.replace(/^\[|\]$/g, '')) ? [{ address: url.hostname.replace(/^\[|\]$/g, '') }] : await dns.lookup(url.hostname, { all: true })
  } catch {
    throw new ErrorApp('link_no_responde', 'No encontramos esa página. Revisa el link.', 400)
  }
  if (!direcciones.length || direcciones.some((d) => esPrivada(d.address))) {
    throw new ErrorApp('link_invalido', 'Ese link apunta a una dirección privada.', 400)
  }
}

// Descarga una página. Si el sitio bloquea la lectura automática (protección
// anti-robots), avisa con el código "bloqueada" para probar con la copia de archive.org.
async function descargar(url) {
  let actual = url
  let respuesta
  // Las redirecciones se siguen a mano para revisar cada destino.
  for (let saltos = 0; ; saltos++) {
    await verificarDestino(actual)
    try {
      respuesta = await fetch(actual, {
        headers: { 'user-agent': NAVEGADOR, accept: 'text/html,*/*', 'accept-language': 'es,en;q=0.8' },
        redirect: 'manual',
        signal: AbortSignal.timeout(15000),
      })
    } catch {
      throw new ErrorApp('link_no_responde', 'No se pudo abrir esa página. Revisa el link o pega el texto de la receta.', 502)
    }
    const destino = respuesta.headers.get('location')
    if (respuesta.status >= 300 && respuesta.status < 400 && destino) {
      if (saltos >= 5) throw new ErrorApp('link_no_responde', 'Esa página redirige demasiadas veces.', 502)
      actual = validarUrl(new URL(destino, actual).href)
      continue
    }
    break
  }
  const html = await respuesta.text().catch(() => '')
  const desafio = /just a moment|cf-chl|challenge-platform|captcha|attention required/i.test(html.slice(0, 20000))
  if ([401, 403, 429, 503].includes(respuesta.status) || (desafio && html.length < 50000)) {
    throw Object.assign(new ErrorApp('bloqueada', 'Esa página bloquea la lectura automática.', 422), { saturada: respuesta.status === 429 })
  }
  if (!respuesta.ok) {
    throw new ErrorApp('link_no_responde', `La página respondió con un error (${respuesta.status}). Prueba pegando el texto de la receta.`, 502)
  }
  return { html, urlFinal: actual.href }
}

export async function textoDesdeLink(direccion) {
  const url = validarUrl(direccion)
  const video = idDeYoutube(url)
  if (video) return recetaDeYoutube(video)
  return recetaDePagina(url)
}

async function recetaDePagina(url) {
  let html
  try {
    ;({ html } = await descargar(url))
  } catch (error) {
    if (error.codigo !== 'bloqueada') throw error
    return recetaDeArchivo(url)
  }
  return recetaDeHtml(html)
}

// Lee la receta de una página ya descargada. Sin una lista de ingredientes, falla con "link_sin_receta".
function recetaDeHtml(html, aviso) {
  // La mayoría de los sitios de recetas publican la receta en formato schema.org.
  const recetaLD = buscarRecetaJsonLd(html)
  if (recetaLD) {
    const receta = leerRecetaJsonLd(recetaLD)
    if (receta.ingredientes.length >= 2) return { receta, fuente: 'json-ld', aviso }
  }

  const texto = htmlATexto(html)
  const receta = leerRecetaTexto(texto.slice(0, MAX_CARACTERES))
  if (receta.ingredientes.length < MINIMO_INGREDIENTES) {
    throw new ErrorApp('link_sin_receta', 'No encontramos una lista de ingredientes en esa página (puede que la cargue con JavaScript o que esté en un video). Copia la receta y pégala en "Texto".', 422)
  }
  return { receta, fuente: 'html', aviso, recortado: texto.length > MAX_CARACTERES }
}

// Plan B: las copias públicas que guarda el Internet Archive (web.archive.org).
// Algunos sitios reemplazan sus copias recientes por un aviso ("Payment Required"),
// así que se piden al índice las últimas copias que se guardaron bien y se prueban
// de la más nueva a la más vieja. Si el índice no responde, se prueba la más reciente.
// Lo leído se guarda 30 días: archive.org limita las consultas seguidas, y una copia vieja no cambia.
const COPIAS_A_PROBAR = 3
const leidasDelArchivo = cache('archivo', 24 * 30)
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

async function recetaDeArchivo(url) {
  const guardada = leidasDelArchivo.leer(url.href)
  if (guardada) return guardada

  const sitio = url.hostname.replace(/^www\./, '')
  const fechas = []
  try {
    const cdx = new URL('https://web.archive.org/cdx/search/cdx')
    cdx.search = new URLSearchParams({ url: url.href, filter: 'statuscode:200', output: 'json', limit: String(-COPIAS_A_PROBAR) })
    const filas = await fetch(cdx, { signal: AbortSignal.timeout(15000) }).then((r) => (r.ok ? r.json() : []))
    fechas.push(...filas.slice(1).map((f) => f[1]).reverse())
  } catch {
    // Sin índice de copias: solo se prueba la más reciente.
  }
  if (!fechas.length) fechas.push('2')

  let saturado = false
  for (const fecha of fechas) {
    // Si archive.org pide esperar, se espera un poco y se reintenta una sola vez.
    for (let intento = 0; intento < 2; intento++) {
      try {
        const copia = await descargar(new URL(`https://web.archive.org/web/${fecha}id_/${url.href}`))
        const dia = copia.urlFinal.match(/\/web\/(\d{4})(\d{2})(\d{2})/)
        const aviso = `${sitio} bloquea la lectura automática, así que usamos la copia pública guardada en archive.org${dia ? ` el ${dia[3]}/${dia[2]}/${dia[1]}` : ''}. Revisa que la receta sea la misma.`
        return leidasDelArchivo.escribir(url.href, recetaDeHtml(copia.html, aviso))
      } catch (error) {
        saturado = Boolean(error.saturada)
        if (!saturado) break // Esta copia no sirve (vacía o sin receta): se prueba la siguiente.
        if (intento === 0) await esperar(5000)
      }
    }
    if (saturado) break // Insistir con otras copias solo alarga el bloqueo.
  }
  if (saturado) {
    throw new ErrorApp('bloqueada', `${sitio} bloquea la lectura automática y archive.org, donde buscamos su copia, está recibiendo demasiadas consultas en este momento. Prueba otra vez en unos minutos o pega el texto de la receta en "Texto".`, 503)
  }
  throw new ErrorApp('bloqueada', `${sitio} bloquea la lectura automática (protección anti-robots) y tampoco pudimos usar su copia en archive.org. Copia la receta desde tu navegador y pégala en "Texto".`, 422)
}

// ---------- YouTube ----------
function idDeYoutube(url) {
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, '')
  if (host === 'youtu.be') return url.pathname.slice(1).split('/')[0] || null
  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com') return null
  if (url.searchParams.get('v')) return url.searchParams.get('v')
  const m = url.pathname.match(/^\/(shorts|embed|live)\/([\w-]{6,})/)
  return m ? m[2] : null
}

// Sitios que nunca son la receta (redes, tiendas, música, patrocinadores típicos).
const NO_RECETA = /(youtube\.com|youtu\.be|instagram\.com|tiktok\.com|facebook\.com|fb\.me|twitter\.com|x\.com|threads\.net|amazon\.|amzn\.|spotify\.com|spoti\.fi|discord|reddit\.com|patreon\.com|twitch\.tv|linktr\.ee|apple\.com|pinterest\.|snapchat|bombas\.com|squarespace\.com|skillshare|hellofresh|nordvpn|audible)/i
const PISTAS_RECETA = /(recipe|receta|receita|ingredient|ingrediente|inspired|inspirad|full|completa|printable|blog|written|escrita|recette)/i

async function recetaDeYoutube(id) {
  const { html } = await descargar(new URL(`https://www.youtube.com/watch?v=${id}&hl=es`))
  let titulo = ''
  let descripcion = ''
  const m = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});(?:var |<\/script>)/s)
  if (m) {
    try {
      const datos = JSON.parse(m[1])
      titulo = datos.videoDetails?.title ?? ''
      descripcion = datos.videoDetails?.shortDescription ?? ''
    } catch {
      // Si YouTube cambia su página, se sigue con lo que haya.
    }
  }
  if (!titulo && !descripcion) {
    throw new ErrorApp('video_ilegible', 'No pudimos leer ese video de YouTube. Copia la receta de la descripción y pégala en "Texto".', 422)
  }

  // 1. La receta escrita en la descripción del video.
  const tituloLimpio = limpiarTitulo(titulo).replace(/\s*#\S+/g, '').trim()
  const enDescripcion = leerRecetaTexto(`${tituloLimpio}\n${descripcion}`)
  if (enDescripcion.ingredientes.length >= MINIMO_INGREDIENTES) {
    const pasos = enDescripcion.pasos.length ? enDescripcion.pasos : [`Sigue la preparación en el video: https://youtu.be/${id}`]
    return {
      receta: { ...enDescripcion, titulo: tituloLimpio || enDescripcion.titulo, pasos },
      fuente: 'youtube',
      aviso: enDescripcion.pasos.length ? 'Leímos la receta de la descripción del video.' : 'Leímos los ingredientes de la descripción del video; los pasos no están escritos, así que te dejamos el link al video.',
    }
  }

  // 2. La página de la receta enlazada en la descripción ("Receta completa: …", "Inspired by: …").
  const lineas = descripcion.split(/\n/)
  const links = []
  for (const linea of lineas) {
    for (const [direccion] of linea.matchAll(/https?:\/\/[^\s)"'<>]+/g)) {
      if (NO_RECETA.test(direccion)) continue
      links.push({ direccion: direccion.replace(/[.,;]+$/, ''), pista: PISTAS_RECETA.test(linea) || PISTAS_RECETA.test(direccion) })
    }
  }
  links.sort((a, b) => Number(b.pista) - Number(a.pista))
  for (const { direccion } of links.slice(0, 4)) {
    try {
      const pagina = await recetaDePagina(validarUrl(direccion))
      const sitio = new URL(direccion).hostname.replace(/^www\./, '')
      return { ...pagina, aviso: [`El video no trae la receta escrita: la sacamos de ${sitio}, que está enlazada en su descripción.`, pagina.aviso ?? 'Revisa que sea la misma.'].join(' ') }
    } catch {
      // Ese link no tenía receta: se prueba el siguiente.
    }
  }

  throw new ErrorApp(
    'video_sin_receta',
    `El video "${titulo}" no tiene la receta escrita en su descripción ni enlaza una página con los ingredientes. Anota los ingredientes que dicen en el video (por ejemplo "2 tazas de harina") y pégalos en "Texto".`,
    422,
  )
}

// ---------- Utilidades ----------
function buscarRecetaJsonLd(html) {
  const bloques = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const [, contenido] of bloques) {
    try {
      const encontrada = buscarTipoReceta(JSON.parse(contenido.trim()))
      if (encontrada) return encontrada
    } catch {
      // JSON-LD mal formado: se ignora y se sigue con el siguiente bloque.
    }
  }
  return null
}

function buscarTipoReceta(nodo) {
  if (!nodo || typeof nodo !== 'object') return null
  if (Array.isArray(nodo)) {
    for (const n of nodo) {
      const r = buscarTipoReceta(n)
      if (r) return r
    }
    return null
  }
  const tipo = nodo['@type']
  if (tipo === 'Recipe' || (Array.isArray(tipo) && tipo.includes('Recipe'))) return nodo
  return buscarTipoReceta(nodo['@graph'])
}

function htmlATexto(html) {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|br|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
}
