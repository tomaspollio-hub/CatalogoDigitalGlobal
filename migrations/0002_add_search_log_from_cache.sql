-- Migration number: 0002 	 2026-07-30T12:32:41.370Z

-- Los hits de caché no cuentan contra BARCODE_LOOKUP_DAILY_LIMIT (no
-- consumen cupo del proveedor externo), pero igual quedan auditados.
ALTER TABLE search_log ADD COLUMN from_cache INTEGER NOT NULL DEFAULT 0;
