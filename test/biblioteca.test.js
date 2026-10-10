import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// El recetario de prueba se guarda en una carpeta temporal, no en datos/.
process.env.ESPACIOCOCINA_DATOS = fs.mkdtempSync(path.join(os.tmpdir(), 'recetario-'))
const bib = await import('../server/biblioteca.js')
const yo = 'a'.repeat(32)
const otra = 'b'.repeat(32)
const receta = {
  titulo: 'Galletas Levain',
  porciones: 8,
  porcion: { singular: 'galleta', plural: 'galletas' },
  ingredientes: [
    { nombre: 'Mantequilla', cantidad: 1, unidad: 'taza' },
    { nombre: 'Harina', cantidad: 3, unidad: 'tazas' },
  ],
  pasos: ['Mezcla todo.', 'Hornea 10 minutos.'],
}
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

test('agrega recetas y no duplica el mismo link', () => {
  const a = bib.agregar({ receta, fuente: { tipo: 'link', url: 'https://www.modernhoney.com/levain/' }, alias: 'Gianina' }, yo)
  assert.equal(a.nueva, true)
  assert.equal(a.receta.esMia, true)
  const b = bib.agregar({ receta, fuente: { tipo: 'link', url: 'https://modernhoney.com/levain' }, alias: 'Otra' }, otra)
  assert.equal(b.nueva, false)
  assert.equal(b.receta.id, a.receta.id)
  assert.equal(b.receta.esMia, false)
  assert.equal(bib.obtener(a.receta.id, otra).vecesCocinada, 2)
})

test('cualquiera califica (también su propia receta) y el promedio se actualiza', () => {
  const { id } = bib.listar({}, yo).recetas[0]
  bib.calificar(id, { estrellas: 5, comentario: '¡Perfectas!', alias: 'Gianina' }, yo)
  const r = bib.calificar(id, { estrellas: 3, alias: 'Otra' }, otra)
  assert.deepEqual(r.calificacion, { promedio: 4, total: 2 })
  const otraVez = bib.calificar(id, { estrellas: 4, alias: 'Otra' }, otra) // una reseña por persona
  assert.equal(otraVez.calificacion.total, 2)
  assert.throws(() => bib.calificar(id, { estrellas: 9 }, otra), /1 a 5/)
})

test('solo quien agregó la receta puede editarla o borrarla', () => {
  const { id } = bib.listar({}, yo).recetas[0]
  assert.throws(() => bib.editar(id, { titulo: 'Hackeada' }, otra), /Solo quien agregó/)
  const editada = bib.editar(id, { titulo: 'Galletas Levain caseras' }, yo)
  assert.equal(editada.titulo, 'Galletas Levain caseras')
  assert.throws(() => bib.eliminar(id, otra), /Solo quien agregó/)
})

test('fotos: solo imágenes reales y cada quien borra las suyas', () => {
  const { id } = bib.listar({}, yo).recetas[0]
  assert.throws(() => bib.agregarFoto(id, { datos: Buffer.from('<script>alert(1)</script>').toString('base64') }, otra), /no es una foto/)
  const r = bib.agregarFoto(id, { datos: PNG, alias: 'Otra' }, otra)
  assert.equal(r.fotos.length, 1)
  assert.ok(fs.existsSync(path.join(bib.CARPETA_FOTOS, path.basename(r.fotos[0].url))))
  assert.throws(() => bib.borrarFoto(id, r.fotos[0].id, 'c'.repeat(32)), /Solo puedes borrar/)
  assert.equal(bib.borrarFoto(id, r.fotos[0].id, yo).fotos.length, 0) // la dueña de la receta también puede
})

test('busca y ordena', () => {
  bib.agregar({ receta: { ...receta, titulo: 'Arroz con pollo', ingredientes: [{ nombre: 'Arroz', cantidad: 2, unidad: 'tazas' }, { nombre: 'Pollo', cantidad: 1, unidad: 'kg' }] }, fuente: { tipo: 'texto' } }, otra)
  assert.equal(bib.listar({ q: 'pollo' }, yo).recetas.length, 1)
  assert.equal(bib.listar({ mias: true }, otra).recetas[0].titulo, 'Arroz con pollo')
  assert.equal(bib.listar({ orden: 'mejores' }, yo).recetas[0].titulo, 'Galletas Levain caseras')
})
