import { useState } from 'react'
import { urlFoto, colorFoto, claveIngrediente } from '../lib/fotos.js'

// src: una foto propia (por ejemplo, la de una receta); si no, la de la clave del catálogo de fotos.
export function Foto({ clave, src, rotulo, como: Etiqueta = 'div', ancho = 800, className = '', style, children, ...resto }) {
  return (
    <Etiqueta
      className={`foto ${className}`}
      style={{ backgroundImage: `url(${src ?? urlFoto(clave, ancho)})`, backgroundColor: colorFoto(clave), ...style }}
      {...resto}
    >
      {rotulo && <span className="rotulo-foto">{rotulo}</span>}
      {children}
    </Etiqueta>
  )
}

// Collage 2×2 de ingredientes con rótulos grandes, como los afiches de comida.
export function Mosaico({ piezas, ancho = 600 }) {
  return (
    <div className="mosaico">
      {piezas.map((p) => (
        <Foto
          key={p.clave + p.rotulo}
          clave={p.clave}
          rotulo={p.rotulo}
          ancho={ancho}
          como={p.onClick ? 'button' : 'div'}
          onClick={p.onClick}
          aria-label={p.onClick ? p.rotulo : undefined}
        />
      ))}
    </div>
  )
}

export function Miniatura({ categoria, nombre }) {
  const clave = claveIngrediente(nombre, categoria)
  return <span className="miniatura" style={{ backgroundImage: `url(${urlFoto(clave, 120)})`, backgroundColor: colorFoto(clave) }} aria-hidden="true" />
}

const PIEZAS_CARGA = [
  { clave: 'tomate', rotulo: '' },
  { clave: 'cebolla', rotulo: '' },
  { clave: 'hierbas', rotulo: '' },
  { clave: 'especias', rotulo: '' },
]

export function Cargando({ titulo, detalle }) {
  return (
    <div className="cargando" role="status" aria-live="polite">
      <Mosaico piezas={PIEZAS_CARGA} ancho={300} />
      <h2>{titulo}</h2>
      {detalle && <p className="suave">{detalle}</p>}
    </div>
  )
}

export function Aviso({ tipo = '', icono, children }) {
  return (
    <div className={`aviso ${tipo}`} role={tipo === 'error' ? 'alert' : undefined}>
      {icono && <span aria-hidden="true">{icono}</span>}
      <div>{children}</div>
    </div>
  )
}

export function Chips({ opciones, elegidos, onCambio }) {
  const alternar = (id) => onCambio(elegidos.includes(id) ? elegidos.filter((x) => x !== id) : [...elegidos, id])
  return (
    <div className="chips">
      {opciones.map((o) => (
        <button type="button" key={o.id} className="chip" aria-pressed={elegidos.includes(o.id)} onClick={() => alternar(o.id)}>
          {o.nombre}
        </button>
      ))}
    </div>
  )
}

export const PASOS_FLUJO = [
  { id: 'confirmar', nombre: 'Ingredientes' },
  { id: 'receta', nombre: 'Receta' },
  { id: 'compras', nombre: 'Compras' },
  { id: 'sobrantes', nombre: 'Sobrantes' },
  { id: 'cocinemos', nombre: 'Cocinemos' },
]

export function Flujo({ actual, sesion, ir }) {
  const disponible = (id) => (id === 'confirmar' ? Boolean(sesion?.extraida) : Boolean(sesion?.adaptada))
  return (
    <nav className="flujo" aria-label="Pasos de la receta">
      {PASOS_FLUJO.map((p, i) => (
        <button key={p.id} disabled={!disponible(p.id)} aria-current={actual === p.id ? 'step' : undefined} onClick={() => ir(p.id)}>
          <span className="num">{String(i + 1).padStart(2, '0')}</span>
          {p.nombre}
        </button>
      ))}
    </nav>
  )
}

// porcion: { singular, plural } cuando la receta rinde unidades (galletas, muffins…).
export function textoPorciones(n, porcion) {
  if (porcion) return n === 1 ? porcion.singular : porcion.plural
  return n === 1 ? 'porción' : 'porciones'
}

export function SelectorPorciones({ valor, onCambio, porcion, min = 1, max = 60 }) {
  return (
    <div className="porciones" role="group" aria-label={porcion ? `Cantidad de ${porcion.plural}` : 'Porciones'}>
      <button type="button" className="boton-icono" onClick={() => onCambio(valor - 1)} disabled={valor <= min} aria-label="Una porción menos">
        −
      </button>
      <span aria-live="polite">
        <b>{valor}</b> {textoPorciones(valor, porcion)}
      </span>
      <button type="button" className="boton-icono" onClick={() => onCambio(valor + 1)} disabled={valor >= max} aria-label="Una porción más">
        +
      </button>
    </div>
  )
}

// Estrellas de 1 a 5. Con onCambio se pueden elegir; sin él solo se muestran.
export function Estrellas({ valor = 0, onCambio, tamano = '1.1rem', etiqueta = 'Calificación' }) {
  const [encima, setEncima] = useState(0)
  const mostrado = encima || valor
  if (!onCambio) {
    return (
      <span className="estrellas" style={{ fontSize: tamano }} aria-label={`${valor} de 5 estrellas`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={n <= Math.round(valor) ? 'llena' : ''} aria-hidden="true">
            ★
          </span>
        ))}
      </span>
    )
  }
  return (
    <span className="estrellas elegibles" style={{ fontSize: tamano }} role="radiogroup" aria-label={etiqueta} onMouseLeave={() => setEncima(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={valor === n}
          aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
          className={n <= mostrado ? 'llena' : ''}
          onMouseEnter={() => setEncima(n)}
          onClick={() => onCambio(n)}
        >
          ★
        </button>
      ))}
    </span>
  )
}
