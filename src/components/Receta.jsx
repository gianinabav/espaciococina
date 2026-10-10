import { useState } from 'react'
import { enviar } from '../lib/api.js'
import { Aviso, Cargando, Foto, Miniatura, SelectorPorciones, textoPorciones } from './comunes.jsx'
import { categoriaPrincipal } from './Inicio.jsx'
import ListaGuardable from './ListaGuardable.jsx'

const ICONOS_CAMBIO = {
  medidas: '⚖️',
  dieta: '🥗',
  implementos: '🍳',
  idioma: '🌎',
  objetivo: '🎯',
  porciones: '👥',
  ingredientes: '🔁',
}

export default function Receta({ sesion, perfil, ir, compartir, cambiarPorciones, onAdaptada, abrirFicha }) {
  const r = sesion.adaptada
  const n = r.nutricion_por_porcion
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [verLista, setVerLista] = useState(false)

  // Vuelve a adaptar la receta original con las porciones nuevas (cantidades redondas y tiempos).
  const readaptar = async () => {
    setError('')
    setCargando(true)
    try {
      const usuario = { ...perfil, personas: r.porciones }
      const respuesta = await enviar('/api/adaptar', { receta: sesion.confirmada, usuario })
      onAdaptada({ confirmada: sesion.confirmada, adaptada: respuesta.datos, porciones: r.porciones, demo: false })
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  if (cargando) return <Cargando titulo={`Recalculando para ${r.porciones}`} detalle="Ajustando cantidades y medidas…" />

  return (
    <>
      <article className="afiche">
        <div className="afiche-titulo">
          <div>
            <span className="sobretitulo">N.º 02 — Tu receta adaptada</span>
            <h1>{r.titulo}</h1>
            {r.descripcion && <p className="lema">{r.descripcion}</p>}
          </div>
          <div>
            <div className="atributos">
              <span>
                {r.porciones} {textoPorciones(r.porciones, r.porcion)}
              </span>
              {r.peso_porcion_g > 0 && <span>{r.peso_porcion_g} g c/u</span>}
              <span>{Math.round(n.calorias)} kcal c/u</span>
              <span>{r.tiempo_total_min} min</span>
            </div>
            <div className="porciones-fila">
              <SelectorPorciones valor={r.porciones} onCambio={cambiarPorciones} porcion={r.porcion} />
              <span className="fila" style={{ gap: 18 }}>
                <button className="enlace" onClick={() => setVerLista(true)}>
                  Lista de ingredientes
                </button>
                <button className="enlace" onClick={() => ir('cocinemos')}>
                  Cocinar ahora
                </button>
              </span>
            </div>
          </div>
        </div>
        <Foto clave={categoriaPrincipal(sesion)} className="afiche-banda" ancho={1200} />
      </article>

      {sesion.bibliotecaId && (
        <Aviso tipo="ok" icono="★">
          <p>
            {sesion.bibliotecaNueva === false || sesion.fuente === 'recetario' ? 'Esta receta está en el recetario de la comunidad.' : 'La agregamos al recetario de la comunidad.'}{' '}
            <button className="boton fantasma" style={{ minHeight: 0, padding: '2px 4px' }} onClick={() => abrirFicha(sesion.bibliotecaId)}>
              Calificarla y subir fotos
            </button>
          </p>
        </Aviso>
      )}
      {error && (
        <Aviso tipo="error" icono="⚠️">
          <p>{error}</p>
        </Aviso>
      )}
      {r.escaladaDesde && (
        <Aviso icono="👥">
          <p>
            Ajustamos los ingredientes y la compra de {r.escaladaDesde} a{' '}
            <b>
              {r.porciones} {textoPorciones(r.porciones, r.porcion)}
            </b>
            . Si un paso menciona cantidades, guíate por la lista de ingredientes.
          </p>
          <div className="fila" style={{ gap: 6 }}>
            {sesion.confirmada && (
              <button className="boton negro" onClick={readaptar}>
                Recalcular la receta
              </button>
            )}
            <button className="boton fantasma" onClick={() => cambiarPorciones(r.escaladaDesde)}>
              Volver a {r.escaladaDesde}
            </button>
          </div>
        </Aviso>
      )}

      {r.advertencias.length > 0 && (
        <Aviso icono="⚠️">
          {r.advertencias.map((a, i) => (
            <p key={i}>{a}</p>
          ))}
        </Aviso>
      )}

      <div className="grilla-2" style={{ alignItems: 'start' }}>
        <section className="tarjeta">
          <h2>01 — Ingredientes</h2>
          <ul className="lista">
            {r.ingredientes.map((ing, i) => (
              <li key={i} className="item-ing">
                <Miniatura categoria={ing.categoria} nombre={ing.nombre} />
                <div>
                  <div>{ing.nombre}</div>
                  <div className="fila" style={{ gap: 6, marginTop: 4 }}>
                    {ing.sustitucion.aplicada && <span className="etiqueta ladrillo">Cambiado</span>}
                    {ing.opcional && <span className="etiqueta">Opcional</span>}
                    {ing.despensa && <span className="etiqueta verde">Despensa</span>}
                  </div>
                  {ing.sustitucion.aplicada && <div className="motivo">{ing.sustitucion.motivo}</div>}
                </div>
                <div className="cant">{ing.cantidad_texto}</div>
              </li>
            ))}
          </ul>
        </section>

        <div>
          <section className="tarjeta">
            <h2>02 — Qué cambiamos</h2>
            {r.cambios.map((c, i) => (
              <div key={i} className="cambio">
                <span aria-hidden="true">{ICONOS_CAMBIO[c.tipo] ?? '•'}</span>
                <div>
                  <span className="sobretitulo" style={{ marginBottom: 2 }}>
                    {c.tipo}
                  </span>
                  {c.detalle}
                </div>
              </div>
            ))}
          </section>

          <section className="tarjeta">
            <div className="fila entre">
              <h2 style={{ margin: 0 }}>03 — Por {r.porcion?.singular ?? 'porción'}</h2>
              <span className="etiqueta">Aproximado</span>
            </div>
            {r.peso_porcion_g > 0 && (
              <p className="suave chico" style={{ margin: '8px 0 0' }}>
                Cada {r.porcion?.singular ?? 'porción'} pesa unos <b>{r.peso_porcion_g} g</b>
                {r.porcion ? ' de masa cruda (al hornear pierde un poco de agua)' : ''}. Con {r.porciones} {textoPorciones(r.porciones, r.porcion)} salen{' '}
                {Math.round((n.calorias * r.porciones) / 100) * 100} kcal en total.
              </p>
            )}
            <div className="nutri" style={{ marginTop: 12 }}>
              <div>
                <b>{Math.round(n.calorias)}</b>
                <span>kcal</span>
              </div>
              <div>
                <b>{Math.round(n.proteinas_g)} g</b>
                <span>Proteína</span>
              </div>
              <div>
                <b>{Math.round(n.carbohidratos_g)} g</b>
                <span>Carbos</span>
              </div>
              <div>
                <b>{Math.round(n.grasas_g)} g</b>
                <span>Grasas</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="tarjeta">
        <h2>04 — Preparación</h2>
        <ol className="pasos-lista" style={{ marginTop: 16 }}>
          {r.pasos.map((p, i) => (
            <li key={i}>
              {p.texto}
              <div className="fila" style={{ gap: 6, marginTop: 6 }}>
                {p.minutos > 0 && <span className="etiqueta negra">{p.minutos} min</span>}
                {p.implemento && <span className="etiqueta">{p.implemento}</span>}
              </div>
              {p.consejo && <div className="motivo">Consejo: {p.consejo}</div>}
            </li>
          ))}
        </ol>
      </section>

      <div className="pie-accion">
        <button className="boton secundario" onClick={() => setVerLista(true)}>
          Ver lista para guardar
        </button>
        <button className="boton secundario" onClick={() => compartir('receta')}>
          Compartir
        </button>
        <button className="boton negro" onClick={() => ir('cocinemos')}>
          Cocinemos
        </button>
        <button className="boton grande" onClick={() => ir('compras')}>
          Armar mi compra
        </button>
      </div>
      {verLista && (
        <ListaGuardable
          titulo={r.titulo}
          subtitulo={`${r.porciones} ${textoPorciones(r.porciones, r.porcion)}${r.tiempo_total_min ? ` · ${r.tiempo_total_min} min` : ''} · ${r.ingredientes.length} ingredientes`}
          grupos={[{ titulo: 'Ingredientes', items: r.ingredientes.map((ing) => ({ nombre: ing.nombre, cantidad: ing.cantidad_texto, detalle: ing.opcional ? 'Opcional' : '' })) }]}
          cerrar={() => setVerLista(false)}
        />
      )}
    </>
  )
}
