-- Migration number: 0001 	 2026-07-30T12:12:44.156Z

CREATE TABLE product_images (
  id                    TEXT PRIMARY KEY,
  product_id            TEXT NOT NULL, -- sku de src/products.json
  source_name           TEXT NOT NULL,
  source_image_url      TEXT NOT NULL,
  source_page_url       TEXT,
  original_storage_path TEXT,
  catalog_storage_path  TEXT,
  thumbnail_storage_path TEXT,
  search_type           TEXT NOT NULL CHECK (search_type IN ('barcode', 'text', 'manual')),
  search_query           TEXT NOT NULL,
  matched_barcode        TEXT,
  confidence_score        INTEGER NOT NULL DEFAULT 0,
  match_reasons           TEXT NOT NULL DEFAULT '[]', -- JSON array de strings
  status                  TEXT NOT NULL DEFAULT 'candidate' CHECK (
                             status IN ('candidate', 'processing', 'pending_review', 'approved', 'rejected', 'failed')
                           ),
  is_primary               INTEGER NOT NULL DEFAULT 0, -- boolean 0/1
  is_illustrative           INTEGER NOT NULL DEFAULT 0, -- boolean 0/1
  approved_by                TEXT,
  approved_at                 TEXT,
  rejected_by                  TEXT,
  rejected_at                   TEXT,
  error_message                 TEXT,
  created_at                     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_product_images_product_id ON product_images (product_id);
CREATE INDEX idx_product_images_status ON product_images (status);
-- A lo sumo una imagen primaria por producto
CREATE UNIQUE INDEX idx_product_images_one_primary
  ON product_images (product_id)
  WHERE is_primary = 1;

-- Caché de búsquedas por código de barra (evita re-consultar el proveedor externo)
CREATE TABLE barcode_search_cache (
  barcode        TEXT PRIMARY KEY,
  provider       TEXT NOT NULL,
  candidates_json TEXT NOT NULL, -- JSON de ProductImageCandidate[]
  fetched_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Registro de consumo/uso, para el contador de cupo diario y auditoría
CREATE TABLE search_log (
  id                TEXT PRIMARY KEY,
  user_email        TEXT NOT NULL,
  query_type        TEXT NOT NULL CHECK (query_type IN ('barcode', 'text')),
  query_value       TEXT NOT NULL,
  provider          TEXT NOT NULL,
  results_count     INTEGER NOT NULL DEFAULT 0,
  image_found       INTEGER NOT NULL DEFAULT 0,
  approved          INTEGER,
  response_time_ms  INTEGER,
  error_message     TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_search_log_created_at ON search_log (created_at);
