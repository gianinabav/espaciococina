import { PAISES, enumerar } from '../lib/datos.js'
import { Aviso, Foto, Mosaico } from './comunes.jsx'
import { fotoPlato } from '../lib/fotos.js'

export default function Inicio({ perfil, estadoServidor, sesion, historial, refri, ir, abrirSesion }) {
  const pais = PAISES[perfil.pais]
  const cadenas = estadoServidor?.paisesConPrecios?.[perfil.pais] ?? []
  return (
    <>
      {estadoServidor?.paisesConPrecios && (
        <Aviso tipo={cadenas.length ? 'ok' : 'demo'} icono="🏷️">
          <p>
            {cadenas.length ? (
              <>
                En {pais.nombre} comparamos <b>precios reales en línea</b> de {enumerar(cadenas)} y te mostramos su local más cercano.
              </>
            ) : (
              <>
                En {pais.nombre} todavía no hay supermercados con catálogo en línea gratuito: verás <b>precios estimados</b> y tiendas reales cerca de ti.
              </>
            )}
          </p>
        </Aviso>
      )}

      <div className="portada">
        <div className="portada-texto">
          <div>
            <span className="sobretitulo">
              {pais.nombre}
              {perfil.zona ? ` · ${perfil.zona}` : ''}
            </span>
            <h1>Cocina lo justo</h1>
            <p>Pega una receta, súbele una foto o comparte un link. La adaptamos a tu país, tu dieta y tu cocina, y te armamos la compra según tu presupuesto.</p>
          </div>
          <div className="fila">
            <button className="boton grande" onClick={() => ir('nueva')}>
              Cargar una receta
            </button>
            {sesion?.extraida && (
              <button className="boton secundario" onClick={() => ir(sesion.adaptada ? 'receta' : 'confirmar')}>
                Seguir con “{recortar(sesion.adaptada?.titulo ?? sesion.extraida.titulo)}”
              </button>
            )}
          </div>
        </div>
        <Mosaico
          piezas={[
            { clave: 'tomate', rotulo: 'Receta', onClick: () => ir('nueva') },
            { clave: 'cebolla', rotulo: 'Compra', onClick: () => ir(sesion?.adaptada ? 'compras' : 'nueva') },
            { clave: 'crema', rotulo: 'Sobras', onClick: () => ir(sesion?.adaptada ? 'sobrantes' : 'refri') },
            { clave: 'hierbas', rotulo: 'Mi refri', onClick: () => ir('refri') },
          ]}
        />
      </div>

      <div className="cifras">
        <div className="cifra">
          <b>{historial.length}</b>
          <span>Recetas</span>
        </div>
        <div className="cifra">
          <b>{refri.length}</b>
          <span>En mi refri</span>
        </div>
        <div className="cifra">
          <b>
            {pais.simbolo}
            {perfil.presupuesto}
          </b>
          <span>Presupuesto</span>
        </div>
      </div>

      <section>
        <span className="sobretitulo">Tus recetas</span>
        {historial.length === 0 ? (
          <div className="tarjeta vacio">
            <p>Aquí aparecerán las recetas que adaptes.</p>
            <button className="boton negro" onClick={() => ir('nueva')}>
              Empezar con una receta
            </button>
          </div>
        ) : (
          <div className="grilla-2">
            {historial.map((s) => (
              <Foto key={s.id} clave={categoriaPrincipal(s)} como="button" className="tarjeta-receta" onClick={() => abrirSesion(s)} style={{ aspectRatio: '16 / 10', textAlign: 'left' }}>
                <span style={{ position: 'absolute', left: 16, right: 16, bottom: 14 }}>
                  <span className="etiqueta negra" style={{ marginBottom: 8 }}>
                    {new Date(s.creada).toLocaleDateString('es')}
                  </span>
                  <h2 style={{ color: '#fff', margin: 0 }}>{s.adaptada.titulo}</h2>
                </span>
              </Foto>
            ))}
          </div>
        )}
      </section>
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
