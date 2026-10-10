// Servidor de espaciococina: expone la API propia (/api/...) y sirve la interfaz.
// No usa servicios pagados ni claves: todo sale del motor gratuito (server/libre)
// y de fuentes públicas (supermercados en línea, OpenStreetMap, MyMemory, TheMealDB).
import express from 'express'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ErrorApp } from './errores.js'
import { textoDesdeLink } from './link.js'
import { RECETA_EJEMPLO } from './ejemplo.js'
import { recetaDesdeTexto, prepararExtraccion } from './libre/extraer.js'
import { adaptarReceta } from './libre/adaptar.js'
import { cotizar, CADENAS } from './libre/precios.js'
import { tiendasCerca } from './libre/tiendas.js'
import { ideasParaSobrantes, recetasParaRefri, traducirPasos } from './libre/recetas.js'
import * as biblioteca from './biblioteca.js'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUERTO = Number(process.env.PORT) || 5173
const produccion = process.env.NODE_ENV === 'production'

const app = express()
// Detrás de un túnel o de un hosting, la IP real llega en una cabecera.
app.set('trust proxy', true)

// Límite de pedidos por persona (IP) para que nadie sature la app ni llene el disco.
function limitar(max, minutos) {
  const registro = new Map()
  return (req, res, next) => {
    const ip = req.get('cf-connecting-ip') || req.ip
    const ahora = Date.now()
    const recientes = (registro.get(ip) ?? []).filter((t) => ahora - t < minutos * 60e3)
    if (recientes.length >= max) return res.status(429).json({ error: 'Hiciste muchas solicitudes seguidas. Espera unos minutos e intenta de nuevo.', codigo: 'limite' })
    recientes.push(ahora)
    registro.set(ip, recientes)
    if (registro.size > 5000) registro.clear()
    next()
  }
}
const limiteConsultas = limitar(40, 10) // leer recetas, precios, tiendas, traducciones
const limiteEscritura = limitar(30, 10) // agregar, calificar, editar
const limiteFotos = limitar(12, 60)
const servidor = http.createServer(app)
app.use(express.json({ limit: '6mb' }))
// Fotos que la gente sube al recetario.
app.use('/fotos-recetas', express.static(biblioteca.CARPETA_FOTOS, { maxAge: '7d' }), (_req, res) => res.status(404).end())

app.get('/api/estado', (_req, res) => {
  res.json({
    motor: 'gratuito',
    paisesConPrecios: Object.fromEntries(Object.entries(CADENAS).map(([pais, cadenas]) => [pais, cadenas.map((c) => c.nombre)])),
  })
})

app.get('/api/ejemplo', (_req, res) => res.json({ texto: RECETA_EJEMPLO }))

app.post(
  '/api/extraer',
  limiteConsultas,
  manejar(async (req) => {
    const { tipo, texto, url, usuario } = req.body ?? {}
    if (tipo === 'texto') {
      if (!texto?.trim()) throw new ErrorApp('vacio', 'Pega el texto de la receta.', 400)
      return { datos: await prepararExtraccion(recetaDesdeTexto(texto), usuario) }
    }
    if (tipo === 'link') {
      const pagina = await textoDesdeLink(url)
      const datos = await prepararExtraccion(pagina.receta, usuario)
      const avisos = [pagina.aviso, pagina.recortado && 'La página era muy larga: se leyó solo la primera parte.'].filter(Boolean)
      return { datos, aviso: avisos.join(' ') || undefined }
    }
    throw new ErrorApp('tipo', 'Elige texto, foto o link.', 400)
  }),
)

app.post(
  '/api/adaptar',
  manejar(async (req) => {
    const { receta, usuario } = req.body ?? {}
    if (!receta?.ingredientes?.length) throw new ErrorApp('vacio', 'La receta no tiene ingredientes.', 400)
    return { datos: adaptarReceta(receta, usuario) }
  }),
)

app.post(
  '/api/precios',
  limiteConsultas,
  manejar(async (req) => {
    const { items, usuario } = req.body ?? {}
    if (!Array.isArray(items)) throw new ErrorApp('vacio', 'No hay productos para cotizar.', 400)
    return cotizar(items.slice(0, 40), usuario)
  }),
)

app.post(
  '/api/tiendas',
  limiteConsultas,
  manejar(async (req) => tiendasCerca(req.body?.usuario)),
)

app.post(
  '/api/sobrantes',
  limiteConsultas,
  manejar(async (req) => {
    const { sobrantes, usuario } = req.body ?? {}
    if (!sobrantes?.length) throw new ErrorApp('vacio', 'No hay sobrantes.', 400)
    return { datos: await ideasParaSobrantes(sobrantes, usuario) }
  }),
)

app.post(
  '/api/refri',
  limiteConsultas,
  manejar(async (req) => {
    const { items, usuario } = req.body ?? {}
    if (!items?.length) throw new ErrorApp('vacio', 'Tu refri está vacía: agrega algunos ingredientes.', 400)
    return { datos: await recetasParaRefri(items, usuario) }
  }),
)

app.post(
  '/api/traducir-pasos',
  limiteConsultas,
  manejar(async (req) => traducirPasos(req.body?.pasos ?? [], req.body?.usuario?.idioma ?? 'es')),
)

// ---------- Recetario compartido ----------
app.get('/api/biblioteca', manejar(async (req) => biblioteca.listar({ q: req.query.q, orden: req.query.orden, mias: req.query.mias === '1' }, biblioteca.huella(req))))
app.post('/api/biblioteca', limiteEscritura, manejar(async (req) => biblioteca.agregar(req.body ?? {}, biblioteca.huella(req))))
app.get('/api/biblioteca/:id', manejar(async (req) => biblioteca.obtener(req.params.id, biblioteca.huella(req))))
app.put('/api/biblioteca/:id', limiteEscritura, manejar(async (req) => biblioteca.editar(req.params.id, req.body ?? {}, biblioteca.huella(req))))
app.delete('/api/biblioteca/:id', limiteEscritura, manejar(async (req) => biblioteca.eliminar(req.params.id, biblioteca.huella(req))))
app.post('/api/biblioteca/:id/calificacion', limiteEscritura, manejar(async (req) => biblioteca.calificar(req.params.id, req.body ?? {}, biblioteca.huella(req))))
app.delete('/api/biblioteca/:id/calificacion', manejar(async (req) => biblioteca.borrarCalificacion(req.params.id, biblioteca.huella(req))))
app.post('/api/biblioteca/:id/fotos', limiteFotos, manejar(async (req) => biblioteca.agregarFoto(req.params.id, req.body ?? {}, biblioteca.huella(req))))
app.delete('/api/biblioteca/:id/fotos/:fotoId', manejar(async (req) => biblioteca.borrarFoto(req.params.id, req.params.fotoId, biblioteca.huella(req))))

app.use('/api', (_req, res) => res.status(404).json({ error: 'No existe esa ruta.' }))

function manejar(fn) {
  return async (req, res) => {
    try {
      res.json(await fn(req))
    } catch (error) {
      if (error instanceof ErrorApp) {
        res.status(error.estado).json({ error: error.message, codigo: error.codigo })
      } else {
        console.error(error)
        res.status(500).json({ error: 'Algo salió mal en el servidor. Intenta de nuevo.', codigo: 'interno' })
      }
    }
  }
}

if (produccion) {
  app.use(express.static(path.join(raiz, 'dist')))
  app.get('*', (_req, res) => res.sendFile(path.join(raiz, 'dist', 'index.html')))
} else {
  const { createServer } = await import('vite')
  const vite = await createServer({ root: raiz, server: { middlewareMode: true, hmr: { server: servidor } }, appType: 'spa' })
  app.use(vite.middlewares)
}

servidor.listen(PUERTO, () => {
  console.log(`\n  espaciococina lista en http://localhost:${PUERTO}`)
  console.log('  Funciona sin claves ni pagos: precios en línea de supermercados, mapas de OpenStreetMap y traducción gratuita.')
})
