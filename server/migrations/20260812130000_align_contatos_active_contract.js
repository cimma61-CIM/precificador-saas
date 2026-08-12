exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE public.contatos
      ADD COLUMN IF NOT EXISTS tipo VARCHAR(20),
      ADD COLUMN IF NOT EXISTS observacoes TEXT;

    ALTER TABLE public.contatos
      ALTER COLUMN documento TYPE VARCHAR(50),
      ALTER COLUMN telefone TYPE VARCHAR(50);

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'contatos'
          AND column_name = 'tipo_pessoa'
          AND is_nullable = 'NO'
      ) THEN
        ALTER TABLE public.contatos
          ALTER COLUMN tipo_pessoa DROP NOT NULL;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'contatos'
          AND column_name = 'documento'
          AND is_nullable = 'NO'
      ) THEN
        ALTER TABLE public.contatos
          ALTER COLUMN documento DROP NOT NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'contatos_tipo_valid'
          AND conrelid = 'public.contatos'::regclass
      ) THEN
        ALTER TABLE public.contatos
          ADD CONSTRAINT contatos_tipo_valid
          CHECK (tipo IS NULL OR tipo IN ('cliente', 'fornecedor', 'ambos'));
      END IF;
    END
    $$;

    CREATE INDEX IF NOT EXISTS idx_contatos_usuario_criado_em
      ON public.contatos (usuario_id, criado_em DESC);

    CREATE INDEX IF NOT EXISTS idx_contatos_tipo
      ON public.contatos (tipo);
  `)
}

// A migration e aditiva e preserva o modelo legado; rollback automatico removeria dados ou colunas.
exports.down = () => {}
