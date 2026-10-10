// Precios reales: busca cada ingrediente en las tiendas en línea de los
// supermercados del país. Usa su catálogo público (el mismo que carga su web),
// sin claves ni pagos. Los resultados se guardan 6 horas para no repetir consultas.
import { PAISES } from '../../src/lib/datos.js'
import { buscarIngrediente, porId, GLOSARIO } from './glosario.js'
import { convertir } from './unidades.js'
import { raices, normalizar } from './texto-util.js'
import { cache } from './cache.js'

export const CADENAS = {
  PE: [
    { id: 'plazavea', carrito: true, nombre: 'Plaza Vea', web: 'https://www.plazavea.com.pe', osm: 'plaza ?vea', mapa: 'plaza ?vea' },
    { id: 'metro', carrito: true, nombre: 'Metro', web: 'https://www.metro.pe', osm: '^(hipermercados? |supermercados? )?metro\\b', mapa: 'metro' },
    { id: 'wong', carrito: true, nombre: 'Wong', web: 'https://www.wong.pe', osm: '\\bwong\\b', mapa: 'wong' },
  ],
  MX: [{ id: 'chedraui', carrito: true, nombre: 'Chedraui', web: 'https://www.chedraui.com.mx', osm: 'chedraui', mapa: 'chedraui' }],
  CO: [
    { id: 'exito', nombre: 'Éxito', web: 'https://www.exito.com', osm: '[eé]xito', mapa: 'xito' },
    { id: 'carulla', nombre: 'Carulla', web: 'https://www.carulla.com', osm: 'carulla', mapa: 'carulla' },
    { id: 'olimpica', carrito: true, nombre: 'Olímpica', web: 'https://www.olimpica.com', osm: 'ol[ií]mpica', mapa: 'mpica' },
  ],
  AR: [
    { id: 'carrefour', carrito: true, nombre: 'Carrefour', web: 'https://www.carrefour.com.ar', osm: 'carrefour', mapa: 'carrefour' },
    { id: 'vea', nombre: 'Vea', web: 'https://www.vea.com.ar', osm: '^(supermercados? )?vea\\b', mapa: 'vea' },
    { id: 'disco', nombre: 'Disco', web: 'https://www.disco.com.ar', osm: '^(supermercados? )?disco\\b', mapa: 'disco' },
    { id: 'jumbo', nombre: 'Jumbo', web: 'https://www.jumbo.com.ar', osm: '\\bjumbo\\b', mapa: 'jumbo' },
  ],
}

// osm: cómo reconocer sus locales en el mapa; mapa: texto simple para buscarlos en OpenStreetMap.
// carrito: la tienda acepta un link que llena el carrito con varios productos (probado a mano).

// Categorías de la tienda que nunca son comida.
// Solo se mira la sección principal ("/Limpieza/…"), no las subsecciones: "Repostería/…/Decoración" sí es comida.
const NO_COMIDA = /(^|\s)\/(mascotas?|limpieza|higiene|cuidado personal|beb[eé]s?|juguet|hogar|electro|bazar|librer|farmacia|belleza|ferreter|jard[ií]n|automo|textil|vestuario|decoraci[oó]n|tecnolog)/i
// Palabras que delatan otro producto ("galletas de vainilla" al buscar vainilla).
const DELATORES = ['codorniz', 'pato', 'mezcla', 'mayonesa', 'mani', 'surtido', 'mix', 'frutos', 'golosina', 'bombon', 'wafer', 'alfajor', 'barrita', 'galleta', 'galletita', 'snack', 'chip', 'helado', 'alimento', 'gato', 'perro', 'sabor', 'saborizado', 'golosina', 'caramelo', 'chocolate', 'jugo', 'nectar', 'yogur', 'yogurt', 'bebida', 'refresco', 'gaseosa', 'mermelada', 'salsa', 'sopa', 'instantaneo', 'instantanea', 'cereal', 'barra', 'gomita', 'chupetin', 'turron', 'torta', 'pastel', 'keke', 'queque', 'pan', 'empanada', 'pizza', 'hamburguesa', 'nugget', 'apanado', 'crema', 'shampoo', 'jabon', 'vela', 'aromatizante', 'te', 'infusion', 'licor', 'cerveza', 'vino', 'pisco', 'ron', 'polvo', 'molido', 'congelado', 'precocido', 'trozo', 'enlatado', 'conserva', 'lata', 'deshidratado', 'encurtido', 'pure', 'paté', 'pate', 'untable', 'esencia', 'aceite', 'vinagre', 'harina', 'pasta', 'fideo', 'galleton']

const ENVASES = new Set(['filete', 'pack', 'bolsa', 'sobre', 'frasco', 'lata', 'bandeja', 'caja', 'paquete', 'malla', 'atado', 'granel', 'botella', 'doypack', 'pote', 'tarro', 'fresco', 'fresca'])

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) espaciococina/1.0 (proyecto educativo)'
const guardados = cache('catalogos-v2', 6) // v2: guarda el SKU de cada producto

// Pocas consultas a la vez, para no cargar las tiendas.
let activas = 0
const cola = []
async function conTurno(fn) {
  if (activas >= 6) await new Promise((r) => cola.push(r))
  activas++
  try {
    return await fn()
  } finally {
    activas--
    cola.shift()?.()
  }
}

async function buscarEnCatalogo(cadena, termino) {
  const clave = `${cadena.id}|${normalizar(termino)}`
  const enCache = guardados.leer(clave)
  if (enCache) return enCache
  const url = `${cadena.web}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(termino)}&O=OrderByScoreDESC&_from=0&_to=19`
  const productos = await conTurno(async () => {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' }, signal: AbortSignal.timeout(12000) })
      if (!r.ok && r.status !== 206) return null
      return await r.json()
    } catch {
      return null
    }
  })
  if (!Array.isArray(productos)) return null
  const lista = productos
    .map((p) => {
      const item = p.items?.find((it) => it.sellers?.some((s) => s.commertialOffer?.Price > 0 && s.commertialOffer?.AvailableQuantity > 0))
      const vendedor = item?.sellers.find((s) => s.commertialOffer?.Price > 0 && s.commertialOffer?.AvailableQuantity > 0)
      const oferta = vendedor?.commertialOffer
      if (!oferta) return null
      return {
        nombre: p.productName,
        marca: p.brand,
        url: p.link,
        imagen: item.images?.[0]?.imageUrl ?? null,
        categorias: (p.categories ?? []).join(' '),
        precio: oferta.Price,
        precioLista: oferta.ListPrice,
        medida: item.measurementUnit,
        multiplicador: item.unitMultiplier,
        // Para el link que llena el carrito de la tienda.
        sku: item.itemId,
        vendedor: vendedor.sellerId,
      }
    })
    .filter(Boolean)
  return guardados.escribir(clave, lista)
}

// Cuánto trae un producto: "Pack x 250g", "Huevos x 15un", venta por kilo…
export function presentacionProducto(p) {
  const medida = normalizar(p.medida ?? 'un')
  const mult = Number(p.multiplicador) || 1
  if (['kg', 'g', 'l', 'lt', 'ml'].includes(medida)) {
    const base = { kg: [1000, 'g'], g: [1, 'g'], l: [1000, 'ml'], lt: [1000, 'ml'], ml: [1, 'ml'] }[medida]
    const cantidad = mult * base[0]
    // El precio viene por kilo o litro; se compra en pasos de "mult".
    return { cantidad, unidad: base[1], precio: p.precio * mult, descripcion: cantidad >= 1000 ? `${cantidad / 1000} ${base[1] === 'g' ? 'kg' : 'l'}` : `${cantidad} ${base[1]} (a granel)` }
  }
  const n = normalizar(p.nombre).replace(/(\d),(\d)/g, '$1.$2')
  const tam = n.match(/(\d+(?:\.\d+)?)\s*(kg|kilos?|g|gr|grs|gramos|ml|cc|l|lt|lts|litros?)\b/)
  const cuenta = n.match(/(?:x\s*|paquete\s*|pack\s*|bandeja\s*|caja\s*)(\d+)\s*(?:un|und|unid|unidades|u|uds)?\b(?!\s*(?:g|gr|kg|ml|l)\b)/) ?? n.match(/(\d+)\s*(?:un|und|unid|unidades|uds)\b/)
  const veces = cuenta ? Number(cuenta[1]) : 1
  if (tam) {
    const [valor, u] = [Number(tam[1]), tam[2]]
    const enBase = /^k/.test(u) ? [valor * 1000, 'g'] : /^(g|gr)/.test(u) ? [valor, 'g'] : /^(ml|cc)/.test(u) ? [valor, 'ml'] : [valor * 1000, 'ml']
    const cantidad = enBase[0] * veces
    return { cantidad, unidad: enBase[1], precio: p.precio, descripcion: `${veces > 1 ? `${veces} × ` : ''}${tam[1]} ${tam[2]}` }
  }
  return { cantidad: veces, unidad: 'unidad', precio: p.precio, descripcion: veces > 1 ? `${veces} unidades` : '1 unidad' }
}

// ¿El producto es el ingrediente buscado? Puntaje 0 = no sirve.
function puntaje(producto, terminoRaices, permitidas, excluir) {
  if (NO_COMIDA.test(producto.categorias)) return 0
  const nombre = raices(producto.nombre)
  // "chocolate" también calza con "choco" (Gotas de Choco), y "nuez" con "nueces".
  const tiene = (r) => nombre.some((n) => n === r || (r.length > 4 && n.startsWith(r)) || (n.length >= 5 && r.startsWith(n)))
  if (!terminoRaices.every(tiene)) return 0
  // El producto tiene que SER el ingrediente: "Sal de cocina" sí, "Maní con sal" no.
  // Antes del nombre solo pueden ir palabras de envase ("Filete de atún", "Bolsa de papas").
  const posicion = nombre.findIndex((n) => n === terminoRaices[0] || (terminoRaices[0].length > 4 && n.startsWith(terminoRaices[0])) || (n.length >= 5 && terminoRaices[0].startsWith(n)))
  if (posicion < 0 || nombre.slice(0, posicion).some((n) => !ENVASES.has(n))) return 0
  for (const d of DELATORES) if (nombre.includes(d) && !permitidas.has(d)) return 0
  // Variantes que no son lo que se pide ("Azúcar rubia" cuando se pide azúcar blanca).
  if (excluir?.some((x) => nombre.includes(x) && !terminoRaices.includes(x))) return 0
  // "Nueces y frutos", "Atún y verduras": si el producto junta cosas que no se buscan, no sirve.
  const partes = normalizar(producto.nombre).split(/\s(?:y|&)\s/)
  if (partes.length > 1) {
    const despues = partes[1]
    if (raices(despues).some((r) => !permitidas.has(r) && r.length > 3 && !/^\d/.test(r))) return 0
  }
  let p = 1
  if (nombre[0] === terminoRaices[0]) p += 0.5
  if (nombre.indexOf(terminoRaices[0]) <= 1) p += 0.25
  // Menos palabras extra = más parecido a lo que se busca.
  p -= Math.min(0.4, Math.max(0, nombre.length - terminoRaices.length - 3) * 0.05)
  return p
}

function terminosPara(item, pais) {
  const ing = item.glosario_id ? porId(item.glosario_id) : buscarIngrediente(item.nombre)?.ing
  const terminos = [item.buscar, item.nombre]
  if (ing) {
    const locales = pais === 'BR' ? [ing.local.BR, ...ing.pt] : [ing.local[pais], ...ing.es]
    terminos.push(...locales)
  }
  return { ing, terminos: [...new Set(terminos.filter(Boolean).map((t) => t.trim()))].slice(0, 4) }
}

// Cotiza un ingrediente en una cadena: el producto que alcanza al menor costo.
async function cotizarEnCadena(item, cadena, pais) {
  const { ing, terminos } = terminosPara(item, pais)
  const datos = ing ?? {}
  // Palabras que son parte del ingrediente y no deben descartar productos (p. ej. "pasta" de tomate).
  const permitidas = new Set(raices([...terminos, ...(ing ? [...ing.es, ...ing.pt] : [])].join(' ')))
  if (ing?.cat === 'enlatado') ['lata', 'conserva', 'enlatado'].forEach((x) => permitidas.add(x))
  if (ing?.cat === 'especia_hierba') ['molido', 'molida', 'polvo'].forEach((x) => permitidas.add(x))
  if (ing?.id === 'gelatina') permitidas.add('sabor')
  for (const termino of terminos) {
    const productos = await buscarEnCatalogo(cadena, termino)
    if (!productos?.length) continue
    const raicesTermino = raices(termino)
    const candidatos = productos
      .map((p) => ({ p, puntaje: puntaje(p, raicesTermino, permitidas, ing?.excluir) }))
      .filter((c) => c.puntaje > 0)
    if (!candidatos.length) continue
    const mejorPuntaje = Math.max(...candidatos.map((c) => c.puntaje))
    let elegido = null
    for (const { p, puntaje: pp } of candidatos) {
      if (pp < mejorPuntaje - 0.5) continue
      const pres = presentacionProducto(p)
      const necesidad = item.cantidad > 0 ? convertir(item.cantidad, item.unidad, pres.unidad, datos) : 0
      const paquetes = necesidad ? Math.max(1, Math.ceil(necesidad / pres.cantidad - 1e-9)) : 1
      if (paquetes > 12) continue // presentaciones demasiado chicas para la receta
      const total = paquetes * pres.precio
      if (!elegido || total < elegido.subtotal - 0.001) elegido = { producto: p, pres, paquetes, subtotal: total, conversion: necesidad !== null }
    }
    if (!elegido) continue
    const moneda = PAISES[pais].moneda
    return {
      lugarId: cadena.id,
      termino,
      producto: { nombre: elegido.producto.nombre, marca: elegido.producto.marca, url: elegido.producto.url, imagen: elegido.producto.imagen, sku: elegido.producto.sku, vendedor: elegido.producto.vendedor },
      presentacion: { cantidad: elegido.pres.cantidad, unidad: elegido.pres.unidad, descripcion: elegido.pres.descripcion },
      precio: {
        monto: Math.round(elegido.pres.precio * 100) / 100,
        moneda,
        fuente: new URL(cadena.web).hostname.replace(/^www\./, ''),
        fecha: new Date().toISOString().slice(0, 10),
        estado: 'en_linea',
        oferta: elegido.producto.precioLista > elegido.producto.precio,
      },
      paquetes: elegido.paquetes,
      subtotal: Math.round(elegido.subtotal * 100) / 100,
      calculoAproximado: !elegido.conversion,
    }
  }
  return null
}

// items: [{ indice, nombre, buscar, glosario_id, cantidad, unidad }]
export async function cotizar(items, usuario = {}) {
  const pais = usuario.pais ?? 'PE'
  const cadenas = CADENAS[pais] ?? []
  const cotizaciones = {}
  await Promise.all(
    items.flatMap((item) =>
      cadenas.map(async (cadena) => {
        const c = await cotizarEnCadena(item, cadena, pais)
        if (c) (cotizaciones[item.indice] ??= {})[cadena.id] = c
      }),
    ),
  )
  return {
    cadenas: cadenas.map(({ id, nombre, web, carrito }) => ({ id, nombre, web, carrito: Boolean(carrito) })),
    cotizaciones,
    sinCatalogo: cadenas.length === 0,
  }
}

export { GLOSARIO }
