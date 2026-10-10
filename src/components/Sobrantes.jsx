import { useState } from 'react'
import { enviar } from '../lib/api.js'
import { calcularSobrantes, formatoCantidad, formatoDinero, listaElegida } from '../lib/compras.js'
import { Aviso, Cargando, Foto, Miniatura } from './comunes.jsx'
import { claveIngrediente } from '../lib/fotos.js'

export default function Sobrantes({ sesion, perfil, actualizar, agregarARefri, ir, onCocinar }) {
  const sobrantes = calcularSobrantes(listaElegida(sesion, perfil))
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const ideas = sesion.ideasSobrantes
  const guardados = Boolean(sesion.sobrantesEnRefri)

  const pedirIdeas = async () => {
    setError('')
    setCargando(true)
    try {
      const respuesta = await enviar('/api/sobrantes', {
        sobrantes: sobrantes.map(({ nombre, categoria }) => ({ nombre, categoria })),
        usuario: perfil,
      })
      actualizar({ ideasSobrantes: respuesta.datos })
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  const guardarEnRefri = () => {
    agregarARefri(
      sobrantes.map((s) => ({
        nombre: s.nombre,
        cantidad: s.cantidad,
        unidad: s.unidad,
        origen: sesion.adaptada.titulo,
      })),
    )
    actualizar({ sobrantesEnRefri: true })
  }

  const valorTotal = sobrantes.reduce((s, x) => s + x.valor, 0)

  return (
    <>
      <span className="sobretitulo">N.º 04 — Nada se pierde</span>
      <h1>Lo que te va a sobrar</h1>
      <p className="suave">Los productos se venden en presentaciones (una bolsa de 1 kg, un atado). Esto es lo que quedará después de cocinar.</p>

      {sobrantes.length === 0 ? (
        <div className="tarjeta vacio">
          <h2>Casi no te sobra nada</h2>
          <p>Compraste justo lo que la receta necesita.</p>
          <button className="boton" onClick={() => ir('cocinemos')}>
            Cocinemos
          </button>
        </div>
      ) : (
        <>
          <section className="tarjeta">
            <div className="fila entre">
              <h2 style={{ margin: 0 }}>Sobrantes</h2>
              <span className="etiqueta verde" title="Lo que pagaste por la parte que sobra">
                Valen ≈ {formatoDinero(valorTotal, perfil)}
              </span>
            </div>
            <ul className="lista" style={{ marginTop: 8 }}>
              {sobrantes.map((s) => (
                <li key={s.nombre} className="item-ing">
                  <Miniatura categoria={s.categoria} nombre={s.nombre} />
                  <div>
                    <b>{s.nombre}</b>
                    <div className="suave chico">Compras {formatoCantidad(s.comprado, s.unidad)}</div>
                  </div>
                  <div className="cant">{formatoCantidad(s.cantidad, s.unidad)}</div>
                </li>
              ))}
            </ul>
            <div className="fila" style={{ marginTop: 12 }}>
              <button className="boton negro" onClick={guardarEnRefri} disabled={guardados}>
                {guardados ? '✓ Guardados en Mi refri' : 'Guardar en Mi refri'}
              </button>
              {guardados && (
                <button className="boton fantasma" onClick={() => ir('refri')}>
                  Ver Mi refri
                </button>
              )}
            </div>
          </section>

          {error && (
            <Aviso tipo="error" icono="⚠️">
              <p>{error}</p>
            </Aviso>
          )}

          {cargando ? (
            <Cargando titulo="Buscando recetas" detalle="Buscando recetas fáciles con lo que te sobra…" />
          ) : ideas ? (
            <>
              <span className="sobretitulo">Ideas para reusar</span>
              <div className="grilla-2">
                {ideas.ideas.map((idea, i) => (
                  <section key={idea.id ?? i} className="tarjeta" style={{ padding: 0, overflow: 'hidden' }}>
                    <Foto src={idea.imagen} clave={fotoIdea(idea, sobrantes, i)} style={{ aspectRatio: '16 / 8', borderRadius: 0 }} rotulo={idea.titulo} ancho={900} />
                    <div style={{ padding: 18 }}>
                      <div className="fila" style={{ gap: 6, marginBottom: 8 }}>
                        {idea.usa.map((u) => (
                          <span key={u} className="etiqueta verde">
                            Usa: {u}
                          </span>
                        ))}
                      </div>
                      <p>{idea.descripcion}</p>
                      <div className="fila" style={{ gap: 6 }}>
                        {idea.receta && (
                          <button className="boton chico-boton" onClick={() => onCocinar(idea.receta)}>
                            Cocinar esta
                          </button>
                        )}
                        {idea.fuente && (
                          <a className="boton secundario chico-boton" href={idea.fuente} target="_blank" rel="noreferrer">
                            Receta original
                          </a>
                        )}
                      </div>
                    </div>
                  </section>
                ))}
              </div>
              {ideas.consejos_conservacion.length > 0 && (
                <section className="tarjeta">
                  <h2>Cómo guardarlos</h2>
                  <ul className="lista">
                    {ideas.consejos_conservacion.map((c, i) => (
                      <li key={i}>
                        <div className="fila entre">
                          <b>{c.ingrediente}</b>
                          <span className="etiqueta verde">Hasta {c.dura_dias} días</span>
                        </div>
                        <div className="motivo">{c.consejo}</div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          ) : (
            <Foto clave="crema" className="afiche-banda" style={{ minHeight: 200, marginBottom: 16, alignItems: 'center', justifyContent: 'center' }}>
              <h2 style={{ color: '#fff', textAlign: 'center' }}>¿Qué hago con esto?</h2>
              <button className="boton blanco" onClick={pedirIdeas}>
                Buscar recetas
              </button>
            </Foto>
          )}
        </>
      )}

      <div className="pie-accion">
        <button className="boton grande" onClick={() => ir('cocinemos')}>
          Cocinemos
        </button>
      </div>
    </>
  )
}

function fotoIdea(idea, sobrantes, i) {
  const usado = sobrantes.find((x) => idea.usa.includes(x.nombre))
  if (usado) return claveIngrediente(usado.nombre, usado.categoria)
  return claveIngrediente(idea.usa[0] ?? '', ['hierbas', 'limon', 'especias'][i % 3])
}
