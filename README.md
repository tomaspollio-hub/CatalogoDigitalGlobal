# Catálogo Mayorista — Farmacias Global

Catálogo B2B sin precios: buscador con sugerencias, filtro por categoría, pedido en un drawer
(no un sidebar fijo), cantidades en múltiplos del mínimo de cada producto (editables a mano o
con +/-), historial de pedidos con "Repetir pedido", y generación de la solicitud por WhatsApp
o email. HTML + CSS + JS plano, sin frameworks ni build step.

La identidad visual (colores, tipografía, componentes) está tomada del proyecto `proyecto-isumos`
para mantener coherencia entre ambos sistemas.

## Decisiones de UX (revisión de Product Design)

- **El pedido es un drawer, no un sidebar fijo.** Se abre desde el botón "Mi pedido" del header
  (con badge de unidades) y se desliza desde la derecha en desktop / desde abajo en mobile. Así
  el catálogo usa el 100% del ancho disponible en vez de perder una columna permanente.
- **Cantidad editable a mano.** Además de los botones +/-, cada control de cantidad tiene un
  input numérico que ajusta automáticamente al múltiplo válido más cercano al perder el foco.
- **Historial y "Repetir pedido"** ("Mis pedidos" en el header): guarda cada solicitud enviada en
  `localStorage` y permite recargarla al carrito en un clic — clave para compras recurrentes.
- **Expectativa post-envío explícita**: la pantalla de éxito aclara que es una solicitud de
  presupuesto, no una compra confirmada, y cuándo se van a poner en contacto.
- **Indicador de paso** ("Paso 2 de 2") en el formulario de datos de contacto.
- **Chips de categoría con scroll horizontal en mobile** en vez de envolver en varias filas,
  para no empujar el catálogo fuera de la primera pantalla.

## Estructura

```
/
├── index.html          # Marca, buscador, grid, carrito, modales
├── src/
│   ├── config.js        # Datos del negocio (nombre, WhatsApp, email de ventas)
│   ├── styles.css        # Design tokens + componentes
│   ├── app.js            # Lógica: catálogo, carrito, checkout, envío
│   └── products.json      # Catálogo de productos (editar acá para cargar productos reales)
└── public/
    └── img/
        └── placeholder.svg  # Imagen de fallback para productos sin foto
```

## Configuración

Editar `src/config.js` con los datos reales del negocio:

```js
export const CONFIG = {
  businessName: "Farmacias Global",
  businessTagline: "Soluciones Corporativas",
  whatsappNumber: "5492994566662",   // código de país + número, sin "+" ni espacios
  salesEmail: "pedidosweb@farmaciasglobal.com.ar",
};
```

## Productos

`src/products.json` tiene **100 productos reales** del rubro medicinal, extraídos del export
del sistema (`Grupos_de_Productos_10-7-2026.xlsx`, ~7.761 productos totales incluyendo
perfumería/cosmética — se filtró solo la parte medicinal para esta primera carga). Cada
producto tiene esta forma:

```json
{
  "sku": "A88900648",
  "barcode": "7793640002093",
  "name": "Actron Ped 4% Susp X 100 Ml",
  "brand": "Actron",
  "manufacturer": "Bayer Consumer",
  "category": "Analgésicos y Antiinflamatorios",
  "presentation": "x 100 ML",
  "minMultiple": 1,
  "disponibilidad": "disponible",
  "controlado": false,
  "description": "Comercializado por Bayer Consumer. Categoría: Analgésicos y Antiinflamatorios."
}
```

- `minMultiple`: el carrito solo permite cantidades en múltiplos de este número. **Viene en 1
  para los 100 productos reales porque el export del sistema no trae esta regla de negocio** —
  hay que revisarlo producto por producto (o por categoría) antes de que sea definitivo.
- `disponibilidad`: `"disponible"` | `"a_consultar"` | `"sin_stock"`. Los 3 productos controlados
  (Tramadol, Midazolam, Somit) quedaron en `"a_consultar"` a propósito.
- `controlado`: `true` en los 3 casos detectados como sustancia controlada (por nombre y por la
  categoría "Hipnótico" del sistema de origen) — revisar si además de la advertencia querés
  sacarlos directamente de un catálogo autoservicio.
- `name`: viene del sistema de origen con abreviaturas propias del rubro (ej. "COMP", "SUSP",
  "AMP") — no se reescribió para no alterar información real del producto. Puede necesitar una
  pasada editorial.
- `brand` / `manufacturer`: `brand` es la marca comercial (ej. "Actron"), `manufacturer` el
  laboratorio/empresa (ej. "Bayer Consumer") — puede haber inconsistencias puntuales heredadas
  del sistema de origen (ver `tools/enrichment/data/product-import-audit.json` para trazabilidad
  completa nombre original → nombre limpio, por si hay que auditar algo).

Para cargar el resto del catálogo (los ~7.660 productos restantes, incluida perfumería) o para
volver a generar esta selección con otros criterios, avisá — el proceso de extracción y limpieza
quedó armado y es reproducible sobre el Excel original.

Para imágenes de producto: agregar los archivos a `public/img/` y cambiar `PLACEHOLDER_IMG` en
`src/app.js` por la lógica que arme la ruta según el producto (por ejemplo, un campo `"image"` en
`products.json` apuntando a `public/img/productos/<sku>.jpg`).

## Correr localmente

El sitio usa `fetch()` y ES modules, que no funcionan abriendo el `index.html` directo desde
`file://`. Hace falta un servidor HTTP local:

```bash
# Python 3
python3 -m http.server 8000
# Abrir http://localhost:8000

# o con Node
npx serve .
```

## Publicar en Cloudflare Pages

Es un sitio estático puro — no requiere build.

### Opción A: conectar el repo desde el dashboard

1. Subir el proyecto a GitHub:
   ```bash
   git init
   git add .
   git commit -m "Catálogo mayorista inicial"
   git branch -M main
   git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
   git push -u origin main
   ```
2. Entrar a [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create
   application** → pestaña **Pages** → **Connect to Git**.
3. Elegir el repositorio recién subido.
4. En la configuración de build:
   - **Framework preset**: `None`
   - **Build command**: (dejar vacío)
   - **Build output directory**: `/`
5. **Save and Deploy**. Cloudflare va a servir la raíz del repo tal cual.

### Opción B: deploy directo con Wrangler

```bash
npm install -g wrangler
wrangler pages deploy . --project-name=catalogo-mayorista
```

Wrangler pide login la primera vez (`wrangler login`) y crea el proyecto si no existe.

## Diseño

Ver el resumen de tokens de diseño (colores, tipografía, componentes) compartido en la
conversación de desarrollo — todos los valores están declarados como variables CSS al inicio de
`src/styles.css`.
