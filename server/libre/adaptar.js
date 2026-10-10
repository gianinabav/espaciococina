// Paso 2 sin IA: adapta la receta confirmada al perfil (porciones, medidas,
// nombres del país, dieta, objetivo e implementos) con reglas y el glosario.
import { PAISES, DIETAS, OBJETIVOS, CATEGORIAS, nombreDe } from '../../src/lib/datos.js'
import { buscarIngrediente, porId, nombreLocal, terminoBusqueda, GLOSARIO } from './glosario.js'
import { aBase } from './unidades.js'
import { minutosDelPaso } from './receta-texto.js'
import { normalizar, raices, capitalizar } from './texto-util.js'

// Qué restricciones (letras del glosario) excluye cada dieta.
const EXCLUYE = { vegana: 'RPMLHA', vegetariana: 'RPM', sin_gluten: 'G', sin_lactosa: 'L', sin_cerdo: 'C', sin_mariscos: 'M' }

// Kcal, proteína, carbohidratos y grasa por 100 g cuando el ingrediente no está en el glosario.
const MACROS_CATEGORIA = {
  verdura: [30, 1.5, 6, 0.2], fruta: [50, 0.7, 12, 0.3], carne_roja: [250, 26, 0, 15], pollo: [190, 25, 0, 9], pescado_marisco: [120, 22, 0, 3],
  lacteo: [70, 3.3, 5, 3.5], queso: [350, 25, 2, 27], huevo: [143, 13, 0.7, 9.5], cereal_harina: [360, 10, 75, 1], pasta_arroz: [360, 9, 77, 1],
  legumbre: [340, 21, 60, 1.5], aceite_grasa: [884, 0, 0, 100], especia_hierba: [280, 10, 55, 8], condimento_salsa: [80, 2, 15, 1],
  azucar_dulce: [390, 0, 98, 0], panaderia: [270, 9, 50, 3], frutos_secos: [600, 18, 20, 52], enlatado: [80, 5, 8, 2], bebida: [40, 0, 5, 0], otro: [150, 5, 20, 5],
}

// Presentación típica para estimar sobrantes cuando no hay producto real.
function presentacionTipica(ing, cat, cantidad, unidad) {
  if (unidad === 'unidad') {
    const n = cat === 'huevo' ? 15 : Math.max(1, Math.ceil(cantidad))
    return { cantidad: n, unidad, descripcion: cat === 'huevo' ? 'bandeja de 15 huevos' : `${n} ${n === 1 ? 'unidad' : 'unidades'}` }
  }
  const tabla = {
    verdura: 500, fruta: 500, carne_roja: Math.max(250, Math.ceil(cantidad / 250) * 250), pollo: Math.max(500, Math.ceil(cantidad / 250) * 250),
    pescado_marisco: Math.max(250, Math.ceil(cantidad / 250) * 250), lacteo: unidad === 'ml' ? 1000 : 200, queso: 250, cereal_harina: 1000,
    pasta_arroz: unidad === 'g' ? 500 : 1000, legumbre: 500, aceite_grasa: unidad === 'ml' ? 900 : 250, especia_hierba: 15, condimento_salsa: unidad === 'ml' ? 250 : 200,
    azucar_dulce: 1000, panaderia: 500, frutos_secos: 200, enlatado: 400, bebida: 1000, otro: 250,
  }
  let c = tabla[cat] ?? 250
  if (ing?.id === 'arroz') c = 1000
  if (ing?.id === 'sal') c = 1000
  if (cantidad > c) c = Math.ceil(cantidad / c) * c
  const desc = c >= 1000 ? `${c / 1000} ${unidad === 'ml' ? 'l' : 'kg'}` : `${c} ${unidad}`
  return { cantidad: c, unidad, descripcion: desc }
}

// ---------- Texto de cantidades ----------
function fraccion(valor) {
  const cuartos = Math.round(valor * 4)
  if (cuartos === 0) return null
  const entero = Math.floor(cuartos / 4)
  const resto = { 0: '', 1: '1/4', 2: '1/2', 3: '3/4' }[cuartos % 4]
  return [entero || '', resto].filter(Boolean).join(' ')
}

function metrico(cantidad, unidad) {
  if (unidad === 'unidad') return null
  if (cantidad >= 1000) return `${(Math.round(cantidad / 50) * 50 / 1000).toLocaleString('es')} ${unidad === 'g' ? 'kg' : 'l'}`
  if (cantidad >= 100) return `${Math.round(cantidad / 5) * 5} ${unidad}`
  return `${Math.max(1, Math.round(cantidad))} ${unidad}`
}

// "1/2 taza (60 g)", "4 dientes", "680 g", "2 unidades".
function textoCantidad({ cantidad, unidadOriginal, factor, base }) {
  if (!cantidad) return 'al gusto'
  const u = normalizar(unidadOriginal)
  const valor = cantidad * factor
  const caseras = [
    [/^(cup|cups|c|taza|tazas|xicara|xicaras)$/, 'taza', 'tazas'],
    [/^(tbsp|tbs|tbl|tablespoons?|cda|cdas|cucharadas?|colher(es)? de sopa)$/, 'cucharada', 'cucharadas'],
    [/^(tsp|teaspoons?|cdta|cdtas|cdita|cditas|cucharaditas?|colher(es)? de cha)$/, 'cucharadita', 'cucharaditas'],
    [/^(clove|cloves|diente|dientes|dente|dentes)$/, 'diente', 'dientes'],
    [/^(pinch|pinches|pizca|pizcas|dash)$/, 'pizca', 'pizcas'],
    [/^(can|cans|lata|latas)$/, 'lata', 'latas'],
    [/^(atado|atados|bunch|bunches|manojo)$/, 'atado', 'atados'],
    [/^(sobre|sobres|packet|cube|cubes|cubito|cubitos|cubo|cubos)$/, 'sobre', 'sobres'],
    [/^(tajada|tajadas|slice|slices|rebanada|rebanadas)$/, 'tajada', 'tajadas'],
    [/^(ramita|ramitas|sprig|sprigs|rama|ramas)$/, 'ramita', 'ramitas'],
  ]
  for (const [patron, uno, varios] of caseras) {
    if (patron.test(u)) {
      const f = fraccion(valor) ?? '1/4'
      const m = metrico(base.cantidad, base.unidad)
      const nombre = valor > 1.01 ? varios : uno
      return m && !/diente|pizca|lata|atado|sobre|tajada|ramita/.test(uno) ? `${f} ${nombre} (${m})` : `${f} ${nombre}`
    }
  }
  if (base.unidad === 'unidad') {
    const n = fraccion(base.cantidad) ?? '1/4'
    return `${n} ${base.cantidad > 1.01 ? 'unidades' : 'unidad'}`
  }
  return metrico(base.cantidad, base.unidad)
}

// ---------- Implementos ----------
const IMPLEMENTOS_PASO = [
  { id: 'horno', nombre: 'Horno', patron: /\b(horno|hornea\w*|hornear|oven|bake[ds]?|baking|roast(ed|ing)?|forno|asse|assar|asar|ásal\w*|asa durante|gratina\w*|broil\w*)\b/i, sin: 'Sin horno: cocina en una sartén u olla gruesa con tapa a fuego medio-bajo y voltea a la mitad. Para queques o panes, usa una olla con tapa sobre una rejilla o un aro de papel aluminio (horno de olla).' },
  { id: 'licuadora', nombre: 'Licuadora', patron: /\b(licuadora|lic[uú]a\w*|licuar|blender|blend\w*|liquidificador|pur[eé] liso)\b/i, sin: 'Sin licuadora: pica muy fino y aplasta con un tenedor o un mortero; para salsas, pásalas por un colador.' },
  { id: 'batidora', nombre: 'Batidora', patron: /\b(batidora|mixer|batedeira|stand mixer|hand mixer|electric mixer)\b/i, sin: 'Sin batidora: bate a mano con un batidor o un tenedor; toma unos minutos más.' },
  { id: 'microondas', nombre: 'Microondas', patron: /\b(microondas|microwave|micro-ondas)\b/i, sin: 'Sin microondas: calienta o derrite en una olla pequeña a fuego bajo.' },
  { id: 'freidora_aire', nombre: 'Freidora de aire', patron: /\b(freidora de aire|air ?fryer|airfryer)\b/i, sin: 'Sin freidora de aire: dóralo en sartén con muy poco aceite, volteando seguido.' },
  { id: 'olla_presion', nombre: 'Olla a presión', patron: /\b(olla a presi[oó]n|olla de presi[oó]n|pressure cooker|instant pot|panela de press[aã]o)\b/i, sin: 'Sin olla a presión: usa una olla normal con tapa; tarda unas 3 veces más y quizá necesites más agua.' },
  { id: 'procesador', nombre: 'Procesador', patron: /\b(procesador|food processor|processador|picadora)\b/i, sin: 'Sin procesador: pica a cuchillo muy fino.' },
  { id: 'sarten', nombre: 'Sartén', patron: /\b(sart[eé]n|skillet|frying pan|frigideira|wok|pan over)\b/i },
  { id: 'olla', nombre: 'Olla', patron: /\b(olla|cacerola|pot|saucepan|panela|hierve|hervir|boil\w*)\b/i },
]

// ---------- Textos de los pasos ----------
function convertirTemperaturas(texto) {
  return texto
    .replace(/(\d{3})\s*(?:°|º|grados)?\s*F\b(?:ahrenheit)?/gi, (_, f) => `${Math.round(((Number(f) - 32) * 5) / 9 / 5) * 5} °C`)
    // "400 grados" sin unidad: un horno casero no pasa de 250 °C, así que 260 o más son °F.
    .replace(/(\d{3})\s*(?:°|º)?\s*(grados|degrees|graus)(?!\s*(?:C\b|cent|celsius))/gi, (todo, f) => (Number(f) >= 260 && Number(f) <= 550 ? `${Math.round(((Number(f) - 32) * 5) / 9 / 5) * 5} °C` : todo))
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:-|x)?\s*(?:inch(?:es)?|pulgadas?|")(?!\w)/gi, (_, n) => `${Math.round(Number(n.replace(',', '.')) * 2.54)} cm`)
}

export function renombrarEnPasos(texto, cambios) {
  let t = texto
  for (const { de, a, reemplazo } of cambios) {
    // Una sola expresión con los sinónimos de más largo a más corto, para que
    // "crema de leche" se reemplace entero y no quede "crema de leche de leche".
    // El nombre final también entra en la lista: si el texto ya lo dice, se deja igual ("papas blancas" no pasa a "papas blancas blancas").
    const nombres = [...new Set([...de, a, pluralizar(a.toLowerCase())])].filter((n) => n.length >= 4).sort((x, y) => y.length - x.length)
    if (!nombres.length) continue
    const alternativas = nombres.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    t = t.replace(new RegExp(`(?<![\\wáéíóúñ])(${alternativas})(?![\\wáéíóúñ])`, 'gi'), (encontrado) => {
      // Si es un reemplazo por dieta u objetivo, se deja el original y se indica qué usar.
      if (normalizar(encontrado) === normalizar(a) || normalizar(encontrado) === normalizar(pluralizar(a.toLowerCase()))) return encontrado
      if (reemplazo) return `${encontrado} (usa ${a.toLowerCase()})`
      return /s$/i.test(encontrado) && !/s$/i.test(a) ? pluralizar(a.toLowerCase()) : a.toLowerCase()
    })
  }
  return t
}

// "papa blanca" → "papas blancas", "pierna de pollo" → "piernas de pollo".
function pluralizar(nombre) {
  const palabras = nombre.split(' ')
  let seguir = true
  return palabras
    .map((p) => {
      if (!seguir || p.length < 2) return p
      if (['de', 'del', 'en', 'con', 'al'].includes(p)) {
        seguir = false
        return p
      }
      if (/[aeiouáéó]$/.test(p)) return `${p}s`
      if (/z$/.test(p)) return `${p.slice(0, -1)}ces`
      if (/[íú]$/.test(p)) return `${p}es`
      return `${p}es`.replace(/ón(es)$/, 'on$1')
    })
    .join(' ')
}

// ---------- Adaptación ----------
export function adaptarReceta(receta, usuario = {}) {
  const pais = usuario.pais ?? 'PE'
  const idioma = usuario.idioma ?? 'es'
  const personas = Number(usuario.personas) || receta.porciones || 4
  const factor = personas / (receta.porciones || personas)
  const dietas = usuario.dietas ?? []
  const objetivo = usuario.objetivo ?? 'rico_simple'
  const alergias = raices(usuario.alergias ?? '')
  const tengo = new Set(usuario.implementos ?? [])

  const cambios = []
  const advertencias = []
  const renombres = []
  let usoMedidasImperiales = false
  const ingredientes = []

  for (const original of receta.ingredientes) {
    // Si viene reconocido desde la lectura, se respeta; si la persona cambió el nombre, se vuelve a buscar.
    const m = original.glosario_id ? { ing: porId(original.glosario_id), marca: /marca/.test(original.nota ?? '') } : buscarIngrediente(original.nombre) ?? buscarIngrediente(original.original ?? '')
    let ing = m?.ing
    let sustitucion = { aplicada: false, original: '', motivo: '' }
    if (/^(lb|lbs|libras?|oz|onzas?|cups?|tazas?|pounds?|ounces?|fl oz)$/i.test(normalizar(original.unidad))) usoMedidasImperiales = true

    // Dieta: si el ingrediente la rompe, se reemplaza.
    if (ing?.f) {
      for (const d of dietas) {
        if (!EXCLUYE[d] || ![...ing.f].some((x) => EXCLUYE[d].includes(x))) continue
        const reemplazo = porId(ing.sub?.[d] ?? (d === 'vegetariana' ? ing.sub?.vegana : null))
        const nombreAntes = original.nombre
        if (reemplazo) {
          sustitucion = { aplicada: true, original: nombreAntes, motivo: `Tu dieta ${nombreDe(DIETAS, d).toLowerCase()} no lo incluye. ${reemplazo.nota ?? ''}`.trim() }
          renombres.push({ de: [nombreAntes, ...ing.es, ...ing.en], a: nombreLocal(reemplazo, pais, idioma), reemplazo: true })
          ing = reemplazo
        } else {
          advertencias.push(`"${nombreAntes}" no va con tu dieta ${nombreDe(DIETAS, d).toLowerCase()} y no tiene un reemplazo directo: omítelo o cámbialo por algo parecido.`)
        }
        break
      }
    }
    // Alergias: se avisa, no se adivina el reemplazo.
    if (alergias.length && raices(`${original.nombre} ${ing ? [...ing.es, ...ing.en].join(' ') : ''}`).some((r) => alergias.includes(r))) {
      advertencias.push(`Atención: "${original.nombre}" coincide con lo que no comes (${usuario.alergias}). Revísalo antes de comprar.`)
    }

    // Objetivo: ahorrar → alternativa más barata.
    if (objetivo === 'ahorrar' && ing?.alt && !sustitucion.aplicada) {
      const barato = porId(ing.alt)
      sustitucion = { aplicada: true, original: original.nombre, motivo: 'Tu objetivo es ahorrar: esta opción es más barata y funciona igual.' }
      renombres.push({ de: [original.nombre, ...ing.es], a: nombreLocal(barato, pais, idioma), reemplazo: true })
      ing = barato
    }

    const nombre = ing ? capitalizar(nombreLocal(ing, pais, idioma)) : capitalizar(original.nombre)
    if (ing?.notaPais?.[pais]) {
      // Si la línea junta varias (harina pastelera + harina), el consejo es solo para su parte.
      const parte = original.partes?.find((x) => x.glosario_id === ing.id) ?? original
      const ml = aBase((Number(parte.cantidad) || 0) * factor, parte.unidad, { liquido: 1 }).cantidad
      const tazas = ml / 240
      const nota = typeof ing.notaPais[pais] === 'function' ? ing.notaPais[pais]({ texto: `${fraccion(tazas) ?? '1/4'} ${tazas > 1.01 ? 'tazas' : 'taza'}`, cucharadas: Math.max(1, Math.round(tazas * 2)) }) : ing.notaPais[pais]
      advertencias.push(nota)
    }
    if (ing && !sustitucion.aplicada) renombres.push({ de: [original.nombre, ...ing.es, ...ing.en], a: nombre })
    if (m?.marca) cambios.push({ tipo: 'ingredientes', detalle: `"${original.original ?? original.nombre}" es una marca de otro país: en tu país busca ${nombre.toLowerCase()} de cualquier marca (te mostramos las que hay en tus supermercados).` })

    let cantidad = Number(original.cantidad) || 0
    // Objetivos de salud: menos grasa, azúcar y sal.
    let ajuste = 1
    if (['mas_sano', 'bajar_peso'].includes(objetivo) && ing && ['aceite', 'aceite_oliva', 'mantequilla', 'margarina', 'manteca_vegetal', 'azucar', 'azucar_rubia', 'sal', 'crema_leche'].includes(ing.id)) ajuste = 0.75
    if (objetivo === 'controlar_azucar' && ing && ['azucar', 'azucar_rubia', 'azucar_polvo', 'miel', 'leche_condensada'].includes(ing.id)) ajuste = 0.5
    if (objetivo === 'ganar_musculo' && ing && ['pollo', 'pollo_pechuga', 'pollo_pierna', 'res', 'res_bistec', 'carne_molida', 'pescado', 'huevo', 'garbanzo', 'lenteja', 'frejol', 'tofu'].includes(ing.id)) ajuste = 1.25
    if (ajuste !== 1 && cantidad) {
      cantidad *= ajuste
      cambios.push({ tipo: 'objetivo', detalle: `${nombre}: ${ajuste < 1 ? `usamos un ${Math.round((1 - ajuste) * 100)} % menos` : `subimos un ${Math.round((ajuste - 1) * 100)} % la porción de proteína`} por tu objetivo "${nombreDe(OBJETIVOS, objetivo).toLowerCase()}".` })
    }
    // Reemplazo de huevo por linaza: 7 g por huevo.
    let unidadOriginal = original.unidad
    if (ing?.id === 'linaza' && sustitucion.aplicada && /huevo|egg|ovo/i.test(sustitucion.original)) {
      cantidad = cantidad * 7
      unidadOriginal = 'g'
    }

    const base = aBase(cantidad * factor, unidadOriginal, ing ?? {})
    const categoria = ing?.cat && CATEGORIAS[ing.cat] ? ing.cat : 'otro'
    const opcional = Boolean(original.opcional) || (!cantidad && /gusto|taste|gosto/i.test(original.unidad ?? ''))
    ingredientes.push({
      nombre,
      cantidad_texto: textoCantidad({ cantidad, unidadOriginal, factor, base }),
      cantidad: Math.round(base.cantidad * 100) / 100,
      unidad: base.unidad,
      categoria,
      presentacion: presentacionTipica(ing, categoria, base.cantidad, base.unidad),
      despensa: Boolean(ing?.desp),
      opcional,
      sustitucion,
      alternativa_economica: ing?.alt ? { nombre: capitalizar(nombreLocal(porId(ing.alt), pais, idioma)), categoria: porId(ing.alt).cat } : { nombre: '', categoria: 'otro' },
      // Datos para buscar el producto real en las tiendas:
      glosario_id: ing?.id ?? null,
      buscar: ing ? terminoBusqueda(ing, pais) : original.nombre,
      sin_compra: Boolean(ing?.sinCompra),
      nota: original.nota ?? '',
    })
  }

  // Ingredientes que terminaron con el mismo nombre (p. ej. dos harinas): una sola línea.
  for (let i = ingredientes.length - 1; i > 0; i--) {
    const otro = ingredientes.findIndex((x, j) => j < i && normalizar(x.nombre) === normalizar(ingredientes[i].nombre) && x.unidad === ingredientes[i].unidad)
    if (otro < 0) continue
    const a = ingredientes[otro]
    const b = ingredientes.splice(i, 1)[0]
    a.cantidad = Math.round((a.cantidad + b.cantidad) * 100) / 100
    a.cantidad_texto = metrico(a.cantidad, a.unidad) ?? `${a.cantidad_texto} + ${b.cantidad_texto}`
    a.opcional = a.opcional && b.opcional
    a.presentacion = presentacionTipica(GLOSARIO.find((g) => g.id === a.glosario_id), a.categoria, a.cantidad, a.unidad)
  }

  // Pasos: temperaturas en °C, nombres del país, minutos e implementos.
  const faltan = new Map()
  const pasos = (receta.pasos ?? []).map((textoPaso) => {
    const texto = renombrarEnPasos(convertirTemperaturas(textoPaso), renombres)
    const usados = IMPLEMENTOS_PASO.filter((i) => i.patron.test(textoPaso) || i.patron.test(texto))
    const faltante = usados.find((i) => i.sin && !tengo.has(i.id))
    if (faltante) faltan.set(faltante.id, faltante)
    return {
      texto,
      minutos: minutosDelPaso(texto),
      implemento: usados[0]?.nombre ?? '',
      consejo: faltante ? faltante.sin : '',
    }
  })

  // Lo que cambió, en palabras.
  if (factor !== 1) cambios.unshift({ tipo: 'porciones', detalle: `La receta rendía ${receta.porciones} ${receta.porcion?.plural ?? 'porciones'}; la ajustamos a ${personas} ${receta.porcion ? (personas === 1 ? receta.porcion.singular : receta.porcion.plural) : personas === 1 ? 'porción' : 'porciones'}.` })
  if (usoMedidasImperiales) cambios.unshift({ tipo: 'medidas', detalle: 'Pasamos libras, onzas, tazas y °F a gramos, mililitros y °C.' })
  if (receta.idioma_original && !/espa/i.test(receta.idioma_original) && idioma === 'es') cambios.unshift({ tipo: 'idioma', detalle: `La receta estaba en ${receta.idioma_original.toLowerCase()}: la tradujimos con los nombres que se usan en ${PAISES[pais]?.nombre ?? 'tu país'}.` })
  const renombrados = ingredientes.filter((i, n) => !i.sustitucion.aplicada && normalizar(i.nombre) !== normalizar(receta.ingredientes[n].nombre))
  if (renombrados.length) cambios.push({ tipo: 'ingredientes', detalle: `Nombres de ${PAISES[pais]?.nombre ?? 'tu país'}: ${renombrados.map((i) => `${receta.ingredientes[ingredientes.indexOf(i)].nombre} → ${i.nombre}`).slice(0, 6).join(', ')}.` })
  for (const i of ingredientes.filter((x) => x.sustitucion.aplicada)) cambios.push({ tipo: i.sustitucion.motivo.startsWith('Tu dieta') ? 'dieta' : 'objetivo', detalle: `${i.sustitucion.original} → ${i.nombre}. ${i.sustitucion.motivo}` })
  for (const f of faltan.values()) cambios.push({ tipo: 'implementos', detalle: f.sin })
  const sinGlosario = ingredientes.filter((i) => !i.glosario_id && !i.opcional)
  if (sinGlosario.length) advertencias.push(`No reconocimos ${sinGlosario.map((i) => `"${i.nombre}"`).join(', ')}: revisa que el nombre esté bien escrito; lo buscaremos tal cual en las tiendas.`)
  if (ingredientes.some((i) => ['pollo', 'carne_roja', 'pescado_marisco'].includes(i.categoria))) advertencias.push('Cocina bien las carnes: el pollo no debe quedar rosado por dentro.')

  // Nutrición aproximada por porción.
  // Nutrición y peso aproximados por porción (peso de la mezcla en crudo).
  const total = [0, 0, 0, 0]
  let pesoTotal = 0
  for (const i of ingredientes) {
    const g = GLOSARIO.find((x) => x.id === i.glosario_id)
    const k = g?.k ?? MACROS_CATEGORIA[i.categoria]
    const gramos = i.unidad === 'g' ? i.cantidad : i.unidad === 'ml' ? i.cantidad * (g?.gml ?? 1) : i.cantidad * (g?.gu ?? 100)
    k.forEach((v, n) => (total[n] += (v * gramos) / 100))
    pesoTotal += gramos
  }
  const porPorcion = total.map((v) => Math.round(v / personas))
  const porcion = receta.porcion ?? null
  const unidadTexto = (n) => (porcion ? (n === 1 ? porcion.singular : porcion.plural) : n === 1 ? 'porción' : 'porciones')

  const tiempo = Math.max(receta.tiempo_total_min || 0, pasos.reduce((s, p) => s + p.minutos, 0))
  return {
    titulo: capitalizar(renombrarEnPasos(receta.titulo || 'Mi receta', renombres.filter((r) => !r.reemplazo))),
    descripcion: `Adaptada para ${personas} ${unidadTexto(personas)} en ${PAISES[pais]?.nombre ?? 'tu país'}, con medidas en gramos y los nombres que vas a encontrar en tus tiendas.`,
    porciones: personas,
    porcion,
    peso_porcion_g: Math.round(pesoTotal / personas),
    tiempo_total_min: tiempo || 30,
    dificultad: pasos.length <= 5 && tiempo <= 40 ? 'fácil' : pasos.length <= 10 && tiempo <= 90 ? 'media' : 'difícil',
    ingredientes,
    pasos,
    cambios,
    nutricion_por_porcion: { calorias: porPorcion[0], proteinas_g: porPorcion[1], carbohidratos_g: porPorcion[2], grasas_g: porPorcion[3] },
    advertencias,
  }
}
