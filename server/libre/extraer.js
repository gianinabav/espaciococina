// Paso 1 sin IA: leer la receta (texto o página web) y traducir lo necesario.
import { leerRecetaTexto, leerRecetaJsonLd, NOMBRE_IDIOMA, detectarPorcion } from './receta-texto.js'
import { buscarIngrediente, nombreLocal } from './glosario.js'
import { traducir } from './traducir.js'
import { normalizar, capitalizar } from './texto-util.js'
import { renombrarEnPasos } from './adaptar.js'

// Notas de preparación frecuentes: se traducen aquí, sin gastar el traductor gratuito.
const NOTAS_ES = {
  minced: 'picado fino', chopped: 'picado', 'finely chopped': 'picado fino', 'roughly chopped': 'picado grueso', diced: 'en cubos', sliced: 'en rodajas',
  'thinly sliced': 'en rodajas finas', halved: 'cortado por la mitad', quartered: 'en cuartos', trimmed: 'sin puntas', divided: 'dividido en partes',
  peeled: 'pelado', grated: 'rallado', shredded: 'rallado', melted: 'derretido', softened: 'a temperatura ambiente', 'at room temperature': 'a temperatura ambiente',
  beaten: 'batido', 'lightly beaten': 'ligeramente batido', drained: 'escurrido', 'drained and rinsed': 'escurrido y enjuagado', rinsed: 'enjuagado', juiced: 'exprimido',
  zested: 'rallado', 'zested and juiced': 'ralladura y jugo', 'juice of': 'el jugo', crushed: 'machacado', cubed: 'en cubos', mashed: 'en puré', 'cut into pieces': 'en trozos',
  'cut into cubes': 'en cubos', 'cut into strips': 'en tiras', 'seeded': 'sin semillas', 'deveined': 'sin vena', 'boneless': 'sin hueso', 'skinless': 'sin piel',
  'to taste': 'al gusto', optional: 'opcional', 'for garnish': 'para decorar', 'for serving': 'para servir', 'packed': 'compacto', 'sifted': 'tamizado', 'cooked': 'cocido',
  'cold': 'frío', 'warm': 'tibio', 'fresh': 'fresco', 'frozen': 'congelado', 'thawed': 'descongelado', 'room temperature': 'a temperatura ambiente',
}
function notaLocal(nota) {
  const partes = nota.toLowerCase().split(/\s*(?:,|;| and | y )\s*/).filter(Boolean)
  const traducidas = partes.map((p) => NOTAS_ES[p.trim()])
  return traducidas.every(Boolean) ? traducidas.join(', ') : null
}

// Nombre de cada unidad en español, para mostrarla y poder editarla.
const UNIDADES_ES = {
  cup: 'tazas', cups: 'tazas', c: 'tazas', tbsp: 'cucharadas', tbs: 'cucharadas', tbl: 'cucharadas', tablespoon: 'cucharadas', tablespoons: 'cucharadas',
  tsp: 'cucharaditas', teaspoon: 'cucharaditas', teaspoons: 'cucharaditas', oz: 'onzas', ounce: 'onzas', ounces: 'onzas', lb: 'libras', lbs: 'libras',
  pound: 'libras', pounds: 'libras', clove: 'dientes', cloves: 'dientes', can: 'lata', cans: 'latas', pinch: 'pizca', pinches: 'pizcas', dash: 'pizca',
  stick: 'barrita', sticks: 'barritas', 'fl oz': 'onzas líquidas', pint: 'pintas', quart: 'cuartos de galón', slice: 'tajadas', slices: 'tajadas',
  bunch: 'atado', bunches: 'atados', sprig: 'ramitas', sprigs: 'ramitas', package: 'paquete', packet: 'sobre', cube: 'cubito', cubes: 'cubitos',
  'colher de sopa': 'cucharadas', 'colheres de sopa': 'cucharadas', 'colher de cha': 'cucharaditas', 'colheres de cha': 'cucharaditas', xicara: 'tazas', xicaras: 'tazas',
  dente: 'dientes', dentes: 'dientes', liter: 'l', liters: 'l', litre: 'l', gram: 'g', grams: 'g',
  gr: 'g', grs: 'g', gramos: 'g', t: 'tazas', tz: 'tazas', cc: 'cucharaditas', cdta: 'cucharaditas', cdtas: 'cucharaditas', cdita: 'cucharaditas', cda: 'cucharadas', cdas: 'cucharadas',
  unid: 'unidad', unids: 'unidad', und: 'unidad', unds: 'unidad', u: 'unidad', kilo: 'kg', kilos: 'kg',
}

// "1 tazas" → "1 taza".
const SINGULAR = { unidades: 'unidad', tazas: 'taza', cucharadas: 'cucharada', cucharaditas: 'cucharadita', onzas: 'onza', libras: 'libra', dientes: 'diente', latas: 'lata', pizcas: 'pizca', barritas: 'barrita', tajadas: 'tajada', atados: 'atado', ramitas: 'ramita', cubitos: 'cubito', pintas: 'pinta' }
const singular = (unidad, cantidad) => (cantidad > 0 && cantidad <= 1 && SINGULAR[unidad] ? SINGULAR[unidad] : unidad)

export function recetaDesdeTexto(texto) {
  return leerRecetaTexto(texto)
}
export function recetaDesdeJsonLd(nodo) {
  return leerRecetaJsonLd(nodo)
}

// Convierte la receta leída al formato que confirma la persona, en su idioma.
export async function prepararExtraccion(leida, usuario = {}) {
  const idioma = usuario.idioma ?? 'es'
  const pais = usuario.pais ?? 'PE'
  if (leida.ingredientes.length < 2) {
    return {
      es_receta: false,
      motivo_no_receta: 'No encontramos ingredientes ni pasos. Pega la receta con un ingrediente por línea (por ejemplo "2 tazas de arroz") y la preparación debajo.',
      titulo: '', idioma_original: '', porciones: 0, tiempo_total_min: 0, ingredientes: [], pasos: [], notas: '',
    }
  }

  const otroIdioma = leida.idioma !== idioma
  const ingredientes = leida.ingredientes.map((i) => {
    const m = buscarIngrediente(i.nombre)
    return { ...i, ing: m?.ing, marca: m?.marca }
  })

  // Lo que hay que traducir: título, pasos, notas y nombres que no están en el glosario.
  const sinGlosario = ingredientes.filter((i) => !i.ing && otroIdioma)
  for (const i of ingredientes) if (i.nota && otroIdioma && idioma === 'es') i.notaTraducida = notaLocal(i.nota) ?? undefined
  const notas = ingredientes.filter((i) => i.nota && otroIdioma && !i.notaTraducida)
  const porTraducir = [leida.titulo, ...leida.pasos, ...sinGlosario.map((i) => i.nombre), ...notas.map((i) => i.nota)]
  const { textos, traducido } = otroIdioma ? await traducir(porTraducir, leida.idioma, idioma) : { textos: porTraducir, traducido: true }
  let k = 0
  // Los nombres de los ingredientes reconocidos se cambian por los del país también en el título y los pasos.
  const renombres = ingredientes.filter((i) => i.ing).map((i) => ({ de: [i.nombre, ...i.ing.es, ...i.ing.en], a: nombreLocal(i.ing, pais, idioma) }))
  const titulo = renombrarEnPasos(textos[k++], renombres)
  const pasos = leida.pasos.map(() => renombrarEnPasos(textos[k++], renombres))
  for (const i of sinGlosario) i.nombreTraducido = textos[k++]
  for (const i of notas) i.notaTraducida = textos[k++]

  return {
    es_receta: true,
    motivo_no_receta: '',
    titulo: capitalizar(titulo),
    idioma_original: NOMBRE_IDIOMA[leida.idioma] ?? leida.idioma,
    porciones: leida.porciones,
    porcion: detectarPorcion(leida.rinde, leida.titulo, titulo),
    tiempo_total_min: leida.tiempo_total_min,
    ingredientes: juntarRepetidos(ingredientes.map((i) => ({
      original: i.original,
      glosario_id: i.ing?.id ?? null,
      nombre: capitalizar(i.ing ? nombreLocal(i.ing, pais, idioma) : i.nombreTraducido ?? i.nombre),
      cantidad: Math.round(i.cantidad * 100) / 100,
      unidad: idioma === 'es' ? singular(UNIDADES_ES[normalizar(i.unidad)] ?? i.unidad, i.cantidad) : i.unidad,
      nota: [i.notaTraducida ?? i.nota, i.marca ? 'marca de otro país: busca el equivalente' : ''].filter(Boolean).join(' · '),
      opcional: Boolean(i.opcional),
    }))),
    pasos,
    notas: otroIdioma && !traducido ? 'Parte del texto no se pudo traducir (el traductor gratuito tiene un límite diario).' : '',
  }
}

// "1 1/2 tazas de cake flour" y "1 1/2 tazas de flour" son la misma harina en Perú:
// los ingredientes que quedan con el mismo nombre y la misma unidad se suman en una línea.
// Si alguno trae un consejo para el país (p. ej. harina pastelera), se conserva ese.
export function juntarRepetidos(lista) {
  const resultado = []
  for (const ing of lista) {
    const igual = resultado.find((r) => normalizar(r.nombre) === normalizar(ing.nombre) && normalizar(r.unidad) === normalizar(ing.unidad))
    if (!igual) {
      resultado.push({ ...ing })
      continue
    }
    // Se recuerda de qué partes salió la suma (para dar consejos con la cantidad exacta).
    igual.partes ??= [{ glosario_id: igual.glosario_id, cantidad: igual.cantidad, unidad: igual.unidad, original: igual.original }]
    igual.partes.push({ glosario_id: ing.glosario_id, cantidad: ing.cantidad, unidad: ing.unidad, original: ing.original })
    igual.cantidad = Math.round((Number(igual.cantidad) + Number(ing.cantidad)) * 100) / 100
    igual.original = `${igual.original} + ${ing.original}`
    igual.nota = [igual.nota, ing.nota].filter(Boolean).join(' · ')
    if (ing.glosario_id && !igual.glosario_id) igual.glosario_id = ing.glosario_id
    if (ing.glosario_id && /pastelera|_sin_|vegetal/.test(ing.glosario_id)) igual.glosario_id = ing.glosario_id
  }
  return resultado
}
