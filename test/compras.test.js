import test from 'node:test'
import assert from 'node:assert/strict'
import { armarListas, calcularSobrantes, itemsAComprar, linkCarrito, linkRappi } from '../src/lib/compras.js'

const usuario = { pais: 'PE', zona: 'Miraflores' }
const receta = {
  ingredientes: [
    { nombre: 'Papa', cantidad: 450, unidad: 'g', categoria: 'verdura', presentacion: { cantidad: 1000, unidad: 'g', descripcion: '1 kg' }, alternativa_economica: { nombre: '' } },
    { nombre: 'Aceite de oliva', cantidad: 30, unidad: 'ml', categoria: 'aceite_grasa', presentacion: { cantidad: 500, unidad: 'ml', descripcion: '500 ml' }, alternativa_economica: { nombre: 'Aceite vegetal', categoria: 'aceite_grasa' } },
    { nombre: 'Sal', cantidad: 4, unidad: 'g', categoria: 'condimento_salsa', despensa: true, presentacion: { cantidad: 1000, unidad: 'g', descripcion: '1 kg' }, alternativa_economica: { nombre: '' } },
    { nombre: 'Agua', cantidad: 100, unidad: 'ml', categoria: 'bebida', sin_compra: true, presentacion: { cantidad: 1000, unidad: 'ml', descripcion: '1 l' }, alternativa_economica: { nombre: '' } },
  ],
}
const real = (lugarId, monto, cantidad, unidad, paquetes = 1) => ({ lugarId, producto: { nombre: 'x', marca: 'y', url: 'https://x' }, presentacion: { cantidad, unidad, descripcion: `${cantidad} ${unidad}` }, precio: { monto, moneda: 'PEN', estado: 'en_linea' }, paquetes, subtotal: monto * paquetes })
const catalogo = {
  cadenas: [
    { id: 'a', nombre: 'Súper A', web: 'https://a' },
    { id: 'b', nombre: 'Súper B', web: 'https://b' },
  ],
  cotizaciones: {
    0: { a: real('a', 2, 500, 'g'), b: real('b', 3, 1000, 'g') },
    1: { a: real('a', 15, 200, 'ml') },
  },
}

test('lo que ya se tiene, lo que no se compra y las alternativas', () => {
  const items = itemsAComprar(receta, { yaTengo: { 2: true }, economicos: { 1: true } })
  assert.deepEqual(items.map((i) => i.nombre), ['Papa', 'Aceite vegetal'])
})

test('las listas usan precios reales y estiman solo lo que no apareció en línea', () => {
  const items = itemsAComprar(receta, { yaTengo: { 2: true } })
  const listas = armarListas(items, usuario, catalogo)
  // A tiene todo en línea y más barato: las tres listas serían iguales, así que queda una sola.
  assert.equal(listas.length, 1)
  assert.equal(listas[0].total, 17)
  assert.equal(listas[0].estimados, 0)
  assert.equal(listas[0].carritos[0].lugar.id, 'a')
  const soloB = armarListas(items, usuario, { ...catalogo, cadenas: [catalogo.cadenas[1]] })
  assert.equal(soloB[0].estimados, 1)
  assert.equal(soloB[0].carritos[0].items.find((i) => i.nombre === 'Aceite de oliva').precio.estado, 'estimado')
})

test('la más barata nunca cuesta más que la equilibrada ni que una sola parada, y no viaja por centavos', () => {
  const items = itemsAComprar(receta)
  const cat = {
    ...catalogo,
    cotizaciones: {
      0: { a: real('a', 6, 500, 'g'), b: real('b', 2, 500, 'g') }, // en B se ahorra S/ 4: vale la vuelta
      1: { a: real('a', 10, 200, 'ml'), b: real('b', 9.6, 200, 'ml') }, // en B se ahorra S/ 0,40: no vale
      2: { a: real('a', 1, 1000, 'g'), b: real('b', 9, 1000, 'g') }, // A es la tienda base (más barata en total)
    },
  }
  const listas = armarListas(items, usuario, cat)
  const porId = Object.fromEntries(listas.map((l) => [l.id, l]))
  const unaParada = porId.una_parada
  const barata = porId.barata ?? porId.equilibrada
  assert.ok(barata.total <= unaParada.total)
  const aceite = barata.carritos.flatMap((c) => c.items).find((i) => i.nombre === 'Aceite de oliva')
  assert.equal(unaParada.carritos[0].lugar.id, 'a')
  assert.equal(aceite.lugarId, 'a') // se queda donde ya se compra todo
  assert.equal(barata.carritos.flatMap((c) => c.items).find((i) => i.nombre === 'Papa').lugarId, 'b')
})

test('sin supermercados en línea, todo es estimado y por tipo de lugar', () => {
  const listas = armarListas(itemsAComprar(receta), { pais: 'CL' }, null)
  assert.ok(listas.every((l) => l.estimados === l.carritos.reduce((s, c) => s + c.items.length, 0)))
})

test('los sobrantes salen de la presentación real comprada', () => {
  const [barata] = armarListas(itemsAComprar(receta, { yaTengo: { 2: true } }), usuario, catalogo)
  const papa = calcularSobrantes(barata).find((s) => s.nombre === 'Papa')
  assert.equal(papa.cantidad, 50) // compra 500 g, usa 450 g
  assert.equal(calcularSobrantes(barata).find((s) => s.nombre === 'Aceite de oliva').cantidad, 170)
})

test('arma el link que llena el carrito solo con productos en línea', () => {
  const carrito = {
    lugar: { web: 'https://www.wong.pe', carrito: true },
    items: [
      { producto: { sku: '43931', vendedor: '1' }, paquetes: 2, precio: { estado: 'en_linea' } },
      { producto: null, paquetes: 1, precio: { estado: 'estimado' } },
    ],
  }
  const link = linkCarrito(carrito)
  assert.equal(link.url, 'https://www.wong.pe/checkout/cart/add?sku=43931&qty=2&seller=1&sc=1')
  assert.equal(link.faltan, 1)
  assert.equal(linkCarrito({ ...carrito, lugar: { web: 'https://www.vea.com.ar' } }), null)
})

test('lleva cada producto a Rappi Turbo en Perú y a la búsqueda de Rappi en otros países', () => {
  assert.equal(linkRappi('ají panca', 'PE'), 'https://www.rappi.com.pe/tiendas/27352-turbo/s?term=aj%C3%AD%20panca')
  assert.equal(linkRappi('arroz', 'MX'), 'https://www.rappi.com.mx/search?query=arroz')
  assert.equal(linkRappi('arroz', 'ES'), null)
})
