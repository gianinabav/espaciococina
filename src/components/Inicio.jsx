import { useEffect, useState } from 'react'
import { PAISES, enumerar } from '../lib/datos.js'
import { obtener } from '../lib/api.js'
import { Estrellas, Foto } from './comunes.jsx'
import { fotoPlato } from '../lib/fotos.js'

export default function Inicio({ perfil, estadoServidor, sesion, historial, refri, ir, abrirSesion, abrirFicha }) {
  const pais = PAISES[perfil.pais]
  const cadenas = estadoServidor?.paisesConPrecios?.[perfil.pais] ?? []
  const [comunidad, setComunidad] = useState(null)

  useEffect(() => {
    let vigente = true
    obtener('/api/biblioteca?orden=mejores')
      .then((d) => vigente && setComunidad(d.recetas.slice(0, 4)))
      .catch(() => vigente && setComunidad([]))
    return () => {
      vigente = false
    }
  }, [])

  const indice = [
    { id: 'nueva', titulo: 'Nueva receta', texto: 'Pega un texto, una foto o un link, en cualquier idioma.' },
    { id: 'recetario', titulo: 'Recetario', texto: 'Las recetas que la comunidad ya cocinó y calificó.' },
    { id: 'refri', titulo: 'Mi refri', texto: 'Lo que tienes en casa y qué cocinar con eso.' },
    { id: 'perfil', titulo: 'Perfil', texto: 'Tu país, tu dieta, tu presupuesto y tus implementos.' },
  ]

  return (
    <>
      <div className="dividida">
        <Foto clave="tomate" como="button" rotulo="Nueva receta" ancho={1400} onClick={() => ir('nueva')} />
        <Foto clave="huevo" como="button" rotulo="Recetario" ancho={1400} onClick={() => ir('recetario')} />
      </div>

      <section className="manifiesto">
        <h1>Tu asistente de cocina</h1>
        <div>
          <p>Prueba recetas nuevas. Guarda las que nunca fallan. La adaptamos a tu país, tu dieta y tu cocina, y te decimos cuánto cuesta y dónde comprarla.</p>
          {estadoServidor?.paisesConPrecios && (
            <p className="suave chico">
              {pais.nombre}
              {perfil.zona ? `, ${perfil.zona}` : ''} —{' '}
              {cadenas.length ? `precios reales de hoy en ${enumerar(cadenas)}.` : 'precios estimados y tiendas reales cerca de ti.'}
            </p>
          )}
          <div className="fila" style={{ marginTop: 22 }}>
            <button className="boton grande" onClick={() => ir('nueva')}>
              Cargar una receta
            </button>
            {sesion?.extraida && (
              <button className="boton fantasma" onClick={() => ir(sesion.adaptada ? 'receta' : 'confirmar')}>
                Seguir con “{recortar(sesion.adaptada?.titulo ?? sesion.extraida.titulo)}”
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="contenido">
        <nav className="indice" aria-label="Índice">
          {indice.map((x, i) => (
            <button key={x.id} onClick={() => ir(x.id)}>
              <span className="num">{String(i + 1).padStart(2, '0')}</span>
              <span>
                <b>{x.titulo}</b>
                <small>{x.texto}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="cifras">
          <div className="cifra">
            <span>Tus recetas</span>
            <b>{historial.length}</b>
          </div>
          <div className="cifra">
            <span>En mi refri</span>
            <b>{refri.length}</b>
          </div>
          <div className="cifra">
            <span>Presupuesto</span>
            <b>
              {pais.simbolo}
              {perfil.presupuesto}
            </b>
          </div>
        </div>

        <section style={{ marginBottom: 56 }}>
          <div className="seccion-cab">
            <span className="num">05</span>
            <b>Tus recetas</b>
            {historial.length > 0 && <span className="suave">{historial.length}</span>}
          </div>
          {historial.length === 0 ? (
            <div className="vacio">
              <p>Aquí aparecerán las recetas que adaptes.</p>
              <button className="boton secundario" onClick={() => ir('nueva')}>
                Empezar con una receta
              </button>
            </div>
          ) : (
            <div className="catalogo">
              {historial.map((s, i) => (
                <button key={s.id} className="ficha" onClick={() => abrirSesion(s)}>
                  <Foto clave={categoriaPrincipal(s)} ancho={700} />
                  <span className="pie-ficha">
                    <span className="num">N.º {String(historial.length - i).padStart(2, '0')}</span>
                    <h3>{s.adaptada.titulo}</h3>
                    <span>
                      {new Date(s.creada).toLocaleDateString('es', { day: 'numeric', month: 'short' })} · {s.adaptada.porciones} porc.
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {comunidad?.length > 0 && (
          <section>
            <div className="seccion-cab">
              <span className="num">06</span>
              <b>Lo mejor del recetario</b>
              <button className="enlace" onClick={() => ir('recetario')}>
                Ver todo
              </button>
            </div>
            <div className="catalogo">
              {comunidad.map((r) => (
                <button key={r.id} className="ficha" onClick={() => abrirFicha(r.id)}>
                  <Foto src={r.foto ?? undefined} clave={fotoPlato(r.titulo)} ancho={700} />
                  <span className="pie-ficha">
                    <h3>{r.titulo}</h3>
                    <span className="fila" style={{ gap: 8 }}>
                      <Estrellas valor={r.calificacion.promedio} tamano="0.8rem" />
                      {r.calificacion.total ? `${r.calificacion.total} ${r.calificacion.total === 1 ? 'reseña' : 'reseñas'}` : 'Sin reseñas'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}

const recortar = (t = '', n = 26) => (t.length > n ? `${t.slice(0, n - 1)}…` : t)

// El ingrediente principal define la foto del plato en la portada de la receta.
const PLATO_POR_CATEGORIA = [
  ['pollo', 'plato_pollo'],
  ['carne_roja', 'plato_carne'],
  ['pescado_marisco', 'plato_pescado'],
  ['legumbre', 'plato_sopa'],
  ['huevo', 'plato_huevo'],
  ['pasta_arroz', 'plato_arroz'],
  ['cereal_harina', 'plato_pasta'],
  ['verdura', 'plato_ensalada'],
  ['fruta', 'plato_ensalada'],
]
export function categoriaPrincipal(sesion) {
  const cats = new Set(sesion?.adaptada?.ingredientes?.map((i) => i.categoria))
  return fotoPlato(sesion?.adaptada?.titulo, PLATO_POR_CATEGORIA.find(([c]) => cats.has(c))?.[1] ?? 'plato')
}
