import { useEffect, useState } from 'react'

// Lista en una sola pantalla, pensada para hacerle captura o guardarla como imagen.
// grupos: [{ titulo, nota, items: [{ nombre, cantidad, detalle, precio }], subtotal }]
export default function ListaGuardable({ titulo, subtitulo, grupos, total, cerrar }) {
  const [estado, setEstado] = useState('')
  const cantidad = grupos.reduce((n, g) => n + g.items.length, 0)
  // Con muchas cosas se achica la letra para que todo entre en la pantalla del celular.
  const tamano = cantidad > 22 ? 'chica' : cantidad > 14 ? 'media' : ''

  useEffect(() => {
    const alTeclear = (e) => e.key === 'Escape' && cerrar()
    window.addEventListener('keydown', alTeclear)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = ''
    }
  }, [cerrar])

  const guardar = async () => {
    setEstado('Preparando la imagen…')
    try {
      const lienzo = await dibujarLista({ titulo, subtitulo, grupos, total })
      const archivo = await new Promise((r) => lienzo.toBlob((b) => r(new File([b], `${nombreArchivo(titulo)}.png`, { type: 'image/png' })), 'image/png'))
      // En el celular se abre el menú de compartir (Guardar imagen, WhatsApp…); en la compu se descarga.
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: titulo })
        setEstado('')
      } else {
        const enlace = document.createElement('a')
        enlace.href = URL.createObjectURL(archivo)
        enlace.download = archivo.name
        enlace.click()
        setTimeout(() => URL.revokeObjectURL(enlace.href), 4000)
        setEstado('Imagen descargada.')
      }
    } catch (err) {
      setEstado(err?.name === 'AbortError' ? '' : 'No se pudo crear la imagen. Haz una captura de pantalla.')
    }
  }

  return (
    <div className="hoja" role="dialog" aria-modal="true" aria-label={`Lista: ${titulo}`}>
      <div className="hoja-barra">
        <button className="enlace" onClick={cerrar}>
          ← Volver
        </button>
        <span className="suave chico" aria-live="polite">
          {estado || 'Haz captura o guárdala como imagen'}
        </span>
        <button className="boton chico-boton" onClick={guardar}>
          Guardar imagen
        </button>
      </div>
      <article className={`hoja-papel ${tamano}`}>
        <header className="hoja-cab">
          <span>espaciococina</span>
          <span>{new Date().toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </header>
        <h1>{titulo}</h1>
        {subtitulo && <p className="hoja-sub">{subtitulo}</p>}
        {grupos.map((g) => (
          <section key={g.titulo} className="hoja-grupo">
            <div className="hoja-grupo-cab">
              <b>{g.titulo}</b>
              {g.subtotal && <span>{g.subtotal}</span>}
            </div>
            {g.nota && <p className="hoja-nota">{g.nota}</p>}
            <ol>
              {g.items.map((it, i) => (
                <li key={i}>
                  <span className="hoja-check" aria-hidden="true" />
                  <span>
                    {it.nombre}
                    {it.detalle && <small>{it.detalle}</small>}
                  </span>
                  <span className="hoja-cant">{it.precio ?? it.cantidad}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
        {total && (
          <div className="hoja-total">
            <span>Total</span>
            <b>{total}</b>
          </div>
        )}
      </article>
    </div>
  )
}

const nombreArchivo = (t) =>
  `lista-${t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)
    .replace(/^-|-$/g, '')}`

// Dibuja la lista en un lienzo de 1080 px de ancho (la medida de una historia de Instagram).
async function dibujarLista({ titulo, subtitulo, grupos, total }) {
  const MONO = '"IBM Plex Mono", ui-monospace, monospace'
  const TITULAR = '"Cutive Mono", "IBM Plex Mono", monospace'
  await Promise.all([document.fonts.load(`400 40px ${MONO}`), document.fonts.load(`500 40px ${MONO}`), document.fonts.load(`400 40px ${TITULAR}`)]).catch(() => {})
  const ANCHO = 1080
  const M = 72
  const PAPEL = '#eeece6'
  const TINTA = '#141414'
  const GRIS = '#6e6a63'
  const LINEA = '#cfcac0'

  // Primero se mide todo para saber qué alto tendrá la imagen.
  const medir = document.createElement('canvas').getContext('2d')
  const partir = (texto, fuente, ancho) => {
    medir.font = fuente
    const palabras = String(texto).split(' ')
    const lineas = []
    let actual = ''
    for (const p of palabras) {
      const prueba = actual ? `${actual} ${p}` : p
      if (medir.measureText(prueba).width > ancho && actual) {
        lineas.push(actual)
        actual = p
      } else actual = prueba
    }
    if (actual) lineas.push(actual)
    return lineas
  }
  const fTitulo = `400 76px ${TITULAR}`
  const fItem = `400 34px ${MONO}`
  const fDetalle = `400 24px ${MONO}`
  const fRotulo = `500 24px ${MONO}`
  const anchoTexto = ANCHO - M * 2
  const lineasTitulo = partir(titulo.toUpperCase(), fTitulo, anchoTexto)
  const lineasSub = subtitulo ? partir(subtitulo, fDetalle, anchoTexto) : []

  const bloques = grupos.map((g) => ({
    g,
    nota: g.nota ? partir(g.nota, fDetalle, anchoTexto) : [],
    items: g.items.map((it) => {
      const derecha = String(it.precio ?? it.cantidad ?? '')
      medir.font = fItem
      const anchoDerecha = medir.measureText(derecha).width
      return { it, derecha, nombre: partir(it.nombre, fItem, anchoTexto - 64 - anchoDerecha - 24), detalle: it.detalle ? partir(it.detalle, fDetalle, anchoTexto - 64) : [] }
    }),
  }))

  let alto = M + 40 + 40 + lineasTitulo.length * 80 + lineasSub.length * 34 + 30
  for (const b of bloques) {
    alto += 90 + b.nota.length * 34
    for (const i of b.items) alto += 28 + i.nombre.length * 44 + i.detalle.length * 32
  }
  if (total) alto += 130
  alto += M + 110

  const lienzo = document.createElement('canvas')
  lienzo.width = ANCHO
  lienzo.height = Math.max(1350, Math.ceil(alto))
  const c = lienzo.getContext('2d')
  c.fillStyle = PAPEL
  c.fillRect(0, 0, lienzo.width, lienzo.height)
  c.textBaseline = 'alphabetic'
  const linea = (y, color = LINEA, grosor = 2) => {
    c.fillStyle = color
    c.fillRect(M, y, anchoTexto, grosor)
  }

  let y = M + 24
  c.fillStyle = TINTA
  c.font = `400 34px ${TITULAR}`
  c.fillText('espaciococina', M, y)
  c.font = fDetalle
  c.fillStyle = GRIS
  const fecha = new Date().toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()
  c.fillText(fecha, ANCHO - M - c.measureText(fecha).width, y)
  y += 28
  linea(y, TINTA)
  y += 96

  c.fillStyle = TINTA
  c.font = fTitulo
  for (const l of lineasTitulo) {
    c.fillText(l, M, y)
    y += 80
  }
  c.font = fDetalle
  c.fillStyle = GRIS
  for (const l of lineasSub) {
    c.fillText(l, M, y - 20)
    y += 34
  }
  y += 10

  for (const b of bloques) {
    linea(y, TINTA)
    y += 46
    c.font = fRotulo
    c.fillStyle = TINTA
    c.fillText(b.g.titulo.toUpperCase(), M, y)
    if (b.g.subtotal) c.fillText(b.g.subtotal, ANCHO - M - c.measureText(b.g.subtotal).width, y)
    y += 44
    c.font = fDetalle
    c.fillStyle = GRIS
    for (const l of b.nota) {
      c.fillText(l, M, y - 8)
      y += 34
    }
    b.items.forEach((i, n) => {
      y += 44
      // casilla para marcar en la tienda
      c.strokeStyle = TINTA
      c.lineWidth = 2
      c.strokeRect(M + 1, y - 28, 28, 28)
      c.font = fItem
      c.fillStyle = TINTA
      i.nombre.forEach((l, k) => c.fillText(l, M + 64, y + k * 44))
      c.fillText(i.derecha, ANCHO - M - c.measureText(i.derecha).width, y)
      y += (i.nombre.length - 1) * 44
      c.font = fDetalle
      c.fillStyle = GRIS
      i.detalle.forEach((l) => {
        y += 32
        c.fillText(l, M + 64, y)
      })
      y += 28
      if (n < b.items.length - 1) linea(y - 10)
    })
    y += 10
  }

  if (total) {
    linea(y, TINTA)
    y += 80
    c.font = fRotulo
    c.fillStyle = TINTA
    c.fillText('TOTAL', M, y)
    c.font = `400 64px ${TITULAR}`
    c.fillText(total, ANCHO - M - c.measureText(total).width, y + 4)
    y += 40
  }

  c.font = fDetalle
  c.fillStyle = GRIS
  c.fillText('Tu asistente de cocina · espaciococina.onrender.com', M, lienzo.height - M + 10)
  return lienzo
}
