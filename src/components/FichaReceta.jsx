import { useEffect, useState } from 'react'
import { pedir, prepararImagen } from '../lib/api.js'
import { fotoPlato } from '../lib/fotos.js'
import { Aviso, Cargando, Estrellas, Foto, textoPorciones } from './comunes.jsx'

const fecha = (iso) => new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })

export default function FichaReceta({ id, perfil, ir, onCocinar }) {
  const [receta, setReceta] = useState(null)
  const [error, setError] = useState('')
  const [editando, setEditando] = useState(false)
  const [ocupado, setOcupado] = useState('')

  useEffect(() => {
    setReceta(null)
    pedir(`/api/biblioteca/${id}`)
      .then(setReceta)
      .catch((err) => setError(err.message))
  }, [id])

  // Ejecuta una acción del servidor y muestra la receta actualizada.
  const accion = async (etiqueta, fn) => {
    setError('')
    setOcupado(etiqueta)
    try {
      const nueva = await fn()
      if (nueva?.id) setReceta(nueva)
      return nueva
    } catch (err) {
      setError(err.message)
    } finally {
      setOcupado('')
    }
  }

  if (error && !receta) {
    return (
      <>
        <Aviso tipo="error" icono="⚠️">
          <p>{error}</p>
        </Aviso>
        <button className="boton" onClick={() => ir('recetario')}>
          Volver al recetario
        </button>
      </>
    )
  }
  if (!receta) return <Cargando titulo="Abriendo la receta" />
  if (editando) {
    return (
      <EditarReceta
        receta={receta}
        cancelar={() => setEditando(false)}
        guardar={async (cambios) => {
          const r = await accion('guardando', () => pedir(`/api/biblioteca/${id}`, { metodo: 'PUT', cuerpo: cambios }))
          if (r) setEditando(false)
        }}
        error={error}
        ocupado={ocupado === 'guardando'}
      />
    )
  }

  const subirFoto = async (e) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    await accion('foto', async () => {
      const img = await prepararImagen(archivo)
      return pedir(`/api/biblioteca/${id}/fotos`, { metodo: 'POST', cuerpo: { datos: img.datos, alias: perfil.alias } })
    })
  }

  const borrar = async () => {
    if (!window.confirm(`¿Borrar "${receta.titulo}" del recetario? También se borran sus fotos y reseñas. No se puede deshacer.`)) return
    const r = await accion('borrando', () => pedir(`/api/biblioteca/${id}`, { metodo: 'DELETE' }))
    if (r?.ok) ir('recetario')
  }

  const portada = receta.fotos.at(-1)?.url

  return (
    <>
      <button className="boton fantasma" onClick={() => ir('recetario')} style={{ marginBottom: 8, paddingLeft: 0 }}>
        ← Recetario
      </button>

      <article className="afiche">
        <div className="afiche-titulo">
          <span className="sobretitulo">
            Por {receta.autor.alias} · {fecha(receta.creada)}
            {receta.actualizada !== receta.creada ? ` · editada ${fecha(receta.actualizada)}` : ''}
          </span>
          <h1>{receta.titulo}</h1>
          <div className="fila" style={{ justifyContent: 'center', gap: 8 }}>
            <Estrellas valor={receta.calificacion.promedio} tamano="1.3rem" />
            <span className="suave">
              {receta.calificacion.total ? `${receta.calificacion.promedio} de 5 · ${receta.calificacion.total} ${receta.calificacion.total === 1 ? 'reseña' : 'reseñas'}` : 'Todavía sin reseñas'}
            </span>
          </div>
        </div>
        <Foto src={portada} clave={fotoPlato(receta.titulo)} className="afiche-banda" ancho={1400}>
          <div className="atributos">
            <span>
              {receta.porciones} {textoPorciones(receta.porciones, receta.porcion)}
            </span>
            <span>{receta.ingredientes.length} ingredientes</span>
            {receta.tiempo_total_min > 0 && <span>{receta.tiempo_total_min} min</span>}
            <span>
              Cocinada {receta.vecesCocinada} {receta.vecesCocinada === 1 ? 'vez' : 'veces'}
            </span>
          </div>
          {receta.descripcion && <p className="lema">{receta.descripcion}</p>}
        </Foto>
      </article>

      {error && (
        <Aviso tipo="error" icono="⚠️">
          <p>{error}</p>
        </Aviso>
      )}

      <div className="pie-accion" style={{ position: 'static', justifyContent: 'flex-start', marginTop: 0, marginBottom: 16 }}>
        <button className="boton grande" onClick={() => onCocinar(receta)}>
          Cocinar esta receta
        </button>
        {receta.esMia && (
          <button className="boton secundario" onClick={() => setEditando(true)}>
            Editar
          </button>
        )}
        {receta.fuente?.url && (
          <a className="boton fantasma" href={receta.fuente.url} target="_blank" rel="noreferrer">
            Ver la receta original
          </a>
        )}
      </div>

      <div className="grilla-2" style={{ alignItems: 'start' }}>
        <section className="tarjeta">
          <h2>Ingredientes</h2>
          <ul className="lista">
            {receta.ingredientes.map((i, n) => (
              <li key={n} className="fila entre" style={{ flexWrap: 'nowrap' }}>
                <span>
                  <b>{i.nombre}</b>
                  {i.nota && <span className="suave chico"> · {i.nota}</span>}
                </span>
                <span style={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{i.cantidad ? `${Math.round(i.cantidad * 100) / 100} ${i.unidad}` : i.unidad || 'al gusto'}</span>
              </li>
            ))}
          </ul>
          <p className="suave chico" style={{ marginTop: 10 }}>
            Al cocinarla la adaptamos a tus porciones, tu dieta y los precios de tus tiendas.
          </p>
        </section>

        <section className="tarjeta">
          <h2>Preparación</h2>
          {receta.pasos.length ? (
            <ol className="pasos-lista" style={{ marginTop: 14 }}>
              {receta.pasos.map((p, n) => (
                <li key={n}>{p}</li>
              ))}
            </ol>
          ) : (
            <p className="suave">Esta receta no tiene pasos escritos.</p>
          )}
        </section>
      </div>

      <section className="tarjeta">
        <div className="fila entre">
          <h2 style={{ margin: 0 }}>Fotos de la comunidad</h2>
          <label className="boton negro chico-boton" style={{ cursor: ocupado ? 'wait' : 'pointer' }}>
            <input type="file" accept="image/*" className="oculto-visual" onChange={subirFoto} disabled={Boolean(ocupado)} />
            {ocupado === 'foto' ? 'Subiendo…' : '+ Subir foto'}
          </label>
        </div>
        {receta.fotos.length ? (
          <div className="galeria" style={{ marginTop: 14 }}>
            {[...receta.fotos].reverse().map((f) => (
              <figure key={f.id}>
                <a href={f.url} target="_blank" rel="noreferrer">
                  <img src={f.url} alt={`Foto de ${f.alias}`} loading="lazy" />
                </a>
                <figcaption>
                  <span>
                    {f.alias} · {fecha(f.creada)}
                  </span>
                  {(f.esMia || receta.esMia) && (
                    <button className="boton-icono" style={{ width: 28, height: 28 }} aria-label="Borrar foto" title="Borrar foto" onClick={() => window.confirm('¿Borrar esta foto?') && accion('borrar-foto', () => pedir(`/api/biblioteca/${id}/fotos/${f.id}`, { metodo: 'DELETE' }))}>
                      ✕
                    </button>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="suave" style={{ marginTop: 10 }}>
            ¿Ya la cocinaste? Sube una foto de cómo te quedó.
          </p>
        )}
      </section>

      <Resenas receta={receta} perfil={perfil} accion={accion} ocupado={ocupado} />

      {receta.esMia && (
        <section className="tarjeta">
          <h2>Es tu receta</h2>
          <p className="suave">Puedes editarla cuando quieras. Si la borras, también se borran sus fotos y reseñas.</p>
          <button className="boton secundario" onClick={borrar} disabled={Boolean(ocupado)}>
            {ocupado === 'borrando' ? 'Borrando…' : 'Borrar del recetario'}
          </button>
        </section>
      )}
    </>
  )
}

function Resenas({ receta, perfil, accion, ocupado }) {
  const mia = receta.miCalificacion
  const [estrellas, setEstrellas] = useState(mia?.estrellas ?? 0)
  const [comentario, setComentario] = useState(mia?.comentario ?? '')
  const [abierta, setAbierta] = useState(!mia)

  const enviar = (e) => {
    e.preventDefault()
    accion('resena', () => pedir(`/api/biblioteca/${receta.id}/calificacion`, { metodo: 'POST', cuerpo: { estrellas, comentario, alias: perfil.alias } })).then((r) => r && setAbierta(false))
  }

  return (
    <section className="tarjeta">
      <h2>Reseñas</h2>
      {abierta ? (
        <form onSubmit={enviar} className="pila" style={{ marginBottom: 12 }}>
          <div className="campo">
            <span>{receta.esMia ? '¿Cómo te quedó tu receta?' : '¿Qué te pareció?'}</span>
            <Estrellas valor={estrellas} onCambio={setEstrellas} tamano="1.8rem" etiqueta="Tu calificación" />
          </div>
          <label className="campo">
            <span>Comentario (opcional)</span>
            <textarea style={{ minHeight: 90 }} maxLength={600} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Ej.: Quedaron perfectas con 10 minutos de horno. Usé la mitad del azúcar." />
          </label>
          <div className="fila">
            <button className="boton" type="submit" disabled={!estrellas || ocupado === 'resena'}>
              {ocupado === 'resena' ? 'Guardando…' : mia ? 'Actualizar mi reseña' : 'Publicar reseña'}
            </button>
            {mia && (
              <button type="button" className="boton fantasma" onClick={() => setAbierta(false)}>
                Cancelar
              </button>
            )}
            {!perfil.alias && <small className="suave">Aparecerás como “Anónimo”: pon tu nombre en tu perfil.</small>}
          </div>
        </form>
      ) : (
        <div className="fila" style={{ marginBottom: 12 }}>
          <button className="boton secundario chico-boton" onClick={() => setAbierta(true)}>
            Editar mi reseña
          </button>
          <button className="boton fantasma" onClick={() => window.confirm('¿Borrar tu reseña?') && accion('resena', () => pedir(`/api/biblioteca/${receta.id}/calificacion`, { metodo: 'DELETE' })).then(() => (setEstrellas(0), setComentario(''), setAbierta(true)))}>
            Borrar mi reseña
          </button>
        </div>
      )}
      {receta.resenas.length === 0 ? (
        <p className="suave">Sé la primera persona en calificarla.</p>
      ) : (
        <div>
          {receta.resenas.map((r, n) => (
            <div key={n} className="resena">
              <div className="fila" style={{ gap: 8 }}>
                <Estrellas valor={r.estrellas} tamano="0.95rem" />
                <b>{r.alias}</b>
                {r.esMia && <span className="etiqueta">Tú</span>}
                <span className="suave chico">{fecha(r.fecha)}</span>
              </div>
              {r.comentario && <p style={{ margin: '6px 0 0' }}>{r.comentario}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// Edición de la receta (solo quien la agregó): título, rendimiento, ingredientes y pasos.
function EditarReceta({ receta, guardar, cancelar, error, ocupado }) {
  const [r, setR] = useState(() => ({
    titulo: receta.titulo,
    descripcion: receta.descripcion ?? '',
    porciones: receta.porciones,
    tiempo_total_min: receta.tiempo_total_min,
    ingredientes: receta.ingredientes.map((i) => ({ ...i })),
    pasos: [...receta.pasos],
    porcion: receta.porcion,
  }))
  const cambiarIng = (i, campo, valor) => setR((x) => ({ ...x, ingredientes: x.ingredientes.map((ing, j) => (j === i ? { ...ing, [campo]: valor, ...(campo === 'nombre' && { glosario_id: null }) } : ing)) }))
  const cambiarPaso = (i, valor) => setR((x) => ({ ...x, pasos: x.pasos.map((p, j) => (j === i ? valor : p)) }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        guardar({ ...r, ingredientes: r.ingredientes.filter((i) => i.nombre.trim()), pasos: r.pasos.filter((p) => p.trim()) })
      }}
    >
      <span className="sobretitulo">Editar mi receta</span>
      <h1>{r.titulo || 'Receta sin nombre'}</h1>
      {error && (
        <Aviso tipo="error" icono="⚠️">
          <p>{error}</p>
        </Aviso>
      )}

      <section className="tarjeta pila">
        <label className="campo">
          <span>Nombre</span>
          <input type="text" maxLength={120} value={r.titulo} onChange={(e) => setR({ ...r, titulo: e.target.value })} />
        </label>
        <label className="campo">
          <span>Descripción (opcional)</span>
          <textarea style={{ minHeight: 70 }} maxLength={500} value={r.descripcion} onChange={(e) => setR({ ...r, descripcion: e.target.value })} placeholder="Ej.: Las galletas gruesas de Levain, con nueces y chocolate." />
        </label>
        <div className="grilla-2">
          <label className="campo">
            <span>Rinde ({r.porcion?.plural ?? 'porciones'})</span>
            <input type="number" min="1" max="200" value={r.porciones} onChange={(e) => setR({ ...r, porciones: e.target.value })} />
          </label>
          <label className="campo">
            <span>Tiempo total (minutos)</span>
            <input type="number" min="0" max="2880" value={r.tiempo_total_min} onChange={(e) => setR({ ...r, tiempo_total_min: e.target.value })} />
          </label>
        </div>
      </section>

      <section className="tarjeta">
        <h2>Ingredientes</h2>
        <ul className="lista">
          {r.ingredientes.map((ing, i) => (
            <li key={i}>
              <div className="editar-ing">
                <input className="nombre" type="text" value={ing.nombre} onChange={(e) => cambiarIng(i, 'nombre', e.target.value)} placeholder="Ingrediente" aria-label="Ingrediente" />
                <input type="number" min="0" step="any" value={ing.cantidad} onChange={(e) => cambiarIng(i, 'cantidad', e.target.value)} aria-label="Cantidad" />
                <input className="unidad" type="text" value={ing.unidad} onChange={(e) => cambiarIng(i, 'unidad', e.target.value)} placeholder="unidad" aria-label="Unidad" />
                <button type="button" className="boton-icono" onClick={() => setR({ ...r, ingredientes: r.ingredientes.filter((_, j) => j !== i) })} aria-label={`Quitar ${ing.nombre}`}>
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button type="button" className="boton fantasma" onClick={() => setR({ ...r, ingredientes: [...r.ingredientes, { nombre: '', cantidad: 0, unidad: '', nota: '' }] })}>
          + Agregar ingrediente
        </button>
      </section>

      <section className="tarjeta">
        <h2>Preparación</h2>
        <ol className="lista" style={{ listStyle: 'none' }}>
          {r.pasos.map((p, i) => (
            <li key={i} className="editar-paso">
              <textarea value={p} onChange={(e) => cambiarPaso(i, e.target.value)} aria-label={`Paso ${i + 1}`} />
              <button type="button" className="boton-icono" onClick={() => setR({ ...r, pasos: r.pasos.filter((_, j) => j !== i) })} aria-label={`Quitar paso ${i + 1}`}>
                ✕
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="boton fantasma" onClick={() => setR({ ...r, pasos: [...r.pasos, ''] })}>
          + Agregar paso
        </button>
      </section>

      <div className="pie-accion">
        <button type="button" className="boton secundario" onClick={cancelar}>
          Cancelar
        </button>
        <button className="boton grande" type="submit" disabled={ocupado}>
          {ocupado ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
