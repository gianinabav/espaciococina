import { useEffect, useState } from 'react'
import { obtener } from '../lib/api.js'
import { fotoPlato } from '../lib/fotos.js'
import { Aviso, Estrellas, Foto, textoPorciones } from './comunes.jsx'

const ORDENES = [
  { id: 'recientes', nombre: 'Recientes' },
  { id: 'mejores', nombre: 'Mejor calificadas' },
  { id: 'mias', nombre: 'Mis recetas' },
]

export default function Recetario({ abrirFicha, ir }) {
  const [orden, setOrden] = useState('recientes')
  const [busqueda, setBusqueda] = useState('')
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true
    const espera = setTimeout(() => {
      const params = new URLSearchParams({ q: busqueda, orden: orden === 'mias' ? 'recientes' : orden, ...(orden === 'mias' && { mias: '1' }) })
      obtener(`/api/biblioteca?${params}`)
        .then((d) => vigente && (setDatos(d), setError('')))
        .catch((err) => vigente && setError(err.message))
    }, 250)
    return () => {
      vigente = false
      clearTimeout(espera)
    }
  }, [orden, busqueda])

  return (
    <>
      <span className="sobretitulo">Recetario de la comunidad</span>
      <h1>Recetas que ya se cocinaron</h1>
      <p className="suave">Cada receta que alguien lee y adapta en espaciococina queda aquí. Califícalas, sube fotos de cómo te quedaron y edita las tuyas.</p>

      <div className="buscador">
        <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Busca por nombre, ingrediente o autor…" aria-label="Buscar en el recetario" />
        <div className="pestanas" role="tablist" style={{ margin: 0 }}>
          {ORDENES.map((o) => (
            <button key={o.id} role="tab" aria-selected={orden === o.id} onClick={() => setOrden(o.id)}>
              {o.nombre}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Aviso tipo="error" icono="⚠️">
          <p>{error}</p>
        </Aviso>
      )}

      {datos && datos.recetas.length === 0 && (
        <div className="tarjeta vacio">
          <h2>{busqueda ? 'No encontramos recetas con eso' : orden === 'mias' ? 'Todavía no agregaste recetas' : 'El recetario está vacío'}</h2>
          <p>Cuando adaptas una receta, se guarda aquí automáticamente para que otros la cocinen y la califiquen.</p>
          <button className="boton" onClick={() => ir('nueva')}>
            Cargar una receta
          </button>
        </div>
      )}

      {datos && datos.recetas.length > 0 && (
        <>
          <p className="suave chico">
            {datos.recetas.length} {datos.recetas.length === 1 ? 'receta' : 'recetas'}
            {busqueda || orden === 'mias' ? ` de ${datos.total}` : ''}
          </p>
          <div className="grilla-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))' }}>
            {datos.recetas.map((r) => (
              <button key={r.id} className="tarjeta-recetario" onClick={() => abrirFicha(r.id)}>
                <Foto src={r.foto ?? undefined} clave={fotoPlato(r.titulo)} ancho={700}>
                  {r.esMia && (
                    <span className="etiqueta negra" style={{ position: 'absolute', top: 12, left: 12 }}>
                      Tuya
                    </span>
                  )}
                </Foto>
                <div className="cuerpo">
                  <h3>{r.titulo}</h3>
                  <div className="fila" style={{ gap: 6 }}>
                    <Estrellas valor={r.calificacion.promedio} tamano="0.95rem" />
                    <span className="suave chico">{r.calificacion.total ? `${r.calificacion.promedio} · ${r.calificacion.total} ${r.calificacion.total === 1 ? 'reseña' : 'reseñas'}` : 'Sin reseñas'}</span>
                  </div>
                  <span className="suave chico">
                    Por {r.autor.alias} · rinde {r.porciones} {textoPorciones(r.porciones, r.porcion)}
                    {r.nfotos ? ` · ${r.nfotos} ${r.nfotos === 1 ? 'foto' : 'fotos'}` : ''}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}
