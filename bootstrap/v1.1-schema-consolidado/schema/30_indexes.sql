CREATE UNIQUE INDEX idx_categorias_slug_escopo_unique
  ON public.categorias(usuario_id, LOWER(slug), tipo_canal, COALESCE(marketplace_id, 0));
CREATE INDEX idx_categorias_tipo_marketplace ON public.categorias(tipo_canal, marketplace_id, ativa);
CREATE INDEX idx_categorias_usuario ON public.categorias(usuario_id);
CREATE INDEX idx_categorias_marketplace ON public.categorias(marketplace_id);
CREATE INDEX idx_categorias_usuario_tipo_marketplace ON public.categorias(usuario_id, tipo_canal, marketplace_id, ativa, id DESC);

CREATE UNIQUE INDEX idx_produtos_sku_unique ON public.produtos(sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_produtos_usuario_id ON public.produtos(usuario_id, id DESC);
CREATE INDEX idx_produtos_usuario_sku ON public.produtos(usuario_id, sku);
CREATE INDEX idx_produtos_usuario_nome ON public.produtos(usuario_id, nome);
CREATE INDEX idx_produtos_usuario_barcode ON public.produtos(usuario_id, barcode);
CREATE INDEX idx_produtos_usuario_ean ON public.produtos(usuario_id, ean);
CREATE INDEX idx_produtos_categoria_id ON public.produtos(categoria_id);
CREATE INDEX idx_produtos_usuario_categoria ON public.produtos(usuario_id, categoria_id);
CREATE INDEX idx_produtos_usuario_marketplace ON public.produtos(usuario_id, marketplace);
CREATE INDEX idx_produtos_nome_trgm ON public.produtos USING gin(nome gin_trgm_ops);

CREATE INDEX idx_historico_produtos_produto ON public.historico_produtos(produto_id, criado_em DESC);
CREATE INDEX idx_historico_produtos_usuario ON public.historico_produtos(usuario_id, criado_em DESC);
CREATE INDEX idx_compras_usuario_data ON public.compras(usuario_id, data DESC, id DESC);
CREATE INDEX idx_compras_fornecedor_id ON public.compras(fornecedor_id);
CREATE INDEX idx_compras_itens_compra ON public.compras_itens(compra_id, id DESC);
CREATE INDEX idx_compras_itens_produto ON public.compras_itens(produto_id);
CREATE UNIQUE INDEX idx_produto_fornecedor_usuario_fornecedor_codigo_unique ON public.produto_fornecedor(usuario_id, LOWER(TRIM(fornecedor)), LOWER(TRIM(codigo_fornecedor)));
CREATE INDEX idx_produto_fornecedor_produto ON public.produto_fornecedor(produto_id);
CREATE INDEX idx_ncm_codigo ON public.ncm(codigo);
CREATE INDEX idx_ncm_descricao_lower ON public.ncm(LOWER(descricao));
CREATE INDEX idx_ncm_catalog_runs_operacao_finalizado
  ON public.ncm_catalog_runs(operacao, finalizado_em DESC);
CREATE INDEX idx_produtos_marketplaces_usuario_produto ON public.produtos_marketplaces(usuario_id, produto_id);
CREATE INDEX idx_produtos_marketplaces_marketplace ON public.produtos_marketplaces(marketplace_id, usuario_id);
CREATE UNIQUE INDEX idx_produtos_marketplaces_unique ON public.produtos_marketplaces(produto_id, marketplace_id);
CREATE INDEX idx_taxas_marketplace_usuario_id ON public.taxas_marketplace(usuario_id);
CREATE INDEX idx_taxas_marketplace_marketplace_id ON public.taxas_marketplace(marketplace_id);
CREATE UNIQUE INDEX idx_taxas_marketplace_usuario_marketplace_id_unique ON public.taxas_marketplace(usuario_id, marketplace_id);
CREATE INDEX idx_contatos_usuario_id ON public.contatos(usuario_id);
CREATE INDEX idx_contatos_documento ON public.contatos(documento);
CREATE INDEX idx_contatos_email ON public.contatos(email);
CREATE INDEX idx_contato_tipos_contato_id ON public.contato_tipos(contato_id);
CREATE INDEX idx_contato_tipos_tipo_id ON public.contato_tipos(tipo_id);
