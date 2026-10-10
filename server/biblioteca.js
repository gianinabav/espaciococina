// Recetario compartido: todas las recetas que la gente lee y adapta quedan aquí,
// con sus calificaciones, reseñas y fotos. Se guarda en datos/recetario.json y las
// fotos en datos/fotos/. Sin cuentas: cada navegador manda una llave secreta
// (cabecera x-autor) y aquí solo se guarda su huella (hash), nunca la llave.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { ErrorApp } from './errores.js'
import { normalizar } from './libre/texto-util.js'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const CARPETA_DATOS = process.env.ESPACIOCOCINA_DATOS ?? path.join(raiz, 'datos')
export const CARPETA_FOTOS = path.join(CARPETA_DATOS, 'fotos')
const ARCHIVO = path.join(CARPETA_DATOS, 'recetario.json')

const MAX_FOTOS_POR_PERSONA = 6
const MAX_BYTES_FOTO = 3 * 1024 * 1024
const MAX_BYTES_TOTAL_FOTOS = 500 * 1024 * 1024 // tope de espacio para todas las fotos juntas

fs.mkdirSync(CARPETA_FOTOS, { recursive: true })
let bytesFotos = fs.readdirSync(CARPETA_FOTOS).reduce((s, f) => s + (fs.statSync(path.join(CARPETA_FOTOS, f)).size || 0), 0)
let recetas = []
try {
  recetas = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')).recetas ?? []
} catch {
  recetas = []
}

let pendiente = null
function guardar() {
  clearTimeout(pendiente)
  pendiente = setTimeout(() => {
    // Escritura atómica: primero un archivo temporal y después se reemplaza.
    const temporal = `${ARCHIVO}.tmp`
    fs.writeFileSync(temporal, JSON.stringify({ version: 1, recetas }, null, 1))
    fs.renameSync(temporal, ARCHIVO)
  }, 300)
}

// ---------- Identidad sin cuentas ----------
export function huella(req) {
  const llave = String(req.get('x-autor') ?? '')
  if (!/^[a-zA-Z0-9-]{16,64}$/.test(llave)) return null
  return crypto.createHash('sha256').update(`espaciococina:${llave}`).digest('hex').slice(0, 32)
}
function requerir(h) {
  if (!h) throw new ErrorApp('sin_autor', 'Falta tu llave del recetario. Recarga la página e intenta de nuevo.', 401)
}
const nuevoId = () => crypto.randomBytes(6).toString('base64url')
const alias = (texto) => String(texto ?? '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'Anónimo'
const texto = (t, max) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

// ---------- Limpieza de lo que llega del navegador ----------
function limpiarReceta(r = {}) {
  const ingredientes = (Array.isArray(r.ingredientes) ? r.ingredientes : [])
    .slice(0, 60)
    .map((i) => ({
      nombre: texto(i.nombre, 80),
      cantidad: Math.max(0, Math.min(100000, Number(i.cantidad) || 0)),
      unidad: texto(i.unidad, 30),
      nota: texto(i.nota, 120),
      original: texto(i.original, 160),
      glosario_id: /^[a-z_]{2,40}$/.test(i.glosario_id ?? '') ? i.glosario_id : null,
      opcional: Boolean(i.opcional),
    }))
    .filter((i) => i.nombre)
  const pasos = (Array.isArray(r.pasos) ? r.pasos : []).slice(0, 40).map((p) => texto(typeof p === 'string' ? p : p?.texto, 1200)).filter(Boolean)
  const porcion = r.porcion?.singular ? { singular: texto(r.porcion.singular, 20), plural: texto(r.porcion.plural, 24) } : null
  return {
    titulo: texto(r.titulo, 120) || 'Receta sin nombre',
    descripcion: texto(r.descripcion, 500),
    porciones: Math.max(1, Math.min(200, Math.round(Number(r.porciones) || 4))),
    porcion,
    tiempo_total_min: Math.max(0, Math.min(2880, Math.round(Number(r.tiempo_total_min) || 0))),
    idioma_original: texto(r.idioma_original, 20),
    ingredientes,
    pasos,
  }
}

function claveDuplicado(receta, fuente) {
  if (fuente?.url) {
    try {
      const u = new URL(fuente.url)
      const video = u.hostname.includes('youtu') ? u.searchParams.get('v') ?? u.pathname.split('/').pop() : null
      return `url:${video ? `yt:${video}` : `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`}`
    } catch {
      // URL inválida: se usa el contenido.
    }
  }
  const ings = receta.ingredientes.map((i) => normalizar(i.nombre)).sort().join(',')
  return `txt:${crypto.createHash('sha1').update(`${normalizar(receta.titulo)}|${ings}`).digest('hex').slice(0, 16)}`
}

// ---------- Lo que se muestra ----------
function resumenCalificaciones(r) {
  const lista = Object.values(r.calificaciones ?? {})
  const total = lista.length
  const promedio = total ? Math.round((lista.reduce((s, c) => s + c.estrellas, 0) / total) * 10) / 10 : 0
  return { promedio, total }
}

function publica(r, h, completa = false) {
  const { promedio, total } = resumenCalificaciones(r)
  const base = {
    id: r.id,
    titulo: r.titulo,
    descripcion: r.descripcion,
    porciones: r.porciones,
    porcion: r.porcion,
    tiempo_total_min: r.tiempo_total_min,
    autor: r.autor,
    fuente: r.fuente,
    creada: r.creada,
    actualizada: r.actualizada,
    foto: r.fotos.at(-1)?.url ?? null,
    nfotos: r.fotos.length,
    calificacion: { promedio, total },
    ningredientes: r.ingredientes.length,
    esMia: Boolean(h && r.autorHash === h),
    vecesCocinada: r.vecesCocinada ?? 0,
  }
  if (!completa) return base
  return {
    ...base,
    idioma_original: r.idioma_original,
    ingredientes: r.ingredientes,
    pasos: r.pasos,
    fotos: r.fotos.map((f) => ({ id: f.id, url: f.url, alias: f.alias, creada: f.creada, esMia: Boolean(h && f.autorHash === h) })),
    resenas: Object.entries(r.calificaciones ?? {})
      .map(([autorHash, c]) => ({ alias: c.alias, estrellas: c.estrellas, comentario: c.comentario, fecha: c.fecha, esMia: autorHash === h }))
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    miCalificacion: h ? r.calificaciones?.[h] ?? null : null,
  }
}

function buscarReceta(id) {
  const r = recetas.find((x) => x.id === id)
  if (!r) throw new ErrorApp('no_existe', 'Esa receta ya no está en el recetario.', 404)
  return r
}

// ---------- Operaciones ----------
export function listar({ q = '', orden = 'recientes', mias = false }, h) {
  const consulta = normalizar(q)
  let lista = recetas.filter((r) => !mias || r.autorHash === h)
  if (consulta) {
    lista = lista.filter((r) => normalizar(`${r.titulo} ${r.autor.alias} ${r.ingredientes.map((i) => i.nombre).join(' ')}`).includes(consulta))
  }
  const puntaje = (r) => {
    const { promedio, total } = resumenCalificaciones(r)
    return total ? (promedio * total + 3 * 2) / (total + 2) : 0 // promedio con un poco de prudencia si hay pocos votos
  }
  lista = [...lista].sort((a, b) => (orden === 'mejores' ? puntaje(b) - puntaje(a) || b.creada.localeCompare(a.creada) : b.creada.localeCompare(a.creada)))
  return { recetas: lista.slice(0, 200).map((r) => publica(r, h)), total: recetas.length }
}

export function obtener(id, h) {
  return publica(buscarReceta(id), h, true)
}

export function agregar({ receta, fuente, alias: nombre }, h) {
  requerir(h)
  const autorHash = h
  const limpia = limpiarReceta(receta)
  if (limpia.ingredientes.length < 2) throw new ErrorApp('receta_incompleta', 'La receta necesita al menos dos ingredientes para entrar al recetario.', 400)
  const fuenteLimpia = { tipo: texto(fuente?.tipo, 20) || 'texto', url: /^https?:\/\//.test(fuente?.url ?? '') ? texto(fuente.url, 500) : '' }
  const clave = claveDuplicado(limpia, fuenteLimpia)
  const existente = recetas.find((r) => r.clave === clave)
  if (existente) {
    existente.vecesCocinada = (existente.vecesCocinada ?? 0) + 1
    guardar()
    return { receta: publica(existente, autorHash), nueva: false }
  }
  const ahora = new Date().toISOString()
  const nueva = {
    id: nuevoId(),
    clave,
    ...limpia,
    fuente: fuenteLimpia,
    autor: { alias: alias(nombre) },
    autorHash,
    creada: ahora,
    actualizada: ahora,
    fotos: [],
    calificaciones: {},
    vecesCocinada: 1,
  }
  recetas.push(nueva)
  guardar()
  return { receta: publica(nueva, autorHash), nueva: true }
}

export function editar(id, cambios, h) {
  const r = buscarReceta(id)
  if (!h || r.autorHash !== h) throw new ErrorApp('no_es_tuya', 'Solo quien agregó la receta puede editarla.', 403)
  const limpia = limpiarReceta({ ...r, ...cambios })
  if (limpia.ingredientes.length < 2) throw new ErrorApp('receta_incompleta', 'Deja al menos dos ingredientes.', 400)
  Object.assign(r, limpia, { actualizada: new Date().toISOString() })
  guardar()
  return publica(r, h, true)
}

export function eliminar(id, h) {
  const r = buscarReceta(id)
  if (!h || r.autorHash !== h) throw new ErrorApp('no_es_tuya', 'Solo quien agregó la receta puede borrarla.', 403)
  for (const f of r.fotos) fs.rm(path.join(CARPETA_FOTOS, path.basename(f.url)), () => {})
  recetas = recetas.filter((x) => x.id !== id)
  guardar()
  return { ok: true }
}

export function calificar(id, { estrellas, comentario, alias: nombre }, h) {
  requerir(h)
  const r = buscarReceta(id)
  const n = Math.round(Number(estrellas))
  if (!(n >= 1 && n <= 5)) throw new ErrorApp('estrellas', 'Elige de 1 a 5 estrellas.', 400)
  r.calificaciones ??= {}
  r.calificaciones[h] = { estrellas: n, comentario: texto(comentario, 600), alias: alias(nombre), fecha: new Date().toISOString() }
  guardar()
  return publica(r, h, true)
}

export function borrarCalificacion(id, h) {
  const r = buscarReceta(id)
  if (h && r.calificaciones?.[h]) delete r.calificaciones[h]
  guardar()
  return publica(r, h, true)
}

// Imagen en base64 (el navegador ya la achica a JPEG): se revisa que de verdad sea una imagen.
export function agregarFoto(id, { datos, alias: nombre }, h) {
  requerir(h)
  const r = buscarReceta(id)
  if (r.fotos.filter((f) => f.autorHash === h).length >= MAX_FOTOS_POR_PERSONA) {
    throw new ErrorApp('muchas_fotos', `Puedes subir hasta ${MAX_FOTOS_POR_PERSONA} fotos por receta.`, 400)
  }
  const buffer = Buffer.from(String(datos ?? ''), 'base64')
  if (!buffer.length || buffer.length > MAX_BYTES_FOTO) throw new ErrorApp('foto', 'La foto es muy pesada (máximo 3 MB).', 400)
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8
  const png = buffer.subarray(0, 4).toString('hex') === '89504e47'
  const webp = buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  if (!jpeg && !png && !webp) throw new ErrorApp('foto', 'Ese archivo no es una foto JPG, PNG o WEBP.', 400)
  if (bytesFotos + buffer.length > MAX_BYTES_TOTAL_FOTOS) throw new ErrorApp('sin_espacio', 'El recetario no tiene más espacio para fotos por ahora.', 507)
  const nombreArchivo = `${r.id}-${nuevoId()}.${jpeg ? 'jpg' : png ? 'png' : 'webp'}`
  fs.writeFileSync(path.join(CARPETA_FOTOS, nombreArchivo), buffer)
  bytesFotos += buffer.length
  r.fotos.push({ id: nuevoId(), url: `/fotos-recetas/${nombreArchivo}`, alias: alias(nombre), autorHash: h, creada: new Date().toISOString() })
  guardar()
  return publica(r, h, true)
}

export function borrarFoto(id, fotoId, h) {
  const r = buscarReceta(id)
  const foto = r.fotos.find((f) => f.id === fotoId)
  if (!foto) throw new ErrorApp('no_existe', 'Esa foto ya no está.', 404)
  if (!h || (foto.autorHash !== h && r.autorHash !== h)) throw new ErrorApp('no_es_tuya', 'Solo puedes borrar tus fotos (o las de tus recetas).', 403)
  fs.rm(path.join(CARPETA_FOTOS, path.basename(foto.url)), () => {})
  r.fotos = r.fotos.filter((f) => f.id !== fotoId)
  guardar()
  return publica(r, h, true)
}
