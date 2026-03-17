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

CREATE INDEX IF NOT EXISTS idx_historico_produtos_produto
ON historico_produtos(produto_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_historico_produtos_usuario
ON historico_produtos(usuario_id, criado_em DESC);
