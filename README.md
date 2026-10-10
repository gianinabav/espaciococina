# espaciococina

Cocina tu receta gastando lo justo, comiendo mejor y sin frustrarte, en cualquier país.

Pegas una receta (texto, foto o link), aunque esté en otro idioma o con medidas de otro país. La app:

1. **la traduce** con los nombres que se usan donde estás ("green beans" → vainita en Perú, ejote en México, chaucha en Argentina), y también resuelve marcas de otros países ("Crisco" → manteca vegetal, "Hellmann's" → mayonesa);
2. **la adapta** a tus porciones, medidas, dieta, objetivo e implementos de cocina;
3. **busca cada producto real** en los supermercados en línea de tu país (nombre, marca, presentación y precio de hoy) y arma la compra más barata según tu presupuesto;
4. **te manda a una tienda concreta**: el local más cercano de cada supermercado, con dirección, distancia, horario y botón "Cómo llegar", y además las bodegas, mercados y verdulerías reales de tu zona.

**No usa ninguna API pagada ni pide claves.** Todo sale de reglas propias y de fuentes públicas y gratuitas.

## Cómo usarla

Requisitos: Node.js 20 o más reciente y conexión a internet.

```bash
npm install
npm run dev
```

Abre http://localhost:5173. En tu perfil escribe tu zona y tu ciudad (por ejemplo "Miraflores, Lima") o usa "Usar mi ubicación".

## Qué hace cada pantalla

| Pantalla | Qué hace |
|---|---|
| Perfil | Pide país, zona o ubicación, idioma, presupuesto, porciones, dieta, alergias, objetivo e implementos |
| Nueva receta | Recibe la receta como texto, foto (leída con OCR en tu propio equipo) o link. Con un video de YouTube lee los ingredientes de la descripción o, si no están, la página de receta que el video enlaza |
| Ingredientes | Muestra lo que se leyó, ya traducido, para que lo corrijas |
| Receta adaptada | Muestra la receta con medidas en gramos y °C, reemplazos por dieta, consejos si te falta un implemento y nutrición aproximada. Las porciones se cambian con − / + |
| Compras | Marcas lo que ya tienes. Ves tres listas (la más barata, equilibrada y una sola parada) con productos reales y un carrito por supermercado, con su local más cercano y otras tiendas reales cerca |
| Sobrantes | Calcula lo que sobra según la presentación real que compraste, propone recetas para aprovecharlo y te dice cómo guardarlo |
| Cocinemos | Paso a paso a pantalla completa, con temporizadores y lectura en voz alta |
| Compartir | Lleva la receta y la lista (con producto, local y link al mapa) a WhatsApp, al portapapeles o a un archivo .txt |
| Recetario | Recetario compartido: cada receta que alguien adapta queda guardada. Se puede buscar, ordenar por mejor calificadas, calificar con estrellas y reseña, subir fotos de cómo quedó y "Cocinar esta receta". Quien la agregó puede editarla o borrarla |
| Mi refri | Guarda lo que tienes en casa: se descuenta de la compra y sugiere recetas con eso |

## De dónde sale cada dato

| Dato | Fuente | ¿Real? |
|---|---|---|
| Traducción de ingredientes y marcas | Glosario propio de más de 140 ingredientes con su nombre en 10 países (`server/libre/glosario.js`) | Sí |
| Medidas, porciones, dieta, implementos | Reglas propias (`server/libre/unidades.js`, `adaptar.js`) | Sí |
| Traducción de títulos y pasos | [MyMemory](https://mymemory.translated.net), gratis y sin clave, con un límite diario (los resultados se guardan) | Sí |
| Precios y productos | Catálogos en línea públicos de los supermercados (`server/libre/precios.js`) | **Sí, de hoy** |
| Tiendas cercanas y sucursales | [OpenStreetMap](https://www.openstreetmap.org) (Nominatim y Overpass) | Sí |
| Recetas para sobrantes y Mi refri | [TheMealDB](https://www.themealdb.com), con su clave pública de prueba | Sí |
| Fotos decorativas | Unsplash | — |

**Países con precios reales en línea:** Perú (Plaza Vea, Metro, Wong), México (Chedraui), Colombia (Éxito, Carulla, Olímpica) y Argentina (Carrefour, Vea, Disco, Jumbo). En los demás países los precios son **estimados** y aparecen marcados como tales; las tiendas cercanas sí son reales. Si un producto no aparece en línea, su precio también queda marcado como estimado.

Cada precio guarda su monto, moneda, fuente (la web de la tienda), fecha y estado (`en_linea` o `estimado`). Los catálogos se consultan con calma: pocas consultas a la vez y caché de 6 horas en `.cache/`.

## Estructura

```
server/
  index.js         API propia: /api/extraer, /adaptar, /precios, /tiendas, /sobrantes, /refri
  link.js          Lee páginas de recetas (usa schema.org/Recipe cuando existe)
  libre/           Motor gratuito
    unidades.js      Cantidades y unidades ("1 1/2 tazas", "8 oz", "4 dientes")
    receta-texto.js  Separa título, porciones, ingredientes y pasos; detecta el idioma
    glosario.js      Ingredientes por país, marcas, densidades, nutrición y dietas
    extraer.js       Paso 1: leer y traducir
    adaptar.js       Paso 2: adaptar al perfil
    precios.js       Productos y precios reales por supermercado
    tiendas.js       Tiendas y sucursales cercanas (OpenStreetMap)
    recetas.js       Recetas de TheMealDB para sobrantes y Mi refri
    traducir.js      Traducción gratuita con caché
src/
  App.jsx          Navegación y estado (perfil, receta en curso, historial, Mi refri)
  components/      Una pantalla por archivo
  lib/             Listas de compras, porciones, fotos y catálogos
test/              Pruebas (npm test), sin necesidad de internet
```

Modelo de datos: Usuario (perfil y ubicación), Receta (leída y adaptada), Ingrediente (nombre local, cantidad, unidad, categoría, término de búsqueda), Lugar de compra (supermercado y su sucursal), Precio (monto, moneda, fuente, fecha, estado), Lista de compras (carritos por lugar), Sobrante y Refri. Todo lo de la persona se guarda en su navegador (localStorage).

## Recetario compartido

- Se guarda en `datos/recetario.json` y las fotos en `datos/fotos/`, dentro de la carpeta de la app. No hay base de datos ni servicios externos.
- No hay cuentas: cada navegador crea una llave secreta que manda en cada pedido, y el servidor solo guarda una huella (hash) de ella. Con eso sabe qué recetas, fotos y reseñas son de cada persona. Si se borran los datos del navegador, se pierde la autoría de lo que se subió desde ahí.
- Cada persona deja una reseña por receta (la puede cambiar o borrar) y hasta 6 fotos por receta. Las fotos se revisan para confirmar que sean imágenes JPG, PNG o WEBP de hasta 3 MB.
- Si la misma receta (mismo link) se adapta otra vez, no se duplica: se suma a "cocinada N veces".

## Límites conocidos

- Los servicios gratuitos pueden fallar o estar saturados. OpenStreetMap a veces responde "504", y la app reintenta y ofrece un link de Google Maps como respaldo. MyMemory tiene un límite diario de traducción.
- Algunas páginas bloquean la lectura automática (protección anti-robots, error 403). En ese caso la app usa la copia pública que guarda el Internet Archive (archive.org) y avisa de qué fecha es. Si no hay copia, hay que pegar el texto.
- De YouTube no se pueden leer los subtítulos sin su API oficial: si un video no escribe la receta en la descripción ni enlaza una página con ella, hay que pegar los ingredientes a mano.
- La lectura de recetas usa reglas, no IA: funciona mejor con un ingrediente por línea. Si algo se lee mal, se corrige en la pantalla de Ingredientes.
- Los catálogos de los supermercados son públicos pero no oficiales: si una tienda cambia su web, hay que actualizar `server/libre/precios.js`.

## Publicar en Render (gratis)

1. Sube este proyecto a un repositorio de GitHub.
2. Entra a [render.com](https://render.com) con tu cuenta de GitHub.
3. **New → Blueprint**, elige el repositorio y confirma. Render lee `render.yaml`: instala, arma la app (`npm run build`) y la enciende (`npm start`) en el plan gratuito.
4. Cada vez que subas cambios a GitHub, Render la vuelve a publicar sola.

En el plan gratuito la app se duerme tras 15 minutos sin visitas (la siguiente tarda ~1 minuto en cargar) y **el recetario y las fotos se borran** cuando se reinicia, porque ese plan no guarda archivos.

Para compartirla desde tu Mac sin publicarla, usa `Compartir espaciococina.command` (link temporal de Cloudflare).

## Producción

```bash
npm run build
npm start
```
