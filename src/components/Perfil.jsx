import { useState } from 'react'
import { PAISES, IDIOMAS, DIETAS, OBJETIVOS, IMPLEMENTOS } from '../lib/datos.js'
import { Chips, Mosaico } from './comunes.jsx'

export const PERFIL_INICIAL = {
  alias: '',
  pais: 'PE',
  zona: '',
  idioma: 'es',
  presupuesto: 60,
  personas: 4,
  dietas: [],
  alergias: '',
  objetivo: 'rico_simple',
  implementos: ['cocina', 'olla', 'sarten'],
}

export default function Perfil({ perfil, primeraVez, onGuardar }) {
  const [p, setP] = useState(perfil ?? PERFIL_INICIAL)
  const [ubicando, setUbicando] = useState('')
  const cambiar = (campo) => (e) => setP({ ...p, [campo]: e.target.value, ...(campo === 'zona' && { lat: null, lon: null }) })

  // Ubicación exacta del navegador (opcional): sirve para encontrar las tiendas más cercanas.
  const usarUbicacion = () => {
    if (!navigator.geolocation) return setUbicando('Tu navegador no permite compartir la ubicación.')
    setUbicando('Buscando tu ubicación…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setP((x) => ({ ...x, lat: Math.round(pos.coords.latitude * 1e4) / 1e4, lon: Math.round(pos.coords.longitude * 1e4) / 1e4 }))
        setUbicando('')
      },
      () => setUbicando('No se pudo obtener tu ubicación. Escribe tu zona.'),
      { timeout: 10000 },
    )
  }
  const pais = PAISES[p.pais]

  const enviar = (e) => {
    e.preventDefault()
    onGuardar({
      ...p,
      zona: p.zona.trim(),
      alias: (p.alias ?? '').trim().slice(0, 40),
      presupuesto: Math.max(0, Number(p.presupuesto) || 0),
      personas: Math.min(20, Math.max(1, Math.round(Number(p.personas) || 1))),
    })
  }

  return (
    <form onSubmit={enviar}>
      {primeraVez ? (
        <div className="portada">
          <div className="portada-texto">
            <div>
              <span className="sobretitulo">Bienvenida · Paso 1 de 1</span>
              <h1>Cuéntanos cómo cocinas</h1>
              <p>Con esto adaptamos cada receta a tu país, tu bolsillo, tu dieta y lo que tienes en la cocina. Lo puedes cambiar cuando quieras.</p>
            </div>
          </div>
          <Mosaico
            piezas={[
              { clave: 'especias', rotulo: 'Tu país' },
              { clave: 'limon', rotulo: 'Tu bolsillo' },
              { clave: 'palta', rotulo: 'Tu dieta' },
              { clave: 'papa', rotulo: 'Tu cocina' },
            ]}
          />
        </div>
      ) : (
        <>
          <span className="sobretitulo">Mi perfil</span>
          <h1>Así cocinas</h1>
        </>
      )}

      <section className="tarjeta pila">
        <h2>Quién eres</h2>
        <label className="campo">
          <span>Tu nombre en el recetario</span>
          <input type="text" maxLength={40} value={p.alias ?? ''} onChange={cambiar('alias')} placeholder="Ej.: Gianina" />
          <small>Se muestra junto a las recetas, fotos y reseñas que compartas. Si lo dejas vacío, aparecerás como “Anónimo”.</small>
        </label>
      </section>

      <section className="tarjeta pila">
        <h2>Dónde estás</h2>
        <div className="grilla-2">
          <label className="campo">
            <span>País</span>
            <select value={p.pais} onChange={cambiar('pais')}>
              {Object.entries(PAISES).map(([id, x]) => (
                <option key={id} value={id}>
                  {x.nombre}
                </option>
              ))}
            </select>
          </label>
          <div className="campo">
            <label className="campo" htmlFor="zona">
              <span>Zona, distrito o barrio</span>
            </label>
            <input id="zona" type="text" value={p.zona} onChange={cambiar('zona')} placeholder="Ej.: Miraflores, Lima" />
            <small>
              {p.lat != null ? '📍 Usando tu ubicación exacta para buscar tiendas. ' : 'Con la zona y la ciudad buscamos las tiendas cerca. '}
              <button type="button" className="boton fantasma" style={{ minHeight: 0, padding: '2px 4px' }} onClick={usarUbicacion}>
                {p.lat != null ? 'Actualizar ubicación' : 'Usar mi ubicación'}
              </button>
            </small>
            {ubicando && <small>{ubicando}</small>}
          </div>
          <label className="campo">
            <span>Idioma de las recetas</span>
            <select value={p.idioma} onChange={cambiar('idioma')}>
              {Object.entries(IDIOMAS).map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="tarjeta pila">
        <h2>Tu bolsillo y tu mesa</h2>
        <div className="grilla-2">
          <label className="campo">
            <span>Presupuesto por receta</span>
            <div className="con-prefijo">
              <b>{pais.simbolo}</b>
              <input type="number" min="0" step="any" inputMode="decimal" value={p.presupuesto} onChange={cambiar('presupuesto')} />
            </div>
            <small>En {pais.moneda}. Lo usamos para armar tus listas de compras.</small>
          </label>
          <label className="campo">
            <span>¿Para cuántas personas cocinas?</span>
            <input type="number" min="1" max="20" inputMode="numeric" value={p.personas} onChange={cambiar('personas')} />
          </label>
        </div>
      </section>

      <section className="tarjeta pila">
        <h2>Cómo quieres comer</h2>
        <div className="campo">
          <span>Objetivo</span>
          <div className="opciones">
            {OBJETIVOS.map((o) => (
              <button type="button" key={o.id} className="opcion" aria-pressed={p.objetivo === o.id} onClick={() => setP({ ...p, objetivo: o.id })}>
                {o.nombre}
              </button>
            ))}
          </div>
        </div>
        <div className="campo">
          <span>Dieta</span>
          <Chips opciones={DIETAS} elegidos={p.dietas} onCambio={(dietas) => setP({ ...p, dietas })} />
          <small>Si no marcas nada, comes de todo.</small>
        </div>
        <label className="campo">
          <span>Alergias o cosas que no comes</span>
          <input type="text" value={p.alergias} onChange={cambiar('alergias')} placeholder="Ej.: maní, culantro" />
        </label>
      </section>

      <section className="tarjeta pila">
        <h2>Tu cocina</h2>
        <div className="campo">
          <span>Implementos que tienes</span>
          <Chips opciones={IMPLEMENTOS} elegidos={p.implementos} onCambio={(implementos) => setP({ ...p, implementos })} />
          <small>Si una receta pide algo que no tienes (por ejemplo, horno), la adaptamos.</small>
        </div>
      </section>

      <div className="pie-accion">
        <button className="boton grande" type="submit">
          {primeraVez ? 'Guardar y empezar' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
