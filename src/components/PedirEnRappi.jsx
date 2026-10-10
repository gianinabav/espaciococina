import { useEffect, useState } from 'react'
import { formatoCantidad, linkRappi } from '../lib/compras.js'

// Pedido en Rappi producto por producto: cada fila abre Rappi (Turbo en Perú) en ese producto.
// Lo que ya se abrió queda tachado, para saber por dónde se va.
export default function PedirEnRappi({ items, perfil, titulo, cerrar }) {
  const [abiertos, setAbiertos] = useState({})
  const [copiado, setCopiado] = useState(false)
  const turbo = perfil.pais === 'PE'

  useEffect(() => {
    const alTeclear = (e) => e.key === 'Escape' && cerrar()
    window.addEventListener('keydown', alTeclear)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = ''
    }
  }, [cerrar])

  // Para comprar, lo que va por unidad se redondea hacia arriba (4 dientes de ajo = 1 cabeza).
  const necesitas = (it) => (!it.cantidad ? 'un poco' : it.unidad === 'unidad' ? formatoCantidad(Math.ceil(it.cantidad - 1e-9), it.unidad) : formatoCantidad(it.cantidad, it.unidad))
  const copiar = async () => {
    const texto = [`Lista: ${titulo}`, ...items.map((it) => `☐ ${it.nombre} · ${necesitas(it)}`)].join('\n')
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      window.prompt('Copia la lista:', texto)
    }
  }
  const listos = Object.values(abiertos).filter(Boolean).length

  return (
    <div className="hoja" role="dialog" aria-modal="true" aria-label={`Pedir en Rappi: ${titulo}`}>
      <div className="hoja-barra">
        <button className="enlace" onClick={cerrar}>
          ← Volver
        </button>
        <span className="suave chico" aria-live="polite">
          {listos}/{items.length} abiertos
        </span>
        <button className="boton secundario chico-boton" onClick={copiar}>
          {copiado ? 'Copiada' : 'Copiar lista'}
        </button>
      </div>
      <article className="hoja-papel">
        <header className="hoja-cab">
          <span>espaciococina</span>
          <span>{turbo ? 'Rappi Turbo' : 'Rappi'}</span>
        </header>
        <h1>Pide en {turbo ? 'Rappi Turbo' : 'Rappi'}</h1>
        <p className="hoja-sub">
          Toca cada producto: se abre {turbo ? 'Turbo' : 'Rappi'} justo en ese producto. Agrégalo al carrito, vuelve aquí y toca el siguiente. Al final pagas en Rappi.
        </p>
        <section className="hoja-grupo">
          <div className="hoja-grupo-cab">
            <b>{titulo}</b>
            <span>{items.length} productos</span>
          </div>
          <ol className="rappi-lista">
            {items.map((it) => {
              const termino = it.buscar ?? it.nombre
              const hecho = abiertos[it.indice]
              return (
                <li key={it.indice} className={hecho ? 'hecho' : ''}>
                  <a href={linkRappi(termino, perfil.pais)} target="_blank" rel="noreferrer" onClick={() => setAbiertos((a) => ({ ...a, [it.indice]: true }))}>
                    <span className="hoja-check" aria-hidden="true" />
                    <span>
                      {it.nombre}
                      <small>Necesitas {necesitas(it)}</small>
                    </span>
                    <span className="hoja-cant">{hecho ? 'Abierto ✓' : 'Abrir →'}</span>
                  </a>
                </li>
              )
            })}
          </ol>
        </section>
        <p className="hoja-nota" style={{ marginTop: 14 }}>
          Si no tienes la app de Rappi, cada producto se abre en su web. Rappi no permite llenar el carrito de una sola vez desde otra app.
        </p>
      </article>
    </div>
  )
}
