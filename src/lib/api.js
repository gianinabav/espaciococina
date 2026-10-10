// Llamadas al servidor propio de espaciococina.
export class ErrorApi extends Error {
  constructor(mensaje, codigo) {
    super(mensaje)
    this.codigo = codigo
  }
}

// Llave secreta de este navegador para el recetario (sin cuentas ni contraseñas):
// con ella el servidor sabe qué recetas, fotos y calificaciones son tuyas.
export function llaveAutor() {
  try {
    let llave = localStorage.getItem('espaciococina:llave')
    if (!llave) {
      llave = crypto.randomUUID()
      localStorage.setItem('espaciococina:llave', llave)
    }
    return llave
  } catch {
    return (window.__llaveTemporal ??= crypto.randomUUID())
  }
}

export async function pedir(ruta, { metodo = 'GET', cuerpo } = {}) {
  let respuesta
  try {
    respuesta = await fetch(ruta, {
      method: metodo,
      headers: { 'x-autor': llaveAutor(), ...(cuerpo !== undefined && { 'content-type': 'application/json' }) },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    })
  } catch {
    throw new ErrorApi('No se pudo conectar con el servidor de espaciococina. ¿Sigue abierta la ventana de la app?', 'red')
  }
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new ErrorApi(datos.error || `Error ${respuesta.status}`, datos.codigo)
  return datos
}

export const enviar = (ruta, cuerpo) => pedir(ruta, { metodo: 'POST', cuerpo })
export const obtener = (ruta) => pedir(ruta)

// Achica la foto antes de enviarla (máx. 1600 px) para que viaje rápido.
export async function prepararImagen(archivo) {
  const bitmap = await createImageBitmap(archivo)
  const escala = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(bitmap.width * escala)
  lienzo.height = Math.round(bitmap.height * escala)
  lienzo.getContext('2d').drawImage(bitmap, 0, 0, lienzo.width, lienzo.height)
  const url = lienzo.toDataURL('image/jpeg', 0.85)
  return { url, tipo: 'image/jpeg', datos: url.split(',')[1] }
}
