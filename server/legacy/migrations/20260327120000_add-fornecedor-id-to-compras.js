exports.up = async (pgm) => {
  pgm.sql(`
    ALTER TABLE compras
      ADD COLUMN IF NOT EXISTS fornecedor_id INTEGER;

    UPDATE compras
      SET fornecedor_id = contato_id
      WHERE fornecedor_id IS NULL;

    ALTER TABLE compras
      ALTER COLUMN fornecedor_id SET NOT NULL;

    ALTER TABLE compras
      ADD CONSTRAINT IF NOT EXISTS compras_fornecedor_id_fkey
      FOREIGN KEY (fornecedor_id)
      REFERENCES contatos(id);

    CREATE INDEX IF NOT EXISTS idx_compras_fornecedor_id
      ON compras(fornecedor_id);
  `)
}

exports.down = false
