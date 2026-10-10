// Catálogos compartidos entre el servidor (prompts y esquemas) y la interfaz.

// tasaUSD: unidades de moneda local por 1 USD (aproximada, solo para la demo).
// nivel: qué tan caro es el país frente a la referencia en USD (1 = igual).
export const PAISES = {
  PE: { nombre: 'Perú', moneda: 'PEN', simbolo: 'S/', tasaUSD: 3.75, nivel: 0.8, tienda: 'Bodega', mercado: 'Mercado', mayorista: 'Mercado mayorista' },
  MX: { nombre: 'México', moneda: 'MXN', simbolo: '$', tasaUSD: 18.5, nivel: 0.75, tienda: 'Tiendita', mercado: 'Mercado', mayorista: 'Central de abasto' },
  CO: { nombre: 'Colombia', moneda: 'COP', simbolo: '$', tasaUSD: 4100, nivel: 0.7, tienda: 'Tienda de barrio', mercado: 'Plaza de mercado', mayorista: 'Corabastos (mayorista)' },
  AR: { nombre: 'Argentina', moneda: 'ARS', simbolo: '$', tasaUSD: 1150, nivel: 0.85, tienda: 'Almacén', mercado: 'Verdulería y carnicería', mayorista: 'Mayorista' },
  CL: { nombre: 'Chile', moneda: 'CLP', simbolo: '$', tasaUSD: 940, nivel: 0.9, tienda: 'Almacén de barrio', mercado: 'Feria libre', mayorista: 'Vega (mayorista)' },
  EC: { nombre: 'Ecuador', moneda: 'USD', simbolo: '$', tasaUSD: 1, nivel: 0.75, tienda: 'Tienda de barrio', mercado: 'Mercado', mayorista: 'Mercado mayorista' },
  BO: { nombre: 'Bolivia', moneda: 'BOB', simbolo: 'Bs', tasaUSD: 6.9, nivel: 0.65, tienda: 'Tienda de barrio', mercado: 'Mercado', mayorista: 'Mercado mayorista' },
  ES: { nombre: 'España', moneda: 'EUR', simbolo: '€', tasaUSD: 0.92, nivel: 1.0, tienda: 'Tienda de barrio', mercado: 'Mercado municipal', mayorista: 'Cash & carry' },
  US: { nombre: 'Estados Unidos', moneda: 'USD', simbolo: '$', tasaUSD: 1, nivel: 1.25, tienda: 'Corner store', mercado: 'Farmers market', mayorista: 'Warehouse club' },
  BR: { nombre: 'Brasil', moneda: 'BRL', simbolo: 'R$', tasaUSD: 5.4, nivel: 0.8, tienda: 'Mercadinho', mercado: 'Feira livre', mayorista: 'Atacadão (mayorista)' },
}

export const IDIOMAS = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
  fr: 'Français',
}

export const DIETAS = [
  { id: 'vegetariana', nombre: 'Vegetariana' },
  { id: 'vegana', nombre: 'Vegana' },
  { id: 'sin_gluten', nombre: 'Sin gluten' },
  { id: 'sin_lactosa', nombre: 'Sin lactosa' },
  { id: 'baja_sodio', nombre: 'Baja en sodio' },
  { id: 'sin_cerdo', nombre: 'Sin cerdo' },
  { id: 'sin_mariscos', nombre: 'Sin mariscos' },
]

export const OBJETIVOS = [
  { id: 'rico_simple', nombre: 'Comer rico sin complicarme' },
  { id: 'mas_sano', nombre: 'Comer más sano' },
  { id: 'ahorrar', nombre: 'Ahorrar lo más posible' },
  { id: 'bajar_peso', nombre: 'Bajar de peso' },
  { id: 'ganar_musculo', nombre: 'Ganar músculo (más proteína)' },
  { id: 'controlar_azucar', nombre: 'Controlar el azúcar' },
]

export const IMPLEMENTOS = [
  { id: 'cocina', nombre: 'Cocina / hornillas' },
  { id: 'olla', nombre: 'Olla' },
  { id: 'sarten', nombre: 'Sartén' },
  { id: 'horno', nombre: 'Horno' },
  { id: 'microondas', nombre: 'Microondas' },
  { id: 'licuadora', nombre: 'Licuadora' },
  { id: 'batidora', nombre: 'Batidora' },
  { id: 'olla_presion', nombre: 'Olla a presión' },
  { id: 'freidora_aire', nombre: 'Freidora de aire' },
  { id: 'procesador', nombre: 'Procesador de alimentos' },
  { id: 'arrocera', nombre: 'Arrocera' },
  { id: 'balanza', nombre: 'Balanza de cocina' },
]

// Precio de referencia en USD para la demo: por kg (g), por litro (ml) o por unidad.
export const CATEGORIAS = {
  verdura: { nombre: 'Verduras', kg: 1.6, unidad: 0.35 },
  fruta: { nombre: 'Frutas', kg: 2.0, unidad: 0.3 },
  carne_roja: { nombre: 'Carnes', kg: 9.0, unidad: 2.5 },
  pollo: { nombre: 'Pollo', kg: 5.0, unidad: 2.0 },
  pescado_marisco: { nombre: 'Pescados y mariscos', kg: 10.0, unidad: 3.0 },
  lacteo: { nombre: 'Lácteos', kg: 2.2, unidad: 1.2 },
  queso: { nombre: 'Quesos', kg: 9.0, unidad: 3.0 },
  huevo: { nombre: 'Huevos', kg: 4.0, unidad: 0.22 },
  cereal_harina: { nombre: 'Harinas y cereales', kg: 1.5, unidad: 1.5 },
  pasta_arroz: { nombre: 'Arroz y pastas', kg: 1.8, unidad: 1.5 },
  legumbre: { nombre: 'Menestras y legumbres', kg: 2.4, unidad: 1.5 },
  aceite_grasa: { nombre: 'Aceites y grasas', kg: 4.0, unidad: 3.0 },
  especia_hierba: { nombre: 'Especias y hierbas', kg: 22.0, unidad: 0.6 },
  condimento_salsa: { nombre: 'Condimentos y salsas', kg: 5.0, unidad: 1.8 },
  azucar_dulce: { nombre: 'Azúcar y dulces', kg: 1.4, unidad: 1.5 },
  panaderia: { nombre: 'Panadería', kg: 3.2, unidad: 0.2 },
  frutos_secos: { nombre: 'Frutos secos y semillas', kg: 14.0, unidad: 2.0 },
  enlatado: { nombre: 'Enlatados', kg: 5.0, unidad: 1.6 },
  bebida: { nombre: 'Bebidas', kg: 1.4, unidad: 1.0 },
  otro: { nombre: 'Otros', kg: 5.0, unidad: 1.5 },
}

export const CATEGORIA_IDS = Object.keys(CATEGORIAS)
export const UNIDADES_BASE = ['g', 'ml', 'unidad']

export function nombreDe(lista, id) {
  return lista.find((x) => x.id === id)?.nombre ?? id
}

// "Plaza Vea, Metro y Wong"
export const enumerar = (lista) => new Intl.ListFormat('es', { type: 'conjunction' }).format(lista)
