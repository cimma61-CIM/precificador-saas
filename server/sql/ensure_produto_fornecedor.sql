CREATE TABLE IF NOT EXISTS produto_fornecedor (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fornecedor VARCHAR(255) NOT NULL,
    codigo_fornecedor VARCHAR(120) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_produto_fornecedor_usuario_fornecedor_codigo_unique
ON produto_fornecedor(usuario_id, LOWER(TRIM(fornecedor)), LOWER(TRIM(codigo_fornecedor)));

CREATE INDEX IF NOT EXISTS idx_produto_fornecedor_produto
ON produto_fornecedor(produto_id);
