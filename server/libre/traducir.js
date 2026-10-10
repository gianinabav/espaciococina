// Traducción gratuita con MyMemory (api.mymemory.translated.net): no pide clave.
// Límite aproximado de 5.000 caracteres por día sin registro, por eso todo se guarda en caché.
// Si el servicio no responde, se devuelve el texto original.
import { cache } from './cache.js'

const guardadas = cache('traducciones')
const IDIOMAS = { es: 'es', en: 'en', pt: 'pt-BR', fr: 'fr' }
// TRADUCCION_EN_SERVIDOR=off: el servidor no traduce y deja todo al navegador (sirve para probar).
let agotado = process.env.TRADUCCION_EN_SERVIDOR === 'off'

async function traducirTrozo(texto, de, a) {
  const clave = `${de}|${a}|${texto}`
  const enCache = guardadas.leer(clave)
  if (enCache) return enCache
  if (agotado) return null
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=${IDIOMAS[de] ?? de}|${IDIOMAS[a] ?? a}`
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) })
    const datos = await r.json()
    if (datos.quotaFinished || datos.responseStatus === 429) {
      agotado = true
      return null
    }
    const traducido = datos.responseData?.translatedText
    if (datos.responseStatus !== 200 || !traducido || /MYMEMORY WARNING|INVALID/i.test(traducido)) return null
    return guardadas.escribir(clave, decodificar(traducido))
  } catch {
    return null
  }
}

const decodificar = (t) => t.replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')

// Traduce una lista de textos. Devuelve { textos, traducido, faltantes }.
// "ayuda" son traducciones que ya hizo el navegador del visitante (texto original → traducido):
// se usan primero, y quedan guardadas para la próxima vez.
export async function traducir(textos, de, a, ayuda = {}) {
  if (!textos.length || de === a) return { textos, traducido: true, faltantes: [] }
  const faltantes = []
  const resultado = []
  // De a pocos para no saturar el servicio.
  for (let i = 0; i < textos.length; i += 4) {
    const grupo = await Promise.all(
      textos.slice(i, i + 4).map(async (t) => {
        if (!t?.trim()) return t
        if (typeof ayuda[t] === 'string' && ayuda[t].trim()) {
          guardadas.escribir(`${de}|${a}|${t.trim()}`, ayuda[t].trim().slice(0, 4000))
          return ayuda[t].trim()
        }
        const partes = t.length > 450 ? t.match(/[^.!?]+[.!?]*\s*/g) ?? [t] : [t]
        const traducidas = []
        let completo = true
        for (const p of partes) {
          const tr = await traducirTrozo(p.trim(), de, a)
          if (!tr) completo = false
          traducidas.push(tr ?? p.trim())
        }
        if (!completo) faltantes.push(t)
        return traducidas.join(' ')
      }),
    )
    resultado.push(...grupo)
  }
  return { textos: resultado, traducido: faltantes.length === 0, faltantes }
}
