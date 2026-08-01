-- Migration number: 0006 	 2026-08-01T00:00:00.000Z

-- Amplía product_overrides para que /admin funcione como un backoffice real
-- de ficha de producto: descripción propia, mínimo de venta (pack/caja),
-- disponibilidad y ocultar del catálogo público (ej. quiebre de stock).
-- Sigue sin incluir "category" por el mismo motivo que la migración 0005
-- (evitar reclasificar sin querer un medicamento y esquivar el bloqueo de
-- imágenes ilustrativas).

ALTER TABLE product_overrides ADD COLUMN description TEXT;
ALTER TABLE product_overrides ADD COLUMN min_multiple INTEGER;
ALTER TABLE product_overrides ADD COLUMN disponibilidad TEXT CHECK (disponibilidad IN ('disponible', 'a_consultar', 'sin_stock'));
ALTER TABLE product_overrides ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0;
