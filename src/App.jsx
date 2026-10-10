import { useCallback, useEffect, useRef, useState } from 'react'
import { obtener, enviar } from './lib/api.js'
import { useGuardado, nuevoId, estaEnRefri } from './lib/almacen.js'
import { Cargando, Flujo } from './components/comunes.jsx'
import { escalarReceta } from './lib/porciones.js'
import { traducirEnNavegador } from './lib/traducir.js'
import Perfil from './components/Perfil.jsx'
import Inicio from './components/Inicio.jsx'
import CargarReceta from './components/CargarReceta.jsx'
import Confirmar from './components/Confirmar.jsx'
import Receta from './components/Receta.jsx'
import Compras from './components/Compras.jsx'
import Sobrantes from './components/Sobrantes.jsx'
import Cocinemos from './components/Cocinemos.jsx'
import Compartir from './components/Compartir.jsx'
import MiRefri from './components/MiRefri.jsx'
import Recetario from './components/Recetario.jsx'
import FichaReceta from './components/FichaReceta.jsx'

const NAV = [
  { id: 'inicio', nombre: 'Inicio', icono: '⌂' },
  { id: 'nueva', nombre: 'Nueva receta', icono: '+' },
  { id: 'recetario', nombre: 'Recetario', icono: '★' },
  { id: 'refri', nombre: 'Mi refri', icono: '❄' },
  { id: 'perfil', nombre: 'Perfil', icono: '◉' },
]
const PANTALLAS_FLUJO = ['confirmar', 'receta', 'compras', 'sobrantes', 'cocinemos']

export default function App() {
  const [perfil, setPerfil] = useGuardado('perfil', null)
  const [refri, setRefri] = useGuardado('refri', [])
  const [sesion, setSesion] = useGuardado('sesion', null)
  const [historial, setHistorial] = useGuardado('historial', [])
  const [pantalla, setPantalla] = useState(perfil ? 'inicio' : 'perfil')
  const [estadoServidor, setEstadoServidor] = useState(null)
  const [tiendas, setTiendas] = useGuardado('tiendas', null)
  const [compartirQue, setCompartirQue] = useState(null)

  useEffect(() => {
    obtener('/api/estado').then(setEstadoServidor).catch(() => setEstadoServidor({ sinServidor: true }))
  }, [])

  // Cada receta adaptada queda en el historial (las 12 más recientes).
  useEffect(() => {
    if (!sesion?.adaptada) return
    setHistorial((h) => [sesion, ...h.filter((x) => x.id !== sesion.id)].slice(0, 12))
  }, [sesion, setHistorial])

  // Cada cambio de pantalla se registra en GoatCounter como una página ("/compras", "/recetario"…),
  // para saber qué partes de la app se usan. La primera carga ya la cuenta GoatCounter solo.
  const primeraPantalla = useRef(true)
  useEffect(() => {
    if (primeraPantalla.current) {
      primeraPantalla.current = false
      return
    }
    window.goatcounter?.count?.({ path: `/${pantalla === 'inicio' ? '' : pantalla}`, title: `espaciococina · ${pantalla}` })
  }, [pantalla])

  const ir = useCallback((destino) => {
    setPantalla(destino)
    if (destino !== 'cocinemos') window.scrollTo({ top: 0 })
  }, [])
  const salirDeCocina = useCallback(() => setPantalla('receta'), [])

  // Tiendas reales cerca (OpenStreetMap). Se guardan por ubicación para no volver a pedirlas.
  const ubicacion = perfil ? `${perfil.pais}|${perfil.lat ?? ''}|${perfil.lon ?? ''}|${(perfil.zona ?? '').trim().toLowerCase()}` : ''
  const tiendasRef = useRef(tiendas)
  tiendasRef.current = tiendas
  const cargarTiendas = useCallback(
    (forzar = false) => {
      if (!perfil || (!perfil.zona?.trim() && perfil.lat == null)) {
        setTiendas({ ubicacion, estado: 'error', error: 'Escribe tu zona o barrio en tu perfil (o usa tu ubicación) para ver tiendas cerca.' })
        return
      }
      const t = tiendasRef.current
      if (!forzar && t?.ubicacion === ubicacion && (t.estado === 'listo' || t.estado === 'cargando')) return
      setTiendas({ ubicacion, estado: 'cargando' })
      enviar('/api/tiendas', { usuario: perfil })
        .then((datos) => setTiendas({ ubicacion, estado: 'listo', datos }))
        .catch((err) => setTiendas({ ubicacion, estado: 'error', error: err.message }))
    },
    // Depende solo de la ubicación del perfil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ubicacion],
  )
  const tiendasVigentes = tiendas?.ubicacion === ubicacion ? tiendas : null

  const actualizar = (cambios) => setSesion((s) => ({ ...s, ...cambios }))
  // La receta se muestra escalada a las porciones elegidas; la adaptación original queda guardada.
  const vista = sesion?.adaptada ? { ...sesion, adaptada: escalarReceta(sesion.adaptada, sesion.porcionesElegidas) } : sesion
  const cambiarPorciones = (n) => actualizar({ porcionesElegidas: n, ideasSobrantes: null, sobrantesEnRefri: false })
  const agregarARefri = (items) => setRefri((r) => [...r, ...items.map((i) => ({ id: nuevoId(), vence: '', ...i }))])

  const nuevaSesion = (datos) => {
    setSesion({ id: nuevoId(), creada: new Date().toISOString(), ...datos })
    ir('confirmar')
  }

  const alAdaptar = ({ confirmada, adaptada, porciones, demo }) => {
    const yaTengo = {}
    adaptada.ingredientes.forEach((ing, i) => {
      if (ing.despensa || estaEnRefri(ing.nombre, refri)) yaTengo[i] = true
    })
    actualizar({
      confirmada,
      adaptada,
      porciones,
      porcionesElegidas: undefined,
      demo,
      catalogo: null,
      seleccion: { yaTengo, omitidos: {}, economicos: {} },
      listaId: 'barata',
      comprados: {},
      ideasSobrantes: null,
      sobrantesEnRefri: false,
    })
    ir('receta')
    // Cada receta adaptada entra al recetario compartido (si ya estaba, no se duplica).
    if (!sesion?.bibliotecaId) {
      enviar('/api/biblioteca', {
        receta: { ...confirmada, porcion: confirmada.porcion ?? sesion?.extraida?.porcion ?? null },
        fuente: { tipo: sesion?.fuente ?? 'texto', url: sesion?.fuenteUrl ?? '' },
        alias: perfil.alias,
      })
        .then((r) => actualizar({ bibliotecaId: r.receta.id, bibliotecaNueva: r.nueva }))
        .catch(() => {})
    }
  }

  const [fichaId, setFichaId] = useState(null)
  const abrirFicha = (id) => {
    setFichaId(id)
    ir('ficha')
  }
  // "Cocinar esta receta" desde el recetario: entra al flujo normal (revisar, adaptar, comprar).
  const cocinarDesdeRecetario = (r) =>
    nuevaSesion({
      fuente: 'recetario',
      bibliotecaId: r.id,
      fuenteUrl: r.fuente?.url ?? '',
      demo: false,
      extraida: {
        es_receta: true,
        motivo_no_receta: '',
        titulo: r.titulo,
        idioma_original: '',
        porciones: r.porciones,
        porcion: r.porcion,
        tiempo_total_min: r.tiempo_total_min,
        ingredientes: r.ingredientes,
        pasos: r.pasos,
        notas: '',
      },
    })

  // Recetas de TheMealDB: los pasos se traducen recién al elegirlas.
  const [preparando, setPreparando] = useState(false)
  const cocinarDesdeRefri = async (r) => {
    let pasos = r.pasos ?? r.pasosOriginales ?? []
    setPreparando(true)
    if (r.pasosOriginales && perfil.idioma !== 'en') {
      const respuesta = await enviar('/api/traducir-pasos', { pasos: r.pasosOriginales, usuario: perfil }).catch(() => null)
      pasos = respuesta?.pasos ?? r.pasosOriginales
      // Sin cupo en el servidor: traduce el navegador.
      if (respuesta?.pendiente?.textos?.length) {
        const mapa = await traducirEnNavegador(respuesta.pendiente.textos, 'en', perfil.idioma)
        pasos = r.pasosOriginales.map((p, n) => mapa[p] ?? pasos[n])
      }
    }
    setPreparando(false)
    nuevaSesion({
      fuente: 'refri',
      fuenteUrl: r.fuente ?? '',
      demo: false,
      extraida: {
        es_receta: true,
        motivo_no_receta: '',
        titulo: r.titulo,
        idioma_original: '',
        porciones: r.porciones,
        tiempo_total_min: r.tiempo_total_min,
        ingredientes: r.ingredientes,
        pasos,
        notas: r.fuente ? `Receta original: ${r.fuente}` : '',
      },
    })
  }

  if (!perfil || pantalla === 'perfil') {
    return (
      <Marco pantalla="perfil" ir={ir} ocultarNav={!perfil}>
        <Perfil
          perfil={perfil}
          primeraVez={!perfil}
          onGuardar={(p) => {
            setPerfil(p)
            ir('inicio')
          }}
        />
      </Marco>
    )
  }

  let destino = pantalla
  if (PANTALLAS_FLUJO.includes(destino) && !sesion?.extraida) destino = 'inicio'
  if (destino !== 'confirmar' && PANTALLAS_FLUJO.includes(destino) && !sesion?.adaptada) destino = 'confirmar'

  let contenido
  switch (destino) {
    case 'nueva':
      contenido = <CargarReceta perfil={perfil} onLeida={nuevaSesion} />
      break
    case 'confirmar':
      contenido = <Confirmar key={sesion.id} sesion={sesion} perfil={perfil} onAdaptada={alAdaptar} />
      break
    case 'receta':
    case 'cocinemos':
      contenido = (
        <Receta sesion={vista} perfil={perfil} ir={ir} compartir={setCompartirQue} cambiarPorciones={cambiarPorciones} onAdaptada={alAdaptar} abrirFicha={abrirFicha} />
      )
      break
    case 'compras':
      contenido = (
        <Compras
          sesion={vista}
          perfil={perfil}
          actualizar={actualizar}
          ir={ir}
          compartir={setCompartirQue}
          cambiarPorciones={cambiarPorciones}
          tiendas={tiendasVigentes}
          cargarTiendas={cargarTiendas}
          estadoServidor={estadoServidor}
        />
      )
      break
    case 'sobrantes':
      contenido = <Sobrantes sesion={vista} perfil={perfil} actualizar={actualizar} agregarARefri={agregarARefri} ir={ir} onCocinar={cocinarDesdeRefri} />
      break
    case 'recetario':
      contenido = <Recetario abrirFicha={abrirFicha} ir={ir} />
      break
    case 'ficha':
      contenido = fichaId ? <FichaReceta key={fichaId} id={fichaId} perfil={perfil} ir={ir} onCocinar={cocinarDesdeRecetario} /> : <Recetario abrirFicha={abrirFicha} ir={ir} />
      break
    case 'refri':
      contenido = <MiRefri refri={refri} setRefri={setRefri} perfil={perfil} agregarARefri={agregarARefri} onCocinar={cocinarDesdeRefri} />
      break
    default:
      contenido = (
        <Inicio
          perfil={perfil}
          estadoServidor={estadoServidor}
          sesion={sesion}
          historial={historial}
          refri={refri}
          ir={ir}
          abrirSesion={(s) => {
            setSesion(s)
            ir('receta')
          }}
          abrirFicha={abrirFicha}
        />
      )
  }

  return (
    <Marco pantalla={destino} ir={ir}>
      {estadoServidor?.sinServidor && (
        <div className="aviso error contenido" role="alert">
          <p>No se pudo hablar con el servidor. Ábrelo con <code>npm run dev</code> y recarga la página.</p>
        </div>
      )}
      {PANTALLAS_FLUJO.includes(destino) && <Flujo actual={destino === 'cocinemos' ? 'receta' : destino} sesion={sesion} ir={ir} />}
      {preparando ? <Cargando titulo="Preparando la receta" detalle="Traduciendo los pasos…" /> : contenido}
      {destino === 'cocinemos' && <Cocinemos sesion={vista} perfil={perfil} salir={salirDeCocina} compartir={setCompartirQue} ir={ir} />}
      {compartirQue && sesion?.adaptada && <Compartir que={compartirQue} sesion={vista} perfil={perfil} tiendas={tiendasVigentes?.datos} cerrar={() => setCompartirQue(null)} />}
    </Marco>
  )
}

function Marco({ pantalla, ir, ocultarNav, children }) {
  const actual = PANTALLAS_FLUJO.includes(pantalla) ? 'nueva' : pantalla === 'ficha' ? 'recetario' : pantalla
  const boton = (n) => (
    <button key={n.id} aria-current={actual === n.id ? 'page' : undefined} onClick={() => ir(n.id)}>
      {n.nombre}
    </button>
  )
  return (
    <div className="app">
      <header className="cabecera">
        <div className="cabecera-dentro">
          <button className="logo" onClick={() => !ocultarNav && ir('inicio')} aria-label="espaciococina, ir al inicio">
            espaciococina
          </button>
          {!ocultarNav && (
            <>
              <nav className="nav" aria-label="Principal">
                {NAV.filter((n) => n.id !== 'perfil' && n.id !== 'inicio').map(boton)}
              </nav>
              <nav className="nav-derecha" aria-label="Tu cuenta">
                {NAV.filter((n) => n.id === 'perfil').map(boton)}
              </nav>
            </>
          )}
        </div>
      </header>
      <main className={`principal ${pantalla === 'inicio' ? 'a-sangre' : ''}`}>{children}</main>
      <footer className="pie">
        <div className="pie-columnas">
          <div>
            <h3>Tu asistente de cocina</h3>
            <p>Prueba recetas nuevas. Guarda las que nunca fallan.</p>
          </div>
          {!ocultarNav && (
            <div>
              <h3>Índice</h3>
              <ul>
                {NAV.map((n) => (
                  <li key={n.id}>
                    <button onClick={() => ir(n.id)}>{n.nombre}</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h3>Fuentes</h3>
            <ul className="creditos">
              <li>Precios: tiendas en línea de cada supermercado</li>
              <li>Mapas: © OpenStreetMap</li>
              <li>Traducción: MyMemory</li>
              <li>Recetas: TheMealDB · Fotos: Unsplash</li>
            </ul>
          </div>
          <div>
            <h3>Privacidad</h3>
            <p className="creditos">Sin cuentas ni cookies. Tu perfil vive en tu navegador. Visitas contadas con GoatCounter.</p>
          </div>
        </div>
        <div className="pie-marca" aria-hidden="true">
          <p className="display">espaciococina</p>
        </div>
      </footer>
      {!ocultarNav && (
        <nav className="nav-movil" aria-label="Principal">
          {NAV.map((n) => (
            <button key={n.id} aria-current={actual === n.id ? 'page' : undefined} onClick={() => ir(n.id)}>
              {n.nombre}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
