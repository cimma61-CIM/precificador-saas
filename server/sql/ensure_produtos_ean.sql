ALTER TABLE produtos
ADD COLUMN IF NOT EXISTS ean VARCHAR(20);

UPDATE produtos
SET ean = TRIM(barcode)
WHERE (ean IS NULL OR TRIM(ean) = '')
  AND barcode IS NOT NULL
  AND TRIM(barcode) <> '';

CREATE INDEX IF NOT EXISTS idx_produtos_usuario_ean
ON produtos (usuario_id, ean);
