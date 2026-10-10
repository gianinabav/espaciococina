// Cantidades y unidades de cocina: lee "1 1/2 tazas", "½ cdta", "8 oz"… y las
// pasa a gramos, mililitros o unidades.
import { normalizar } from './texto-util.js'

// Cada unidad: a qué base va (g, ml o unidad) y cuánto vale 1 en esa base.
const UNIDADES = [
  { base: 'ml', valor: 240, nombres: ['cup', 'cups', 'c', 't', 'tz', 'taza', 'tazas', 'xicara', 'xicaras', 'tasse', 'tasses'] },
  { base: 'ml', valor: 15, nombres: ['tbsp', 'tbs', 'tbl', 'tablespoon', 'tablespoons', 'cda', 'cdas', 'cucharada', 'cucharadas', 'colher de sopa', 'colheres de sopa', 'cs', 'c s', 'cuillere a soupe'] },
  { base: 'ml', valor: 5, nombres: ['tsp', 'teaspoon', 'teaspoons', 'cdta', 'cdtas', 'cdita', 'cditas', 'cucharadita', 'cucharaditas', 'colher de cha', 'colheres de cha', 'cc', 'c c', 'cuillere a cafe'] },
  { base: 'ml', valor: 29.57, nombres: ['fl oz', 'fluid ounce', 'fluid ounces'] },
  { base: 'ml', valor: 1, nombres: ['ml', 'mililitro', 'mililitros', 'milliliter', 'milliliters', 'millilitre'] },
  { base: 'ml', valor: 10, nombres: ['cl'] },
  { base: 'ml', valor: 100, nombres: ['dl'] },
  { base: 'ml', valor: 1000, nombres: ['l', 'lt', 'lts', 'litro', 'litros', 'liter', 'liters', 'litre', 'litres'] },
  { base: 'ml', valor: 473, nombres: ['pint', 'pints', 'pinta', 'pintas'] },
  { base: 'ml', valor: 946, nombres: ['quart', 'quarts'] },
  { base: 'g', valor: 1, nombres: ['g', 'gr', 'grs', 'gramo', 'gramos', 'gram', 'grams', 'gramme', 'grammes'] },
  { base: 'g', valor: 1000, nombres: ['kg', 'kgs', 'kilo', 'kilos', 'kilogramo', 'kilogramos', 'kilogram', 'kilograms'] },
  { base: 'g', valor: 28.35, nombres: ['oz', 'ounce', 'ounces', 'onza', 'onzas'] },
  { base: 'g', valor: 453.6, nombres: ['lb', 'lbs', 'pound', 'pounds', 'libra', 'libras'] },
  { base: 'g', valor: 0.5, nombres: ['pinch', 'pinches', 'pizca', 'pizcas', 'pitada', 'pincee', 'dash', 'dashes', 'chorrito'] },
  { base: 'g', valor: 113, nombres: ['stick', 'sticks', 'barrita'] },
  { base: 'diente', valor: 1, nombres: ['clove', 'cloves', 'diente', 'dientes', 'dente', 'dentes', 'gousse', 'gousses'] },
  { base: 'unidad', valor: 1, nombres: ['lata', 'latas', 'can', 'cans', 'tin', 'tins'], tipo: 'lata' },
  { base: 'unidad', valor: 1, nombres: ['sobre', 'sobres', 'packet', 'packets', 'envelope', 'cubo', 'cubos', 'cube', 'cubes', 'cubito', 'cubitos'], tipo: 'sobre' },
  { base: 'unidad', valor: 1, nombres: ['atado', 'atados', 'manojo', 'manojos', 'bunch', 'bunches', 'maco', 'macos'], tipo: 'atado' },
  { base: 'unidad', valor: 1, nombres: ['rama', 'ramas', 'ramita', 'ramitas', 'sprig', 'sprigs', 'raminho'], tipo: 'ramita' },
  { base: 'unidad', valor: 1, nombres: ['rebanada', 'rebanadas', 'tajada', 'tajadas', 'slice', 'slices', 'fatia', 'fatias', 'feta', 'fetas'], tipo: 'tajada' },
  { base: 'unidad', valor: 1, nombres: ['unidad', 'unidades', 'unid', 'unids', 'und', 'unds', 'un', 'u', 'pieza', 'piezas', 'piece', 'pieces', 'whole', 'large', 'medium', 'small', 'grande', 'grandes', 'mediano', 'mediana', 'medianos', 'medianas', 'pequeno', 'pequena', 'pequenos', 'pequenas', 'presa', 'presas', 'filete', 'filetes', 'fillet', 'fillets'] },
  { base: 'unidad', valor: 1, nombres: ['paquete', 'paquetes', 'package', 'packages', 'pack', 'bolsa', 'bolsas', 'bag', 'caja', 'cajas', 'box', 'frasco', 'frascos', 'jar', 'pote', 'potes'], tipo: 'paquete' },
]

const POR_NOMBRE = new Map()
for (const u of UNIDADES) for (const n of u.nombres) POR_NOMBRE.set(n, u)
// Las más largas primero, para que "fl oz" gane a "oz" y "colher de sopa" a "colher".
const NOMBRES = [...POR_NOMBRE.keys()].sort((a, b) => b.length - a.length)

const FRACCIONES = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅕': 0.2, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 }
const PALABRAS_NUMERO = { un: 1, una: 1, uno: 1, a: 1, an: 1, one: 1, dos: 2, two: 2, tres: 3, three: 3, cuatro: 4, four: 4, cinco: 5, five: 5, seis: 6, six: 6, media: 0.5, medio: 0.5, half: 0.5, um: 1, uma: 1, duas: 2, meia: 0.5, meio: 0.5 }
const AL_GUSTO = /\b(al gusto|a gusto|to taste|as needed|a gosto|c\/n|cantidad necesaria|q\.?b\.?)\b/i

// Lee la cantidad al inicio del texto. Devuelve { cantidad, resto } o null.
export function leerCantidad(texto) {
  let t = texto.trim()
  for (const [simbolo, valor] of Object.entries(FRACCIONES)) t = t.replace(new RegExp(`(\\d)?\\s*${simbolo}`, 'g'), (_, d) => ` ${(d ? Number(d) : 0) + valor} `)
  t = t.trim()
  const numero = String.raw`(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)`
  const m = t.match(new RegExp(`^${numero}(?:\\s*(?:-|–|a|to|ou|o)\\s*${numero})?(?![\\d/])`, 'i'))
  if (m) {
    const a = aNumero(m[1])
    const b = m[2] ? aNumero(m[2]) : null
    return { cantidad: b ? (a + b) / 2 : a, resto: t.slice(m[0].length).trim() }
  }
  const palabra = t.match(/^([a-záéíóúñ]+)\s+/i)
  if (palabra && PALABRAS_NUMERO[normalizar(palabra[1])] !== undefined) {
    const siguiente = normalizar(t.slice(palabra[0].length)).split(' ')[0]
    // "a pinch", "una taza", "two eggs": solo si después viene una unidad o un ingrediente
    if (siguiente && !['de', 'of', 'la', 'el'].includes(siguiente)) {
      return { cantidad: PALABRAS_NUMERO[normalizar(palabra[1])], resto: t.slice(palabra[0].length).trim() }
    }
  }
  return null
}

function aNumero(texto) {
  const partes = texto.trim().replace(',', '.').split(/\s+/)
  return partes.reduce((suma, p) => {
    if (p.includes('/')) {
      const [n, d] = p.split('/').map(Number)
      return suma + (d ? n / d : 0)
    }
    return suma + Number(p)
  }, 0)
}

// Lee la unidad al inicio del texto (después de la cantidad).
export function leerUnidad(texto) {
  // "cda." y "gr." llevan punto: se ignora para reconocer la unidad.
  const t = normalizar(texto).replace(/\./g, ' ').replace(/\s+/g, ' ').trim()
  for (const nombre of NOMBRES) {
    if (t === nombre || t.startsWith(`${nombre} `)) {
      const u = POR_NOMBRE.get(nombre)
      // Avanza en el texto original la misma cantidad de palabras.
      const palabras = nombre.split(' ').length
      const resto = texto.trim().replace(/^(\S+?)\.(?=\S)/, '$1. ').split(/\s+/).slice(palabras).join(' ').replace(/^\.\s*/, '')
      return { unidad: u, nombreUnidad: nombre, resto }
    }
  }
  return null
}

// Separa "2 tazas de harina, tamizada (250 g)" en cantidad, unidad, nombre y nota.
export function leerLineaIngrediente(linea) {
  let texto = linea.replace(/^[\s\-–•*·▪◦●○+]+/, '').replace(/^\d+[.)]\s+(?=\D)/, '').trim()
  const original = texto
  const alGusto = AL_GUSTO.test(texto)
  const opcional = /\b(opcional|optional|opcionalmente|para decorar|to garnish|for garnish|for serving|para servir)\b/i.test(texto)

  // Paréntesis: suelen traer la equivalencia métrica o una nota.
  let nota = ''
  const parentesis = [...texto.matchAll(/\(([^)]*)\)/g)].map((m) => m[1])
  texto = texto.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()

  let cantidad = 0
  let unidad = null
  const c = leerCantidad(texto)
  if (c) {
    cantidad = c.cantidad
    texto = c.resto
    const u = leerUnidad(texto)
    if (u) {
      unidad = u
      texto = u.resto
    }
    // "4 tazas / 500 gr. de harina": si después de la barra viene una medida métrica, se usa esa.
    const alterna = texto.match(/^\/\s*(.+)$/)
    if (alterna) {
      const c2 = leerCantidad(alterna[1])
      const u2 = c2 && leerUnidad(c2.resto)
      if (c2 && u2 && (u2.unidad.base === 'g' || u2.unidad.base === 'ml')) {
        cantidad = c2.cantidad
        unidad = u2
        texto = u2.resto
      } else {
        texto = alterna[1]
      }
    }
    // "cc": en México es cucharadita ("2cc"); en Chile son mililitros ("250 cc de leche").
    if (unidad?.nombreUnidad === 'cc' && cantidad >= 20) unidad = { ...leerUnidad('ml'), nombreUnidad: 'ml' }
    // "2 large eggs", "1 medium onion": el tamaño no es una unidad de compra.
    if (unidad && unidad.unidad.base === 'unidad' && !unidad.unidad.tipo) unidad = { ...unidad, nombreUnidad: 'unidad' }
  }
  // Si la cantidad vino entre paréntesis métricos ("1 cup (125 g) flour"), úsala.
  for (const p of parentesis) {
    const pc = leerCantidad(p)
    const pu = pc && leerUnidad(pc.resto)
    if (pc && pu && (pu.unidad.base === 'g' || pu.unidad.base === 'ml') && pu.unidad.valor === 1) {
      cantidad = pc.cantidad
      unidad = pu
    } else if (!pc) {
      nota = nota ? `${nota}; ${p}` : p
    }
  }

  texto = texto.replace(/^(of|de|del|de la|de los|de las|da|do|das|dos|d')\s+/i, '')
  // Lo que va después de la coma es preparación: "ajo, picado".
  const coma = texto.split(/,|;|\s+-\s+/)
  let nombre = coma[0].trim()
  const preparacion = coma.slice(1).join(', ').trim()
  nombre = nombre.replace(AL_GUSTO, '').replace(/\b(opcional|optional)\b/i, '').replace(/\s+/g, ' ').replace(/[.:;,]+$/, '').trim()
  if (preparacion) nota = nota ? `${preparacion}; ${nota}` : preparacion

  return {
    original,
    nombre,
    cantidad: alGusto && !cantidad ? 0 : cantidad,
    unidad: unidad ? unidad.nombreUnidad : alGusto ? 'al gusto' : cantidad ? 'unidad' : '',
    nota: nota.replace(/^\s*;\s*/, ''),
    opcional,
  }
}

// Pasa una cantidad a la unidad base. ing: datos del glosario (gml = g por ml, gu = g por unidad, gd = g por diente).
export function aBase(cantidad, unidadTexto, ing = {}) {
  const u = POR_NOMBRE.get(normalizar(unidadTexto || ''))
  if (!cantidad) return { cantidad: 0, unidad: ing.vende ?? 'g' }
  if (!u || u.base === 'unidad') {
    if (ing.vende === 'unidad' || !ing.gu) return { cantidad, unidad: 'unidad' }
    return { cantidad: cantidad * ing.gu, unidad: 'g' }
  }
  if (u.base === 'diente') {
    if (ing.vende === 'unidad' && ing.dientes) return { cantidad: cantidad / ing.dientes, unidad: 'unidad' }
    return { cantidad: cantidad * (ing.gd ?? 5), unidad: 'g' }
  }
  const valor = cantidad * u.valor
  if (u.base === 'ml') {
    // Sólidos medidos en tazas o cucharas: a gramos con su densidad.
    if (ing.liquido) return { cantidad: valor, unidad: 'ml' }
    return { cantidad: valor * (ing.gml ?? 1), unidad: 'g' }
  }
  if (ing.liquido) return { cantidad: valor / (ing.gml ?? 1), unidad: 'ml' }
  if (ing.vende === 'unidad' && ing.gu) return { cantidad: valor / ing.gu, unidad: 'unidad' }
  return { cantidad: valor, unidad: 'g' }
}

// Convierte entre g, ml y unidad con los datos del glosario. null si no se puede.
export function convertir(cantidad, de, a, ing = {}) {
  if (de === a) return cantidad
  const gml = ing.gml ?? 1
  if (de === 'g' && a === 'ml') return cantidad / gml
  if (de === 'ml' && a === 'g') return cantidad * gml
  if (de === 'unidad' && ing.gu) return a === 'g' ? cantidad * ing.gu : (cantidad * ing.gu) / gml
  if (a === 'unidad' && ing.gu) return de === 'g' ? cantidad / ing.gu : (cantidad * gml) / ing.gu
  return null
}

export { AL_GUSTO }
