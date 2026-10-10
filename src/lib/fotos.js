// Fotos de ingredientes en primer plano (Unsplash, licencia libre: unsplash.com/license).
// Se cargan desde la web; si no hay internet, se ve el color de respaldo.
const u = (id, color) => ({ id, color })

export const FOTOS = {
  verdura: u('1542838132-92c53300491e', '#5d7a3a'),
  fruta: u('1610126176343-3e1833a107e1', '#e2b632'),
  carne_roja: u('1603048297172-c92544798d5a', '#8e2f25'),
  pollo: u('1604503468506-a8da13d82791', '#d9a383'),
  pescado_marisco: u('1635843097783-dda76d61f7d9', '#7d8b94'),
  lacteo: u('1644346402970-d8d7304ff82f', '#e9e6df'),
  queso: u('1552767059-ce182ead6c1b', '#e2bb5c'),
  huevo: u('1506976785307-8732e854ad03', '#c99568'),
  cereal_harina: u('1504400739660-22ebeb14f00a', '#d8d2c6'),
  pasta_arroz: u('1586201375761-83865001e31c', '#ece6da'),
  legumbre: u('1564894809611-1742fc40ed80', '#9b6b45'),
  aceite_grasa: u('1474979266404-7eaacbcd87c5', '#b59a2e'),
  especia_hierba: u('1509359149003-657ef23eaf04', '#a5562b'),
  condimento_salsa: u('1752627559682-9b7f0f0ded4e', '#a8321f'),
  azucar_dulce: u('1709651808265-977ed7ef78c6', '#eeeae4'),
  panaderia: u('1549413468-cd78edb7e75c', '#b07a45'),
  frutos_secos: u('1573555657105-47a0bb37c3ea', '#cfa774'),
  enlatado: u('1669855148276-bbaf3c1ab6de', '#b3271b'),
  bebida: u('1517701550927-30cf4ba1dba5', '#6b4128'),
  otro: u('1550989460-0adf9ea622e2', '#6c7f3c'),
  // Para portadas y secciones
  tomate: u('1669855148276-bbaf3c1ab6de', '#b3271b'),
  cebolla: u('1575475240735-0b191257c762', '#e8e1d8'),
  crema: u('1585945037805-5fd82c2e60b1', '#ece4d6'),
  especias: u('1758745464235-ccb8c1253074', '#b4592a'),
  aji: u('1567539549213-cc1697632146', '#a5231a'),
  palta: u('1523049673857-eb18f1d7b578', '#6f8b33'),
  papa: u('1518977676601-b53f82aba655', '#b8915f'),
  hierbas: u('1448935852404-7a38bb46f5b3', '#3f6b2d'),
  limon: u('1582287104445-6754664dbdb2', '#e8c53a'),
  plato: u('1546069901-ba9599a7e63c', '#c9a27a'),
  // Platos ya servidos, para las portadas de cada receta
  plato_pollo: u('1598103442097-8b74394b95c6', '#8a5a33'),
  plato_carne: u('1600891964092-4316c288032e', '#6b3a26'),
  plato_pescado: u('1600699899970-b1c9fadd8f9e', '#b9b2a4'),
  plato_arroz: u('1512058564366-18510be2db19', '#c79a4f'),
  plato_pasta: u('1608897013039-887f21d8c804', '#b5462c'),
  plato_huevo: u('1510693206972-df098062cb71', '#d8b04a'),
  plato_ensalada: u('1512621776951-a57141f2eefd', '#5b7f36'),
  plato_sopa: u('1642497394078-4794e837019c', '#d27a2c'),
  plato_galletas: u('1499636136210-6f4ee915583e', '#a8703e'),
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
  [/cebolla|ajo\b|onion|garlic/i, 'cebolla'],
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
