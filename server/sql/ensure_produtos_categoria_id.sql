DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'produtos'
  ) THEN
    ALTER TABLE produtos
    ADD COLUMN IF NOT EXISTS categoria_id INTEGER;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'produtos_categoria_id_fkey'
    ) THEN
      ALTER TABLE produtos
      ADD CONSTRAINT produtos_categoria_id_fkey
      FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'idx_produtos_categoria_id'
    ) THEN
      CREATE INDEX idx_produtos_categoria_id
      ON produtos(categoria_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'idx_produtos_usuario_categoria'
    ) THEN
      CREATE INDEX idx_produtos_usuario_categoria
      ON produtos(usuario_id, categoria_id);
    END IF;
  END IF;
END $$;
