exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.ncm_catalog_versions (
      id SERIAL PRIMARY KEY,
      versao VARCHAR(160) NOT NULL UNIQUE,
      fonte_url TEXT NOT NULL,
      vigencia_fonte VARCHAR(255),
      hash_payload VARCHAR(64) NOT NULL,
      hash_catalogo VARCHAR(64) NOT NULL,
      obtido_em TIMESTAMPTZ NOT NULL,
      revisado_em TIMESTAMPTZ,
      revisado_por VARCHAR(255),
      status_revisao VARCHAR(20) NOT NULL DEFAULT 'pendente',
      total_registros INTEGER NOT NULL,
      total_codigos_ativos INTEGER NOT NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS public.ncm_catalog_runs (
      id SERIAL PRIMARY KEY,
      operacao VARCHAR(20) NOT NULL,
      versao_id INTEGER REFERENCES public.ncm_catalog_versions(id) ON DELETE SET NULL,
      iniciado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finalizado_em TIMESTAMPTZ,
      resultado VARCHAR(20) NOT NULL,
      relatorio JSONB NOT NULL DEFAULT '{}'::jsonb,
      erro TEXT
    );

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.ncm_catalog_versions'::regclass
          AND conname = 'ncm_catalog_versions_review_status'
      ) THEN
        ALTER TABLE public.ncm_catalog_versions
          ADD CONSTRAINT ncm_catalog_versions_review_status
          CHECK (status_revisao IN ('pendente', 'aprovado', 'rejeitado'));
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.ncm_catalog_runs'::regclass
          AND conname = 'ncm_catalog_runs_operacao_check'
      ) THEN
        ALTER TABLE public.ncm_catalog_runs
          ADD CONSTRAINT ncm_catalog_runs_operacao_check
          CHECK (operacao IN ('check', 'update'));
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.ncm_catalog_runs'::regclass
          AND conname = 'ncm_catalog_runs_resultado_check'
      ) THEN
        ALTER TABLE public.ncm_catalog_runs
          ADD CONSTRAINT ncm_catalog_runs_resultado_check
          CHECK (resultado IN ('sucesso', 'falha'));
      END IF;
    END
    $$;

    CREATE INDEX IF NOT EXISTS idx_ncm_catalog_runs_operacao_finalizado
      ON public.ncm_catalog_runs (operacao, finalizado_em DESC);
  `)
}

// As tabelas tambem pertencem ao baseline de bootstrap; este complemento nao as remove.
exports.down = () => {}
