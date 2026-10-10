import { useEffect, useMemo, useState } from 'react'
import { PAISES, enumerar } from '../lib/datos.js'
import { enviar } from '../lib/api.js'
import { armarListas, itemsAComprar, formatoDinero, formatoCantidad, claveCatalogo } from '../lib/compras.js'
import { Aviso, Miniatura, SelectorPorciones } from './comunes.jsx'


export default function Compras({ sesion, perfil, actualizar, ir, compartir, cambiarPorciones, tiendas, cargarTiendas, estadoServidor }) {
  const receta = sesion.adaptada
  const seleccion = sesion.seleccion ?? { yaTengo: {}, omitidos: {}, economicos: {} }
  const presupuesto = Number(sesion.presupuesto ?? perfil.presupuesto) || 0
  const pais = PAISES[perfil.pais]
  const cadenasPais = estadoServidor?.paisesConPrecios?.[perfil.pais] ?? []

  const items = useMemo(() => itemsAComprar(receta, seleccion), [receta, seleccion])
  const clave = claveCatalogo(items, perfil)
  const catalogo = sesion.catalogo?.clave === clave ? sesion.catalogo : null
  const [buscando, setBuscando] = useState(false)
  const [errorPrecios, setErrorPrecios] = useState('')

  // Precios reales: se piden cuando cambia la lista (porciones, "ya lo tengo", alternativas).
  useEffect(() => {
    if (catalogo || !items.length || !cadenasPais.length) return
    let vigente = true
    setBuscando(true)
    setErrorPrecios('')
    const pedido = items.map(({ indice, nombre, buscar, glosario_id, cantidad, unidad, categoria }) => ({ indice, nombre, buscar, glosario_id, cantidad, unidad, categoria }))
    enviar('/api/precios', { items: pedido, usuario: perfil })
      .then((datos) => vigente && actualizar({ catalogo: { clave, ...datos, consultado: new Date().toISOString() } }))
      .catch((err) => vigente && setErrorPrecios(err.message))
      .finally(() => vigente && setBuscando(false))
    return () => {
      vigente = false
    }
    // Solo cuando cambia la lista o el país.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, cadenasPais.length])

  useEffect(() => {
    cargarTiendas()
  }, [cargarTiendas])

  const datosTiendas = tiendas?.datos ?? null
  const listas = useMemo(() => armarListas(items, perfil, catalogo, datosTiendas), [items, perfil, catalogo, datosTiendas])
  const lista = listas.find((l) => l.id === sesion.listaId) ?? listas[0]
  const comprados = sesion.comprados ?? {}

  const alternar = (grupo, i) => actualizar({ seleccion: { ...seleccion, [grupo]: { ...seleccion[grupo], [i]: !seleccion[grupo][i] } } })
  const conAlternativa = receta.ingredientes.map((ing, i) => ({ ing, i })).filter(({ ing }) => ing.alternativa_economica?.nombre)
  const aplicarAhorro = () => {
    const economicos = Object.fromEntries(conAlternativa.map(({ i }) => [i, true]))
    const omitidos = Object.fromEntries(receta.ingredientes.map((ing, i) => [i, ing.opcional]).filter(([, v]) => v))
    actualizar({ seleccion: { ...seleccion, economicos, omitidos }, listaId: 'barata' })
  }
  const exceso = lista ? lista.total - presupuesto : 0

  return (
    <>
      <span className="sobretitulo">N.º 03 — Tu compra</span>
      <h1>Gasta lo justo</h1>
      <div className="fila" style={{ marginBottom: 16 }}>
        <span className="suave chico">Compra para</span>
        <SelectorPorciones valor={receta.porciones} onCambio={cambiarPorciones} porcion={receta.porcion} />
      </div>

      {cadenasPais.length ? (
        <Aviso tipo="ok" icono="🏷️">
          <p>
            <b>Precios reales en línea</b> de {enumerar(cadenasPais)}
            {catalogo ? `, consultados el ${new Date(catalogo.consultado).toLocaleDateString('es')}` : ''}. Pueden variar un poco en la tienda.
            {!buscando && lista?.estimados ? ` ${lista.estimados} ${lista.estimados === 1 ? 'producto no apareció' : 'productos no aparecieron'} en línea: su precio es estimado.` : ''}
          </p>
        </Aviso>
      ) : (
        <Aviso tipo="demo" icono="🏷️">
          <p>
            Para {pais.nombre} todavía no hay supermercados con catálogo en línea gratuito: los <b>precios son estimados</b>. Las tiendas cercanas sí son reales (OpenStreetMap).
          </p>
        </Aviso>
      )}
      {errorPrecios && (
        <Aviso tipo="error" icono="⚠️">
          <p>No se pudieron consultar los precios en línea ({errorPrecios}). Mostramos precios estimados.</p>
        </Aviso>
      )}

      <section className="tarjeta">
        <h2>01 — ¿Qué ya tienes?</h2>
        <p className="suave chico">Marcamos lo que suele haber en casa y lo que tienes en Mi refri. Lo que marques no entra en la compra.</p>
        <ul className="lista interruptores">
          {receta.ingredientes.map((ing, i) =>
            ing.sin_compra ? null : (
              <li key={i}>
                <Miniatura categoria={ing.categoria} nombre={ing.nombre} />
                <div>
                  <b>{ing.nombre}</b> <span className="suave chico">· {ing.cantidad_texto}</span>
                </div>
                <div className="controles">
                  <label className="interruptor">
                    <input type="checkbox" checked={Boolean(seleccion.yaTengo[i])} onChange={() => alternar('yaTengo', i)} />
                    Ya lo tengo
                  </label>
                  {ing.opcional && (
                    <label className="interruptor">
                      <input type="checkbox" checked={Boolean(seleccion.omitidos[i])} onChange={() => alternar('omitidos', i)} />
                      Omitir (opcional)
                    </label>
                  )}
                  {ing.alternativa_economica?.nombre && (
                    <label className="interruptor">
                      <input type="checkbox" checked={Boolean(seleccion.economicos[i])} onChange={() => alternar('economicos', i)} />
                      Más barato: {ing.alternativa_economica.nombre}
                    </label>
                  )}
                </div>
              </li>
            ),
          )}
        </ul>
      </section>

      <section>
        <div className="fila entre" style={{ marginBottom: 10 }}>
          <span className="sobretitulo" style={{ margin: 0 }}>
            Listas según tu presupuesto
          </span>
          <label className="fila chico" style={{ gap: 6 }}>
            <span className="rotulo">Presupuesto</span>
            <span className="con-prefijo" style={{ width: 130 }}>
              <b>{pais.simbolo}</b>
              <input type="number" min="0" step="any" value={sesion.presupuesto ?? perfil.presupuesto} onChange={(e) => actualizar({ presupuesto: e.target.value })} aria-label="Presupuesto para esta receta" />
            </span>
          </label>
        </div>

        {buscando && (
          <div className="tarjeta cargando-precios" role="status">
            <span className="punto-carga" aria-hidden="true" />
            Buscando cada producto en {enumerar(cadenasPais)}…
          </div>
        )}

        {items.length === 0 ? (
          <div className="tarjeta vacio">
            <h2>¡Ya tienes todo!</h2>
            <p>No necesitas comprar nada para esta receta.</p>
            <button className="boton" onClick={() => ir('cocinemos')}>
              Cocinemos
            </button>
          </div>
        ) : (
          !buscando && (
            <div className="listas-opciones">
              {listas.map((l) => {
                const dentro = presupuesto <= 0 || l.total <= presupuesto
                const porcentaje = presupuesto > 0 ? Math.min(100, (l.total / presupuesto) * 100) : 0
                return (
                  <button key={l.id} className="lista-opcion" aria-pressed={l.id === lista.id} onClick={() => actualizar({ listaId: l.id })}>
                    <span className="sobretitulo" style={{ margin: 0 }}>
                      {l.nombre}
                    </span>
                    <span className="total">{formatoDinero(l.total, perfil)}</span>
                    <span className="chico suave">{l.carritos.map((c) => c.lugar.nombre).join(' + ')}</span>
                    <span className="chico suave" style={{ display: 'block', marginTop: 4 }}>
                      {l.descripcion}
                    </span>
                    {presupuesto > 0 && (
                      <div className={`barra ${dentro ? '' : 'pasado'}`}>
                        <i style={{ width: `${porcentaje}%` }} />
                      </div>
                    )}
                    <div className="fila" style={{ gap: 6, marginTop: 6 }}>
                      {presupuesto > 0 && <span className={`etiqueta ${dentro ? 'verde' : 'ladrillo'}`}>{dentro ? 'Dentro del presupuesto' : `Te pasas ${formatoDinero(l.total - presupuesto, perfil)}`}</span>}
                      {l.estimados > 0 && <span className="etiqueta demo">{l.estimados} estimado{l.estimados > 1 ? 's' : ''}</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          )
        )}

        {!buscando && lista && exceso > 0 && presupuesto > 0 && (
          <Aviso tipo="error" icono="💸">
            <p>
              Esta lista se pasa por <b>{formatoDinero(exceso, perfil)}</b>. Prueba con las alternativas más baratas, omite lo opcional o marca lo que ya tengas.
            </p>
            {(conAlternativa.length > 0 || receta.ingredientes.some((i) => i.opcional)) && (
              <button className="boton negro" onClick={aplicarAhorro} style={{ marginTop: 6 }}>
                Aplicar todo el ahorro
              </button>
            )}
          </Aviso>
        )}
      </section>

      {!buscando &&
        lista?.carritos.map((c, n) => {
          const listos = c.items.filter((it) => comprados[`${c.lugar.id}:${it.indice}`]).length
          const s = c.lugar.sucursal
          return (
            <section key={c.lugar.id} className="carrito">
              <div className="carrito-cab">
                <div>
                  <span className="sobretitulo" style={{ margin: 0 }}>
                    Tienda {String(n + 1).padStart(2, '0')} · {listos}/{c.items.length} en el carrito{s ? ` · a ${s.distancia_km} km` : ''}
                  </span>
                  <h2>{c.lugar.nombre}</h2>
                  <div className="sucursal">
                    {s ? (
                      <p>
                        {s.nombre}
                        {s.direccion ? `, ${s.direccion}` : ''} — a {s.distancia_km} km de {datosTiendas?.centro?.nombre ?? 'ti'}
                        {s.horario ? ` · ${s.horario}` : ''}
                      </p>
                    ) : (
                      <p>{tiendas?.estado === 'cargando' ? 'Buscando el local más cercano…' : 'No encontramos este local en el mapa cerca de tu zona.'}</p>
                    )}
                  </div>
                </div>
                <div className="acciones">
                  <a className="boton chico-boton" href={s ? s.mapa : c.lugar.buscarEnMapa} target="_blank" rel="noreferrer">
                    {s ? 'Cómo llegar' : 'Ver locales cercanos'}
                  </a>
                  {c.lugar.web && (
                    <a className="boton secundario chico-boton" href={c.lugar.web} target="_blank" rel="noreferrer">
                      Comprar en línea
                    </a>
                  )}
                </div>
              </div>
              <ul className="productos">
                {c.items.map((it) => {
                  const claveItem = `${c.lugar.id}:${it.indice}`
                  const hecho = Boolean(comprados[claveItem])
                  return (
                    <li key={claveItem} className={`producto ${hecho ? 'hecho' : ''}`}>
                      <div className="producto-imagen">
                        {it.producto?.imagen ? <img src={it.producto.imagen} alt="" loading="lazy" /> : <Miniatura categoria={it.categoria} nombre={it.nombre} />}
                        <input type="checkbox" className="check" checked={hecho} onChange={() => actualizar({ comprados: { ...comprados, [claveItem]: !hecho } })} aria-label={`Comprado: ${it.nombre}`} />
                        {it.precio.oferta ? (
                          <span className="etiqueta ladrillo">Oferta</span>
                        ) : it.esAlternativa ? (
                          <span className="etiqueta verde">Ahorro</span>
                        ) : it.precio.estado === 'estimado' ? (
                          <span className="etiqueta demo">Estimado</span>
                        ) : null}
                      </div>
                      <h3>{it.nombre}</h3>
                      {it.producto ? (
                        <a className="producto-tienda" href={it.producto.url} target="_blank" rel="noreferrer">
                          {it.producto.nombre}
                          {it.producto.marca && !it.producto.nombre.toLowerCase().includes(it.producto.marca.toLowerCase()) ? ` · ${it.producto.marca}` : ''}
                        </a>
                      ) : (
                        <span className="suave">No apareció en línea · precio estimado</span>
                      )}
                      <span className="suave">
                        {it.paquetes > 1 ? `${it.paquetes} × ` : ''}
                        {it.presentacion.descripcion} · necesitas {it.cantidad ? formatoCantidad(it.cantidad, it.unidad) : 'un poco'}
                      </span>
                      {lista.id === 'barata' && it.ahorro > 0 && <span style={{ color: 'var(--ok)' }}>Ahorras {formatoDinero(it.ahorro, perfil)}</span>}
                      <div className="precio">
                        <span className="suave">{it.paquetes > 1 ? `${formatoDinero(it.precio.monto, perfil)} c/u` : ''}</span>
                        <b>{formatoDinero(it.subtotal, perfil)}</b>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="subtotal">
                <span>Subtotal {c.lugar.nombre}</span>
                <b>{formatoDinero(c.subtotal, perfil)}</b>
              </div>
            </section>
          )
        })}

      {!buscando && lista && items.length > 0 && (
        <div className="gran-total">
          <h2>Total</h2>
          <p className="display">{formatoDinero(lista.total, perfil)}</p>
        </div>
      )}

      <section className="tarjeta">
        <h2>Otras tiendas cerca de ti</h2>
        {tiendas?.estado === 'cargando' && <p className="suave">Buscando en el mapa…</p>}
        {tiendas?.estado === 'error' && (
          <p className="suave">
            {tiendas.error}{' '}
            {perfil.zona?.trim() || perfil.lat != null ? (
              <button className="boton fantasma" onClick={() => cargarTiendas(true)}>
                Reintentar
              </button>
            ) : (
              <button className="boton fantasma" onClick={() => ir('perfil')}>
                Ir a mi perfil
              </button>
            )}
          </p>
        )}
        {datosTiendas && (
          <>
            <p className="suave chico">
              Cerca de {datosTiendas.centro.nombre}. Mercados, bodegas y verdulerías no publican precios en línea, pero suelen ser más baratos en frescos. Datos: OpenStreetMap.
            </p>
            <ul className="lista">
              {datosTiendas.cercanas.slice(0, 10).map((t) => (
                <li key={t.id} className="fila entre" style={{ flexWrap: 'nowrap' }}>
                  <div>
                    <b>{t.nombre}</b>
                    <div className="suave chico">
                      {t.tipoNombre}
                      {t.direccion ? ` · ${t.direccion}` : ''} · a {t.distancia_km} km
                    </div>
                  </div>
                  <a className="boton secundario chico-boton" href={t.mapa} target="_blank" rel="noreferrer">
                    Ir
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <div className="pie-accion">
        <button className="boton secundario" onClick={() => compartir('compras')}>
          Compartir lista
        </button>
        <button className="boton grande" onClick={() => ir('sobrantes')}>
          Ver sobrantes
        </button>
      </div>
    </>
  )
}
