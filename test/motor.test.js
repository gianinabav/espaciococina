import test from 'node:test'
import assert from 'node:assert/strict'
import { leerLineaIngrediente, aBase } from '../server/libre/unidades.js'
import { leerRecetaTexto } from '../server/libre/receta-texto.js'
import { buscarIngrediente, nombreLocal, terminoBusqueda } from '../server/libre/glosario.js'
import { adaptarReceta } from '../server/libre/adaptar.js'
import { presentacionProducto } from '../server/libre/precios.js'
import { RECETA_EJEMPLO } from '../server/ejemplo.js'

test('lee cantidades, unidades y notas de una línea', () => {
  assert.deepEqual(
    { ...leerLineaIngrediente('1 1/2 lb boneless skinless chicken thighs'), original: undefined },
    { original: undefined, nombre: 'boneless skinless chicken thighs', cantidad: 1.5, unidad: 'lb', nota: '', opcional: false },
  )
  const ajo = leerLineaIngrediente('4 cloves garlic, minced')
  assert.equal(ajo.unidad, 'cloves')
  assert.equal(ajo.nota, 'minced')
  assert.equal(leerLineaIngrediente('½ cdta de comino').cantidad, 0.5)
  assert.equal(leerLineaIngrediente('2 tazas (250 g) de harina').cantidad, 250)
  assert.equal(leerLineaIngrediente('Sal y pimienta al gusto').unidad, 'al gusto')
  assert.equal(leerLineaIngrediente('1/4 cup parsley (optional)').opcional, true)
})

test('pasa medidas caseras a gramos con la densidad del ingrediente', () => {
  assert.equal(Math.round(aBase(1, 'cup', { gml: 0.53 }).cantidad), 127) // harina
  assert.equal(Math.round(aBase(1.5, 'lb', {}).cantidad), 680)
  assert.deepEqual(aBase(2, 'tbsp', { liquido: 1 }), { cantidad: 30, unidad: 'ml' })
})

test('separa título, porciones, ingredientes y pasos de una receta pegada', () => {
  const r = leerRecetaTexto(RECETA_EJEMPLO)
  assert.match(r.titulo, /Lemon Garlic Chicken/)
  assert.equal(r.porciones, 4)
  assert.equal(r.tiempo_total_min, 50)
  assert.equal(r.ingredientes.length, 12)
  assert.equal(r.pasos.length, 6)
  assert.equal(r.idioma, 'en')
})

test('traduce cada ingrediente al nombre que se usa en cada país, también marcas', () => {
  const vainita = buscarIngrediente('green beans').ing
  assert.equal(nombreLocal(vainita, 'PE'), 'vainita')
  assert.equal(nombreLocal(vainita, 'MX'), 'ejote')
  assert.equal(terminoBusqueda(vainita, 'AR'), 'chaucha')
  assert.equal(nombreLocal(buscarIngrediente('avocado').ing, 'CO'), 'aguacate')
  assert.equal(nombreLocal(buscarIngrediente('butter').ing, 'AR'), 'manteca')
  assert.equal(buscarIngrediente('Crisco').ing.id, 'manteca_vegetal')
  assert.equal(buscarIngrediente("Hellmann's mayo").ing.id, 'mayonesa')
  assert.equal(buscarIngrediente('nada que ver'), null)
})

test('adapta porciones, medidas, dieta e implementos sin IA', () => {
  const r = adaptarReceta(
    {
      titulo: 'Queque',
      porciones: 2,
      ingredientes: [
        { nombre: 'Huevos', cantidad: 2, unidad: 'unidad' },
        { nombre: 'Leche', cantidad: 1, unidad: 'tazas' },
        { nombre: 'Harina', cantidad: 1, unidad: 'tazas' },
      ],
      pasos: ['Bate los huevos con la leche.', 'Hornea a 350°F por 30 minutos.'],
    },
    { pais: 'PE', personas: 4, dietas: ['vegana'], implementos: ['cocina', 'olla'] },
  )
  assert.equal(r.porciones, 4)
  assert.equal(r.ingredientes[0].nombre, 'Linaza')
  assert.equal(r.ingredientes[1].nombre, 'Leche de almendras')
  assert.equal(r.ingredientes[1].cantidad, 480)
  assert.equal(r.ingredientes[1].unidad, 'ml')
  assert.match(r.pasos[0].texto, /huevos \(usa linaza\)/)
  assert.match(r.pasos[1].texto, /175 °C/)
  assert.equal(r.pasos[1].minutos, 30)
  assert.match(r.pasos[1].consejo, /Sin horno/)
  assert.ok(r.cambios.some((c) => c.tipo === 'dieta'))
  assert.ok(r.nutricion_por_porcion.calorias > 0)
})

test('entiende las presentaciones de los productos de las tiendas', () => {
  assert.deepEqual(presentacionProducto({ nombre: 'Vainita x kg', precio: 13.29, medida: 'kg', multiplicador: 0.25 }), { cantidad: 250, unidad: 'g', precio: 3.3225, descripcion: '250 g (a granel)' })
  const leche = presentacionProducto({ nombre: 'Leche Light GLORIA Lata 390g Paquete 6un', precio: 21.9, medida: 'un', multiplicador: 1 })
  assert.equal(leche.cantidad, 2340)
  assert.equal(presentacionProducto({ nombre: 'Huevos Pardos x 15un', precio: 9, medida: 'un', multiplicador: 1 }).cantidad, 15)
  assert.equal(presentacionProducto({ nombre: 'Aceite de Oliva 1 L', precio: 30, medida: 'un', multiplicador: 1 }).unidad, 'ml')
})

test('lee la receta de la descripción de un video sin tomar redes ni links', () => {
  const r = leerRecetaTexto(`🍌QUEQUE DE PLÁTANO | Mi canal
INGREDIENTES
4 tazas / 500 gr. Harina sin preparar.
1 cda. / 10 gr. Polvo de hornear.
½ cdta. Sal.
4 unid. Plátanos.
Facebook► https://www.facebook.com/micanal
Dale Like, comenta y suscríbete`)
  assert.equal(r.titulo, 'Queque de plátano')
  assert.deepEqual(r.ingredientes.map((i) => [i.cantidad, i.unidad, i.nombre]), [
    [500, 'gr', 'Harina sin preparar'],
    [10, 'gr', 'Polvo de hornear'],
    [0.5, 'cdta', 'Sal'],
    [4, 'unidad', 'Plátanos'],
  ])
  assert.equal(r.pasos.length, 0)
})

test('junta ingredientes repetidos y calcula el peso de cada galleta', async () => {
  const { juntarRepetidos } = await import('../server/libre/extraer.js')
  const { detectarPorcion } = await import('../server/libre/receta-texto.js')
  const juntos = juntarRepetidos([
    { nombre: 'Harina sin preparar', cantidad: 1.5, unidad: 'tazas', original: '1 1/2 cups Cake Flour', glosario_id: 'harina_pastelera' },
    { nombre: 'Harina sin preparar', cantidad: 1.5, unidad: 'tazas', original: '1 1/2 cups Flour', glosario_id: 'harina' },
  ])
  assert.equal(juntos.length, 1)
  assert.equal(juntos[0].cantidad, 3)
  assert.deepEqual(detectarPorcion('8', 'Levain Chocolate Chip Cookies'), { singular: 'galleta', plural: 'galletas' })
  assert.equal(detectarPorcion('Serves 4', 'Arroz con pollo'), null)

  const r = adaptarReceta(
    { titulo: 'Galletas', porciones: 8, porcion: { singular: 'galleta', plural: 'galletas' }, ingredientes: [...juntos, { nombre: 'Mantequilla', cantidad: 1, unidad: 'taza' }], pasos: [] },
    { pais: 'PE', personas: 8 },
  )
  assert.equal(r.ingredientes.length, 2)
  assert.equal(r.porcion.plural, 'galletas')
  assert.ok(r.peso_porcion_g > 50 && r.peso_porcion_g < 100) // (345 g harina + 230 g mantequilla) / 8
  assert.match(r.advertencias.join(' '), /1 1\/2 tazas.*3 cucharadas/)
})

test('no confunde la carne de un animal con la de otro ni los chiles mexicanos', () => {
  const id = (n) => buscarIngrediente(n)?.ing.id
  assert.equal(id('boneless blade-end loin or sirloin pork roast'), 'cerdo')
  assert.equal(id('sirloin steak'), 'res_bistec')
  assert.equal(id('2 whole ancho chiles'), 'chile_ancho')
  assert.equal(id('1 chipotle chile packed in adobo sauce'), 'chipotle')
  assert.equal(id('achiote powder or paste'), 'achiote')
  assert.equal(nombreLocal(buscarIngrediente('guajillo chiles').ing, 'PE'), 'ají panca')
})
