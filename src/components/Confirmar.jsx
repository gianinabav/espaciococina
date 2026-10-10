import { useState } from 'react'
import { enviar } from '../lib/api.js'
import { Aviso, Cargando, textoPorciones } from './comunes.jsx'

export default function Confirmar({ sesion, perfil, onAdaptada }) {
  const [receta, setReceta] = useState(() => ({
    ...sesion.extraida,
    ingredientes: sesion.extraida.ingredientes.map((i) => ({ ...i })),
  }))
  // Si la receta rinde unidades (8 galletas), se parte de eso; si no, de las personas del perfil.
  const porcion = sesion.extraida.porcion ?? null
  const [porciones, setPorciones] = useState(porcion ? sesion.extraida.porciones : perfil.personas || sesion.extraida.porciones)
  const [verPasos, setVerPasos] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const cambiarIng = (i, campo, valor) =>
    setReceta((r) => ({
      ...r,
      // Si cambia el nombre, el ingrediente se vuelve a reconocer al adaptar.
      ingredientes: r.ingredientes.map((ing, j) => (j === i ? { ...ing, [campo]: valor, ...(campo === 'nombre' && { glosario_id: null }) } : ing)),
    }))
  const quitarIng = (i) => setReceta((r) => ({ ...r, ingredientes: r.ingredientes.filter((_, j) => j !== i) }))
  const agregarIng = () =>
    setReceta((r) => ({ ...r, ingredientes: [...r.ingredientes, { original: '', nombre: '', cantidad: 0, unidad: '', nota: '' }] }))

  const adaptar = async () => {
    setError('')
    setCargando(true)
    const confirmada = {
      titulo: receta.titulo,
      porciones: receta.porciones,
      porcion,
      tiempo_total_min: receta.tiempo_total_min,
      idioma_original: receta.idioma_original,
      ingredientes: receta.ingredientes
        .filter((i) => i.nombre.trim())
        .map((i) => ({ ...i, cantidad: Number(i.cantidad) || 0 })),
      pasos: receta.pasos,
      notas: receta.notas,
    }
    try {
      const usuario = { ...perfil, personas: Number(porciones) || receta.porciones }
      const respuesta = await enviar('/api/adaptar', { receta: confirmada, usuario })
      onAdaptada({ confirmada, adaptada: respuesta.datos, porciones: usuario.personas, demo: false })
    } catch (err) {
      setError(err.message)
      setCargando(false)
    }
  }

  if (cargando) return <Cargando titulo="Adaptando tu receta" detalle="Medidas, dieta, implementos e idioma. Puede tardar unos segundos…" />

  return (
    <>
      <span className="sobretitulo">N.º 01 — Revisa lo que leímos</span>
      <h1>{receta.titulo || 'Tu receta'}</h1>
      <p className="suave">
        {{ imagen: 'Leída desde tu foto', link: 'Leída desde el link', refri: 'Receta del recetario TheMealDB' }[sesion.fuente] ?? 'Leída desde el texto'}
        {receta.idioma_original ? ` · original en ${receta.idioma_original.toLowerCase()}` : ''} · rinde {receta.porciones} {textoPorciones(receta.porciones, porcion)} · {receta.tiempo_total_min} min
      </p>

      {sesion.aviso && (
        <Aviso icono="ℹ️">
          <p>{sesion.aviso}</p>
        </Aviso>
      )}
      {error && (
        <Aviso tipo="error" icono="⚠️">
          <p>{error}</p>
        </Aviso>
      )}

      <div className="grilla-2" style={{ alignItems: 'start' }}>
        <section className="tarjeta" style={{ gridColumn: '1 / -1' }}>
          <div className="fila entre" style={{ marginBottom: 6 }}>
            <h2 style={{ margin: 0 }}>Ingredientes</h2>
            <span className="etiqueta">{receta.ingredientes.length}</span>
          </div>
          <p className="suave chico">Corrige lo que haga falta: nombre, cantidad o unidad. Borra lo que no quieras y agrega lo que falte.</p>
          <ul className="lista">
            {receta.ingredientes.map((ing, i) => (
              <li key={i}>
                <div className="editar-ing">
                  <input className="nombre" type="text" value={ing.nombre} onChange={(e) => cambiarIng(i, 'nombre', e.target.value)} placeholder="Ingrediente" aria-label="Ingrediente" />
                  <input type="number" min="0" step="any" value={ing.cantidad} onChange={(e) => cambiarIng(i, 'cantidad', e.target.value)} aria-label="Cantidad" />
                  <input className="unidad" type="text" value={ing.unidad} onChange={(e) => cambiarIng(i, 'unidad', e.target.value)} placeholder="unidad" aria-label="Unidad" />
                  <button type="button" className="boton-icono" onClick={() => quitarIng(i)} aria-label={`Quitar ${ing.nombre}`} title="Quitar">
                    ✕
                  </button>
                </div>
                {(ing.original && ing.original !== ing.nombre) || ing.nota ? (
                  <div className="motivo">
                    {ing.original && ing.original !== ing.nombre && <>Original: “{ing.original}”</>}
                    {ing.nota && <> · {ing.nota}</>}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <button type="button" className="boton fantasma" onClick={agregarIng}>
            + Agregar ingrediente
          </button>
        </section>

        <section className="tarjeta">
          <h2>{porcion ? porcion.plural : 'Porciones'}</h2>
          <label className="campo">
            <span>{porcion ? `¿Cuántas ${porcion.plural} quieres hacer?` : '¿Para cuántas personas?'}</span>
            <input type="number" min="1" max="60" value={porciones} onChange={(e) => setPorciones(e.target.value)} />
            <small>
              La receta original rinde {receta.porciones} {textoPorciones(receta.porciones, porcion)}. Ajustamos las cantidades.
            </small>
          </label>
        </section>

        <section className="tarjeta">
          <div className="fila entre">
            <h2 style={{ margin: 0 }}>Preparación</h2>
            <button type="button" className="boton fantasma" onClick={() => setVerPasos(!verPasos)} aria-expanded={verPasos}>
              {verPasos ? 'Ocultar' : `Ver ${receta.pasos.length} pasos`}
            </button>
          </div>
          {verPasos && (
            <ol className="pasos-lista" style={{ marginTop: 14 }}>
              {receta.pasos.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="pie-accion">
        <button className="boton grande" onClick={adaptar} disabled={!receta.ingredientes.some((i) => i.nombre.trim())}>
          Adaptar mi receta
        </button>
      </div>
    </>
  )
}
