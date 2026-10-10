import { useState } from 'react'
import { enviar, obtener, prepararImagen } from '../lib/api.js'
import { Aviso, Cargando } from './comunes.jsx'

const PESTANAS = [
  { id: 'texto', nombre: 'Texto' },
  { id: 'imagen', nombre: 'Foto' },
  { id: 'link', nombre: 'Link' },
]

// Lee el texto de la foto en el propio navegador (OCR gratuito con Tesseract).
async function leerFoto(archivo, alAvanzar) {
  const { createWorker } = await import('tesseract.js')
  const lector = await createWorker(['spa', 'eng', 'por'], 1, {
    logger: (m) => m.status === 'recognizing text' && alAvanzar(Math.round(m.progress * 100)),
  })
  try {
    const { data } = await lector.recognize(archivo)
    return data.text
  } finally {
    await lector.terminate()
  }
}

export default function CargarReceta({ perfil, onLeida }) {
  const [tipo, setTipo] = useState('texto')
  const [texto, setTexto] = useState('')
  const [url, setUrl] = useState('')
  const [imagen, setImagen] = useState(null)
  const [cargando, setCargando] = useState(null)
  const [error, setError] = useState('')

  const usarEjemplo = async () => {
    setError('')
    const { texto: ejemplo } = await obtener('/api/ejemplo')
    setTipo('texto')
    setTexto(ejemplo)
  }

  const elegirImagen = async (e) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setError('')
    try {
      setImagen({ ...(await prepararImagen(archivo)), archivo })
    } catch {
      setError('No se pudo abrir esa imagen. Prueba con una foto JPG o PNG.')
    }
  }

  const leer = async (e) => {
    e.preventDefault()
    setError('')
    try {
      let cuerpo
      if (tipo === 'imagen') {
        setCargando({ titulo: 'Leyendo tu foto', detalle: 'Reconociendo el texto… 0 %' })
        const leido = await leerFoto(imagen.archivo, (p) => setCargando({ titulo: 'Leyendo tu foto', detalle: `Reconociendo el texto… ${p} %` }))
        if (leido.trim().length < 30) throw new Error('No pudimos leer texto en esa foto. Prueba con más luz, de frente y sin sombras, o pega el texto.')
        cuerpo = { tipo: 'texto', texto: leido }
      } else {
        cuerpo = tipo === 'texto' ? { tipo, texto } : { tipo, url: url.trim() }
      }
      setCargando({ titulo: 'Leyendo tu receta', detalle: tipo === 'link' ? 'Abriendo la página y buscando los ingredientes…' : 'Separando ingredientes, cantidades y pasos…' })
      const respuesta = await enviar('/api/extraer', { ...cuerpo, usuario: perfil })
      if (!respuesta.datos.es_receta) {
        setError(respuesta.datos.motivo_no_receta || 'Eso no parece una receta.')
        if (tipo === 'imagen') {
          setTipo('texto')
          setTexto(cuerpo.texto)
        }
        return
      }
      onLeida({ extraida: respuesta.datos, aviso: [respuesta.aviso, respuesta.datos.notas].filter(Boolean).join(' '), fuente: tipo, fuenteUrl: tipo === 'link' ? url.trim() : '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(null)
    }
  }

  if (cargando) return <Cargando titulo={cargando.titulo} detalle={cargando.detalle} />

  const listo = (tipo === 'texto' && texto.trim()) || (tipo === 'imagen' && imagen) || (tipo === 'link' && url.trim())

  return (
    <form onSubmit={leer}>
      <span className="sobretitulo">Nueva receta</span>
      <h1>¿Qué vas a cocinar?</h1>
      <p className="suave">Puede estar en español, inglés o portugués, con cualquier medida (tazas, onzas, °F…). La traducimos con los nombres de tu país.</p>

      {error && (
        <Aviso tipo="error" icono="⚠️">
          <p>{error}</p>
        </Aviso>
      )}

      <div className="tarjeta">
        <div className="pestanas" role="tablist">
          {PESTANAS.map((p) => (
            <button type="button" role="tab" key={p.id} aria-selected={tipo === p.id} onClick={() => setTipo(p.id)}>
              {p.nombre}
            </button>
          ))}
        </div>

        {tipo === 'texto' && (
          <label className="campo">
            <span className="oculto-visual">Texto de la receta</span>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={'Pega aquí la receta: un ingrediente por línea y la preparación debajo.\n\nEj.:\nArroz con pollo (4 porciones)\nIngredientes\n- 4 presas de pollo\n- 2 tazas de arroz\nPreparación\n1. Dora el pollo…'}
            />
          </label>
        )}

        {tipo === 'imagen' && (
          <label className="zona-imagen">
            <input type="file" accept="image/*" capture="environment" onChange={elegirImagen} className="oculto-visual" />
            {imagen ? (
              <img src={imagen.url} alt="Foto de la receta" />
            ) : (
              <>
                <h2>Sube una foto</h2>
                <p className="suave chico">De un libro, una revista o una captura de pantalla. Se lee en tu equipo: la foto no se envía a ningún lado.</p>
                <span className="boton negro">Elegir foto</span>
              </>
            )}
          </label>
        )}

        {tipo === 'link' && (
          <label className="campo">
            <span>Link de la receta</span>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" inputMode="url" />
            <small>Funciona con la mayoría de blogs y sitios de recetas. Si una página no se puede leer, copia y pega el texto.</small>
          </label>
        )}
      </div>

      <div className="pie-accion">
        <button type="button" className="boton secundario" onClick={usarEjemplo}>
          Probar con un ejemplo
        </button>
        <button className="boton grande" type="submit" disabled={!listo}>
          Leer receta
        </button>
      </div>
    </form>
  )
}
