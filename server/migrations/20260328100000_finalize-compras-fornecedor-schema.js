exports.up = async (pgm) => {
  // Esta migration finaliza o esquema de compras usando apenas fornecedor_id.
  // Compras antigas podem não ter fornecedor definido, por isso a coluna não é NOT NULL.
  // A FK é criada com ON DELETE SET NULL para manter o registro da compra
  // mesmo que o contato fornecedor seja removido posteriormente.

  pgm.sql(`
    ALTER TABLE compras
      ADD COLUMN IF NOT EXISTS fornecedor_id INTEGER;

    ALTER TABLE compras
      ADD CONSTRAINT IF NOT EXISTS compras_fornecedor_id_fkey
      FOREIGN KEY (fornecedor_id)
      REFERENCES contatos(id)
      ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_compras_fornecedor_id
      ON compras(fornecedor_id);

    COMMENT ON COLUMN compras.fornecedor_id IS 'Fornecedor associado à compra; compras antigas podem não ter fornecedor definido.';
  `)
}

exports.down = async (pgm) => {
  pgm.sql(`
    ALTER TABLE compras
      DROP CONSTRAINT IF EXISTS compras_fornecedor_id_fkey;

    DROP INDEX IF EXISTS idx_compras_fornecedor_id;
  `)
}
