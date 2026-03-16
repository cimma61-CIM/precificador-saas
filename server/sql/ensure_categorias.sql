CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    descricao TEXT,
    tipo_canal VARCHAR(50),
    marketplace_id INTEGER,
    usuario_id INTEGER,
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE categorias
ADD COLUMN IF NOT EXISTS descricao TEXT;

ALTER TABLE categorias
ADD COLUMN IF NOT EXISTS usuario_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_categorias_usuario
ON categorias(usuario_id);

CREATE INDEX IF NOT EXISTS idx_categorias_marketplace
ON categorias(marketplace_id);

CREATE INDEX IF NOT EXISTS idx_categorias_usuario_tipo_marketplace
ON categorias(usuario_id, tipo_canal, marketplace_id, ativa, id DESC);

DROP INDEX IF EXISTS idx_categorias_slug_escopo_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_slug_escopo_unique
ON categorias(usuario_id, LOWER(slug), tipo_canal, COALESCE(marketplace_id, 0));
