-- Declarative baseline for v1.1-schema-consolidado. No migration ledger is included.

CREATE TABLE public.usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  reset_token TEXT,
  reset_token_expira TIMESTAMP,
  plano VARCHAR(50) NOT NULL DEFAULT 'starter',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.ncm (
  codigo VARCHAR(20) PRIMARY KEY,
  descricao TEXT NOT NULL
);

CREATE TABLE public.marketplaces (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.categorias (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  usuario_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  slug VARCHAR(160),
  tipo_canal VARCHAR(50) NOT NULL DEFAULT 'loja_virtual',
  marketplace_id INTEGER,
  ativa BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE public.produtos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id INTEGER,
  sku VARCHAR(50),
  barcode VARCHAR(100),
  ean VARCHAR(20),
  ncm VARCHAR(20),
  categoria_id INTEGER,
  custo NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_venda NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantidade INTEGER NOT NULL DEFAULT 0,
  estoque_min INTEGER NOT NULL DEFAULT 0,
  estoque_max INTEGER NOT NULL DEFAULT 0,
  localizacao VARCHAR(120),
  descricao TEXT,
  marketplace VARCHAR(100),
  margem NUMERIC(10,4) NOT NULL DEFAULT 0,
  margem_desejada NUMERIC(10,4) NOT NULL DEFAULT 0
);

CREATE TABLE public.tipos_contato (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.contatos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL,
  nome VARCHAR(255) NOT NULL,
  fantasia VARCHAR(255),
  tipo_pessoa VARCHAR(2) NOT NULL,
  documento VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(20),
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.contato_tipos (
  id SERIAL PRIMARY KEY,
  contato_id INTEGER NOT NULL,
  tipo_id INTEGER NOT NULL
);

CREATE TABLE public.historico_produtos (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  sku VARCHAR(50),
  nome VARCHAR(255) NOT NULL,
  ean VARCHAR(20),
  custo NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_venda NUMERIC(10,2) NOT NULL DEFAULT 0,
  margem NUMERIC(10,4) NOT NULL DEFAULT 0,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.compras (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL,
  data DATE NOT NULL,
  fornecedor_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.compras_itens (
  id SERIAL PRIMARY KEY,
  compra_id INTEGER NOT NULL,
  produto_id INTEGER NOT NULL,
  quantidade INTEGER NOT NULL,
  custo_unitario NUMERIC(10,2) NOT NULL
);

CREATE TABLE public.produto_fornecedor (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  fornecedor VARCHAR(255) NOT NULL,
  codigo_fornecedor VARCHAR(120) NOT NULL
);

CREATE TABLE public.produtos_marketplaces (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL,
  marketplace_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  margem NUMERIC(10,4) NOT NULL DEFAULT 0,
  preco_calculado NUMERIC(10,2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.taxas_marketplace (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL,
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
