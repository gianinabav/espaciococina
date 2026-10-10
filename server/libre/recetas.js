// Recetas reales y gratuitas de TheMealDB (themealdb.com, clave pública de prueba "1")
// para dar ideas con los sobrantes y para cocinar con lo que hay en "Mi refri".
import { buscarIngrediente, nombreLocal, porId } from './glosario.js'
import { leerLineaIngrediente } from './unidades.js'
import { traducir } from './traducir.js'
import { cache } from './cache.js'
import { capitalizar } from './texto-util.js'

const BASE = 'https://www.themealdb.com/api/json/v1/1'
const guardadas = cache('recetas', 24 * 7)

const CATEGORIAS = { Beef: 'carne de res', Chicken: 'pollo', Dessert: 'postre', Lamb: 'cordero', Miscellaneous: 'variado', Pasta: 'pasta', Pork: 'cerdo', Seafood: 'pescados y mariscos', Side: 'acompañamiento', Starter: 'entrada', Vegan: 'vegano', Vegetarian: 'vegetariano', Breakfast: 'desayuno', Goat: 'cabrito' }
const ORIGEN = { American: 'estadounidense', British: 'británica', Canadian: 'canadiense', Chinese: 'china', Croatian: 'croata', Dutch: 'holandesa', Egyptian: 'egipcia', Filipino: 'filipina', French: 'francesa', Greek: 'griega', Indian: 'india', Irish: 'irlandesa', Italian: 'italiana', Jamaican: 'jamaiquina', Japanese: 'japonesa', Kenyan: 'keniana', Malaysian: 'malaya', Mexican: 'mexicana', Moroccan: 'marroquí', Polish: 'polaca', Portuguese: 'portuguesa', Russian: 'rusa', Spanish: 'española', Thai: 'tailandesa', Tunisian: 'tunecina', Turkish: 'turca', Ukrainian: 'ucraniana', Vietnamese: 'vietnamita', Peruvian: 'peruana', Argentinian: 'argentina' }

// Consejos para guardar, por categoría.
const GUARDAR = {
  verdura: 'En la parte baja de la refri, en una bolsa con un papel que absorba la humedad.',
  fruta: 'Fuera de la refri hasta que madure; después, en la refri.',
  pollo: 'En la parte más fría de la refri, bien tapado; o congélalo en porciones.',
  carne_roja: 'Bien envuelta en la parte más fría de la refri, o congelada en porciones.',
  pescado_marisco: 'Cocínalo pronto o congélalo el mismo día.',
  lacteo: 'Bien cerrado en la refri; no en la puerta, que es la zona más tibia.',
  queso: 'Envuelto en papel y dentro de un táper en la refri.',
  huevo: 'En su caja, dentro de la refri.',
  aceite_grasa: 'Bien cerrado, lejos de la luz y del calor de la cocina.',
  especia_hierba: 'En un frasco cerrado, lejos del calor.',
  default: 'En un recipiente bien cerrado.',
}

async function pedir(ruta) {
  const guardada = guardadas.leer(ruta)
  if (guardada) return guardada
  try {
    const r = await fetch(`${BASE}/${ruta}`, { signal: AbortSignal.timeout(12000) })
    const datos = await r.json()
    return guardadas.escribir(ruta, datos.meals ?? [])
  } catch {
    return null
  }
}

// Nombres en inglés que entiende TheMealDB ("chicken breast" → chicken_breast, "potatoes"…).
function nombresIngles(nombre) {
  const m = buscarIngrediente(nombre)
  if (!m) return []
  const nombres = m.ing.en.slice(0, 3).map((n) => n.toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '_'))
  return [...new Set([...nombres, nombres[0].split('_').pop()])]
}

async function recetasCon(nombre) {
  // Se juntan los resultados de todos los nombres ("carrot" y "carrots" dan listas distintas).
  const vistas = new Map()
  for (const ingles of nombresIngles(nombre)) {
    for (const r of (await pedir(`filter.php?i=${encodeURIComponent(ingles)}`)) ?? []) vistas.set(r.idMeal, r)
  }
  return [...vistas.values()]
}

// Convierte una receta de TheMealDB al formato de la app (ingredientes con nombres del país).
function convertirReceta(d, { titulo, usa, tengo = usa, pais, idioma }) {
  const ingredientes = []
  for (let i = 1; i <= 20; i++) {
    const nombre = d[`strIngredient${i}`]?.trim()
    if (!nombre) continue
    const original = `${d[`strMeasure${i}`] ?? ''} ${nombre}`.trim()
    const linea = leerLineaIngrediente(original)
    const g = buscarIngrediente(nombre)
    ingredientes.push({ ...linea, original, nombre: g ? nombreLocal(g.ing, pais, idioma) : nombre, glosario_id: g?.ing.id ?? null })
  }
  const enRefri = new Set(tengo.map((u) => buscarIngrediente(u)?.ing.id))
  return {
    id: d.idMeal,
    titulo: titulo === titulo.toUpperCase() ? capitalizar(titulo.toLowerCase()) : titulo,
    imagen: d.strMealThumb,
    por_que: `Usa ${usa.length} ${usa.length === 1 ? 'cosa' : 'cosas'} que ya tienes. Receta ${ORIGEN[d.strArea] ?? 'internacional'}${CATEGORIAS[d.strCategory] ? ` de ${CATEGORIAS[d.strCategory]}` : ''}.`,
    usa,
    // Lo que falta, sin contar lo que casi todos tienen en casa (sal, aceite, agua…).
    falta: ingredientes.filter((i) => !enRefri.has(i.glosario_id) && !(i.glosario_id && porId(i.glosario_id)?.desp)).map((i) => i.nombre).slice(0, 8),
    porciones: 4,
    tiempo_total_min: 40,
    ingredientes,
    // Los pasos se traducen recién cuando eliges la receta (el traductor gratuito tiene límite diario).
    pasosOriginales: (d.strInstructions ?? '').split(/\r?\n+/).map((p) => p.replace(/^(step\s*\d+[:.]?|\d+[.)])\s*/i, '').trim()).filter((p) => p.length > 3),
    fuente: d.strSource || `https://www.themealdb.com/meal/${d.idMeal}`,
  }
}

// Ideas para los sobrantes: recetas que usan lo que sobró.
export async function ideasParaSobrantes(sobrantes, usuario = {}) {
  const idioma = usuario.idioma ?? 'es'
  const ideas = []
  const vistas = new Set()
  // Primero lo que se malogra antes (pollo, verduras) y después lo que dura meses (aceite, especias).
  const porDuracion = [...sobrantes].sort((a, b) => (buscarIngrediente(a.nombre)?.ing.dias ?? 7) - (buscarIngrediente(b.nombre)?.ing.dias ?? 7))
  for (const s of porDuracion.slice(0, 5)) {
    const recetas = await recetasCon(s.nombre)
    for (const r of recetas.slice(0, 6)) {
      if (vistas.has(r.idMeal) || ideas.filter((i) => i.usa.includes(s.nombre)).length >= 1) continue
      vistas.add(r.idMeal)
      ideas.push({ id: r.idMeal, titulo: r.strMeal.trim(), imagen: r.strMealThumb, usa: [s.nombre] })
    }
    if (ideas.length >= 4) break
  }
  const { textos } = await traducir(ideas.map((i) => i.titulo), 'en', idioma)
  const detalles = await Promise.all(ideas.map((i) => pedir(`lookup.php?i=${i.id}`)))
  const pais = usuario.pais ?? 'PE'
  return {
    ideas: ideas.map((i, n) => {
      const d = detalles[n]?.[0]
      return {
        ...i,
        receta: d ? convertirReceta(d, { titulo: capitalizar(textos[n]), usa: i.usa, tengo: sobrantes.map((x) => x.nombre), pais, idioma }) : null,
        titulo: capitalizar(textos[n]),
        descripcion: d ? `Receta ${ORIGEN[d.strArea] ?? 'internacional'}${CATEGORIAS[d.strCategory] ? ` de ${CATEGORIAS[d.strCategory]}` : ''}. Con «Cocinar esta» la traducimos, la adaptamos y armamos su compra.` : 'Receta para aprovechar lo que te sobró.',
        tiempo_min: 30,
        conservacion: '',
        fuente: d?.strSource || `https://www.themealdb.com/meal/${i.id}`,
        video: d?.strYoutube || '',
      }
    }),
    consejos_conservacion: sobrantes.map((s) => {
      const m = buscarIngrediente(s.nombre)
      const fueraDeRefri = ['papa', 'camote', 'cebolla', 'cebolla_roja', 'ajo', 'zapallo', 'platano'].includes(m?.ing.id)
      return { ingrediente: s.nombre, consejo: fueraDeRefri ? 'Fuera de la refri, en un lugar fresco, seco y oscuro.' : GUARDAR[s.categoria] ?? GUARDAR.default, dura_dias: m?.ing.dias ?? 5 }
    }),
  }
}

// Recetas con lo que hay en Mi refri: las que usan más de esos ingredientes.
export async function recetasParaRefri(items, usuario = {}) {
  const idioma = usuario.idioma ?? 'es'
  const pais = usuario.pais ?? 'PE'
  const conteo = new Map()
  for (const item of items.slice(0, 6)) {
    for (const r of await recetasCon(item.nombre)) {
      const actual = conteo.get(r.idMeal) ?? { r, usa: [] }
      actual.usa.push(item.nombre)
      conteo.set(r.idMeal, actual)
    }
  }
  const mejores = [...conteo.values()].sort((a, b) => b.usa.length - a.usa.length).slice(0, 3)
  const detalles = await Promise.all(mejores.map((m) => pedir(`lookup.php?i=${m.r.idMeal}`)))
  const { textos } = await traducir(mejores.map((m) => m.r.strMeal.trim()), 'en', idioma)

  return {
    recetas: mejores
      .map((m, n) => (detalles[n]?.[0] ? convertirReceta(detalles[n][0], { titulo: capitalizar(textos[n]), usa: m.usa, tengo: items.map((i) => i.nombre), pais, idioma }) : null))
      .filter(Boolean),
  }
}

// Traduce los pasos de una receta de TheMealDB al elegirla.
export async function traducirPasos(pasos, idioma, ayuda = {}) {
  const { textos, traducido, faltantes } = await traducir(pasos.slice(0, 60).map((p) => String(p).slice(0, 2000)), 'en', idioma, ayuda)
  return { pasos: textos, traducido, pendiente: traducido ? null : { de: 'en', a: idioma, textos: faltantes } }
}
