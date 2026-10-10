// Listas de compras por presupuesto y sobrantes.
// Usa los precios reales que trae el servidor de cada supermercado en línea.
// Cuando un producto no aparece en línea (o el país no tiene supermercados en
// línea), usa un precio ESTIMADO por categoría y lo marca como tal.
import { PAISES, CATEGORIAS } from './datos.js'

const FRESCOS = ['verdura', 'fruta', 'carne_roja', 'pollo', 'pescado_marisco', 'huevo']
const SECOS = ['cereal_harina', 'pasta_arroz', 'legumbre', 'aceite_grasa', 'azucar_dulce', 'enlatado', 'condimento_salsa', 'especia_hierba', 'frutos_secos', 'bebida']

// Tipos de lugar para los países sin supermercados en línea (precios estimados).
const TIPOS_LUGAR = [
  { id: 'mercado', factor: (cat) => (FRESCOS.includes(cat) ? 0.82 : 0.95), vende: (cat) => cat !== 'bebida', nota: 'Frescos más baratos; lleva tu bolsa.' },
  { id: 'supermercado', factor: (cat) => (FRESCOS.includes(cat) ? 1.08 : 1.0), vende: () => true, nota: 'Tiene de todo en un solo lugar.' },
  { id: 'tienda', factor: () => 1.15, vende: (cat) => !['carne_roja', 'pescado_marisco', 'frutos_secos'].includes(cat), nota: 'La más cerca; algo más cara.' },
]

const hoy = () => new Date().toISOString().slice(0, 10)

function variacion(texto) {
  let h = 2166136261
  for (const c of texto.toLowerCase()) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return ((h >>> 0) % 2001) / 1000 - 1
}

function redondear(monto, pais) {
  if (pais.tasaUSD >= 500) return Math.max(50, Math.round(monto / 50) * 50)
  if (pais.tasaUSD >= 10) return Math.max(1, Math.round(monto))
  return Math.max(0.1, Math.round(monto * 10) / 10)
}

export function paquetesNecesarios(cantidad, unidad, presentacion) {
  if (!presentacion?.cantidad || presentacion.unidad !== unidad || !cantidad) return 1
  return Math.max(1, Math.ceil(cantidad / presentacion.cantidad - 1e-9))
}

// Precio estimado (no real) de un ingrediente, por su categoría y el país.
export function estimar(item, lugarId, usuario, factorLugar = 1) {
  const pais = PAISES[usuario?.pais] ?? PAISES.PE
  const cat = CATEGORIAS[item.categoria] ? item.categoria : 'otro'
  const ref = CATEGORIAS[cat]
  const pres = item.presentacion
  const base = pres.unidad === 'unidad' ? ref.unidad * pres.cantidad : (ref.kg * pres.cantidad) / 1000
  const monto = redondear(base * (1 + 0.15 * variacion(item.nombre)) * factorLugar * pais.nivel * pais.tasaUSD, pais)
  const paquetes = paquetesNecesarios(item.cantidad, item.unidad, pres)
  return {
    lugarId,
    producto: null,
    presentacion: pres,
    precio: { monto, moneda: pais.moneda, fuente: 'Estimación de espaciococina', fecha: hoy(), estado: 'estimado' },
    paquetes,
    subtotal: monto * paquetes,
  }
}

// Ingredientes que hay que comprar (sin lo que ya se tiene ni lo opcional omitido).
export function itemsAComprar(receta, { yaTengo = {}, omitidos = {}, economicos = {} } = {}) {
  return receta.ingredientes
    .map((ing, i) => ({ ...ing, indice: i }))
    .filter((ing) => !yaTengo[ing.indice] && !omitidos[ing.indice] && !ing.sin_compra)
    .map((ing) => {
      if (economicos[ing.indice] && ing.alternativa_economica?.nombre) {
        return {
          ...ing,
          nombreOriginal: ing.nombre,
          nombre: ing.alternativa_economica.nombre,
          buscar: ing.alternativa_economica.nombre,
          glosario_id: null,
          categoria: ing.alternativa_economica.categoria,
          esAlternativa: true,
        }
      }
      return ing
    })
}

// Lugares donde comprar: supermercados con precios en línea, o tipos de lugar con precios estimados.
export function lugaresDeCompra(usuario, catalogo, tiendas) {
  const pais = PAISES[usuario?.pais] ?? PAISES.PE
  if (catalogo?.cadenas?.length) {
    return catalogo.cadenas.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      web: c.web,
      enLinea: true,
      carrito: c.carrito,
      sucursal: tiendas?.sucursales?.[c.id] ?? null,
      buscarEnMapa: `https://www.google.com/maps/search/${encodeURIComponent(`${c.nombre} supermercado ${usuario?.zona ?? ''} ${pais.nombre}`)}`,
    }))
  }
  const cercana = (tipo) => tiendas?.cercanas?.find((t) => t.tipo === tipo || (tipo === 'tienda' && t.tipo === 'verduleria'))
  const nombres = { mercado: pais.mercado, supermercado: 'Supermercado', tienda: pais.tienda }
  return TIPOS_LUGAR.map((t) => {
    const real = cercana(t.id)
    return {
      id: t.id,
      nombre: real?.nombre ?? nombres[t.id],
      enLinea: false,
      nota: t.nota,
      sucursal: real ?? null,
      buscarEnMapa: `https://www.google.com/maps/search/${encodeURIComponent(`${nombres[t.id]} ${usuario?.zona ?? ''} ${pais.nombre}`)}`,
    }
  })
}

// Cotización de un ingrediente en un lugar: real si existe, estimada si no.
function cotizacion(item, lugar, usuario, catalogo) {
  if (lugar.enLinea) return catalogo.cotizaciones?.[item.indice]?.[lugar.id] ?? estimar(item, lugar.id, usuario, 1.05)
  const tipo = TIPOS_LUGAR.find((t) => t.id === lugar.id)
  if (!tipo.vende(item.categoria)) return null
  return estimar(item, lugar.id, usuario, tipo.factor(item.categoria))
}

function armarLista(id, nombre, descripcion, asignacion, lugares) {
  const porLugar = {}
  let total = 0
  for (const { item, cot } of asignacion) {
    porLugar[cot.lugarId] ??= { lugar: lugares.find((l) => l.id === cot.lugarId), items: [], subtotal: 0 }
    porLugar[cot.lugarId].items.push({ ...item, ...cot, presentacion: cot.presentacion })
    porLugar[cot.lugarId].subtotal += cot.subtotal
    total += cot.subtotal
  }
  const carritos = Object.values(porLugar).sort((a, b) => b.subtotal - a.subtotal)
  const estimados = asignacion.filter((a) => a.cot.precio.estado === 'estimado').length
  return { id, nombre, descripcion, carritos, total, paradas: carritos.length, estimados }
}

// Tres listas: la más barata, una equilibrada (máx. 2 lugares) y una sola parada.
export function armarListas(items, usuario, catalogo = null, tiendas = null) {
  const lugares = lugaresDeCompra(usuario, catalogo, tiendas)
  const opciones = items.map((item) => ({ item, cots: lugares.map((l) => cotizacion(item, l, usuario, catalogo)).filter(Boolean) }))
  // Entre dos opciones gana la real; entre iguales, la más barata.
  const mejor = (cots) =>
    cots.reduce((a, b) => {
      const ra = a.precio.estado !== 'estimado'
      const rb = b.precio.estado !== 'estimado'
      if (ra !== rb) return ra ? a : b
      return b.subtotal < a.subtotal ? b : a
    })

  const combinar = (grupo) => {
    const asignacion = opciones.map((o) => {
      const cots = o.cots.filter((c) => grupo.includes(c.lugarId))
      return { item: o.item, cot: cots.length ? mejor(cots) : null }
    })
    if (asignacion.some((a) => !a.cot)) return null
    const estimados = asignacion.filter((a) => a.cot.precio.estado === 'estimado').length
    // Primero, los lugares donde se encontraron más productos en línea; después, el más barato.
    return { asignacion, estimados, total: asignacion.reduce((s, a) => s + a.cot.subtotal, 0) }
  }

  const mejorQue = (c, otro) => !otro || c.estimados < otro.estimados || (c.estimados === otro.estimados && c.total < otro.total)
  let unaParada = null
  for (const l of lugares) {
    const c = combinar([l.id])
    if (c && mejorQue(c, unaParada)) unaParada = c
  }
  // Sin una tienda con todo (países sin catálogo en línea), cada cosa va donde se vende.
  if (!unaParada) {
    const listas = [armarLista('barata', 'La más barata', 'Cada cosa donde se consigue más barata.', opciones.filter((o) => o.cots.length).map((o) => ({ item: o.item, cot: mejor(o.cots) })), lugares)]
    return listas.filter((l) => l.carritos.length)
  }

  // Mover un producto a otra tienda solo vale la vuelta si se ahorra de verdad
  // (unos 0,8 dólares o más), o si en la tienda actual su precio era estimado.
  const pais = PAISES[usuario?.pais] ?? PAISES.PE
  const ahorroMinimo = pais.tasaUSD * 0.8
  const mover = (desde, permitidos) =>
    desde.map(({ item, cot }) => {
      const o = opciones.find((x) => x.item === item)
      const candidata = mejor(o.cots.filter((c) => permitidos.includes(c.lugarId)))
      if (!candidata || candidata.lugarId === cot.lugarId) return { item, cot }
      const actualReal = cot.precio.estado !== 'estimado'
      const ahorro = cot.subtotal - candidata.subtotal
      if (actualReal && ahorro < ahorroMinimo) return { item, cot }
      return { item, cot: { ...candidata, ahorro: actualReal ? ahorro : null } }
    })
  const total = (asignacion) => asignacion.reduce((s, a) => s + a.cot.subtotal, 0)

  // Equilibrada: la tienda de "una sola parada" + la mejor segunda tienda.
  const base = unaParada.asignacion[0].cot.lugarId
  let equilibrada = unaParada.asignacion
  for (const l of lugares) {
    if (l.id === base) continue
    const opcion = mover(unaParada.asignacion, [base, l.id])
    if (total(opcion) < total(equilibrada)) equilibrada = opcion
  }
  // La más barata: parte de la equilibrada y suma tiendas solo si el ahorro lo vale.
  const barata = mover(equilibrada, lugares.map((l) => l.id))

  const nota = `Cambia de tienda solo si ahorras ${formatoDinero(ahorroMinimo, usuario)} o más en un producto.`
  const candidatas = [
    armarLista('barata', 'La más barata', nota, barata, lugares),
    armarLista('equilibrada', 'Equilibrada', `Máximo dos lugares. ${nota}`, equilibrada, lugares),
    armarLista('una_parada', 'Una sola parada', 'Todo en un mismo lugar.', unaParada.asignacion, lugares),
  ].filter((l) => l.carritos.length || !items.length)
  // Si dos listas quedaron iguales, se muestra una sola (la de menos paradas).
  return candidatas.filter((l, n) => !candidatas.slice(n + 1).some((o) => Math.abs(o.total - l.total) < 0.01 && o.paradas <= l.paradas))
}

// Lo que sobra de cada presentación comprada.
export function calcularSobrantes(lista) {
  const sobrantes = []
  for (const carrito of lista?.carritos ?? []) {
    for (const item of carrito.items) {
      const pres = item.presentacion
      if (!pres?.cantidad || pres.unidad !== item.unidad || !item.cantidad) continue
      const comprado = pres.cantidad * item.paquetes
      const sobra = comprado - item.cantidad
      if (sobra / comprado < 0.05) continue
      sobrantes.push({
        nombre: item.nombre,
        cantidad: redondearCantidad(sobra, item.unidad),
        unidad: item.unidad,
        categoria: item.categoria,
        comprado: redondearCantidad(comprado, item.unidad),
        valor: (item.subtotal * sobra) / comprado,
        estimado: item.precio.estado === 'estimado',
      })
    }
  }
  return sobrantes.sort((a, b) => b.valor - a.valor)
}

function redondearCantidad(valor, unidad) {
  if (unidad === 'unidad') return Math.round(valor * 10) / 10
  return valor >= 100 ? Math.round(valor / 5) * 5 : Math.round(valor)
}

export function formatoDinero(monto, usuario) {
  const pais = PAISES[usuario?.pais] ?? PAISES.PE
  const decimales = pais.tasaUSD >= 10 ? 0 : 2
  return `${pais.simbolo} ${monto.toLocaleString('es', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}`
}

export function formatoCantidad(cantidad, unidad) {
  if (unidad === 'unidad') {
    const n = Math.round(cantidad * 10) / 10
    return `${n.toLocaleString('es')} ${n === 1 ? 'unidad' : 'unidades'}`
  }
  if (cantidad >= 1000) return `${(cantidad / 1000).toLocaleString('es', { maximumFractionDigits: 2 })} ${unidad === 'g' ? 'kg' : 'l'}`
  return `${Math.round(cantidad).toLocaleString('es')} ${unidad}`
}

// Clave para saber si hay que volver a pedir precios (cambió la lista o el país).
export function claveCatalogo(items, usuario) {
  // "v4": se sube cuando cambia la forma de elegir productos, para no usar precios viejos guardados.
  return `v4|${usuario?.pais}|${items.map((i) => `${i.indice}:${i.nombre}:${Math.round(i.cantidad)}${i.unidad}`).join(',')}`
}

// La lista que eligió la persona para la receta en curso.
export function listaElegida(sesion, usuario, tiendas = null) {
  if (!sesion?.adaptada) return null
  const items = itemsAComprar(sesion.adaptada, sesion.seleccion)
  const catalogo = sesion.catalogo?.clave === claveCatalogo(items, usuario) ? sesion.catalogo : null
  const listas = armarListas(items, usuario, catalogo, tiendas)
  return listas.find((l) => l.id === sesion.listaId) ?? listas[0] ?? null
}

// Link que abre el carrito de la tienda ya lleno con los productos de la lista (tiendas VTEX).
// Devuelve null si la tienda no lo permite o ningún producto tiene código.
export function linkCarrito(carrito) {
  if (!carrito.lugar.carrito) return null
  const conCodigo = carrito.items.filter((it) => it.producto?.sku && it.precio?.estado === 'en_linea')
  if (!conCodigo.length) return null
  const params = conCodigo.flatMap((it) => [`sku=${encodeURIComponent(it.producto.sku)}`, `qty=${Math.max(1, it.paquetes || 1)}`, `seller=${encodeURIComponent(it.producto.vendedor ?? '1')}`])
  return { url: `${carrito.lugar.web}/checkout/cart/add?${params.join('&')}&sc=1`, incluidos: conCodigo.length, faltan: carrito.items.length - conCodigo.length }
}

// Rappi no deja abrir un carrito ya lleno, pero sí abrir la búsqueda de un producto.
// Con la app de Rappi instalada, el link abre la app (enlaces universales) en ese producto.
// En Perú se busca dentro de la tienda Turbo (27352, la misma en todo Lima); en el resto, en todo Rappi.
const RAPPI = { PE: 'rappi.com.pe', MX: 'rappi.com.mx', CO: 'rappi.com.co', AR: 'rappi.com.ar', CL: 'rappi.cl', EC: 'rappi.com.ec', BR: 'rappi.com.br' }

export function hayRappi(pais) {
  return Boolean(RAPPI[pais])
}

export function linkRappi(termino, pais) {
  const q = encodeURIComponent(termino)
  if (pais === 'PE') return `https://www.rappi.com.pe/tiendas/27352-turbo/s?term=${q}`
  return RAPPI[pais] ? `https://www.${RAPPI[pais]}/search?query=${q}` : null
}
