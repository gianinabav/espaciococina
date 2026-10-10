import { useEffect, useRef, useState } from 'react'
import { Foto } from './comunes.jsx'
import { categoriaPrincipal } from './Inicio.jsx'

const VOCES = { es: 'es', en: 'en', pt: 'pt', fr: 'fr' }

function sonar() {
  try {
    const ctx = new AudioContext()
    ;[0, 0.35, 0.7].forEach((t) => {
      const osc = ctx.createOscillator()
      const vol = ctx.createGain()
      osc.frequency.value = 880
      vol.gain.setValueAtTime(0.25, ctx.currentTime + t)
      vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3)
      osc.connect(vol).connect(ctx.destination)
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + 0.3)
    })
  } catch {
    // Sin audio disponible: queda el aviso visual.
  }
  navigator.vibrate?.([300, 150, 300])
}

function Temporizador({ minutos }) {
  const [restante, setRestante] = useState(minutos * 60)
  const [corriendo, setCorriendo] = useState(false)
  const fin = useRef(null)

  useEffect(() => {
    if (!corriendo) return
    fin.current = Date.now() + restante * 1000
    const id = setInterval(() => {
      const quedan = Math.max(0, Math.round((fin.current - Date.now()) / 1000))
      setRestante(quedan)
      if (quedan === 0) {
        setCorriendo(false)
        sonar()
      }
    }, 250)
    return () => clearInterval(id)
    // Solo se reinicia al pausar o reanudar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corriendo])

  const mm = String(Math.floor(restante / 60)).padStart(2, '0')
  const ss = String(restante % 60).padStart(2, '0')
  return (
    <div className={`temporizador ${restante === 0 ? 'sonando' : ''}`} role="timer" aria-live={restante === 0 ? 'assertive' : 'off'}>
      <span className="reloj">
        {mm}:{ss}
      </span>
      <div className="fila" style={{ flex: 1 }}>
        {restante === 0 ? (
          <b style={{ flex: 1 }}>¡Tiempo!</b>
        ) : (
          <button className="boton blanco" onClick={() => setCorriendo(!corriendo)}>
            {corriendo ? 'Pausar' : restante === minutos * 60 ? 'Iniciar' : 'Seguir'}
          </button>
        )}
        <button
          className="boton secundario"
          onClick={() => {
            setCorriendo(false)
            setRestante(minutos * 60)
          }}
        >
          Reiniciar
        </button>
      </div>
    </div>
  )
}

export default function Cocinemos({ sesion, perfil, salir, compartir, ir }) {
  const receta = sesion.adaptada
  const [paso, setPaso] = useState(-1)
  const [listos, setListos] = useState({})
  const total = receta.pasos.length
  const terminado = paso >= total

  useEffect(() => {
    let candado
    navigator.wakeLock?.request('screen').then((c) => (candado = c)).catch(() => {})
    const tecla = (e) => {
      if (e.key === 'ArrowRight') setPaso((p) => Math.min(total, p + 1))
      if (e.key === 'ArrowLeft') setPaso((p) => Math.max(-1, p - 1))
      if (e.key === 'Escape') salir()
    }
    window.addEventListener('keydown', tecla)
    return () => {
      candado?.release()
      speechSynthesis?.cancel()
      window.removeEventListener('keydown', tecla)
    }
  }, [total, salir])

  const leerEnVoz = (texto) => {
    if (!('speechSynthesis' in window)) return
    speechSynthesis.cancel()
    const voz = new SpeechSynthesisUtterance(texto)
    voz.lang = VOCES[perfil.idioma] ?? 'es'
    speechSynthesis.speak(voz)
  }

  const actual = receta.pasos[paso]

  return (
    <div className="cocina" role="dialog" aria-modal="true" aria-label="Modo cocina">
      <div className="cocina-cab">
        <button className="boton-icono" onClick={salir} aria-label="Salir del modo cocina">
          ✕
        </button>
        <div className="cocina-progreso" aria-hidden="true">
          <i style={{ width: `${((paso + 1) / (total + 1)) * 100}%` }} />
        </div>
        <span className="rotulo">{paso < 0 ? 'Prepara' : terminado ? 'Listo' : `${paso + 1}/${total}`}</span>
      </div>

      <div className="cocina-cuerpo">
        {paso < 0 && (
          <>
            <span className="sobretitulo">Antes de empezar</span>
            <h1>Ten todo a la mano</h1>
            <p className="suave">Marca cada cosa cuando ya esté medida y lista.</p>
            <ul className="lista">
              {receta.ingredientes.map((ing, i) => (
                <li key={i}>
                  <label className="item-compra" style={{ cursor: 'pointer' }}>
                    <input type="checkbox" className="check" checked={Boolean(listos[i])} onChange={() => setListos({ ...listos, [i]: !listos[i] })} />
                    <span className={listos[i] ? 'suave' : ''} style={{ textDecoration: listos[i] ? 'line-through' : 'none', fontWeight: 600 }}>
                      {ing.nombre}
                    </span>
                    <b>{ing.cantidad_texto}</b>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}

        {actual && (
          <>
            <div className="cocina-numero">{String(paso + 1).padStart(2, '0')}</div>
            <p className="cocina-paso">{actual.texto}</p>
            <div className="fila" style={{ marginBottom: 18 }}>
              {actual.implemento && <span className="etiqueta negra">{actual.implemento}</span>}
              <button className="boton fantasma" onClick={() => leerEnVoz(`${actual.texto}. ${actual.consejo}`)}>
                🔊 Leer en voz alta
              </button>
            </div>
            {actual.minutos > 0 && <Temporizador key={paso} minutos={actual.minutos} />}
            {actual.consejo && (
              <div className="aviso" style={{ marginTop: 16 }}>
                <span aria-hidden="true">💡</span>
                <p>{actual.consejo}</p>
              </div>
            )}
          </>
        )}

        {terminado && (
          <div className="pila">
            <Foto clave={categoriaPrincipal(sesion)} style={{ aspectRatio: '4 / 3' }} rotulo="¡Buen provecho!" ancho={1200} />
            <h1>{receta.titulo}</h1>
            <p className="suave">Lo lograste. ¿Lo compartimos o guardamos lo que sobró?</p>
            <div className="fila">
              <button className="boton" onClick={() => compartir('receta')}>
                Compartir
              </button>
              <button
                className="boton secundario"
                onClick={() => {
                  salir()
                  ir('sobrantes')
                }}
              >
                Ver sobrantes
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="cocina-pie">
        <button className="boton secundario" onClick={() => setPaso(paso - 1)} disabled={paso < 0}>
          Atrás
        </button>
        {terminado ? (
          <button className="boton" onClick={salir}>
            Terminar
          </button>
        ) : (
          <button className="boton" onClick={() => setPaso(paso + 1)}>
            {paso < 0 ? 'Empezar' : paso === total - 1 ? 'Terminar' : 'Siguiente'}
          </button>
        )}
      </div>
    </div>
  )
}
