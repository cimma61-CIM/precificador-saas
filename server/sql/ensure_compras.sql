CREATE TABLE IF NOT EXISTS compras (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    fornecedor_id INTEGER REFERENCES contatos(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE compras
  ADD COLUMN IF NOT EXISTS fornecedor_id INTEGER;

DO $$
BEGIN
  ALTER TABLE compras
    ADD CONSTRAINT compras_fornecedor_id_fkey
    FOREIGN KEY (fornecedor_id)
    REFERENCES contatos(id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END
$$;

CREATE INDEX IF NOT EXISTS idx_compras_fornecedor_id
ON compras(fornecedor_id);

COMMENT ON COLUMN compras.fornecedor_id IS 'Fornecedor associado à compra; compras antigas podem não ter fornecedor definido.';

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
