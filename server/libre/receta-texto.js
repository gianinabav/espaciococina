// Lee una receta escrita (pegada o sacada de una página) y la separa en
// título, porciones, tiempo, ingredientes y pasos. Sin IA: reglas y patrones.
import { leerLineaIngrediente, leerCantidad } from './unidades.js'
import { normalizar } from './texto-util.js'
import { buscarIngrediente } from './glosario.js'

const VERBOS_COCINA = /\b(mezcl|agreg|añad|anad|incorpor|bat[ei]|bate|hornea|horn[eé]|cocin|coc[ei]|hierv|herv|fr[ií]e|fre[ií]r|sofr[ií]|saltea|lic[uú]a|licu|vierte|vert|precalient|engras|enharin|reserv|calienta|calent|corta|cort|pica|pic[aá]|dora|dorar|sirve|serv|deja|dej|retira|retir|tamiz|amasa|amas|unta|enfr[ií]|refriger|congel|add|mix|stir|bake|cook|heat|whisk|beat|pour|place|combine|preheat|simmer|boil|fry|roast|chop|slice|serve|let|remove|season|fold|knead|spread|transfer|misture|adicione|asse|cozinhe|bata|despeje)\w*/i

// Líneas de redes sociales, links y saludos que suelen venir después de la receta en blogs y videos.
const RUIDO = /(https?:\/\/|www\.|@\w|#\w|►|▶|👉|suscr[ií]b|subscribe|dale like|comenta|comparte|instagram|facebook|tiktok|twitter|cup[oó]n|curso|enlace|link|patrocin|sponsor|merch|amazon|c[oó]digo de descuento)/i

const TITULO_INGREDIENTES = /^(ingredients?|ingredientes|ingrédients|para la (masa|salsa|cobertura|marinada)|for the \w+)\b/i
const TITULO_PASOS = /^(instructions?|directions?|method|steps?|preparation|preparaci[oó]n|elaboraci[oó]n|procedimiento|pasos|modo de (preparo|fazer|preparaci[oó]n)|pr[eé]paration)\b/i
const OTROS_TITULOS = /^(notes?|notas?|nutrition|nutrici[oó]n|tips?|consejos)\b/i

const PALABRAS = {
  en: ['the', 'and', 'with', 'add', 'until', 'minutes', 'cup', 'tbsp', 'tsp', 'into', 'over', 'heat', 'serve', 'oven', 'mix', 'large'],
  es: ['el', 'la', 'los', 'las', 'con', 'agrega', 'agregar', 'hasta', 'minutos', 'taza', 'cucharada', 'fuego', 'sirve', 'horno', 'mezcla', 'y', 'de', 'del'],
  pt: ['com', 'adicione', 'ate', 'minutos', 'xicara', 'colher', 'fogo', 'sirva', 'forno', 'misture', 'e', 'o', 'os', 'da', 'do', 'em'],
  fr: ['le', 'les', 'avec', 'ajouter', 'jusqu', 'minutes', 'tasse', 'cuillere', 'feu', 'servir', 'four', 'et', 'du', 'des'],
}
export const NOMBRE_IDIOMA = { en: 'Inglés', es: 'Español', pt: 'Portugués', fr: 'Francés' }

export function detectarIdioma(texto) {
  const palabras = normalizar(texto).split(' ')
  const cuenta = Object.fromEntries(Object.keys(PALABRAS).map((k) => [k, 0]))
  for (const p of palabras) for (const [k, lista] of Object.entries(PALABRAS)) if (lista.includes(p)) cuenta[k]++
  return Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0][0]
}

// Recetas que rinden unidades: la porción es "1 galleta", "1 muffin"… y no "1 persona".
const UNIDADES_PORCION = [
  [/cookie|galleta|galletita|biscoito|bolacha|biscotti/i, 'galleta', 'galletas'],
  [/cupcake/i, 'cupcake', 'cupcakes'],
  [/muffin|magdalena|mantecada/i, 'muffin', 'muffins'],
  [/brownie/i, 'brownie', 'brownies'],
  [/empanada/i, 'empanada', 'empanadas'],
  [/alfajor/i, 'alfajor', 'alfajores'],
  [/trufa|truffle|bomb[oó]n|brigadeiro/i, 'trufa', 'trufas'],
  [/donut|dona\b|rosquilla|doughnut/i, 'dona', 'donas'],
  [/pancake|panqueque|hotcake|crepe|crêpe|wafle|waffle/i, 'panqueque', 'panqueques'],
  [/hamburguesa|burger|patty|patties/i, 'hamburguesa', 'hamburguesas'],
  [/croqueta|croquette|nugget/i, 'croqueta', 'croquetas'],
  [/arepa/i, 'arepa', 'arepas'],
  [/tamal|tamale/i, 'tamal', 'tamales'],
  [/\btacos?\b/i, 'taco', 'tacos'],
  [/\bbuns?\b|\brolls?\b|bollo|pancito|panecillo|bagel|scone/i, 'pancito', 'pancitos'],
]
export function detectarPorcion(...textos) {
  for (const texto of textos) {
    for (const [patron, singular, plural] of UNIDADES_PORCION) if (patron.test(texto ?? '')) return { singular, plural }
  }
  return null
}

export function leerPorciones(texto) {
  const m = texto.match(/\b(?:serves|servings?|yield|makes|porciones|raciones|rinde|para|por[cç][oõ]es|rendimento|rend[ae])\s*:?\s*(\d+)/i) ?? texto.match(/(\d+)\s*(?:porciones|raciones|servings|personas|people|por[cç][oõ]es|pessoas)/i)
  return m ? Number(m[1]) : null
}

export function leerTiempo(texto) {
  const total = texto.match(/(?:total(?: time)?|tiempo(?: total)?|tempo(?: total)?)\s*:?\s*(?:(\d+)\s*(?:h|hr|hrs|hours?|horas?)\s*)?(?:(\d+)\s*(?:min|minutes|minutos))?/i)
  if (total && (total[1] || total[2])) return Number(total[1] ?? 0) * 60 + Number(total[2] ?? 0)
  return null
}

// Minutos que dura un paso: "hornea 20–25 minutos" → 25.
export function minutosDelPaso(texto) {
  let minutos = 0
  for (const m of texto.matchAll(/(\d+)(?:\s*(?:-|–|a|to|ou|o)\s*(\d+))?\s*(min\b|mins\b|minutos?|minutes?|minutes)/gi)) minutos = Math.max(minutos, Number(m[2] ?? m[1]))
  for (const m of texto.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:h\b|hrs?\b|horas?|hours?)/gi)) minutos = Math.max(minutos, Math.round(Number(m[1].replace(',', '.')) * 60))
  return minutos
}

function pareceIngrediente(linea) {
  const t = linea.replace(/^[\s\-–•*·▪◦●○]+/, '').trim()
  if (t.length > 120) return false
  if (leerCantidad(t)) return true
  return /\b(al gusto|to taste|a gosto)\b/i.test(t)
}

// Sin emojis, sin "| Nombre del canal" y sin MAYÚSCULAS sostenidas.
export function limpiarTitulo(linea) {
  let t = linea.replace(/^#+\s*/, '').replace(/\p{Extended_Pictographic}|\uFE0F/gu, '').replace(/\s+[|/]\s+[^|/]*$/, '').replace(/\s+/g, ' ').trim()
  // Si casi todo está en mayúsculas, se pasa a tipo oración.
  const letras = t.replace(/[^a-záéíóúñ]/gi, '')
  const mayusculas = letras.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length
  if (letras && mayusculas / letras.length > 0.6) t = t.toLowerCase().replace(/^./, (c) => c.toUpperCase())
  return t
}

function limpiarPaso(linea) {
  return linea.replace(/^[\s\-–•*·▪◦●○]+/, '').replace(/^(paso|step|passo)\s*\d+\s*[:.)-]?\s*/i, '').replace(/^\d+\s*[.)-]\s*/, '').trim()
}

export function leerRecetaTexto(texto) {
  const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  let titulo = ''
  const ingredientes = []
  const pasos = []
  let seccion = null

  for (const [i, linea] of lineas.entries()) {
    const limpia = linea.replace(/[:：]\s*$/, '')
    if (TITULO_INGREDIENTES.test(limpia) && limpia.length < 40) {
      seccion = 'ingredientes'
      continue
    }
    if (TITULO_PASOS.test(limpia) && limpia.length < 40) {
      seccion = 'pasos'
      continue
    }
    if (OTROS_TITULOS.test(limpia) && limpia.length < 30) {
      seccion = 'otro'
      continue
    }
    if (!titulo && i < 3 && !pareceIngrediente(linea) && linea.length < 120 && !leerPorciones(linea)) {
      titulo = limpiarTitulo(linea)
      continue
    }
    if (seccion === 'otro') continue
    if (RUIDO.test(linea)) {
      // Después de la lista suelen venir redes y links: ahí se termina la sección.
      if (seccion === 'ingredientes' && ingredientes.length) seccion = 'otro'
      continue
    }
    if (seccion === 'ingredientes' || (!seccion && pareceIngrediente(linea))) {
      // Subtítulos dentro de ingredientes ("Para la salsa:") no son ingredientes.
      if (/:$/.test(linea) && !leerCantidad(linea)) continue
      if (/^(serves|servings|porciones|total time|tiempo)/i.test(linea)) continue
      // Sin cantidad, solo vale si es un ingrediente conocido y corto ("Sal", "Pimienta al gusto").
      if (!pareceIngrediente(linea) && (linea.length > 40 || !buscarIngrediente(linea))) continue
      ingredientes.push(leerLineaIngrediente(linea))
      continue
    }
    // Fuera de una sección "Preparación", un paso tiene que tener un verbo de cocina.
    if (seccion === 'pasos' || (!seccion && linea.length > 25 && VERBOS_COCINA.test(linea))) {
      if (/^(serves|servings|porciones|rinde|total time|tiempo total)/i.test(linea)) continue
      // La descripción de un video suele repetir el título: eso no es un paso.
      if (titulo && normalizar(limpiarTitulo(linea)).startsWith(normalizar(titulo).slice(0, 25))) continue
      const paso = limpiarPaso(linea)
      if (paso) pasos.push(paso)
    }
  }

  return {
    titulo: titulo || 'Mi receta',
    porciones: leerPorciones(texto) ?? 4,
    rinde: texto.match(/\b(?:serves|servings?|yield|makes|porciones|raciones|rinde|rendimento)\s*:?[^\n]{0,40}/i)?.[0] ?? '',
    tiempo_total_min: leerTiempo(texto) ?? (pasos.reduce((s, p) => s + minutosDelPaso(p), 0) || 30),
    ingredientes: ingredientes.filter((i) => i.nombre),
    pasos,
    idioma: detectarIdioma(texto),
  }
}

// Receta en formato schema.org (JSON-LD) de una página web.
export function leerRecetaJsonLd(r) {
  const texto = (v) => (Array.isArray(v) ? v.join(' ') : String(v ?? ''))
  const pasos = []
  const recorrer = (nodo) => {
    if (!nodo) return
    if (typeof nodo === 'string') return pasos.push(...nodo.split(/\n+/).map(limpiarPaso).filter(Boolean))
    if (Array.isArray(nodo)) return nodo.forEach(recorrer)
    if (nodo['@type'] === 'HowToSection') return recorrer(nodo.itemListElement)
    if (nodo.text) pasos.push(limpiarPaso(sinHtml(nodo.text)))
  }
  recorrer(r.recipeInstructions)
  const ingredientes = (r.recipeIngredient ?? []).map((l) => leerLineaIngrediente(sinHtml(String(l)))).filter((i) => i.nombre)
  const todo = `${texto(r.name)} ${ingredientes.map((i) => i.original).join(' ')} ${pasos.join(' ')}`
  return {
    titulo: sinHtml(texto(r.name)) || 'Mi receta',
    porciones: Number(String(texto(r.recipeYield)).match(/\d+/)?.[0]) || 4,
    rinde: texto(r.recipeYield),
    tiempo_total_min: duracionISO(r.totalTime) || duracionISO(r.cookTime) + duracionISO(r.prepTime) || 30,
    ingredientes,
    pasos,
    idioma: detectarIdioma(todo),
  }
}

function duracionISO(v) {
  const m = String(v ?? '').match(/P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/)
  return m ? Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0) : 0
}

const sinHtml = (t) => t.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
