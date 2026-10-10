// Fotos de ingredientes en primer plano (Unsplash, licencia libre: unsplash.com/license).
// Se cargan desde la web; si no hay internet, se ve el color de respaldo.
const u = (id, color) => ({ id, color })

export const FOTOS = {
  verdura: u('1542838132-92c53300491e', '#5d7a3a'),
  fruta: u('1601004890684-d8cbf643f5f2', '#c9d36a'),
  carne_roja: u('1603048297172-c92544798d5a', '#8e2f25'),
  pollo: u('1604503468506-a8da13d82791', '#d9a383'),
  pescado_marisco: u('1635843097783-dda76d61f7d9', '#7d8b94'),
  lacteo: u('1576186726115-4d51596775d1', '#e9e6df'),
  queso: u('1552767059-ce182ead6c1b', '#e2bb5c'),
  huevo: u('1536816579748-4ecb3f03d72a', '#d9c7a6'),
  cereal_harina: u('1504400739660-22ebeb14f00a', '#d8d2c6'),
  pasta_arroz: u('1586201375761-83865001e31c', '#ece6da'),
  legumbre: u('1613728913084-090a0d106c3a', '#e4dccb'),
  aceite_grasa: u('1563822249310-5b066ba85162', '#e8d9a0'),
  especia_hierba: u('1509359149003-657ef23eaf04', '#a5562b'),
  condimento_salsa: u('1752627559682-9b7f0f0ded4e', '#a8321f'),
  azucar_dulce: u('1709651808265-977ed7ef78c6', '#eeeae4'),
  panaderia: u('1549413468-cd78edb7e75c', '#b07a45'),
  frutos_secos: u('1573555657105-47a0bb37c3ea', '#cfa774'),
  enlatado: u('1669855148276-bbaf3c1ab6de', '#b3271b'),
  bebida: u('1517701550927-30cf4ba1dba5', '#6b4128'),
  otro: u('1550989460-0adf9ea622e2', '#6c7f3c'),
  // Para portadas y secciones
  tomate: u('1692737003338-f2071356a62b', '#c23a2a'),
  cebolla: u('1612679300857-0b7600449e68', '#8a3a55'),
  crema: u('1585945037805-5fd82c2e60b1', '#ece4d6'),
  especias: u('1758745464235-ccb8c1253074', '#b4592a'),
  aji: u('1567539549213-cc1697632146', '#a5231a'),
  palta: u('1677555024309-19edb4a1d40e', '#7d9a3c'),
  papa: u('1615139679227-446ab0cfe88d', '#7a95b8'),
  hierbas: u('1448935852404-7a38bb46f5b3', '#3f6b2d'),
  limon: u('1610833805553-43556a0f821d', '#e8c53a'),
  ajo: u('1501420193726-1f65acd36cda', '#e9e4da'),
  fresa: u('1554118879-e459bb1fe1ca', '#e7a7b0'),
  platano: u('1593479815261-f092750c5046', '#e5c94a'),
  palta_2: u('1560155016-bd4879ae8f21', '#c9d7b5'),
  fresa_cortada: u('1687125106218-3c7a1963bd6e', '#d8463c'),
  plato: u('1785960160415-8877ea3b25c2', '#d8cfc0'),
  // Platos ya servidos, para las portadas de cada receta
  plato_pollo: u('1594221708779-94832f4320d1', '#b07a45'),
  plato_carne: u('1600891964092-4316c288032e', '#6b3a26'),
  plato_pescado: u('1600699899970-b1c9fadd8f9e', '#b9b2a4'),
  plato_arroz: u('1610663711502-35f870cfaea2', '#ece6da'),
  plato_pasta: u('1608897013039-887f21d8c804', '#b5462c'),
  plato_huevo: u('1510693206972-df098062cb71', '#d8b04a'),
  plato_ensalada: u('1512621776951-a57141f2eefd', '#5b7f36'),
  plato_sopa: u('1642497394078-4794e837019c', '#d27a2c'),
  plato_galletas: u('1557310717-d6bea9f36682', '#a8703e'),
  plato_torta: u('1517427294546-5aa121f68e8a', '#4a2a1d'),
  plato_muffin: u('1607958996333-41aef7caefaa', '#8a5a33'),
  plato_brownie: u('1515037893149-de7f840978e2', '#3b2418'),
  plato_panqueque: u('1528207776546-365bb710ee93', '#c78a46'),
  plato_pan: u('1534620808146-d33bb39128b2', '#c79a5f'),
}

export function urlFoto(clave, ancho = 800) {
  const foto = FOTOS[clave] ?? FOTOS.otro
  return `https://images.unsplash.com/photo-${foto.id}?w=${ancho}&q=72&auto=format&fit=crop`
}

export function colorFoto(clave) {
  return (FOTOS[clave] ?? FOTOS.otro).color
}

// Foto más precisa según el nombre del ingrediente; si no hay, la de su categoría.
const POR_NOMBRE = [
  [/papa|patata|potato/i, 'papa'],
  [/lim[oó]n|lima\b|lemon/i, 'limon'],
  [/\bajos?\b|garlic/i, 'ajo'],
  [/cebolla|onion/i, 'cebolla'],
  [/fresa|frutilla|strawberr/i, 'fresa'],
  [/pl[aá]tano|banana/i, 'platano'],
  [/huevo|egg/i, 'huevo'],
  [/perejil|culantro|cilantro|albahaca|hierbabuena|parsley|basil/i, 'hierbas'],
  [/tomate|tomato/i, 'tomate'],
  [/palta|aguacate|avocado/i, 'palta'],
  [/aj[ií]\b|chile|rocoto|pimiento|chili|pepper/i, 'aji'],
  [/crema|mayonesa|yogur/i, 'crema'],
]

export function claveIngrediente(nombre = '', categoria = 'otro') {
  return POR_NOMBRE.find(([patron]) => patron.test(nombre))?.[1] ?? categoria
}

// Foto de plato servido según el título de la receta.
const PLATO_POR_TITULO = [
  [/galleta|cookie|biscoito|alfajor/i, 'plato_galletas'],
  [/brownie/i, 'plato_brownie'],
  [/muffin|cupcake|magdalena/i, 'plato_muffin'],
  [/torta|pastel|queque|keke|bizcocho|cake|kuchen|cheesecake|pie\b/i, 'plato_torta'],
  [/pancake|panqueque|hotcake|waffle|wafle|crepe/i, 'plato_panqueque'],
  [/\bpan\b|bread|pancito|focaccia|baguette/i, 'plato_pan'],
  [/tortilla|omelet|huevo|egg/i, 'plato_huevo'],
  [/arroz|chaufa|risotto|rice/i, 'plato_arroz'],
  [/sopa|crema|caldo|soup|guiso|lenteja|menestra/i, 'plato_sopa'],
  [/ensalada|salad|bowl/i, 'plato_ensalada'],
  [/pasta|fideo|tallar|spaghetti|lasa/i, 'plato_pasta'],
  [/pollo|chicken/i, 'plato_pollo'],
  [/pescado|ceviche|fish|salm[oó]n|at[uú]n/i, 'plato_pescado'],
  [/carne|res\b|lomo|steak|beef/i, 'plato_carne'],
]

export function fotoPlato(titulo = '', porDefecto = 'plato') {
  return PLATO_POR_TITULO.find(([patron]) => patron.test(titulo))?.[1] ?? porDefecto
}
