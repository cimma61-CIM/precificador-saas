CREATE TABLE IF NOT EXISTS compras (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    fornecedor VARCHAR(255) NOT NULL,
    contato_id INTEGER NOT NULL REFERENCES contatos(id),
    fornecedor_id INTEGER NOT NULL REFERENCES contatos(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_compras_usuario_data
ON compras(usuario_id, data DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_compras_contato_id
ON compras(contato_id);

CREATE INDEX IF NOT EXISTS idx_compras_fornecedor_id
ON compras(fornecedor_id);

CREATE TABLE IF NOT EXISTS compras_itens (
    id SERIAL PRIMARY KEY,
    compra_id INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade INTEGER NOT NULL,
    custo_unitario NUMERIC(10,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_compras_itens_compra
ON compras_itens(compra_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_compras_itens_produto
ON compras_itens(produto_id);
