import { useState } from 'react'
import { formatoDinero, listaElegida } from '../lib/compras.js'

function textoReceta(r) {
  return [
    `🍳 ${r.titulo}`,
    `${r.porciones} porciones · ${r.tiempo_total_min} min · ${r.dificultad}`,
    '',
    'INGREDIENTES',
    ...r.ingredientes.map((i) => `• ${i.nombre}: ${i.cantidad_texto}${i.opcional ? ' (opcional)' : ''}`),
    '',
    'PREPARACIÓN',
    ...r.pasos.map((p, i) => `${i + 1}. ${p.texto}${p.minutos ? ` (${p.minutos} min)` : ''}`),
  ].join('\n')
}

function textoCompras(lista, perfil) {
  if (!lista) return ''
  const enLinea = lista.carritos.some((c) => c.lugar.enLinea)
  return [
    `🛒 Lista de compras (${lista.nombre}) · total ${formatoDinero(lista.total, perfil)}`,
    enLinea ? '(precios en línea de cada supermercado; pueden variar en tienda)' : '(precios estimados)',
    ...lista.carritos.flatMap((c) => {
      const s = c.lugar.sucursal
      return [
        '',
        `📍 ${c.lugar.nombre} — ${formatoDinero(c.subtotal, perfil)}`,
        ...(s ? [`   ${[s.nombre, s.direccion].filter(Boolean).join(', ')} · a ${s.distancia_km} km · ${s.mapa}`] : []),
        ...c.items.map((it) => `☐ ${it.producto ? it.producto.nombre : it.nombre} · ${it.paquetes > 1 ? `${it.paquetes} × ` : ''}${it.presentacion.descripcion} · ${formatoDinero(it.subtotal, perfil)}`),
      ]
    }),
  ].join('\n')
}

export default function Compartir({ que, sesion, perfil, tiendas, cerrar }) {
  const [opcion, setOpcion] = useState(que ?? 'receta')
  const [copiado, setCopiado] = useState(false)
  const lista = listaElegida(sesion, perfil, tiendas)

  const partes = []
  if (opcion !== 'compras') partes.push(textoReceta(sesion.adaptada))
  if (opcion !== 'receta') partes.push(textoCompras(lista, perfil))
  const texto = `${partes.join('\n\n')}\n\nHecho con espaciococina`

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }
  const compartirNativo = () => navigator.share?.({ title: sesion.adaptada.titulo, text: texto }).catch(() => {})
  const descargar = () => {
    const enlace = document.createElement('a')
    enlace.href = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }))
    enlace.download = `${sesion.adaptada.titulo.replace(/[^\p{L}\p{N} ]/gu, '').trim() || 'receta'}.txt`
    enlace.click()
    URL.revokeObjectURL(enlace.href)
  }

  return (
    <div className="velo" onClick={cerrar}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-compartir" onClick={(e) => e.stopPropagation()}>
        <div className="fila entre">
          <h2 id="titulo-compartir" style={{ margin: 0 }}>
            Compartir
          </h2>
          <button className="boton-icono" onClick={cerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="pestanas" role="tablist" style={{ marginTop: 14 }}>
          {[
            ['receta', 'Receta'],
            ['compras', 'Compras'],
            ['ambos', 'Ambos'],
          ].map(([id, nombre]) => (
            <button key={id} role="tab" aria-selected={opcion === id} onClick={() => setOpcion(id)}>
              {nombre}
            </button>
          ))}
        </div>
        <div className="vista-previa">{texto}</div>
        <div className="fila" style={{ marginTop: 14 }}>
          <button className="boton" onClick={copiar}>
            {copiado ? '✓ Copiado' : 'Copiar'}
          </button>
          <a className="boton negro" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          {'share' in navigator && (
            <button className="boton secundario" onClick={compartirNativo}>
              Más…
            </button>
          )}
          <button className="boton secundario" onClick={descargar}>
            Descargar .txt
          </button>
        </div>
      </div>
    </div>
  )
}
