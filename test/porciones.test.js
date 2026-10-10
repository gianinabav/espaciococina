import test from 'node:test'
import assert from 'node:assert/strict'
import { escalarReceta, escalarTexto } from '../src/lib/porciones.js'

test('escala números, fracciones y números mixtos del texto', () => {
  assert.equal(escalarTexto('680 g (unas 6 piezas)', 0.5), '340 g (unas 3 piezas)')
  assert.equal(escalarTexto('1/2 cucharadita (1 g)', 2), '1 cucharadita (2 g)')
  assert.equal(escalarTexto('3/4 de cucharadita (4 g)', 2), '1 1/2 de cucharadita (8 g)')
  assert.equal(escalarTexto('1 1/2 tazas', 0.5), '3/4 tazas')
  assert.equal(escalarTexto('2 cucharadas (30 ml)', 1.5), '3 cucharadas (45 ml)')
  assert.equal(escalarTexto('1 cucharada (14 g)', 0.25), '1/4 cucharada (4 g)')
})

test('escalar la receta cambia porciones y cantidades, no el original', () => {
  const base = { porciones: 4, ingredientes: [{ nombre: 'Pollo', cantidad: 680, unidad: 'g', cantidad_texto: '680 g (unas 6 piezas)' }] }
  const doble = escalarReceta(base, 8)
  assert.equal(doble.porciones, 8)
  assert.equal(doble.escaladaDesde, 4)
  assert.equal(doble.ingredientes[0].cantidad, 1360)
  assert.equal(doble.ingredientes[0].cantidad_texto, '1360 g (unas 12 piezas)')
  assert.equal(base.ingredientes[0].cantidad, 680)
  assert.equal(escalarReceta(base, 4), base)
})
