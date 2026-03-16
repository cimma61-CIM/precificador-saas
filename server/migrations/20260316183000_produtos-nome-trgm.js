exports.up = async (pgm) => {
  pgm.sql('CREATE EXTENSION IF NOT EXISTS pg_trgm;')
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_produtos_nome_trgm
    ON produtos USING gin (nome gin_trgm_ops);
  `)
}

exports.down = false
