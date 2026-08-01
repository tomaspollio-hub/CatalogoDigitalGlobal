-- Migration number: 0005 	 2026-08-01T00:00:00.000Z

-- Permite editar la "ficha" de un producto desde /admin (nombre, marca,
-- fabricante, presentación) sin tocar src/products.json, que sigue siendo
-- la fuente de datos original del sistema de facturación. No incluye
-- "category": esa columna alimenta la detección de medicamento
-- (functions/_lib/products.js -> isMedication/categoryGroup), que bloquea
-- imágenes ilustrativas para medicamentos; dejarla fuera de este mecanismo
-- evita que un cambio de ficha reclasifique sin querer un producto y
-- esquive esa regla de compliance.

CREATE TABLE product_overrides (
  product_id   TEXT PRIMARY KEY,
  name         TEXT,
  brand        TEXT,
  manufacturer TEXT,
  presentation TEXT,
  updated_by   TEXT NOT NULL,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
