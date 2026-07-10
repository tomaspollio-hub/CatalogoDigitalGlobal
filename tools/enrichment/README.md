# Enriquecimiento de catálogo — Etapa 1 (modo prueba)

Herramienta separada del sitio público. Busca, valida y puntúa candidatos de imagen para
productos del catálogo. **En esta etapa no descarga, procesa ni asigna ninguna imagen** — solo
busca y genera un reporte.

No forma parte del build de Cloudflare Pages ni se despliega. Vive en `/tools/enrichment/` y se
corre manualmente desde tu máquina.

## Cómo correr la Etapa 1

```bash
cd tools/enrichment
node run-test.js
```

Genera `data/enrichment-report.json` con un candidato evaluado por cada uno de los primeros 10
productos de `src/products.json`. No modifica `products.json`, no toca `/public`, no descarga
ninguna imagen real.

## Qué hace hoy (y qué no)

- **Selecciona candidatos**: productos sin imagen asignada (`candidate-selector.js`).
- **Busca**: en esta etapa no hay ninguna API de búsqueda de imágenes contratada, así que el
  "resultado de búsqueda" viene de `data/manual-search-results.json` — investigación real hecha
  a mano (con búsqueda web) para los 10 productos de prueba, simulando el rol que en Etapa 3
  cumpliría una API real (Google Custom Search / Bing Image Search / SerpApi).
- **Puntúa**: `confidence-scorer.js` aplica los pesos y umbrales definidos en `config.js`.
- **Reporta**: escribe el resultado completo (score, desglose, fuente, motivo) a
  `enrichment-report.json`. No asigna nada.

## Resultado de esta corrida

Los 10 productos actuales usan **GTIN de ejemplo** (inventados para el catálogo demo, no existen
realmente). Por diseño, ninguna fuente real puede confirmar coincidencia de GTIN sobre esos
códigos — y esa es la señal con más peso del sistema (30 de 100 puntos). Resultado:

| SKU | Producto | Fuente | Tipo | Score | Estado |
|---|---|---|---|---|---|
| AB-001 | Amoxicilina 500mg | roemmers.com.ar | fabricante | **68** | rechazado |
| AN-002 | Paracetamol 500mg | adium.com.ar | fabricante | 67 | rechazado |
| AB-003 | Cefalexina 500mg | roemmers.com.ar | fabricante | 67 | rechazado |
| AN-003 | Diclofenac Sódico 75mg | quimfar.com | fabricante | 65 | rechazado |
| AS-002 | Alcohol Etílico 96° | bialcohol.com.ar | fabricante | 66 | rechazado |
| AS-001 | Alcohol en Gel 70% | victorylimpieza.com.ar | fabricante | 64 | rechazado |
| AN-001 | Ibuprofeno 600mg | farmatodo.com.ar | distribuidor | 63 | rechazado |
| AN-004 | Tramadol Clorhidrato 50mg | adium.com.ar | fabricante | 52 | rechazado (+ controlado) |
| AB-002 | Azitromicina 500mg | adium.com.ar | fabricante | 51 | rechazado |
| AS-003 | Gasas Estériles 10x10cm | insumosodontologicosweb.com.ar | distribuidor | 43 | rechazado |

**Los 10 quedaron rechazados** — ninguno cruzó ni el piso de revisión manual (70). El mejor caso
(Amoxicilina, con sitio oficial de Roemmers y presentación exacta confirmada) quedó a solo 2
puntos del umbral de revisión manual, únicamente por no poder confirmar el GTIN.

**Esto valida el comportamiento de seguridad esperado**: sin GTIN confirmado, el sistema nunca
llega a asignar automáticamente una imagen (imposible matemáticamente con los pesos actuales:
sin los 30 puntos de GTIN, el máximo teórico es 70, exactamente el piso de revisión manual) — ni
siquiera cuando el resto de las señales (marca, presentación, fuente oficial) son casi perfectas.
Con GTIN real confirmado, varios de estos candidatos probablemente hubieran cruzado a revisión
manual o incluso a asignación automática.

## Qué falta para las próximas etapas

- **Etapa 2** (revisión manual + procesamiento): pantalla de revisión (imagen actual/encontrada,
  score, motivos, aprobar/rechazar/re-buscar) y el pipeline de procesamiento real con Pillow
  (resize, fondo, recorte, WebP, 1200×1200). Falta decidir la pieza de eliminación de fondo:
  no hay librería instalada (`rembg` requiere descargar un modelo de ~176MB) o una API paga
  (remove.bg, Clipdrop) — a definir antes de esta etapa.
- **Etapa 3** (asignación automática): requiere una API de búsqueda de imágenes real contratada
  y su conector en `config.js` (`imageSearchProvider`). Sin eso, no hay forma de que el sistema
  busque por sí solo — hoy la búsqueda la hice yo a mano para esta prueba.
- **Etapa 4** (ejecución programada / masiva): evaluar si migrar de "script local" a un backend
  real (Cloudflare Workers + D1 + R2 + Cron Trigger) para poder correr sin intervención humana.

## Archivos de este módulo

```
tools/enrichment/
├── package.json
├── config.js                     # umbrales, pesos, proveedor de búsqueda (sin configurar)
├── candidate-selector.js         # qué productos necesitan enriquecimiento
├── confidence-scorer.js          # cálculo del puntaje de confianza
├── run-test.js                   # orquestador de la Etapa 1
├── data/
│   ├── manual-search-results.json  # investigación real (Etapa 1, sin API)
│   └── enrichment-report.json      # salida generada por run-test.js
└── README.md
```
