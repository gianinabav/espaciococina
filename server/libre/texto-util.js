// Utilidades de texto compartidas por el motor gratuito.
export const normalizar = (texto = '') =>
  String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ/.' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'en', 'y', 'con', 'sin', 'al', 'a', 'of', 'the', 'and', 'with', 'da', 'do', 'das', 'dos', 'e', 'com', 'x', 'para', 'por'])

// Palabras con significado, en singular aproximado ("papas" → "papa", "limones" → "limon").
export function raices(texto) {
  return normalizar(texto)
    .replace(/[/.']/g, ' ')
    .split(' ')
    .filter((p) => p.length > 1 && !VACIAS.has(p))
    .map(raiz)
}

export function raiz(p) {
  if (p.length <= 3 || !p.endsWith('s')) return p
  if (p.endsWith('ces') && p.length > 4) return `${p.slice(0, -3)}z` // nueces → nuez
  if (p.endsWith('oes')) return p.slice(0, -2) // tomatoes → tomato
  if (p.endsWith('es') && /[lnrdjy]$/.test(p.slice(0, -2))) return p.slice(0, -2) // limones → limon
  return p.slice(0, -1) // papas → papa, tomates → tomate
}

export const capitalizar = (t = '') => (t ? t[0].toUpperCase() + t.slice(1) : t)
