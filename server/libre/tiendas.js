// Tiendas reales cerca de la persona, con OpenStreetMap (gratis, sin clave):
// Nominatim ubica la zona y Overpass busca supermercados, mercados, bodegas,
// verdulerías y carnicerías alrededor. También encuentra la sucursal más
// cercana de cada supermercado con precios en línea.
import { PAISES } from '../../src/lib/datos.js'
import { CADENAS } from './precios.js'
import { cache } from './cache.js'
import { ErrorApp } from '../errores.js'

const UA = 'espaciococina/1.0 (proyecto educativo de recetas)'
const lugares = cache('ubicaciones', 24 * 30)
const tiendasCache = cache('tiendas', 24)
const SERVIDORES_OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
const CODIGO_PAIS = { PE: 'pe', MX: 'mx', CO: 'co', AR: 'ar', CL: 'cl', EC: 'ec', BO: 'bo', ES: 'es', US: 'us', BR: 'br' }

export async function ubicar({ pais = 'PE', zona = '', lat, lon }) {
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lon)) && lat !== null && lon !== null && lat !== '' && lon !== '') {
    return { lat: Number(lat), lon: Number(lon), nombre: 'Tu ubicación' }
  }
  if (!zona.trim()) throw new ErrorApp('sin_zona', 'Escribe tu zona o barrio en tu perfil (o usa tu ubicación) para encontrar tiendas cerca.', 400)
  const clave = `${pais}|${zona.trim().toLowerCase()}`
  const guardado = lugares.leer(clave)
  if (guardado) return guardado
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(zona)}&countrycodes=${CODIGO_PAIS[pais] ?? ''}&format=json&limit=1&accept-language=es`
  let datos
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(12000) })
    datos = await r.json()
  } catch {
    throw new ErrorApp('mapa', 'No se pudo consultar el mapa (OpenStreetMap). Revisa tu internet.', 502)
  }
  if (!datos?.length) throw new ErrorApp('zona_desconocida', `No encontramos "${zona}" en ${PAISES[pais]?.nombre ?? 'tu país'}. Prueba con el nombre del distrito o barrio y la ciudad (ej.: "Miraflores, Lima").`, 404)
  return lugares.escribir(clave, { lat: Number(datos[0].lat), lon: Number(datos[0].lon), nombre: datos[0].display_name.split(',').slice(0, 2).join(',') })
}

async function overpass(consulta) {
  // El servidor gratuito a veces está saturado (504): se reintenta con pausas y luego se prueba otro.
  const intentos = [SERVIDORES_OVERPASS[0], SERVIDORES_OVERPASS[0], SERVIDORES_OVERPASS[0], ...SERVIDORES_OVERPASS.slice(1)]
  for (const [n, servidor] of intentos.entries()) {
    try {
      const r = await fetch(servidor, {
        method: 'POST',
        headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(consulta)}`,
        signal: AbortSignal.timeout(25000),
      })
      const texto = await r.text()
      if (r.ok && texto.trimStart().startsWith('{')) return JSON.parse(texto).elements ?? []
    } catch {
      // Se reintenta.
    }
    await new Promise((listo) => setTimeout(listo, 1500 * (n + 1)))
  }
  return null
}

function distanciaKm(a, b) {
  const rad = (x) => (x * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

function tipoDeTienda(tags, pais) {
  const p = PAISES[pais] ?? PAISES.PE
  if (tags.amenity === 'marketplace') return { id: 'mercado', nombre: p.mercado }
  return (
    {
      supermarket: { id: 'supermercado', nombre: 'Supermercado' },
      convenience: { id: 'tienda', nombre: p.tienda },
      grocery: { id: 'tienda', nombre: p.tienda },
      greengrocer: { id: 'verduleria', nombre: 'Verdulería' },
      butcher: { id: 'carniceria', nombre: 'Carnicería' },
      wholesale: { id: 'mayorista', nombre: p.mayorista },
    }[tags.shop] ?? { id: 'tienda', nombre: p.tienda }
  )
}

function aTienda(e, centro, pais) {
  const lat = e.lat ?? e.center?.lat
  const lon = e.lon ?? e.center?.lon
  const t = e.tags ?? {}
  const tipo = tipoDeTienda(t, pais)
  const direccion = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ')
  return {
    id: `osm-${e.type}-${e.id}`,
    conNombre: Boolean(t.name || t.brand),
    nombre: t.name ?? t.brand ?? tipo.nombre,
    marca: t.brand ?? '',
    tipo: tipo.id,
    tipoNombre: tipo.nombre,
    direccion,
    horario: t.opening_hours ?? '',
    lat,
    lon,
    distancia_km: Math.round(distanciaKm(centro, { lat, lon }) * 10) / 10,
    mapa: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
  }
}

export async function tiendasCerca(usuario = {}) {
  const pais = usuario.pais ?? 'PE'
  const centro = await ubicar(usuario)
  const clave = `${pais}|${centro.lat.toFixed(3)}|${centro.lon.toFixed(3)}`
  const guardado = tiendasCache.leer(clave)
  if (guardado) return guardado

  const { lat, lon } = centro
  const cadenas = CADENAS[pais] ?? []
  // Dos consultas chicas en vez de una grande: lo que está a pocas cuadras y los supermercados de la zona.
  const [cerca, supermercados] = await Promise.all([
    overpass(`[out:json][timeout:20];(nwr["shop"~"^(supermarket|convenience|greengrocer|butcher|grocery)$"](around:1200,${lat},${lon});nwr["amenity"="marketplace"](around:2500,${lat},${lon}););out center 80;`),
    cadenas.length ? overpass(`[out:json][timeout:20];nwr["shop"="supermarket"](around:6000,${lat},${lon});out center 200;`) : Promise.resolve([]),
  ])
  if (!cerca && !supermercados) throw new ErrorApp('mapa', 'El mapa gratuito (OpenStreetMap) está saturado en este momento. Usa los botones "Ver locales cercanos" o intenta en un minuto.', 503)
  const elementos = [...(cerca ?? []), ...(supermercados ?? [])]
  const todas = elementos
    .filter((e) => (e.lat ?? e.center?.lat) && e.tags)
    .map((e) => aTienda(e, centro, pais))
    .sort((a, b) => a.distancia_km - b.distancia_km)

  // Sucursal más cercana de cada supermercado que tiene precios en línea.
  const sucursales = {}
  for (const c of cadenas) {
    const patron = new RegExp(c.osm, 'i')
    const s = todas.find((t) => patron.test(t.nombre) || patron.test(t.marca))
    if (s) sucursales[c.id] = s
  }
  // Cerca: sin repetir, quitando las que no tienen nombre propio.
  const vistas = new Set()
  const cercanas = todas
    .filter((t) => t.distancia_km <= 3 && (t.conNombre || t.tipo === 'mercado') && !/farma|botica|pharm|drugstore/i.test(t.nombre))
    .filter((t) => {
      const k = `${t.nombre}|${t.direccion}`
      if (vistas.has(k)) return false
      vistas.add(k)
      return true
    })
    .slice(0, 40)

  const resultado = { centro, cercanas, sucursales, fuente: 'OpenStreetMap', fecha: new Date().toISOString().slice(0, 10), incompleto: !cerca || (cadenas.length > 0 && !supermercados) }
  // Si una de las consultas falló, no se guarda para volver a intentar la próxima vez.
  return resultado.incompleto ? resultado : tiendasCache.escribir(clave, resultado)
}
