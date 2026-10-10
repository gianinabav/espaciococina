// Escala la receta adaptada a otra cantidad de porciones, sin volver a llamar a la IA.
// Cambia las cantidades de los ingredientes (número y texto); los pasos quedan igual.

function formatear(valor, metrico) {
  if (metrico) return String(valor >= 100 ? Math.round(valor / 5) * 5 : Math.max(1, Math.round(valor)))
  if (valor >= 10) return String(valor >= 100 ? Math.round(valor / 5) * 5 : Math.round(valor))
  // Medidas caseras chicas: al cuarto más cercano (1/4, 1/2, 3/4).
  const cuartos = Math.max(1, Math.round(valor * 4))
  const entero = Math.floor(cuartos / 4)
  const fraccion = { 0: '', 1: '1/4', 2: '1/2', 3: '3/4' }[cuartos % 4]
  if (!fraccion) return String(entero)
  return entero ? `${entero} ${fraccion}` : fraccion
}

const NUMERO = /(\d+)\s+(\d+)\/(\d+)|(\d+)\/(\d+)|(\d+(?:[.,]\d+)?)/g

export function escalarTexto(texto, factor) {
  if (factor === 1 || !texto) return texto
  return texto.replace(NUMERO, (coincidencia, entero, num, den, num2, den2, decimal, posicion) => {
    // Gramos y mililitros van en números enteros, no en fracciones.
    const metrico = /^\s*(g|gr|kg|ml|l|cc)\b/i.test(texto.slice(posicion + coincidencia.length))
    let valor
    if (entero) valor = Number(entero) + Number(num) / Number(den)
    else if (num2) valor = Number(num2) / Number(den2)
    else valor = Number(decimal.replace(',', '.'))
    return formatear(valor * factor, metrico)
  })
}

export function escalarReceta(receta, porciones) {
  const objetivo = Math.round(Number(porciones))
  if (!receta || !objetivo || objetivo === receta.porciones) return receta
  const factor = objetivo / receta.porciones
  return {
    ...receta,
    porciones: objetivo,
    escaladaDesde: receta.porciones,
    ingredientes: receta.ingredientes.map((ing) => ({
      ...ing,
      cantidad: ing.cantidad * factor,
      cantidad_texto: escalarTexto(ing.cantidad_texto, factor),
    })),
  }
}
