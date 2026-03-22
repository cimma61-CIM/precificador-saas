-- Passo 1: Preparar tabela temporária com dados migrados
CREATE TEMPORARY TABLE produto_fornecedor_backup AS
SELECT 
    id,
    produto_id,
    'default_user'::VARCHAR(255) as fornecedor,
    codigo_fornecedor,
    1::INTEGER as usuario_id
FROM produto_fornecedor;

-- Passo 2: Recriar a tabela com a estrutura correta
DROP TABLE IF EXISTS produto_fornecedor CASCADE;

CREATE TABLE produto_fornecedor (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fornecedor VARCHAR(255) NOT NULL,
    codigo_fornecedor VARCHAR(120) NOT NULL
);

-- Passo 3: Restaurar dados (se houver)
INSERT INTO produto_fornecedor (id, produto_id, usuario_id, fornecedor, codigo_fornecedor)
SELECT id, produto_id, usuario_id, fornecedor, codigo_fornecedor
FROM produto_fornecedor_backup
ON CONFLICT (id) DO NOTHING;

-- Passo 4: Recriar índices
CREATE UNIQUE INDEX idx_produto_fornecedor_usuario_fornecedor_codigo_unique
ON produto_fornecedor(usuario_id, LOWER(TRIM(fornecedor)), LOWER(TRIM(codigo_fornecedor)));

CREATE INDEX idx_produto_fornecedor_produto
ON produto_fornecedor(produto_id);

-- Passo 5: Resetar sequência se houver dados
SELECT setval('produto_fornecedor_id_seq', COALESCE(MAX(id), 0) + 1, false) FROM produto_fornecedor;
