// Traducción desde el navegador del visitante (MyMemory, gratis y sin clave).
// Se usa cuando el servidor ya no tiene cupo: cada visitante tiene su propio límite diario.
import { leer, guardar } from './almacen.js'

const IDIOMAS = { es: 'es', en: 'en', pt: 'pt-BR', fr: 'fr' }

async function traducirTrozo(texto, de, a) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=${IDIOMAS[de] ?? de}|${IDIOMAS[a] ?? a}`
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) })
    const d = await r.json()
    const t = d.responseData?.translatedText
    if (d.quotaFinished || d.responseStatus !== 200 || !t || /MYMEMORY WARNING|INVALID/i.test(t)) return null
    return t.replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  } catch {
    return null
  }
}

// Devuelve { "texto original": "texto traducido" } con lo que se pudo traducir.
export async function traducirEnNavegador(textos, de, a) {
  const memoria = leer('traducciones', {})
  const resultado = {}
  const pendientes = textos.filter((t) => t?.trim())
  for (let i = 0; i < pendientes.length; i += 3) {
    await Promise.all(
      pendientes.slice(i, i + 3).map(async (t) => {
        const clave = `${de}|${a}|${t}`
        if (memoria[clave]) return (resultado[t] = memoria[clave])
        const partes = t.length > 450 ? t.match(/[^.!?]+[.!?]*\s*/g) ?? [t] : [t]
        const traducidas = []
        for (const p of partes) {
          const tr = await traducirTrozo(p.trim(), de, a)
          if (!tr) return
          traducidas.push(tr)
        }
        resultado[t] = memoria[clave] = traducidas.join(' ')
      }),
    )
  }
  // Se guardan las últimas traducciones para no repetirlas.
  const entradas = Object.entries(memoria)
  guardar('traducciones', Object.fromEntries(entradas.slice(-400)))
  return resultado
}
