-- Migration number: 0003 	 2026-07-30T12:34:08.575Z

ALTER TABLE product_images ADD COLUMN original_width INTEGER;
ALTER TABLE product_images ADD COLUMN original_height INTEGER;
ALTER TABLE product_images ADD COLUMN low_res_warning INTEGER NOT NULL DEFAULT 0;
