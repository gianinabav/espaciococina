import { useState } from 'react'
import { enviar } from '../lib/api.js'
import { formatoCantidad } from '../lib/compras.js'
import { Aviso, Cargando, Foto, Mosaico } from './comunes.jsx'
import { fotoPlato } from '../lib/fotos.js'

const diasHasta = (fecha) => (fecha ? Math.ceil((new Date(`${fecha}T23:59:59`) - new Date()) / 86400000) : null)

export default function MiRefri({ refri, setRefri, perfil, agregarARefri, onCocinar }) {
  const [nuevo, setNuevo] = useState({ nombre: '', cantidad: '', unidad: 'g', vence: '' })
  const [sugerencias, setSugerencias] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const ordenada = [...refri].sort((a, b) => (a.vence || '9999').localeCompare(b.vence || '9999'))

  const agregar = (e) => {
    e.preventDefault()
    if (!nuevo.nombre.trim()) return
    agregarARefri([{ ...nuevo, nombre: nuevo.nombre.trim(), cantidad: Number(nuevo.cantidad) || 0 }])
    setNuevo({ nombre: '', cantidad: '', unidad: nuevo.unidad, vence: '' })
  }

  const pedirRecetas = async () => {
    setError('')
    setCargando(true)
    try {
      const items = ordenada.map((i) => ({
        nombre: i.nombre,
        cantidad: i.cantidad ? formatoCantidad(i.cantidad, i.unidad) : '',
        vence: i.vence,
      }))
      const respuesta = await enviar('/api/refri', { items, usuario: perfil })
      setSugerencias(respuesta.datos)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      <span className="sobretitulo">Mi refri</span>
      <h1>Lo que ya tienes</h1>
      <p className="suave">Lo que guardes aquí se descuenta de tus compras, y te proponemos recetas para usarlo antes de que se malogre.</p>

      <form className="tarjeta" onSubmit={agregar}>
        <h2>Agregar</h2>
        <div className="grilla-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <label className="campo" style={{ gridColumn: 'span 2' }}>
            <span>Ingrediente</span>
            <input type="text" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Ej.: huevos" />
          </label>
          <label className="campo">
            <span>Cantidad</span>
            <input type="number" min="0" step="any" value={nuevo.cantidad} onChange={(e) => setNuevo({ ...nuevo, cantidad: e.target.value })} />
          </label>
          <label className="campo">
            <span>Unidad</span>
            <select value={nuevo.unidad} onChange={(e) => setNuevo({ ...nuevo, unidad: e.target.value })}>
              <option value="g">gramos</option>
              <option value="ml">mililitros</option>
              <option value="unidad">unidades</option>
            </select>
          </label>
          <label className="campo">
            <span>Vence</span>
            <input type="date" value={nuevo.vence} onChange={(e) => setNuevo({ ...nuevo, vence: e.target.value })} />
          </label>
        </div>
        <button className="boton negro" type="submit" style={{ marginTop: 14 }} disabled={!nuevo.nombre.trim()}>
          Agregar a Mi refri
        </button>
      </form>

      {refri.length === 0 ? (
        <div style={{ marginBottom: 16 }}>
          <Mosaico
            piezas={[
              { clave: 'huevo', rotulo: 'Huevos' },
              { clave: 'cebolla', rotulo: 'Cebolla' },
              { clave: 'pasta_arroz', rotulo: 'Arroz' },
              { clave: 'papa', rotulo: 'Papas' },
            ]}
          />
          <p className="suave centro" style={{ marginTop: 12 }}>
            Tu refri está vacía. Agrega lo que tienes o guarda los sobrantes de una receta.
          </p>
        </div>
      ) : (
        <section className="tarjeta">
          <div className="fila entre">
            <h2 style={{ margin: 0 }}>En tu refri</h2>
            <span className="etiqueta">{refri.length}</span>
          </div>
          <ul className="lista" style={{ marginTop: 8 }}>
            {ordenada.map((item) => {
              const dias = diasHasta(item.vence)
              return (
                <li key={item.id} className="fila entre" style={{ flexWrap: 'nowrap' }}>
                  <div>
                    <b>{item.nombre}</b>
                    <div className="fila" style={{ gap: 6, marginTop: 4 }}>
                      {item.cantidad > 0 && <span className="etiqueta">{formatoCantidad(item.cantidad, item.unidad)}</span>}
                      {dias !== null && (
                        <span className={`etiqueta ${dias <= 2 ? 'ladrillo' : 'verde'}`}>{dias < 0 ? 'Vencido' : dias === 0 ? 'Vence hoy' : `Vence en ${dias} d`}</span>
                      )}
                      {item.origen && <span className="etiqueta">Sobró de {item.origen.length > 24 ? `${item.origen.slice(0, 23)}…` : item.origen}</span>}
                    </div>
                  </div>
                  <button className="boton-icono" onClick={() => setRefri(refri.filter((x) => x.id !== item.id))} aria-label={`Quitar ${item.nombre}`} title="Quitar">
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {error && (
        <Aviso tipo="error" icono="⚠️">
          <p>{error}</p>
        </Aviso>
      )}

      {cargando ? (
        <Cargando titulo="Buscando recetas" detalle="Con lo que tienes en tu refri…" />
      ) : sugerencias ? (
        <>
          <span className="sobretitulo">Puedes cocinar</span>
          <div className="grilla-2">
            {sugerencias.recetas.map((r, i) => (
              <section key={i} className="tarjeta" style={{ padding: 0, overflow: 'hidden' }}>
                <Foto src={r.imagen} clave={fotoPlato(r.titulo, ['plato_ensalada', 'plato_arroz', 'plato_sopa'][i % 3])} style={{ aspectRatio: '16 / 8', borderRadius: 0 }} rotulo={r.titulo} ancho={900} />
                <div style={{ padding: 18 }}>
                  <p>{r.por_que}</p>
                  <div className="fila" style={{ gap: 6, marginBottom: 8 }}>
                    <span className="etiqueta">Recetario TheMealDB</span>
                  </div>
                  <p className="chico">
                    <b>Usa:</b> {r.usa.join(', ')}
                    {r.falta.length > 0 && (
                      <>
                        <br />
                        <b>Te falta:</b> {r.falta.join(', ')}
                      </>
                    )}
                  </p>
                  <div className="fila" style={{ gap: 6 }}>
                    <button className="boton" onClick={() => onCocinar(r)}>
                      Cocinar esta
                    </button>
                    {r.fuente && (
                      <a className="boton secundario chico-boton" href={r.fuente} target="_blank" rel="noreferrer">
                        Receta original
                      </a>
                    )}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
        refri.length > 0 && (
          <Foto clave="especias" className="afiche-banda" style={{ minHeight: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <h2 style={{ color: '#fff', textAlign: 'center' }}>¿Qué cocino hoy?</h2>
            <button className="boton blanco" onClick={pedirRecetas}>
              Recetas con mi refri
            </button>
          </Foto>
        )
      )}
    </>
  )
}
