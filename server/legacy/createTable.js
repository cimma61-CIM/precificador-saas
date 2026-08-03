require('./config/loadEnv')
const pool = require('./db')
const ncmSeed = require('./data/ncmSeed')

async function createTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        reset_token TEXT,
        reset_token_expira TIMESTAMP,
        plano VARCHAR(50) NOT NULL DEFAULT 'starter',
        criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await pool.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS reset_token TEXT;
    `)

    await pool.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS reset_token_expira TIMESTAMP;
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        usuario_id INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await pool.query(`
      ALTER TABLE categorias
      ADD COLUMN IF NOT EXISTS slug VARCHAR(160);
    `)

    await pool.query(`
      ALTER TABLE categorias
      ADD COLUMN IF NOT EXISTS tipo_canal VARCHAR(50) NOT NULL DEFAULT 'loja_virtual';
    `)

    await pool.query(`
      ALTER TABLE categorias
      ADD COLUMN IF NOT EXISTS marketplace_id INTEGER;
    `)

    await pool.query(`
      ALTER TABLE categorias
      ADD COLUMN IF NOT EXISTS ativa BOOLEAN NOT NULL DEFAULT true;
    `)

    await pool.query(`
      ALTER TABLE categorias
      ADD COLUMN IF NOT EXISTS nome VARCHAR(255);
    `)

    await pool.query(`
      ALTER TABLE categorias
      ADD COLUMN IF NOT EXISTS descricao TEXT;
    `)

    await pool.query(`
      ALTER TABLE categorias
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `)

    await pool.query(`
      ALTER TABLE categorias
      ADD COLUMN IF NOT EXISTS usuario_id INTEGER;
    `)

    await pool.query(`
      UPDATE categorias
      SET slug = REGEXP_REPLACE(
        REGEXP_REPLACE(
          LOWER(TRIM(TRANSLATE(
            nome,
            'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
            'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'
          ))),
          '[^a-z0-9]+',
          '_',
          'g'
        ),
        '^_+|_+$',
        '',
        'g'
      )
      WHERE nome IS NOT NULL
      AND (slug IS NULL OR slug = '');
    `)

    await pool.query(`
      UPDATE categorias
      SET tipo_canal = 'loja_virtual'
      WHERE tipo_canal IS NULL OR tipo_canal = '';
    `)

    await pool.query(`
      DROP INDEX IF EXISTS idx_categorias_nome_unique;
    `)

    await pool.query(`
      DROP INDEX IF EXISTS idx_categorias_slug_escopo_unique;
    `)

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_slug_escopo_unique
      ON categorias (usuario_id, LOWER(slug), tipo_canal, COALESCE(marketplace_id, 0));
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_categorias_tipo_marketplace
      ON categorias (tipo_canal, marketplace_id, ativa);
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_categorias_usuario
      ON categorias (usuario_id);
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_categorias_usuario_tipo_marketplace
      ON categorias (usuario_id, tipo_canal, marketplace_id, ativa, id DESC);
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ncm (
        codigo VARCHAR(20) PRIMARY KEY,
        descricao TEXT NOT NULL
      );
    `)

    await pool.query(`
      ALTER TABLE ncm
      ADD COLUMN IF NOT EXISTS descricao TEXT;
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS marketplaces (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        ativo BOOLEAN NOT NULL DEFAULT true,
        criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await pool.query(`
      ALTER TABLE marketplaces
      ADD COLUMN IF NOT EXISTS nome VARCHAR(255);
    `)

    await pool.query(`
      ALTER TABLE marketplaces
      ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
    `)

    await pool.query(`
      ALTER TABLE marketplaces
      ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;
    `)

    await pool.query(`
      ALTER TABLE marketplaces
      ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `)

    await pool.query(`
      WITH marketplaces_normalizados AS (
        SELECT
          id,
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              LOWER(TRIM(TRANSLATE(
                COALESCE(NULLIF(slug, ''), nome),
                'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
                'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'
              ))),
              '[^a-z0-9]+',
              '_',
              'g'
            ),
            '^_+|_+$',
            '',
            'g'
          ) AS slug_normalizado
        FROM marketplaces
        WHERE nome IS NOT NULL
      ),
      marketplaces_canonicos AS (
        SELECT
          slug_normalizado,
          MIN(id) AS id_canonico
        FROM marketplaces_normalizados
        GROUP BY slug_normalizado
      ),
      marketplaces_duplicados AS (
        SELECT
          mn.id AS id_duplicado,
          mc.id_canonico
        FROM marketplaces_normalizados mn
        INNER JOIN marketplaces_canonicos mc
          ON mc.slug_normalizado = mn.slug_normalizado
        WHERE mn.id <> mc.id_canonico
      )
      UPDATE taxas_marketplace tm
      SET marketplace_id = md.id_canonico
      FROM marketplaces_duplicados md
      WHERE tm.marketplace_id = md.id_duplicado;
    `)

    await pool.query(`
      DELETE FROM marketplaces m
      WHERE EXISTS (
        SELECT 1
        FROM (
        SELECT
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                LOWER(TRIM(TRANSLATE(
                  COALESCE(NULLIF(slug, ''), nome),
                  'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
                  'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'
                ))),
                '[^a-z0-9]+',
                '_',
                'g'
              ),
              '^_+|_+$',
              '',
              'g'
            ) AS slug_normalizado,
            MIN(id) AS id_canonico
          FROM marketplaces
          WHERE nome IS NOT NULL
          GROUP BY 1
          HAVING COUNT(*) > 1
        ) canonicos
        WHERE canonicos.slug_normalizado = REGEXP_REPLACE(
          REGEXP_REPLACE(
            LOWER(TRIM(TRANSLATE(
              COALESCE(NULLIF(m.slug, ''), m.nome),
              'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
              'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'
            ))),
            '[^a-z0-9]+',
            '_',
            'g'
          ),
          '^_+|_+$',
          '',
          'g'
        )
        AND canonicos.id_canonico <> m.id
      );
    `)

    await pool.query(`
      UPDATE marketplaces
      SET slug = REGEXP_REPLACE(
        REGEXP_REPLACE(
          LOWER(TRIM(TRANSLATE(
            COALESCE(NULLIF(slug, ''), nome),
            'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
            'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'
          ))),
          '[^a-z0-9]+',
          '_',
          'g'
        ),
        '^_+|_+$',
        '',
        'g'
      )
      WHERE nome IS NOT NULL;
    `)

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'marketplaces_slug_key'
        ) THEN
          ALTER TABLE marketplaces
          ADD CONSTRAINT marketplaces_slug_key UNIQUE (slug);
        END IF;
      END $$;
    `)

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'marketplaces'
          AND column_name = 'slug'
          AND is_nullable = 'YES'
        ) THEN
          ALTER TABLE marketplaces
          ALTER COLUMN slug SET NOT NULL;
        END IF;
      END $$;
    `)

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'categorias_marketplace_id_fkey'
        ) THEN
          ALTER TABLE categorias
          ADD CONSTRAINT categorias_marketplace_id_fkey
          FOREIGN KEY (marketplace_id) REFERENCES marketplaces(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `)

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'categorias_usuario_id_fkey'
        ) THEN
          ALTER TABLE categorias
          ADD CONSTRAINT categorias_usuario_id_fkey
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await pool.query(`
      ALTER TABLE produtos
      ADD COLUMN IF NOT EXISTS usuario_id INTEGER;
    `)

    await pool.query(`
      ALTER TABLE produtos
      ADD COLUMN IF NOT EXISTS sku VARCHAR(50);
    `)

    await pool.query(`
      ALTER TABLE produtos
      ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
    `)

    await pool.query(`
      ALTER TABLE produtos
      ADD COLUMN IF NOT EXISTS ean VARCHAR(20);
    `)

    await pool.query(`
      ALTER TABLE produtos
      ADD COLUMN IF NOT EXISTS ncm VARCHAR(20);
    `)

    await pool.query(`
      ALTER TABLE produtos
      ADD COLUMN IF NOT EXISTS categoria_id INTEGER;
    `)

    await pool.query(`
      ALTER TABLE produtos
      ADD COLUMN IF NOT EXISTS custo NUMERIC(10,2) NOT NULL DEFAULT 0;
    `)

    await pool.query(`
      ALTER TABLE produtos
      ADD COLUMN IF NOT EXISTS preco NUMERIC(10,2) NOT NULL DEFAULT 0;
    `)

    await pool.query(`
      ALTER TABLE produtos
      ADD COLUMN IF NOT EXISTS preco_venda NUMERIC(10,2) NOT NULL DEFAULT 0;
    `)

    await pool.query(`
      ALTER TABLE produtos
      ADD COLUMN IF NOT EXISTS quantidade INTEGER NOT NULL DEFAULT 0;
    `)

    await pool.query(`
      ALTER TABLE produtos
      ADD COLUMN IF NOT EXISTS estoque_min INTEGER NOT NULL DEFAULT 0;
    `)

    await pool.query(`
      ALTER TABLE produtos
      ADD COLUMN IF NOT EXISTS estoque_max INTEGER NOT NULL DEFAULT 0;
    `)

    await pool.query(`
      ALTER TABLE produtos
      ADD COLUMN IF NOT EXISTS localizacao VARCHAR(120);
    `)

    await pool.query(`
      ALTER TABLE produtos
      ADD COLUMN IF NOT EXISTS descricao TEXT;
    `)

    await pool.query(`
      ALTER TABLE produtos
      ADD COLUMN IF NOT EXISTS marketplace VARCHAR(100);
    `)

    await pool.query(`
      ALTER TABLE produtos
      ADD COLUMN IF NOT EXISTS margem NUMERIC(10,4) NOT NULL DEFAULT 0;
    `)

    await pool.query(`
      ALTER TABLE produtos
      ADD COLUMN IF NOT EXISTS margem_desejada NUMERIC(10,4) NOT NULL DEFAULT 0;
    `)

    await pool.query(`
      UPDATE produtos
      SET marketplace = LOWER(TRIM(marketplace))
      WHERE marketplace IS NOT NULL;
    `)

    await pool.query(`
      UPDATE produtos
      SET ean = TRIM(barcode)
      WHERE (ean IS NULL OR TRIM(ean) = '')
      AND barcode IS NOT NULL
      AND TRIM(barcode) <> '';
    `)

    await pool.query(`
      UPDATE produtos
      SET preco_venda = COALESCE(NULLIF(preco_venda, 0), preco, 0)
      WHERE preco IS NOT NULL;
    `)

    await pool.query(`
      UPDATE produtos
      SET margem_desejada = COALESCE(margem_desejada, margem, 0)
      WHERE margem IS NOT NULL;
    `)

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'produtos'
          AND column_name = 'preco_custo'
        ) THEN
          EXECUTE '
            UPDATE produtos
            SET custo = COALESCE(custo, preco_custo, 0)
          ';
        END IF;
      END $$;
    `)

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'produtos'
          AND column_name = 'preco_venda'
        ) THEN
          EXECUTE '
            UPDATE produtos
            SET preco = COALESCE(preco, preco_venda, 0)
          ';
        END IF;
      END $$;
    `)

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'produtos_categoria_id_fkey'
        ) THEN
          ALTER TABLE produtos
          ADD CONSTRAINT produtos_categoria_id_fkey
          FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `)

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'produtos_usuario_id_fkey'
        ) THEN
          ALTER TABLE produtos
          ADD CONSTRAINT produtos_usuario_id_fkey
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `)

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_sku_unique
      ON produtos (sku)
      WHERE sku IS NOT NULL;
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_produtos_usuario_id
      ON produtos (usuario_id, id DESC);
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_produtos_usuario_sku
      ON produtos (usuario_id, sku);
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_produtos_usuario_nome
      ON produtos (usuario_id, nome);
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_produtos_usuario_barcode
      ON produtos (usuario_id, barcode);
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_produtos_usuario_ean
      ON produtos (usuario_id, ean);
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_produtos_categoria_id
      ON produtos (categoria_id);
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_produtos_usuario_categoria
      ON produtos (usuario_id, categoria_id);
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_produtos_usuario_marketplace
      ON produtos (usuario_id, marketplace);
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS historico_produtos (
        id SERIAL PRIMARY KEY,
        produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        sku VARCHAR(50),
        nome VARCHAR(255) NOT NULL,
        ean VARCHAR(20),
        custo NUMERIC(10,2) NOT NULL DEFAULT 0,
        preco_venda NUMERIC(10,2) NOT NULL DEFAULT 0,
        margem NUMERIC(10,4) NOT NULL DEFAULT 0,
        criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_historico_produtos_produto
      ON historico_produtos (produto_id, criado_em DESC);
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_historico_produtos_usuario
      ON historico_produtos (usuario_id, criado_em DESC);
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS compras (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        data DATE NOT NULL,
        fornecedor VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_compras_usuario_data
      ON compras (usuario_id, data DESC, id DESC);
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS compras_itens (
        id SERIAL PRIMARY KEY,
        compra_id INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
        produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
        quantidade INTEGER NOT NULL,
        custo_unitario NUMERIC(10,2) NOT NULL
      );
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_compras_itens_compra
      ON compras_itens (compra_id, id DESC);
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_compras_itens_produto
      ON compras_itens (produto_id);
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS produto_fornecedor (
        id SERIAL PRIMARY KEY,
        produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        fornecedor VARCHAR(255) NOT NULL,
        codigo_fornecedor VARCHAR(120) NOT NULL
      );
    `)

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_produto_fornecedor_usuario_fornecedor_codigo_unique
      ON produto_fornecedor (usuario_id, LOWER(TRIM(fornecedor)), LOWER(TRIM(codigo_fornecedor)));
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_produto_fornecedor_produto
      ON produto_fornecedor (produto_id);
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ncm_codigo
      ON ncm (codigo);
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ncm_descricao_lower
      ON ncm (LOWER(descricao));
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS produtos_marketplaces (
        id SERIAL PRIMARY KEY,
        produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
        marketplace_id INTEGER NOT NULL REFERENCES marketplaces(id) ON DELETE RESTRICT,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        margem NUMERIC(10,4) NOT NULL DEFAULT 0,
        preco_calculado NUMERIC(10,2) NOT NULL DEFAULT 0,
        criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await pool.query(`
      ALTER TABLE produtos_marketplaces
      ADD COLUMN IF NOT EXISTS produto_id INTEGER;
    `)

    await pool.query(`
      ALTER TABLE produtos_marketplaces
      ADD COLUMN IF NOT EXISTS marketplace_id INTEGER;
    `)

    await pool.query(`
      ALTER TABLE produtos_marketplaces
      ADD COLUMN IF NOT EXISTS usuario_id INTEGER;
    `)

    await pool.query(`
      ALTER TABLE produtos_marketplaces
      ADD COLUMN IF NOT EXISTS margem NUMERIC(10,4) NOT NULL DEFAULT 0;
    `)

    await pool.query(`
      ALTER TABLE produtos_marketplaces
      ADD COLUMN IF NOT EXISTS preco_calculado NUMERIC(10,2) NOT NULL DEFAULT 0;
    `)

    await pool.query(`
      ALTER TABLE produtos_marketplaces
      ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `)

    await pool.query(`
      INSERT INTO produtos_marketplaces (
        produto_id,
        marketplace_id,
        usuario_id,
        margem,
        preco_calculado
      )
      SELECT
        p.id,
        m.id,
        p.usuario_id,
        COALESCE(p.margem_desejada, p.margem, 0),
        0
      FROM produtos p
      INNER JOIN marketplaces m
        ON m.slug = p.marketplace
      WHERE p.marketplace IS NOT NULL
      AND p.marketplace <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM produtos_marketplaces pm
        WHERE pm.produto_id = p.id
        AND pm.marketplace_id = m.id
      );
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_produtos_marketplaces_usuario_produto
      ON produtos_marketplaces (usuario_id, produto_id);
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_produtos_marketplaces_marketplace
      ON produtos_marketplaces (marketplace_id, usuario_id);
    `)

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_marketplaces_unique
      ON produtos_marketplaces (produto_id, marketplace_id);
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS taxas_marketplace (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        marketplace VARCHAR(100),
        marketplace_id INTEGER,
        taxa_percentual NUMERIC(10,4) NOT NULL DEFAULT 0,
        taxa_fixa NUMERIC(10,2) NOT NULL DEFAULT 0,
        frete_medio NUMERIC(10,2) NOT NULL DEFAULT 0,
        indices_extras TEXT NOT NULL DEFAULT '',
        indice_extra_percentual NUMERIC(10,4) NOT NULL DEFAULT 0,
        imposto_percentual NUMERIC(10,4) NOT NULL DEFAULT 0,
        criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await pool.query(`
      ALTER TABLE taxas_marketplace
      ADD COLUMN IF NOT EXISTS usuario_id INTEGER;
    `)

    await pool.query(`
      ALTER TABLE taxas_marketplace
      ADD COLUMN IF NOT EXISTS marketplace VARCHAR(100);
    `)

    await pool.query(`
      ALTER TABLE taxas_marketplace
      ADD COLUMN IF NOT EXISTS marketplace_id INTEGER;
    `)

    await pool.query(`
      ALTER TABLE taxas_marketplace
      ADD COLUMN IF NOT EXISTS taxa_percentual NUMERIC(10,4) NOT NULL DEFAULT 0;
    `)

    await pool.query(`
      ALTER TABLE taxas_marketplace
      ADD COLUMN IF NOT EXISTS taxa_fixa NUMERIC(10,2) NOT NULL DEFAULT 0;
    `)

    await pool.query(`
      ALTER TABLE taxas_marketplace
      ADD COLUMN IF NOT EXISTS frete_medio NUMERIC(10,2) NOT NULL DEFAULT 0;
    `)

    await pool.query(`
      ALTER TABLE taxas_marketplace
      ADD COLUMN IF NOT EXISTS indices_extras TEXT NOT NULL DEFAULT '';
    `)

    await pool.query(`
      ALTER TABLE taxas_marketplace
      ADD COLUMN IF NOT EXISTS indice_extra_percentual NUMERIC(10,4) NOT NULL DEFAULT 0;
    `)

    await pool.query(`
      ALTER TABLE taxas_marketplace
      ALTER COLUMN indice_extra_percentual TYPE NUMERIC(10,4);
    `)

    await pool.query(`
      ALTER TABLE taxas_marketplace
      ADD COLUMN IF NOT EXISTS imposto_percentual NUMERIC(10,4) NOT NULL DEFAULT 0;
    `)

    await pool.query(`
      ALTER TABLE taxas_marketplace
      ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `)

    await pool.query(`
      UPDATE taxas_marketplace
      SET marketplace = LOWER(TRIM(marketplace))
      WHERE marketplace IS NOT NULL;
    `)

    await pool.query(`
      INSERT INTO marketplaces (nome, slug)
      SELECT DISTINCT marketplace, marketplace
      FROM taxas_marketplace
      WHERE marketplace IS NOT NULL
      AND marketplace <> ''
      ON CONFLICT (slug) DO NOTHING;
    `)

    await pool.query(`
      UPDATE taxas_marketplace tm
      SET marketplace_id = m.id
      FROM marketplaces m
      WHERE tm.marketplace_id IS NULL
      AND tm.marketplace IS NOT NULL
      AND m.slug = tm.marketplace;
    `)

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM taxas_marketplace
          WHERE marketplace_id IS NULL
        ) THEN
          RAISE EXCEPTION 'Existem taxas sem marketplace_id. Corrija a migracao antes de continuar.';
        END IF;
      END $$;
    `)

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'taxas_marketplace_usuario_id_fkey'
        ) THEN
          ALTER TABLE taxas_marketplace
          ADD CONSTRAINT taxas_marketplace_usuario_id_fkey
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `)

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'taxas_marketplace_marketplace_id_fkey'
        ) THEN
          ALTER TABLE taxas_marketplace
          ADD CONSTRAINT taxas_marketplace_marketplace_id_fkey
          FOREIGN KEY (marketplace_id) REFERENCES marketplaces(id) ON DELETE RESTRICT;
        END IF;
      END $$;
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_taxas_marketplace_usuario_id
      ON taxas_marketplace (usuario_id);
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_taxas_marketplace_marketplace_id
      ON taxas_marketplace (marketplace_id);
    `)

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM (
            SELECT usuario_id, marketplace_id
            FROM taxas_marketplace
            GROUP BY usuario_id, marketplace_id
            HAVING COUNT(*) > 1
          ) duplicadas
        ) THEN
          RAISE EXCEPTION 'Existem taxas duplicadas por usuario_id e marketplace_id. Corrija os dados antes de aplicar a restricao UNIQUE.';
        END IF;
      END $$;
    `)

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_taxas_marketplace_usuario_marketplace_id_unique
      ON taxas_marketplace (usuario_id, marketplace_id);
    `)

    for (const item of ncmSeed) {
      await pool.query(
        `
        INSERT INTO ncm (codigo, descricao)
        VALUES ($1, $2)
        ON CONFLICT (codigo) DO UPDATE
        SET descricao = EXCLUDED.descricao
        `,
        [item.codigo, item.descricao]
      )
    }

    console.log('Tabelas e indices criados com sucesso!')
  } catch (err) {
    console.error('Erro ao criar tabela:', err)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

createTable()
