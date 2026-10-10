// Caché simple en disco (.cache/) para no repetir consultas a servicios públicos.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const carpeta = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.cache')
const almacenes = new Map()

export function cache(nombre, horas) {
  if (almacenes.has(nombre)) return almacenes.get(nombre)
  const archivo = path.join(carpeta, `${nombre}.json`)
  let datos = {}
  try {
    datos = JSON.parse(fs.readFileSync(archivo, 'utf8'))
  } catch {
    // Primera vez o archivo dañado: se empieza vacío.
  }
  let pendiente = null
  const guardar = () => {
    clearTimeout(pendiente)
    pendiente = setTimeout(() => {
      fs.mkdirSync(carpeta, { recursive: true })
      fs.writeFile(archivo, JSON.stringify(datos), () => {})
    }, 500)
  }
  const almacen = {
    leer(clave) {
      const e = datos[clave]
      if (!e) return undefined
      if (horas && Date.now() - e.t > horas * 3600e3) return undefined
      return e.v
    },
    escribir(clave, valor) {
      datos[clave] = { t: Date.now(), v: valor }
      guardar()
      return valor
    },
  }
  almacenes.set(nombre, almacen)
  return almacen
}
