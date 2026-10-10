// Guarda el perfil, la refri y las recetas en este navegador (localStorage).
import { useEffect, useState } from 'react'

export function leer(clave, porDefecto) {
  try {
    const valor = localStorage.getItem(`espaciococina:${clave}`)
    return valor ? JSON.parse(valor) : porDefecto
  } catch {
    return porDefecto
  }
}

export function guardar(clave, valor) {
  try {
    localStorage.setItem(`espaciococina:${clave}`, JSON.stringify(valor))
  } catch {
    // Sin almacenamiento (modo privado o lleno): la app sigue funcionando en memoria.
  }
}

export function useGuardado(clave, porDefecto) {
  const [valor, setValor] = useState(() => leer(clave, porDefecto))
  useEffect(() => guardar(clave, valor), [clave, valor])
  return [valor, setValor]
}

export const nuevoId = () => Math.random().toString(36).slice(2, 10)

// Compara nombres de ingredientes sin tildes ni mayúsculas.
export const normalizar = (texto = '') =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const PALABRAS_VACIAS = new Set(['de', 'del', 'la', 'el', 'en', 'y', 'con', 'sin', 'al', 'a'])
const palabras = (texto) =>
  normalizar(texto)
    .split(' ')
    .filter((p) => p.length > 1 && !PALABRAS_VACIAS.has(p))
    .map((p) => p.replace(/(es|s)$/, ''))

// "Pierna de pollo" está en la refri si hay "pollo"; "Huevos" si hay "huevo".
export function estaEnRefri(nombre, refri) {
  const ing = palabras(nombre)
  return refri.some((item) => {
    const r = palabras(item.nombre)
    return r.length > 0 && (r.every((p) => ing.includes(p)) || r[0] === ing[0])
  })
}
