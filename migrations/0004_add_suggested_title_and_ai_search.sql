-- Migration number: 0004 	 2026-07-31T00:00:00.000Z

-- Agrega título sugerido (para el buscador por IA, que además de la foto
-- puede proponer un nombre mejor que el del sistema de facturación) y
-- suma 'ai_search' como origen válido de búsqueda. SQLite no permite
-- ALTER de un CHECK constraint, así que se recrea la tabla (sin datos
-- todavía en producción a esta altura).

CREATE TABLE product_images_new (
  id                    TEXT PRIMARY KEY,
  product_id            TEXT NOT NULL,
  source_name           TEXT NOT NULL,
  source_image_url      TEXT NOT NULL,
  source_page_url       TEXT,
  original_storage_path TEXT,
  catalog_storage_path  TEXT,
  thumbnail_storage_path TEXT,
  search_type           TEXT NOT NULL CHECK (search_type IN ('barcode', 'text', 'manual', 'ai_search')),
  search_query           TEXT NOT NULL,
  matched_barcode        TEXT,
  confidence_score        INTEGER NOT NULL DEFAULT 0,
  match_reasons           TEXT NOT NULL DEFAULT '[]',
  status                  TEXT NOT NULL DEFAULT 'candidate' CHECK (
                             status IN ('candidate', 'processing', 'pending_review', 'approved', 'rejected', 'failed')
                           ),
  is_primary               INTEGER NOT NULL DEFAULT 0,
  is_illustrative           INTEGER NOT NULL DEFAULT 0,
  suggested_title           TEXT, -- propuesta de nombre de mostrador, mejor que el de facturación (búsqueda IA)
  approved_by                TEXT,
  approved_at                 TEXT,
  rejected_by                  TEXT,
  rejected_at                   TEXT,
  error_message                 TEXT,
  original_width                 INTEGER,
  original_height                 INTEGER,
  low_res_warning                  INTEGER NOT NULL DEFAULT 0,
  created_at                     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                      TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO product_images_new
  (id, product_id, source_name, source_image_url, source_page_url,
   original_storage_path, catalog_storage_path, thumbnail_storage_path,
   search_type, search_query, matched_barcode, confidence_score, match_reasons,
   status, is_primary, is_illustrative,
   approved_by, approved_at, rejected_by, rejected_at, error_message,
   original_width, original_height, low_res_warning,
   created_at, updated_at)
SELECT
  id, product_id, source_name, source_image_url, source_page_url,
  original_storage_path, catalog_storage_path, thumbnail_storage_path,
  search_type, search_query, matched_barcode, confidence_score, match_reasons,
  status, is_primary, is_illustrative,
  approved_by, approved_at, rejected_by, rejected_at, error_message,
  original_width, original_height, low_res_warning,
  created_at, updated_at
FROM product_images;

DROP TABLE product_images;
ALTER TABLE product_images_new RENAME TO product_images;

CREATE INDEX idx_product_images_product_id ON product_images (product_id);
CREATE INDEX idx_product_images_status ON product_images (status);
CREATE UNIQUE INDEX idx_product_images_one_primary
  ON product_images (product_id)
  WHERE is_primary = 1;
